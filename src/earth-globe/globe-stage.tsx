"use client";

import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import {
  type ColorSpace,
  Mesh,
  NoColorSpace,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import {
  createAtmosphereMaterial,
  createEarthMaterial,
  type EarthTextures,
} from "./earth-materials";
import {
  currentGlobeSlot,
  type GlobeSlot,
  reportGlobeLoading,
  watchGlobeSlot,
} from "./globe-store";
import { type GeographicPoint, subsolarPoint } from "./sun-position";

const EARTH_SHARE_OF_FRAME = 0.88;
const ATMOSPHERE_RADIUS = 1.12;
const CAMERA_DISTANCE = 5;
const EARTH_TANGENT = 1 / Math.sqrt(CAMERA_DISTANCE * CAMERA_DISTANCE - 1);
const INITIAL_VIEW: GeographicPoint = { latitude: -16, longitude: -47 };
const ROTATION_DEGREES_PER_SECOND = 6;
const FLIGHT_SECONDS = 1.4;
const FLIGHT_SPIN_DEGREES = 140;
const ENTRANCE_SECONDS = 1.4;
const ENTRANCE_LIFT_PIXELS = 72;
const EXIT_SECONDS = 0.4;
const EASE_CAMERA = [0.65, 0, 0.35, 1] as const;
const EASE_EXIT = [0.4, 0, 1, 1] as const;
const SUN_REFRESH_MILLISECONDS = 60_000;
const MAX_PIXEL_RATIO = 1.5;
const MAX_ANISOTROPY = 8;
const RADIANS_PER_DEGREE = Math.PI / 180;

const TEXTURE_FILES: { url: string; colorSpace: ColorSpace }[] = [
  { url: "/globe/earth-day.jpg", colorSpace: SRGBColorSpace },
  { url: "/globe/earth-night.jpg", colorSpace: SRGBColorSpace },
  { url: "/globe/earth-water.png", colorSpace: NoColorSpace },
];

type Frame = { x: number; y: number; radius: number };
type Playback = { stop: () => void };

let texturesRequest: Promise<EarthTextures> | null = null;

export function GlobeStage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    let renderer: WebGLRenderer;
    try {
      renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch {
      reportGlobeLoading({ progress: 1, ready: true });
      return;
    }
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

    const scene = new Scene();
    const camera = new PerspectiveCamera(30, 1, 0.1, 100);
    const sunDirection = new Vector3();
    const earthGeometry = new SphereGeometry(1, 160, 80);
    const atmosphereGeometry = new SphereGeometry(ATMOSPHERE_RADIUS, 160, 80);
    const atmosphereMaterial = createAtmosphereMaterial(
      ATMOSPHERE_RADIUS,
      sunDirection,
    );
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const startTime = performance.now();
    const playbacks = new Map<string, Playback>();
    let slot: GlobeSlot | null = null;
    let shownElement: HTMLElement | null = null;
    let frame: Frame | null = null;
    let flight: { from: Frame; progress: number } | null = null;
    let opacity = 0;
    let lift = 0;
    let spin = 0;
    let earthMesh: Mesh | null = null;
    let width = 0;
    let height = 0;
    let animationFrame = 0;
    let lastDrawKey = "";
    let lastSunUpdate = -Infinity;
    let disposed = false;

    const play = (
      name: string,
      from: number,
      to: number,
      seconds: number,
      ease: typeof EASE_CAMERA | typeof EASE_EXIT,
      onUpdate: (value: number) => void,
      onComplete?: () => void,
    ) => {
      playbacks.get(name)?.stop();
      if (reducedMotion.matches) {
        onUpdate(to);
        onComplete?.();
        return;
      }
      playbacks.set(
        name,
        animate(from, to, {
          duration: seconds,
          ease,
          onUpdate,
          onComplete: () => {
            playbacks.delete(name);
            onComplete?.();
          },
        }),
      );
      wake();
    };

    const followSlot = () => {
      const next = currentGlobeSlot();
      slot = next;
      if (!next?.visible) {
        play("opacity", opacity, 0, EXIT_SECONDS, EASE_EXIT, (value) => {
          opacity = value;
        });
        return;
      }
      const onScreen = opacity > 0 && frame !== null;
      if (onScreen && frame && shownElement !== next.element) {
        flight = { from: frame, progress: 0 };
        play(
          "flight",
          0,
          1,
          FLIGHT_SECONDS,
          EASE_CAMERA,
          (value) => {
            if (flight) {
              flight.progress = value;
            }
          },
          () => {
            flight = null;
          },
        );
        play(
          "spin",
          spin,
          spin + FLIGHT_SPIN_DEGREES,
          FLIGHT_SECONDS,
          EASE_CAMERA,
          (value) => {
            spin = value;
          },
        );
      } else if (!onScreen) {
        flight = null;
        play(
          "lift",
          ENTRANCE_LIFT_PIXELS,
          0,
          ENTRANCE_SECONDS,
          EASE_CAMERA,
          (value) => {
            lift = value;
          },
        );
      }
      play(
        "opacity",
        opacity,
        1,
        onScreen ? EXIT_SECONDS : ENTRANCE_SECONDS,
        EASE_CAMERA,
        (value) => {
          opacity = value;
        },
      );
      shownElement = next.element;
    };

    const draw = (time: number, current: Frame) => {
      const rotating = !reducedMotion.matches;
      const clip = flight ? null : clipRectangle(slot);
      const drawKey = `${current.x}|${current.y + lift}|${current.radius}|${opacity}|${width}|${height}|${clip?.join() ?? ""}`;
      const sunIsStale = time - lastSunUpdate > SUN_REFRESH_MILLISECONDS;
      if (!rotating && drawKey === lastDrawKey && !sunIsStale) {
        return;
      }
      lastDrawKey = drawKey;
      if (sunIsStale || rotating) {
        surfaceDirection(subsolarPoint(new Date()), sunDirection);
        lastSunUpdate = time;
      }
      const elapsedSeconds = rotating ? (time - startTime) / 1000 : 0;
      surfaceDirection(
        {
          latitude: INITIAL_VIEW.latitude,
          longitude:
            INITIAL_VIEW.longitude -
            elapsedSeconds * ROTATION_DEGREES_PER_SECOND -
            spin,
        },
        camera.position,
      ).multiplyScalar(CAMERA_DISTANCE);
      camera.lookAt(0, 0, 0);
      camera.aspect = width / height;
      camera.fov =
        (2 * Math.atan((EARTH_TANGENT * height) / 2 / current.radius)) /
        RADIANS_PER_DEGREE;
      camera.setViewOffset(
        width,
        height,
        width / 2 - current.x,
        height / 2 - (current.y + lift),
        width,
        height,
      );
      canvas.style.opacity = String(opacity);
      renderer.setScissorTest(false);
      renderer.clear();
      if (clip) {
        renderer.setScissorTest(true);
        renderer.setScissor(
          clip[0],
          height - clip[3],
          clip[2] - clip[0],
          clip[3] - clip[1],
        );
      }
      renderer.render(scene, camera);
    };

    const tick = (time: number) => {
      animationFrame = 0;
      if (slot?.element.isConnected) {
        const target = measure(slot.element);
        frame = flight ? mix(flight.from, target, flight.progress) : target;
      }
      canvas.style.opacity = String(opacity);
      if (frame && earthMesh && opacity > 0 && width && height) {
        draw(time, frame);
      }
      if (opacity > 0 || slot?.visible || playbacks.size > 0) {
        animationFrame = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      animationFrame ||= requestAnimationFrame(tick);
    };

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      if (width && height) {
        renderer.setSize(width, height, false);
      }
      lastDrawKey = "";
      wake();
    };

    const stopWatchingSlot = watchGlobeSlot(() => {
      requestAnimationFrame(() => {
        if (!disposed) {
          followSlot();
          wake();
        }
      });
    });
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    window.addEventListener("scroll", wake, { passive: true });
    followSlot();

    texturesRequest ??= loadEarthTextures().catch((error: unknown) => {
      texturesRequest = null;
      throw error;
    });
    texturesRequest
      .then(async (textures) => {
        if (disposed) {
          return;
        }
        const anisotropy = Math.min(
          MAX_ANISOTROPY,
          renderer.capabilities.getMaxAnisotropy(),
        );
        for (const texture of Object.values(textures)) {
          texture.anisotropy = anisotropy;
          renderer.initTexture(texture);
        }
        earthMesh = new Mesh(
          earthGeometry,
          createEarthMaterial(textures, sunDirection),
        );
        scene.add(earthMesh, new Mesh(atmosphereGeometry, atmosphereMaterial));
        await renderer.compileAsync(scene, camera);
        if (!disposed) {
          reportGlobeLoading({ progress: 1, ready: true });
          wake();
        }
      })
      .catch(() => {
        if (!disposed) {
          reportGlobeLoading({ progress: 1, ready: true });
        }
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      for (const playback of playbacks.values()) {
        playback.stop();
      }
      stopWatchingSlot();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", wake);
      earthGeometry.dispose();
      atmosphereGeometry.dispose();
      atmosphereMaterial.dispose();
      if (earthMesh && !Array.isArray(earthMesh.material)) {
        earthMesh.material.dispose();
      }
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[3] size-full opacity-0"
    />
  );
}

async function loadEarthTextures(): Promise<EarthTextures> {
  const received = TEXTURE_FILES.map(() => 0);
  const sizes = TEXTURE_FILES.map(() => 0);
  const report = () => {
    if (sizes.every((size) => size > 0)) {
      const total = sizes.reduce((sum, size) => sum + size, 0);
      const done = received.reduce((sum, bytes) => sum + bytes, 0);
      reportGlobeLoading({ progress: Math.min(done / total, 1) });
    }
  };
  const [day, night, water] = await Promise.all(
    TEXTURE_FILES.map(async (file, index) => {
      const response = await fetch(file.url);
      if (!response.ok || !response.body) {
        throw new Error(`${file.url} answered ${response.status}`);
      }
      sizes[index] = Number(response.headers.get("content-length")) || 0;
      const reader = response.body.getReader();
      const chunks: BlobPart[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        chunks.push(value);
        received[index] += value.byteLength;
        report();
      }
      sizes[index] ||= received[index];
      report();
      const blobUrl = URL.createObjectURL(
        new Blob(chunks, { type: response.headers.get("content-type") ?? "" }),
      );
      try {
        const texture = await new TextureLoader().loadAsync(blobUrl);
        texture.colorSpace = file.colorSpace;
        return texture;
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    }),
  );
  return { day, night, water };
}

function measure(element: HTMLElement): Frame {
  const bounds = element.getBoundingClientRect();
  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
    radius: (bounds.width * EARTH_SHARE_OF_FRAME) / 2,
  };
}

function mix(from: Frame, to: Frame, progress: number): Frame {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    radius: from.radius + (to.radius - from.radius) * progress,
  };
}

function clipRectangle(
  slot: GlobeSlot | null,
): [left: number, top: number, right: number, bottom: number] | null {
  const container = slot?.element.offsetParent;
  if (!(container instanceof HTMLElement)) {
    return null;
  }
  const bounds = container.getBoundingClientRect();
  const left = Math.max(0, Math.floor(bounds.left));
  const top = Math.max(0, Math.floor(bounds.top));
  const right = Math.min(window.innerWidth, Math.ceil(bounds.right));
  const bottom = Math.min(window.innerHeight, Math.ceil(bounds.bottom));
  return [left, top, Math.max(left, right), Math.max(top, bottom)];
}

function surfaceDirection(point: GeographicPoint, target: Vector3): Vector3 {
  const latitude = point.latitude * RADIANS_PER_DEGREE;
  const longitude = point.longitude * RADIANS_PER_DEGREE;
  return target.set(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude),
  );
}
