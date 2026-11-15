import { animate } from "motion/react";
import { HEAT_TOKENS } from "@/fire-calendar/calendar-cell-style";
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineDashedMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

export type CalendarBar = {
  row: number;
  month: number;
  count: number | null;
  heat: number;
  outOfPattern: boolean;
  inProgress: boolean;
  label: string;
  dimmed?: boolean;
};

export type CalendarLabels = {
  months: string[];
  years: string[];
  tooltip: HTMLElement;
};

const COLUMNS = 12;
const FOOTPRINT = 0.78;
const MIN_HEIGHT = 0.08;
const MAX_HEIGHT = 4.2;
const GROW_SECONDS = 0.9;
const ROW_DELAY = 0.06;
const MONTH_DELAY = 0.04;
const ENTRANCE_DELAY = 0.3;
const CAMERA_DISTANCE = 24.5;
const CAMERA_ELEVATION_DEGREES = 42;
const CAMERA_YAW_DEGREES = -8;
const SWAY_DEGREES = 6;
const SWAY_SECONDS = 14;
const PULSE_SECONDS = 2;
const MAX_PIXEL_RATIO = 2;
const RADIANS_PER_DEGREE = Math.PI / 180;
const CAMERA_DAMPING = 10;
const LABEL_PIXELS_PER_UNIT = 105;

export function startCalendarBars(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  bars: CalendarBar[],
  labels: CalendarLabels,
): () => void {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.setClearColor(0x000000, 0);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const rows = Math.max(...bars.map((bar) => bar.row)) + 1;
  const heatColors = readHeatColors();
  const dimTarget = readToken("--color-surface", "#121215");
  const positiveCounts = bars
    .map((bar) => bar.count ?? 0)
    .filter((count) => count > 0);
  const logCeiling = Math.log10(Math.max(10, ...positiveCounts));
  const logFloor = Math.min(
    logCeiling - 1,
    Math.log10(Math.max(1, Math.min(...positiveCounts, 10 ** logCeiling))) -
      0.3,
  );
  const yearsAlongX =
    rows > COLUMNS && container.clientWidth > container.clientHeight;
  const boardWidth = yearsAlongX ? rows : COLUMNS;
  const boardDepth = yearsAlongX ? COLUMNS : rows;
  const cameraDistance =
    CAMERA_DISTANCE *
    Math.max(1, (boardDepth * 0.62 + boardWidth * 0.5) / 13.44) *
    (yearsAlongX ? 1.12 : 1);
  const colorOf = (bar: CalendarBar, target: Color) => {
    target.copy(heatColors[bar.heat]);
    return bar.dimmed ? target.lerp(dimTarget, 0.78) : target;
  };
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  const board = new Group();
  scene.add(board);

  scene.add(new AmbientLight(0xffffff, 1.3));
  const sun = new DirectionalLight(0xffffff, 2.2);
  sun.position.set(-6, 14, 10);
  scene.add(sun);
  const rim = new DirectionalLight(0x6ea8ff, 0.5);
  rim.position.set(8, 6, -10);
  scene.add(rim);

  const positionOf = (bar: { row: number; month: number }) =>
    new Vector3(
      (yearsAlongX ? bar.row : bar.month) - (boardWidth - 1) / 2,
      0,
      (yearsAlongX ? bar.month : bar.row) - (boardDepth - 1) / 2,
    );

  const groundGeometry = new PlaneGeometry(boardWidth + 1.2, boardDepth + 1.2);
  const groundMaterial = new MeshStandardMaterial({
    color: readToken("--color-surface-raised", "#252525"),
    roughness: 0.95,
  });
  const ground = new Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  board.add(ground);

  const labelColor = readToken("--color-ink-muted", "#a8a8ae");
  const labelFont = getComputedStyle(container).fontFamily;
  const monthTexts = labels.months.map((text) => text.toUpperCase());
  const frontTexts = yearsAlongX
    ? labels.years.map((year) => `'${year.slice(-2)}`)
    : monthTexts;
  const sideTexts = yearsAlongX ? monthTexts : labels.years;
  const textLabels = [
    ...frontTexts.map((text, index) => ({
      text,
      align: "center" as const,
      position: new Vector3(
        index - (boardWidth - 1) / 2,
        0.01,
        (boardDepth - 1) / 2 + 1.05,
      ),
    })),
    ...sideTexts.map((text, index) => ({
      text,
      align: "right" as const,
      position: new Vector3(
        -(boardWidth - 1) / 2 - (yearsAlongX ? 0.95 : 0.65),
        0.01,
        index - (boardDepth - 1) / 2,
      ),
    })),
  ].map(({ text, align, position }) => {
    const label = createTextLabel(text, labelFont, labelColor);
    const place = () => {
      label.mesh.position.copy(position);
      if (align === "right") {
        label.mesh.position.x -= label.width() / 2;
      }
    };
    place();
    board.add(label.mesh);
    return {
      redraw: () => {
        label.redraw();
        place();
      },
      dispose: label.dispose,
    };
  });
  document.fonts?.ready.then(() => {
    if (!disposed) {
      for (const label of textLabels) {
        label.redraw();
      }
      wake();
    }
  });

  const barGeometry = new BoxGeometry(FOOTPRINT, 1, FOOTPRINT);
  barGeometry.translate(0, 0.5, 0);
  const solidBars = bars.filter((bar) => bar.count !== null && !bar.inProgress);
  const barMaterial = new MeshStandardMaterial({
    roughness: 0.55,
    metalness: 0.05,
  });
  const instanced = new InstancedMesh(
    barGeometry,
    barMaterial,
    solidBars.length,
  );
  solidBars.forEach((bar, index) => {
    instanced.setColorAt(index, colorOf(bar, new Color()));
  });
  board.add(instanced);

  const stripeTexture = createStripeTexture();
  const partials = bars
    .filter((bar) => bar.inProgress && bar.count !== null)
    .map((bar) => {
      const material = new MeshStandardMaterial({
        color: colorOf(bar, new Color()),
        map: stripeTexture,
        roughness: 0.6,
      });
      const mesh = new Mesh(barGeometry, material);
      mesh.position.copy(positionOf(bar));
      board.add(mesh);
      return { bar, mesh, material };
    });

  const edgesGeometry = new EdgesGeometry(barGeometry);
  const outlierMaterial = new LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
  });
  const outliers = solidBars
    .map((bar, index) => ({ bar, index }))
    .filter(({ bar }) => bar.outOfPattern)
    .map(({ bar, index }) => {
      const lines = new LineSegments(edgesGeometry, outlierMaterial);
      lines.position.copy(positionOf(bar));
      lines.scale.set(1.04, 1, 1.04);
      board.add(lines);
      return { bar, index, lines };
    });

  const emptyMaterial = new LineDashedMaterial({
    color: readToken("--color-line-strong", "#7c7c84"),
    dashSize: 0.12,
    gapSize: 0.1,
  });
  const emptyOutlines = bars
    .filter((bar) => bar.count === null)
    .map((bar) => {
      const outline = new LineSegments(
        new EdgesGeometry(new PlaneGeometry(FOOTPRINT, FOOTPRINT)),
        emptyMaterial,
      );
      outline.computeLineDistances();
      outline.rotation.x = -Math.PI / 2;
      outline.position.copy(positionOf(bar)).setY(0.01);
      board.add(outline);
      return outline;
    });

  const targetHeight = (bar: CalendarBar) => {
    if (bar.count === null || bar.count <= 0) {
      return MIN_HEIGHT;
    }
    const t = Math.min(
      Math.max((Math.log10(bar.count) - logFloor) / (logCeiling - logFloor), 0),
      1,
    );
    return MIN_HEIGHT + t ** 1.35 * (MAX_HEIGHT - MIN_HEIGHT);
  };
  const delayOf = (bar: CalendarBar) =>
    ENTRANCE_DELAY + bar.row * ROW_DELAY + bar.month * MONTH_DELAY;

  const matrix = new Matrix4();
  const highlight = new Color();
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  let hovered = -1;
  let seconds = reducedMotion.matches ? 60 : 0;
  let yaw = CAMERA_YAW_DEGREES;
  let elevation = CAMERA_ELEVATION_DEGREES;
  let userYaw = 0;
  let userElevation = 0;
  let smoothYaw = 0;
  let smoothElevation = 0;
  let lastFrame = performance.now();
  let dragging: { x: number; y: number } | null = null;
  let interacted = false;
  let width = 0;
  let height = 0;
  let onScreen = true;
  let animationFrame = 0;
  let disposed = false;

  const grow = (bar: CalendarBar) => {
    const t = Math.min(Math.max((seconds - delayOf(bar)) / GROW_SECONDS, 0), 1);
    return 1 - (1 - t) ** 3;
  };

  const placeCamera = () => {
    const sway =
      reducedMotion.matches || interacted
        ? 0
        : Math.sin((seconds / SWAY_SECONDS) * Math.PI * 2) * SWAY_DEGREES;
    const now = performance.now();
    const step = 1 - Math.exp(-((now - lastFrame) / 1000) * CAMERA_DAMPING);
    lastFrame = now;
    smoothYaw += (userYaw - smoothYaw) * step;
    smoothElevation += (userElevation - smoothElevation) * step;
    yaw = CAMERA_YAW_DEGREES + sway + smoothYaw;
    elevation = Math.min(
      Math.max(CAMERA_ELEVATION_DEGREES + smoothElevation, 12),
      70,
    );
    const yawRadians = yaw * RADIANS_PER_DEGREE;
    const elevationRadians = elevation * RADIANS_PER_DEGREE;
    camera.position.set(
      Math.sin(yawRadians) * Math.cos(elevationRadians) * cameraDistance,
      Math.sin(elevationRadians) * cameraDistance,
      Math.cos(yawRadians) * Math.cos(elevationRadians) * cameraDistance,
    );
    camera.lookAt(yearsAlongX ? -0.8 : 0, 0.7, 0.4);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const render = () => {
    if (!width || !height) {
      return;
    }
    placeCamera();
    const pulse = (seconds % PULSE_SECONDS) / PULSE_SECONDS;
    solidBars.forEach((bar, index) => {
      const position = positionOf(bar);
      matrix.makeScale(1, Math.max(targetHeight(bar) * grow(bar), 0.001), 1);
      matrix.setPosition(position);
      instanced.setMatrixAt(index, matrix);
      colorOf(bar, highlight);
      if (index === hovered) {
        highlight.lerp(new Color(0xffffff), 0.35);
      }
      instanced.setColorAt(index, highlight);
    });
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) {
      instanced.instanceColor.needsUpdate = true;
    }
    for (const { bar, mesh } of partials) {
      mesh.scale.y = Math.max(targetHeight(bar) * grow(bar), 0.001);
    }
    for (const { bar, lines } of outliers) {
      lines.scale.y = Math.max(targetHeight(bar) * grow(bar), 0.001) * 1.02;
      lines.visible = grow(bar) > 0;
    }
    outlierMaterial.opacity = reducedMotion.matches
      ? 1
      : 0.45 + 0.55 * (1 - pulse) ** 2;
    for (const outline of emptyOutlines) {
      outline.visible = seconds > ENTRANCE_DELAY;
    }

    renderer.render(scene, camera);
  };

  const tick = () => {
    animationFrame = 0;
    if (disposed) {
      return;
    }
    render();
    const settling =
      Math.abs(userYaw - smoothYaw) +
        Math.abs(userElevation - smoothElevation) >
      0.01;
    if (onScreen && (!reducedMotion.matches || settling)) {
      animationFrame = requestAnimationFrame(tick);
    }
  };

  const wake = () => {
    if (!disposed) {
      animationFrame ||= requestAnimationFrame(tick);
    }
  };

  const updateHover = (event: PointerEvent) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(instanced)[0];
    hovered = hit?.instanceId ?? -1;
    const bar = solidBars[hovered];
    if (bar) {
      labels.tooltip.textContent = bar.label;
      labels.tooltip.style.opacity = "1";
      labels.tooltip.style.transform = `translate(${event.clientX - bounds.left}px, ${event.clientY - bounds.top - 14}px) translate(-50%, -100%)`;
    } else {
      labels.tooltip.style.opacity = "0";
    }
    canvas.style.cursor = dragging ? "grabbing" : bar ? "pointer" : "grab";
    wake();
  };

  const onPointerDown = (event: PointerEvent) => {
    dragging = { x: event.clientX, y: event.clientY };
    interacted = true;
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (dragging) {
      userYaw = Math.min(
        Math.max(userYaw - (event.clientX - dragging.x) * 0.25, -50),
        50,
      );
      userElevation -= (event.clientY - dragging.y) * 0.2;
      userElevation = Math.min(Math.max(userElevation, -22), 36);
      dragging = { x: event.clientX, y: event.clientY };
    }
    updateHover(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    dragging = null;
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    updateHover(event);
  };
  const onPointerLeave = () => {
    hovered = -1;
    labels.tooltip.style.opacity = "0";
    wake();
  };
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);

  const resize = () => {
    width = container.clientWidth;
    height = container.clientHeight;
    if (width && height) {
      renderer.setSize(width, height, false);
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
    : animate(0, 3600, {
        duration: 3600,
        ease: "linear",
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
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    for (const outline of emptyOutlines) {
      outline.geometry.dispose();
    }
    for (const label of textLabels) {
      label.dispose();
    }
    for (const { material } of partials) {
      material.dispose();
    }
    for (const disposable of [
      groundGeometry,
      groundMaterial,
      barGeometry,
      barMaterial,
      stripeTexture,
      edgesGeometry,
      outlierMaterial,
      emptyMaterial,
    ]) {
      disposable.dispose();
    }
    instanced.dispose();
    renderer.dispose();
  };
}

function readToken(name: string, fallback: string): Color {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return new Color(value || fallback);
}

function readHeatColors(): Color[] {
  const fallbacks = [
    "#1f1f24",
    "#5c1c1f",
    "#962326",
    "#f03d3d",
    "#ff8a3d",
    "#ffce52",
    "#fff1c7",
  ];
  const colors = fallbacks.map((fallback, level) =>
    readToken(`--color-heat-${level}`, fallback),
  );
  return [
    colors[0],
    ...HEAT_TOKENS.map((token) => colors[Number(token.slice(-1))]),
  ];
}

function createStripeTexture(): CanvasTexture {
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "rgba(10, 10, 11, 0.55)";
  context.lineWidth = 6;
  for (let offset = -size; offset <= size * 2; offset += 14) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset - size, size);
    context.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.repeat.set(1, 4);
  return texture;
}

function createTextLabel(text: string, font: string, color: Color) {
  const canvas = document.createElement("canvas");
  const fontSize = 40;
  const height = 64;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  const material = new MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const geometry = new PlaneGeometry(1, 1);
  const mesh = new Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  let width = 1;

  const redraw = () => {
    const context = canvas.getContext("2d")!;
    const letterSpacing = fontSize * 0.08;
    context.font = `600 ${fontSize}px ${font}`;
    const measured =
      context.measureText(text).width + letterSpacing * text.length;
    canvas.width = Math.ceil(measured + 8);
    canvas.height = height;
    context.font = `600 ${fontSize}px ${font}`;
    context.letterSpacing = `${letterSpacing}px`;
    context.fillStyle = `#${color.getHexString()}`;
    context.textBaseline = "middle";
    context.textAlign = "center";
    context.fillText(text, canvas.width / 2, height / 2);
    texture.needsUpdate = true;
    width = canvas.width / LABEL_PIXELS_PER_UNIT;
    mesh.scale.set(width, height / LABEL_PIXELS_PER_UNIT, 1);
  };
  redraw();

  return {
    mesh,
    width: () => width,
    redraw,
    dispose: () => {
      texture.dispose();
      material.dispose();
      geometry.dispose();
    },
  };
}
