import { useCallback, useEffect, useSyncExternalStore } from "react";
import { readPipelineCsv } from "./read-pipeline-csv";

export type PipelineFile<T> = { rows: T[] | null; error: Error | null };

export type LatestBatchRow = { batch: number; updated_at: string };

type BatchFileRow = { path: string };

type Entry = {
  file: PipelineFile<unknown>;
  listeners: Set<() => void>;
  request: number;
};

const LATEST_PATH = "meta/latest.csv";
const POLL_INTERVAL_MS = 5 * 60 * 1000;
const NOT_LOADED: PipelineFile<never> = { rows: null, error: null };

const entries = new Map<string, Entry>();
let knownBatch: number | null = null;

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

export function reloadPipelineFile(path: string) {
  const entry = entryOf(path);
  const request = ++entry.request;
  readPipelineCsv(path).then(
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

async function changedPaths(from: number, to: number): Promise<Set<string>> {
  const paths = new Set<string>();
  for (let batch = from + 1; batch <= to; batch++) {
    const rows = await readPipelineCsv<BatchFileRow>(
      `meta/batches/${batch}.csv`,
    );
    for (const row of rows) {
      paths.add(row.path);
    }
  }
  return paths;
}

async function checkForNewBatch() {
  const latestEntry = entryOf(LATEST_PATH);
  const [latest] = await readPipelineCsv<LatestBatchRow>(LATEST_PATH);
  const previous =
    knownBatch ??
    (latestEntry.file.rows as LatestBatchRow[] | null)?.[0]?.batch ??
    null;
  if (!latest || latest.batch === previous) {
    return;
  }
  knownBatch = latest.batch;
  const loaded = [...entries.keys()].filter((path) => path !== LATEST_PATH);
  const paths =
    previous === null
      ? null
      : await changedPaths(previous, latest.batch).catch(() => null);
  for (const path of loaded) {
    if (!paths || paths.has(path)) {
      reloadPipelineFile(path);
    }
  }
  publish(latestEntry, { rows: [latest], error: null });
}

export function useBatchPolling(): PipelineFile<LatestBatchRow> {
  const latest = usePipelineFile<LatestBatchRow>(LATEST_PATH);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!document.hidden) {
        checkForNewBatch().catch(() => {});
      }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);
  return latest;
}
