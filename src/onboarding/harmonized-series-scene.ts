import { animate } from "motion/react";
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Mesh,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";

export const VIEW_WIDTH = 560;
export const VIEW_HEIGHT = 300;
export const BASELINE = 268;
export const VIIRS_ENTRY_X = 384.6;

export const SERIES_X = [
  8, 49.8, 91.7, 133.5, 175.4, 217.2, 259.1, 300.9, 342.8, 384.6, 426.5, 468.3,
  510.2, 552,
];
export const RAW_Y = [
  228, 222.7, 220, 230.7, 217.3, 234.7, 238.7, 214.7, 236, 128, 174.7, 154.7,
  141.3, 148,
];
export const HARMONIZED_Y = [
  108, 86.7, 76, 118.7, 65.3, 134.7, 150.7, 54.7, 140, 128, 174.7, 154.7, 141.3,
  148,
];

const LOOP_SECONDS = 11;
const RAW_DRAW = [0.3, 2.1] as const;
const MARKER = [1.7, 2.3] as const;
const HARMONIZED_IN = [2.6, 3.0] as const;
const MORPH = [3.0, 4.8] as const;
const FADE_OUT = [9.8, 10.5] as const;
const EMBER_COUNT = 70;
const GLOW_HALF_WIDTH = 9;
const MAX_PIXEL_RATIO = 2;

export type SeriesFrame = {
  rawReveal: number;
  rawOpacity: number;
  markerReveal: number;
  harmonizedOpacity: number;
  ys: number[];
  visibility: number;
};

export type SeriesListener = (frame: SeriesFrame) => void;

const STRIP_VERTEX_SHADER = `
attribute float side;
varying float vSide;

void main() {
  vSide = side;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const GLOW_FRAGMENT_SHADER = `
uniform float opacity;
varying float vSide;

void main() {
  float alpha = exp(-vSide * vSide * 5.0) * opacity;
  gl_FragColor = vec4(vec3(0.94, 0.24, 0.24) * alpha, alpha);
}
`;

const AREA_FRAGMENT_SHADER = `
uniform float opacity;
varying float vSide;

void main() {
  float alpha = pow(1.0 - vSide, 2.2) * 0.32 * opacity;
  gl_FragColor = vec4(0.94, 0.24, 0.24, alpha);
}
`;

const EMBER_VERTEX_SHADER = `
attribute float alpha;
attribute float size;
uniform float scale;
varying float vAlpha;

void main() {
  vAlpha = alpha;
  gl_PointSize = size * scale;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const EMBER_FRAGMENT_SHADER = `
varying float vAlpha;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float alpha = pow(max(1.0 - d, 0.0), 1.8) * vAlpha;
  if (alpha < 0.01) discard;
  vec3 color = mix(vec3(0.94, 0.24, 0.24), vec3(1.0, 0.8, 0.45), pow(max(1.0 - d, 0.0), 3.0));
  gl_FragColor = vec4(color * alpha, alpha);
}
`;

export function startHarmonizedSeries(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  onFrame: SeriesListener,
): () => void {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finalFrame = frameAt(MORPH[1] + 1, 0);

  let renderer: WebGLRenderer | null = null;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setClearColor(0x000000, 0);
  } catch {
    renderer = null;
  }

  const scene = new Scene();
  const camera = new OrthographicCamera(0, VIEW_WIDTH, 0, VIEW_HEIGHT, -1, 1);
  const pointCount = SERIES_X.length;

  const glowGeometry = stripGeometry(pointCount, [-1, 1]);
  const glowMaterial = new ShaderMaterial({
    uniforms: { opacity: { value: 0 } },
    vertexShader: STRIP_VERTEX_SHADER,
    fragmentShader: GLOW_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });

  const areaGeometry = stripGeometry(pointCount, [0, 1]);
  const areaMaterial = new ShaderMaterial({
    uniforms: { opacity: { value: 0 } },
    vertexShader: STRIP_VERTEX_SHADER,
    fragmentShader: AREA_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    side: DoubleSide,
  });

  const embers = Array.from({ length: EMBER_COUNT }, (_, index) => {
    const random = seeded(index + 1);
    return {
      x: 8 + random() * (VIEW_WIDTH - 16),
      phase: random(),
      speed: 0.25 + random() * 0.35,
      rise: 18 + random() * 34,
      sway: (random() - 0.5) * 10,
      size: 4 + random() * 6,
    };
  });
  const emberGeometry = new BufferGeometry();
  emberGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(EMBER_COUNT * 3), 3),
  );
  emberGeometry.setAttribute(
    "alpha",
    new Float32BufferAttribute(new Float32Array(EMBER_COUNT), 1),
  );
  emberGeometry.setAttribute(
    "size",
    new Float32BufferAttribute(
      embers.map((ember) => ember.size),
      1,
    ),
  );
  const emberMaterial = new ShaderMaterial({
    uniforms: { scale: { value: 1 } },
    vertexShader: EMBER_VERTEX_SHADER,
    fragmentShader: EMBER_FRAGMENT_SHADER,
    transparent: true,
    depthTest: false,
    blending: AdditiveBlending,
  });
  const emberPoints = new Points(emberGeometry, emberMaterial);
  emberPoints.frustumCulled = false;

  const flashGeometry = new BufferGeometry();
  flashGeometry.setAttribute(
    "position",
    new Float32BufferAttribute([VIIRS_ENTRY_X, RAW_Y[9], 0], 3),
  );
  flashGeometry.setAttribute("alpha", new Float32BufferAttribute([0], 1));
  flashGeometry.setAttribute("size", new Float32BufferAttribute([90], 1));
  const flashMaterial = emberMaterial.clone();
  const flash = new Points(flashGeometry, flashMaterial);
  flash.frustumCulled = false;

  scene.add(
    new Mesh(areaGeometry, areaMaterial),
    new Mesh(glowGeometry, glowMaterial),
    emberPoints,
    flash,
  );

  let seconds = reducedMotion.matches ? MORPH[1] + 1 : 0;
  const startTime = performance.now();
  let onScreen = true;
  let animationFrame = 0;
  let disposed = false;

  const render = () => {
    const now = (performance.now() - startTime) / 1000;
    const frame = reducedMotion.matches ? finalFrame : frameAt(seconds, now);
    onFrame(frame);
    if (!renderer) {
      return;
    }
    const ys = frame.ys;
    const glowPositions = glowGeometry.getAttribute("position");
    const areaPositions = areaGeometry.getAttribute("position");
    for (let index = 0; index < pointCount; index++) {
      const x = SERIES_X[index];
      glowPositions.setXYZ(index * 2, x, ys[index] - GLOW_HALF_WIDTH, 0);
      glowPositions.setXYZ(index * 2 + 1, x, ys[index] + GLOW_HALF_WIDTH, 0);
      areaPositions.setXYZ(index * 2, x, ys[index], 0);
      areaPositions.setXYZ(index * 2 + 1, x, BASELINE, 0);
    }
    glowPositions.needsUpdate = true;
    areaPositions.needsUpdate = true;
    const lineOpacity = frame.harmonizedOpacity * frame.visibility;
    glowMaterial.uniforms.opacity.value = lineOpacity * 0.8;
    areaMaterial.uniforms.opacity.value =
      lineOpacity * smooth(progressOf(seconds, MORPH));

    const emberPositions = emberGeometry.getAttribute("position");
    const emberAlphas = emberGeometry.getAttribute("alpha");
    const morphing = progressOf(seconds, MORPH);
    embers.forEach((ember, index) => {
      const cycle = (now * ember.speed + ember.phase) % 1;
      const lineY = interpolate(ys, ember.x);
      const lift = cycle * ember.rise * (0.4 + morphing);
      emberPositions.setXYZ(
        index,
        ember.x + Math.sin(cycle * Math.PI * 2 + ember.phase * 6) * ember.sway,
        lineY - lift,
        0,
      );
      emberAlphas.setX(
        index,
        Math.sin(cycle * Math.PI) * lineOpacity * (0.4 + 0.9 * morphing),
      );
    });
    emberPositions.needsUpdate = true;
    emberAlphas.needsUpdate = true;

    const crossing =
      RAW_DRAW[0] +
      ((VIIRS_ENTRY_X - SERIES_X[0]) / (SERIES_X.at(-1)! - SERIES_X[0])) *
        (RAW_DRAW[1] - RAW_DRAW[0]);
    const sinceCrossing = seconds - crossing;
    flashGeometry
      .getAttribute("alpha")
      .setX(
        0,
        sinceCrossing > 0 && !reducedMotion.matches
          ? Math.exp(-sinceCrossing * 2.2) * 0.9 * frame.visibility
          : 0,
      );
    flashGeometry.getAttribute("alpha").needsUpdate = true;

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
    if (renderer && width && height) {
      renderer.setSize(width, height, false);
      const scale = (width / VIEW_WIDTH) * renderer.getPixelRatio();
      emberMaterial.uniforms.scale.value = scale;
      flashMaterial.uniforms.scale.value = scale;
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

  const playback = reducedMotion.matches
    ? null
    : animate(0, LOOP_SECONDS, {
        duration: LOOP_SECONDS,
        ease: "linear",
        repeat: Infinity,
        onUpdate: (value) => {
          seconds = value;
        },
      });
  wake();

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    playback?.stop();
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    for (const disposable of [
      glowGeometry,
      glowMaterial,
      areaGeometry,
      areaMaterial,
      emberGeometry,
      emberMaterial,
      flashGeometry,
      flashMaterial,
    ]) {
      disposable.dispose();
    }
    renderer?.dispose();
  };
}

function frameAt(seconds: number, now: number): SeriesFrame {
  const morph = progressOf(seconds, MORPH);
  const lastIndex = SERIES_X.length - 1;
  const ys = SERIES_X.map((_, index) => {
    const local = smooth(
      Math.min(Math.max(morph * 1.5 - (index / lastIndex) * 0.5, 0), 1),
    );
    const breathe =
      morph >= 1 && now > 0 ? Math.sin(now * 1.6 + index * 0.7) * 0.8 : 0;
    return (
      RAW_Y[index] + (HARMONIZED_Y[index] - RAW_Y[index]) * local + breathe
    );
  });
  return {
    rawReveal: smooth(progressOf(seconds, RAW_DRAW)),
    rawOpacity: 1 - 0.45 * morph,
    markerReveal: smooth(progressOf(seconds, MARKER)),
    harmonizedOpacity: smooth(progressOf(seconds, HARMONIZED_IN)),
    ys,
    visibility: 1 - smooth(progressOf(seconds, FADE_OUT)),
  };
}

function stripGeometry(pointCount: number, sides: [number, number]) {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    "position",
    new Float32BufferAttribute(new Float32Array(pointCount * 6), 3),
  );
  geometry.setAttribute(
    "side",
    new Float32BufferAttribute(
      Array.from({ length: pointCount }, () => sides).flat(),
      1,
    ),
  );
  const indices: number[] = [];
  for (let index = 0; index < pointCount - 1; index++) {
    const a = index * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  geometry.setIndex(indices);
  return geometry;
}

export function interpolate(ys: number[], x: number): number {
  const segment = SERIES_X.findIndex((value) => value >= x);
  if (segment <= 0) {
    return ys[0];
  }
  const x0 = SERIES_X[segment - 1];
  const x1 = SERIES_X[segment];
  const t = (x - x0) / (x1 - x0);
  return ys[segment - 1] + (ys[segment] - ys[segment - 1]) * t;
}

function progressOf(seconds: number, [from, to]: readonly [number, number]) {
  return Math.min(Math.max((seconds - from) / (to - from), 0), 1);
}

function smooth(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function seeded(seed: number) {
  let state = (seed * 16807) % 2147483647;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}
