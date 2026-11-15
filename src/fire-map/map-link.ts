export type MapCamera = {
  center: [number, number];
  zoom: number;
  bearing: number;
  pitch: number;
};

type CameraListener = (camera: MapCamera) => void;

export type MapLink = {
  lastCamera: () => MapCamera | null;
  share: (from: object, camera: MapCamera) => void;
  follow: (member: object, listener: CameraListener) => () => void;
};

export function createMapLink(): MapLink {
  const listeners = new Map<object, CameraListener>();
  let last: MapCamera | null = null;
  return {
    lastCamera: () => last,
    share: (from, camera) => {
      last = camera;
      for (const [member, listener] of listeners) {
        if (member !== from) {
          listener(camera);
        }
      }
    },
    follow: (member, listener) => {
      listeners.set(member, listener);
      return () => {
        listeners.delete(member);
      };
    },
  };
}
