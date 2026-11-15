import { useSyncExternalStore } from "react";

export type GlobeSlot = { element: HTMLElement; visible: boolean };
export type GlobeLoading = { progress: number; ready: boolean };

const NOT_LOADED: GlobeLoading = { progress: 0, ready: false };

let slot: GlobeSlot | null = null;
let slotListener: (() => void) | null = null;
let loading = NOT_LOADED;
const loadingListeners = new Set<() => void>();

export function placeGlobe(next: GlobeSlot) {
  slot = next;
  slotListener?.();
}

export function releaseGlobe(element: HTMLElement) {
  if (slot?.element === element) {
    slot = null;
    slotListener?.();
  }
}

export function currentGlobeSlot(): GlobeSlot | null {
  return slot;
}

export function watchGlobeSlot(listener: () => void): () => void {
  slotListener = listener;
  return () => {
    slotListener = null;
  };
}

export function reportGlobeLoading(next: Partial<GlobeLoading>) {
  loading = { ...loading, ...next };
  for (const listener of loadingListeners) {
    listener();
  }
}

export function globeLoadingSnapshot(): GlobeLoading {
  return loading;
}

export function useGlobeLoading(): GlobeLoading {
  return useSyncExternalStore(
    (listener) => {
      loadingListeners.add(listener);
      return () => loadingListeners.delete(listener);
    },
    () => loading,
    () => NOT_LOADED,
  );
}
