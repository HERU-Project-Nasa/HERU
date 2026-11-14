import { animate } from "motion/react";
import {
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
  WebGLRenderer,
} from "three";

export type PixelGrid = "modis" | "viirs";

export const FIRES: [x: number, y: number][] = [
  [0.22, 0.3],
  [0.6, 0.45],
  [0.3, 0.82],
];

const VIIRS_EDGES = [0, 0.375, 0.75, 1];
const VIIRS_DETECTED_CELLS: [column: number, row: number][] = [
  [0, 0],
  [1, 1],
  [0, 2],
];

const LOOP_SECONDS = 7;
const SCAN_SHARE = 0.45;
const FADE_START_SHARE = 0.9;
const SCAN_FROM = -0.06;
const SCAN_TO = 1.12;
const DETECT_DELAY = 0.02;
const PULSE_SECONDS = 1.6;
const STATIC_AGE = 10;
const MAX_PIXEL_RATIO = 2;

const VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = vec2(uv.x, 1.0 - uv.y);
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER = `
#define PULSE_SECONDS ${PULSE_SECONDS.toFixed(2)}
uniform float time;
uniform float scan;
uniform float reveal;
uniform float viirs;
uniform vec2 resolution;
uniform vec2 fires[3];
uniform vec3 fireAge;
uniform vec3 cellAge;
uniform vec4 cells[3];

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

float lineMask(float distanceInPixels, float halfWidth) {
  return 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, distanceInPixels);
}

float detection(float age) {
  return step(0.0, age) * reveal;
}

float flash(float age) {
  return step(0.0, age) * exp(-age * 3.5) * reveal;
}

void main() {
  vec2 uv = vUv;
  vec2 pixel = uv * resolution;
  float size = min(resolution.x, resolution.y);

  float terrain = fbm(uv * 5.0 + 3.7);
  float detail = fbm(uv * 22.0 - 1.3);
  vec3 color = mix(vec3(0.085, 0.09, 0.095), vec3(0.14, 0.15, 0.13), terrain);
  color = mix(color, vec3(0.17, 0.15, 0.12), smoothstep(0.55, 0.8, detail) * 0.5);
  color *= 0.9 + 0.2 * noise(pixel * 0.6);

  float scanned = smoothstep(scan + 0.01, scan - 0.01, uv.y);
  color *= mix(0.82, 1.0, scanned);

  vec3 burned = vec3(0.94, 0.24, 0.24);
  for (int i = 0; i < 3; i++) {
    vec4 cell = cells[i];
    if (cell.z <= cell.x) continue;
    float inside = step(cell.x, uv.x) * step(uv.x, cell.z) * step(cell.y, uv.y) * step(uv.y, cell.w);
    float seen = detection(cellAge[i]);
    float glow = flash(cellAge[i]);
    color = mix(color, burned, inside * (seen * 0.32 + glow * 0.4));
    vec2 toEdge = min(uv - cell.xy, cell.zw - uv) * resolution;
    float border = lineMask(min(toEdge.x, toEdge.y), 0.9) * inside;
    color = mix(color, burned * (1.0 + glow), border * seen);
  }

  if (viirs > 0.5) {
    float gridDistance = 1e5;
    for (int i = 1; i < 3; i++) {
      float edge = ${VIIRS_EDGES[1].toFixed(3)} * float(i);
      gridDistance = min(gridDistance, abs(uv.x - edge) * resolution.x);
      gridDistance = min(gridDistance, abs(uv.y - edge) * resolution.y);
    }
    color = mix(color, vec3(0.95), lineMask(gridDistance, 0.6) * 0.22);
  }

  float scanDistance = abs(uv.y - scan) * resolution.y;
  float scanVisible = step(-0.02, scan) * step(scan, 1.02) * reveal;
  vec3 scanColor = vec3(0.43, 0.66, 1.0);
  color += scanColor * (lineMask(scanDistance, 0.8) * 0.9 + exp(-scanDistance / (size * 0.05)) * 0.18) * scanVisible;
  color += scanColor * exp(-max(scan - uv.y, 0.0) * resolution.y / (size * 0.12)) * step(uv.y, scan) * 0.08 * scanVisible;

  for (int i = 0; i < 3; i++) {
    vec2 fire = fires[i];
    float d = length(pixel - fire * resolution) / size;
    float flicker = 0.82 + 0.12 * sin(time * 9.0 + float(i) * 2.1) + 0.1 * noise(vec2(time * 6.0, float(i) * 4.0));
    float core = 1.0 - smoothstep(0.012, 0.02, d);
    float halo = exp(-d / 0.045) * 0.55 * flicker;
    vec3 fireColor = mix(vec3(1.0, 0.54, 0.24), vec3(1.0, 0.85, 0.5), core);
    color += vec3(1.0, 0.45, 0.18) * halo;
    color = mix(color, fireColor, core);

    float age = fireAge[i];
    float phase = fract(max(age, 0.0) / PULSE_SECONDS);
    float pulse = step(0.0, age) * reveal;
    float ringRadius = 0.02 + phase * 0.14;
    float ring = 1.0 - smoothstep(0.0, 0.006, abs(d - ringRadius));
    color += vec3(1.0, 0.55, 0.3) * ring * (1.0 - phase) * (1.0 - phase) * pulse;
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export function detectionTimes(grid: PixelGrid): number[] {
  return grid === "viirs"
    ? VIIRS_DETECTED_CELLS.map(([, row]) => VIIRS_EDGES[row + 1])
    : [1];
}

export function startPixelScan(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  grid: PixelGrid,
  onCount: (count: number) => void,
): () => void {
  const detectAt = detectionTimes(grid);
  const finalCount = detectAt.length;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: false });
  } catch {
    onCount(finalCount);
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

  const cells =
    grid === "viirs"
      ? VIIRS_DETECTED_CELLS.map(
          ([column, row]) =>
            new Vector4(
              VIIRS_EDGES[column],
              VIIRS_EDGES[row],
              VIIRS_EDGES[column + 1],
              VIIRS_EDGES[row + 1],
            ),
        )
      : [
          new Vector4(0, 0, 1, 1),
          new Vector4(0, 0, 0, 0),
          new Vector4(0, 0, 0, 0),
        ];
  const fireDetectAt = FIRES.map(([, y]) =>
    grid === "viirs"
      ? VIIRS_EDGES[VIIRS_EDGES.findIndex((edge) => edge > y)]
      : 1,
  );

  const material = new ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      scan: { value: SCAN_TO },
      reveal: { value: 1 },
      viirs: { value: grid === "viirs" ? 1 : 0 },
      resolution: { value: new Vector2(1, 1) },
      fires: { value: FIRES.map(([x, y]) => new Vector2(x, y)) },
      fireAge: { value: new Vector3(-1, -1, -1) },
      cellAge: { value: new Vector3(-1, -1, -1) },
      cells: { value: cells },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  const geometry = new PlaneGeometry(2, 2);
  const scene = new Scene();
  scene.add(new Mesh(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const startTime = performance.now();
  let onScreen = true;
  let animationFrame = 0;
  let disposed = false;
  let count = -1;
  let lastScan = -Infinity;
  const cellSeenAt = detectAt.map(() => Number.NaN);
  const fireSeenAt = fireDetectAt.map(() => Number.NaN);

  const clock = () => (performance.now() - startTime) / 1000;

  const report = () => {
    const scan = material.uniforms.scan.value;
    const now = clock();
    if (scan < lastScan) {
      cellSeenAt.fill(Number.NaN);
      fireSeenAt.fill(Number.NaN);
    }
    lastScan = scan;
    detectAt.forEach((edge, index) => {
      if (Number.isNaN(cellSeenAt[index]) && scan >= edge + DETECT_DELAY) {
        cellSeenAt[index] = now;
      }
    });
    fireDetectAt.forEach((edge, index) => {
      if (Number.isNaN(fireSeenAt[index]) && scan >= edge + DETECT_DELAY) {
        fireSeenAt[index] = now;
      }
    });
    const next = cellSeenAt.filter((seenAt) => !Number.isNaN(seenAt)).length;
    if (next !== count) {
      count = next;
      onCount(next);
    }
  };

  const ages = (seenAt: number[], target: Vector3, now: number) => {
    const [a = -1, b = -1, c = -1] = seenAt.map((time) =>
      Number.isNaN(time) ? -1 : now - time,
    );
    target.set(a, b, c);
  };

  const render = () => {
    const now = clock();
    material.uniforms.time.value = now;
    ages(cellSeenAt, material.uniforms.cellAge.value, now);
    ages(fireSeenAt, material.uniforms.fireAge.value, now);
    renderer.render(scene, camera);
  };

  const tick = () => {
    animationFrame = 0;
    if (disposed) {
      return;
    }
    render();
    if (onScreen && !reducedMotion.matches && !disposed) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  const wake = () => {
    if (!disposed) {
      animationFrame ||= requestAnimationFrame(tick);
    }
  };

  const resize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (width && height) {
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(material.uniforms.resolution.value);
    }
    wake();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  const visibilityObserver = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    wake();
  });
  visibilityObserver.observe(container);

  let playback: { stop: () => void } | null = null;
  if (reducedMotion.matches) {
    cellSeenAt.fill(-STATIC_AGE);
    count = finalCount;
    onCount(finalCount);
  } else {
    playback = animate(0, 1, {
      duration: LOOP_SECONDS,
      delay: 0.5,
      ease: "linear",
      repeat: Infinity,
      onUpdate: (progress) => {
        const scanProgress = Math.min(progress / SCAN_SHARE, 1);
        material.uniforms.scan.value =
          SCAN_FROM + (SCAN_TO - SCAN_FROM) * scanProgress;
        material.uniforms.reveal.value =
          progress < FADE_START_SHARE
            ? 1
            : 1 - (progress - FADE_START_SHARE) / (1 - FADE_START_SHARE);
        report();
      },
    });
    material.uniforms.scan.value = SCAN_FROM;
    report();
  }

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    playback?.stop();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
}
