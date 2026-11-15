import { useCallback, useEffect, useSyncExternalStore } from "react";
import { PipelineFileError, readPipelineCsv } from "./read-pipeline-csv";

export type PipelineFile<T> = { rows: T[] | null; error: Error | null };

export type LatestBatchRow = { batch: number; updated_at: string };

export type ChangedPaths = Set<string> | null;

type BatchFileRow = { path: string };

type Entry = {
  file: PipelineFile<unknown>;
  listeners: Set<() => void>;
  request: number;
};

export const LATEST_PATH = "meta/latest.csv";
const POLL_INTERVAL_MS = 60 * 1000;
const MAX_BATCH_JUMP = 500;
const NOT_LOADED: PipelineFile<never> = { rows: null, error: null };

const entries = new Map<string, Entry>();
const changeListeners = new Set<(paths: ChangedPaths) => void>();
let knownBatch: number | null = null;
let firstLatest: Promise<void> | null = null;
let revision = 0;
let checking = false;

function entryOf(path: string): Entry {
  let entry = entries.get(path);
  if (!entry) {
    entry = { file: NOT_LOADED, listeners: new Set(), request: 0 };
    entries.set(path, entry);
  }
  return entry;
}

function publish(entry: Entry, file: PipelineFile<unknown>) {
  entry.file = file;
  for (const listener of entry.listeners) {
    listener();
  }
}

function load(path: string, after: Promise<unknown> | null): Promise<void> {
  const entry = entryOf(path);
  const request = ++entry.request;
  const read = after
    ? after.then(() => readPipelineCsv(path))
    : readPipelineCsv(path);
  return read.then(
    (rows) => {
      if (request === entry.request) {
        publish(entry, { rows, error: null });
      }
    },
    (error: Error) => {
      if (request === entry.request) {
        publish(entry, { rows: entry.file.rows, error });
      }
    },
  );
}

function loadLatest(): Promise<void> {
  const loading = load(LATEST_PATH, null).then(() => {
    const rows = entryOf(LATEST_PATH).file.rows as LatestBatchRow[] | null;
    knownBatch = rows?.[0]?.batch ?? knownBatch;
  });
  firstLatest = loading;
  return loading;
}

export function reloadPipelineFile(path: string) {
  if (path === LATEST_PATH) {
    loadLatest();
    return;
  }
  load(path, firstLatest ?? loadLatest());
}

function notifyChange(paths: ChangedPaths) {
  revision++;
  for (const listener of changeListeners) {
    listener(paths);
  }
}

export function onPipelineChange(
  listener: (paths: ChangedPaths) => void,
): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

function subscribeRevision(listener: () => void) {
  return onPipelineChange(listener);
}

export function usePipelineRevision(): number {
  return useSyncExternalStore(
    subscribeRevision,
    () => revision,
    () => 0,
  );
}

export function usePipelineFile<T>(path: string | null): PipelineFile<T> {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (path === null) {
        return () => {};
      }
      const entry = entryOf(path);
      entry.listeners.add(listener);
      if (entry.request === 0) {
        reloadPipelineFile(path);
      }
      return () => {
        entry.listeners.delete(listener);
      };
    },
    [path],
  );
  return useSyncExternalStore(
    subscribe,
    () => (path === null ? NOT_LOADED : entryOf(path).file),
    () => NOT_LOADED,
  ) as PipelineFile<T>;
}

const NO_FILES: PipelineFile<never>[] = [];
const fileGroups = new Map<string, PipelineFile<unknown>[]>();

export function usePipelineFiles<T>(paths: string[]): PipelineFile<T>[] {
  const key = paths.join("\n");
  const subscribe = useCallback(
    (listener: () => void) => {
      const groupEntries = key ? key.split("\n").map(entryOf) : [];
      for (const entry of groupEntries) {
        entry.listeners.add(listener);
      }
      for (const [index, entry] of groupEntries.entries()) {
        if (entry.request === 0) {
          reloadPipelineFile(key.split("\n")[index]);
        }
      }
      return () => {
        for (const entry of groupEntries) {
          entry.listeners.delete(listener);
        }
      };
    },
    [key],
  );
  const groupSnapshot = useCallback(() => {
    if (!key) {
      return NO_FILES;
    }
    const files = key.split("\n").map((path) => entryOf(path).file);
    const previous = fileGroups.get(key);
    if (previous && previous.every((file, index) => file === files[index])) {
      return previous;
    }
    fileGroups.set(key, files);
    return files;
  }, [key]);
  return useSyncExternalStore(
    subscribe,
    groupSnapshot,
    () => NO_FILES,
  ) as PipelineFile<T>[];
}

async function changedPaths(from: number, to: number): Promise<ChangedPaths> {
  const paths = new Set<string>();
  for (let batch = from + 1; batch <= to; batch++) {
    try {
      const rows = await readPipelineCsv<BatchFileRow>(
        `meta/batches/${batch}.csv`,
      );
      for (const row of rows) {
        paths.add(row.path);
      }
    } catch (error) {
      if (error instanceof PipelineFileError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
  return paths;
}

function resynchronize() {
  const latestRead = loadLatest();
  for (const path of entries.keys()) {
    if (path !== LATEST_PATH && entryOf(path).request > 0) {
      load(path, latestRead);
    }
  }
  notifyChange(null);
}

async function checkForNewBatch() {
  const [latest] = await readPipelineCsv<LatestBatchRow>(LATEST_PATH);
  if (!latest || knownBatch === null || latest.batch === knownBatch) {
    return;
  }
  if (latest.batch < knownBatch || latest.batch - knownBatch > MAX_BATCH_JUMP) {
    resynchronize();
    return;
  }
  const paths = await changedPaths(knownBatch, latest.batch);
  if (paths === null) {
    resynchronize();
    return;
  }
  knownBatch = latest.batch;
  for (const path of paths) {
    const entry = entries.get(path);
    if (entry && entry.request > 0) {
      load(path, null);
    }
  }
  publish(entryOf(LATEST_PATH), { rows: [latest], error: null });
  notifyChange(paths);
}

async function pollOnce() {
  if (checking || document.hidden) {
    return;
  }
  checking = true;
  try {
    await checkForNewBatch();
  } catch {
    return;
  } finally {
    checking = false;
  }
}

export function useBatchPolling(): PipelineFile<LatestBatchRow> {
  const latest = usePipelineFile<LatestBatchRow>(LATEST_PATH);
  useEffect(() => {
    const timer = window.setInterval(pollOnce, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (!document.hidden) {
        pollOnce();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  return latest;
}
