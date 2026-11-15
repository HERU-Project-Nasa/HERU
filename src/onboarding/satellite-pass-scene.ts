import { animate } from "motion/react";
import {
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from "three";
import { createAtmosphereMaterial } from "@/earth-globe/earth-materials";

const RADIANS_PER_DEGREE = Math.PI / 180;
const EARTH_RADIUS_KM = 6371;
const VIIRS_HALF_WIDTH = 1500 / EARTH_RADIUS_KM;
const MODIS_HALF_WIDTH = 1165 / EARTH_RADIUS_KM;
const MODIS_TRACK_OFFSET = 520 / EARTH_RADIUS_KM;
const SATELLITE_ALTITUDE = 1 + 824 / EARTH_RADIUS_KM;
const PASS_AREA = { latitude: 32.5, longitude: -83.5 };
const TRACK_HEADING_DEGREES = -12;
const RING_RADIUS = 380 / EARTH_RADIUS_KM;
const FIRE_COUNT = 90;

const CAMERA_FOV = 40;
const CAMERA_START = { distance: 3.6, behind: 0.04 };
const CAMERA_END = { distance: 1.55, behind: 0.34 };
const LOOK_AHEAD = 0.06;

const INTRO_SECONDS = 2.4;
const PASS_SECONDS = 9;
const SWEEP_SHARE = 0.6;
const FADE_START_SHARE = 0.88;
const SWEEP_FROM = -0.62;
const SWEEP_TO = 0.62;
const LABEL_ALONG = 0.3;
const MAX_PIXEL_RATIO = 1.75;
const EASE_CAMERA = [0.65, 0, 0.35, 1] as const;

export type SatellitePassLabels = { viirs: HTMLElement; modis: HTMLElement };

const SURFACE_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(mat3(modelMatrix) * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const SWATH_FUNCTIONS = `
uniform vec3 trackCenter;
uniform vec3 trackForward;
uniform vec3 trackNormal;
uniform float sweep;
uniform float visibility;

float alongTrack(vec3 p) {
  return atan(dot(p, trackForward), dot(p, trackCenter));
}

float acrossTrack(vec3 p) {
  return asin(clamp(dot(p, trackNormal), -1.0, 1.0));
}

float swept(float along) {
  return (1.0 - smoothstep(sweep - 0.012, sweep, along)) * visibility;
}
`;

const EARTH_FRAGMENT_SHADER = `
uniform sampler2D dayMap;
uniform vec3 lightDirection;
uniform vec3 ringCenter;
uniform float ringRadius;
uniform float viirsHalfWidth;
uniform float modisHalfWidth;
uniform float modisOffset;
uniform vec3 viirsColor;
uniform vec3 modisColor;
${SWATH_FUNCTIONS}

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

float band(float offset, float halfWidth) {
  float edge = fwidth(offset);
  return 1.0 - smoothstep(halfWidth - edge, halfWidth + edge, abs(offset));
}

float line(float offset, float halfWidth, float thickness) {
  float edge = fwidth(offset);
  return 1.0 - smoothstep(thickness * edge, (thickness + 1.0) * edge, abs(abs(offset) - halfWidth));
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 p = normalize(vPosition);
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float viewCosine = max(dot(normal, viewDirection), 0.0);

  vec3 day = texture2D(dayMap, vUv).rgb;
  float light = 0.55 + 0.6 * max(dot(normal, lightDirection), 0.0);
  vec3 color = day * light;

  float along = alongTrack(p);
  float across = acrossTrack(p);
  float shown = swept(along);
  float trail = exp(-max(sweep - along, 0.0) * 9.0);

  float viirsArea = band(across, viirsHalfWidth);
  float modisArea = band(across - modisOffset, modisHalfWidth);
  color = mix(color, vec3(0.86, 0.9, 1.0), shown * max(viirsArea, modisArea) * (0.2 + 0.18 * trail));

  float front = (1.0 - smoothstep(0.0, 0.01, abs(along - sweep))) * visibility;
  color = mix(color, vec3(1.0), front * max(viirsArea, modisArea) * 0.8);

  color = mix(color, viirsColor, shown * line(across, viirsHalfWidth, 0.8));
  color = mix(color, modisColor, shown * line(across - modisOffset, modisHalfWidth, 0.8));

  float ringDistance = acos(clamp(dot(p, ringCenter), -1.0, 1.0));
  float ringEdge = fwidth(ringDistance);
  float ring = 1.0 - smoothstep(1.4 * ringEdge, 2.6 * ringEdge, abs(ringDistance - ringRadius));
  color = mix(color, vec3(1.0), ring);

  float rim = pow(1.0 - viewCosine, 3.0);
  color = mix(color, vec3(0.3, 0.55, 1.0), rim * 0.55);

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const FIRE_VERTEX_SHADER = `
uniform float pixelRatio;
${SWATH_FUNCTIONS}
varying float vShown;

void main() {
  vec3 p = normalize(position);
  vShown = swept(alongTrack(p));
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 3.2 * pixelRatio * (1.6 / -viewPosition.z);
  gl_Position = projectionMatrix * viewPosition;
}
`;

const FIRE_FRAGMENT_SHADER = `
varying float vShown;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5);
  float alpha = (1.0 - smoothstep(0.3, 0.5, distanceFromCenter)) * vShown;
  if (alpha < 0.01) discard;
  vec3 color = mix(vec3(1.0, 0.85, 0.5), vec3(0.94, 0.24, 0.24), smoothstep(0.0, 0.35, distanceFromCenter));
  gl_FragColor = vec4(color, alpha);
  #include <colorspace_fragment>
}
`;

const SATELLITE_VERTEX_SHADER = `
uniform float pixelRatio;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = 26.0 * pixelRatio * (1.6 / -viewPosition.z);
  gl_Position = projectionMatrix * viewPosition;
}
`;

const SATELLITE_FRAGMENT_SHADER = `
uniform float visibility;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  float core = 1.0 - smoothstep(0.12, 0.2, distanceFromCenter);
  float glow = pow(max(1.0 - distanceFromCenter, 0.0), 2.5) * 0.7;
  float alpha = max(core, glow) * visibility;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(mix(vec3(0.43, 0.66, 1.0), vec3(1.0), core), alpha);
  #include <colorspace_fragment>
}
`;

export function startSatellitePass(
  container: HTMLElement,
  canvas: HTMLCanvasElement,
  labels: SatellitePassLabels,
  onReady: () => void,
): () => void {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return () => {};
  }
  const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  const center = surfacePoint(PASS_AREA.latitude, PASS_AREA.longitude);
  const north = new Vector3(0, 1, 0)
    .addScaledVector(center, -center.y)
    .normalize();
  const east = new Vector3().crossVectors(north, center).normalize();
  const heading = TRACK_HEADING_DEGREES * RADIANS_PER_DEGREE;
  const forward = north
    .clone()
    .multiplyScalar(Math.cos(heading))
    .addScaledVector(east, Math.sin(heading))
    .normalize();
  const trackNormal = new Vector3().crossVectors(forward, center).normalize();
  const lightDirection = trackPoint(center, forward, trackNormal, -0.5, 0)
    .add(new Vector3(0, 0.3, 0))
    .normalize();

  const swathUniforms = {
    trackCenter: { value: center },
    trackForward: { value: forward },
    trackNormal: { value: trackNormal },
    sweep: { value: SWEEP_FROM },
    visibility: { value: 0 },
  };

  const scene = new Scene();
  const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.01, 20);

  const earthGeometry = new SphereGeometry(1, 192, 96);
  const earthMaterial = new ShaderMaterial({
    uniforms: {
      ...swathUniforms,
      dayMap: { value: null },
      lightDirection: { value: lightDirection },
      ringCenter: { value: center },
      ringRadius: { value: RING_RADIUS },
      viirsHalfWidth: { value: VIIRS_HALF_WIDTH },
      modisHalfWidth: { value: MODIS_HALF_WIDTH },
      modisOffset: { value: MODIS_TRACK_OFFSET },
      viirsColor: { value: new Vector3(0.43, 0.66, 1.0) },
      modisColor: { value: new Vector3(1.0, 0.54, 0.24) },
    },
    vertexShader: SURFACE_VERTEX_SHADER,
    fragmentShader: EARTH_FRAGMENT_SHADER,
  });

  const atmosphereRadius = 1.06;
  const atmosphereGeometry = new SphereGeometry(atmosphereRadius, 128, 64);
  const atmosphereMaterial = createAtmosphereMaterial(
    atmosphereRadius,
    lightDirection,
  );

  const fireGeometry = new BufferGeometry();
  fireGeometry.setAttribute(
    "position",
    new Float32BufferAttribute(firePositions(), 3),
  );
  const fireMaterial = new ShaderMaterial({
    uniforms: { ...swathUniforms, pixelRatio: { value: pixelRatio } },
    vertexShader: FIRE_VERTEX_SHADER,
    fragmentShader: FIRE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });

  const satelliteGeometry = new BufferGeometry();
  const satellitePosition = new Float32BufferAttribute([0, 0, 0], 3);
  satelliteGeometry.setAttribute("position", satellitePosition);
  const satelliteMaterial = new ShaderMaterial({
    uniforms: {
      pixelRatio: { value: pixelRatio },
      visibility: swathUniforms.visibility,
    },
    vertexShader: SATELLITE_VERTEX_SHADER,
    fragmentShader: SATELLITE_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
  });
  const satellite = new Points(satelliteGeometry, satelliteMaterial);
  satellite.frustumCulled = false;

  scene.add(
    new Mesh(earthGeometry, earthMaterial),
    new Mesh(atmosphereGeometry, atmosphereMaterial),
    new Points(fireGeometry, fireMaterial),
    satellite,
  );

  const labelAnchors = {
    viirs: trackPoint(
      center,
      forward,
      trackNormal,
      LABEL_ALONG,
      -VIIRS_HALF_WIDTH,
    ),
    modis: trackPoint(
      center,
      forward,
      trackNormal,
      LABEL_ALONG,
      MODIS_TRACK_OFFSET + MODIS_HALF_WIDTH,
    ),
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const playbacks: { stop: () => void }[] = [];
  let intro = 0;
  let width = 0;
  let height = 0;
  let onScreen = true;
  let ready = false;
  let animationFrame = 0;
  let disposed = false;

  const placeCamera = () => {
    const distance =
      CAMERA_START.distance +
      (CAMERA_END.distance - CAMERA_START.distance) * intro;
    const behind =
      CAMERA_START.behind + (CAMERA_END.behind - CAMERA_START.behind) * intro;
    const position = trackPoint(center, forward, trackNormal, -behind, 0);
    camera.position.copy(position).multiplyScalar(distance);
    camera.up.copy(forward).lerp(position, intro).normalize();
    const target = trackPoint(center, forward, trackNormal, LOOK_AHEAD, 0);
    camera.lookAt(target.multiplyScalar(intro));
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const placeLabel = (element: HTMLElement, anchor: Vector3, along: number) => {
    const facing = anchor.dot(
      new Vector3().subVectors(camera.position, anchor),
    );
    const projected = anchor.clone().project(camera);
    const revealed = swathUniforms.sweep.value >= along ? 1 : 0;
    const opacity =
      facing > 0 ? revealed * swathUniforms.visibility.value * intro : 0;
    element.style.opacity = String(opacity);
    element.style.transform = `translate(${((projected.x + 1) / 2) * width}px, ${((1 - projected.y) / 2) * height}px) translate(-50%, -130%)`;
  };

  const render = () => {
    if (!ready || !width || !height) {
      return;
    }
    placeCamera();
    const satelliteSpot = trackPoint(
      center,
      forward,
      trackNormal,
      swathUniforms.sweep.value,
      0,
    ).multiplyScalar(SATELLITE_ALTITUDE);
    satellitePosition.setXYZ(
      0,
      satelliteSpot.x,
      satelliteSpot.y,
      satelliteSpot.z,
    );
    satellitePosition.needsUpdate = true;
    renderer.render(scene, camera);
    placeLabel(labels.viirs, labelAnchors.viirs, LABEL_ALONG);
    placeLabel(labels.modis, labelAnchors.modis, LABEL_ALONG);
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

  const setPass = (progress: number) => {
    const sweepProgress = Math.min(progress / SWEEP_SHARE, 1);
    swathUniforms.sweep.value =
      SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * sweepProgress;
    swathUniforms.visibility.value =
      progress < FADE_START_SHARE
        ? Math.min(progress / 0.04, 1)
        : 1 - (progress - FADE_START_SHARE) / (1 - FADE_START_SHARE);
  };

  const begin = () => {
    if (reducedMotion.matches) {
      intro = 1;
      setPass(SWEEP_SHARE);
      wake();
      return;
    }
    playbacks.push(
      animate(0, 1, {
        duration: INTRO_SECONDS,
        ease: EASE_CAMERA,
        onUpdate: (value) => {
          intro = value;
        },
      }),
      animate(0, 1, {
        duration: PASS_SECONDS,
        delay: INTRO_SECONDS * 0.7,
        ease: "linear",
        repeat: Infinity,
        onUpdate: setPass,
      }),
    );
    wake();
  };

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

  new TextureLoader()
    .loadAsync("/globe/earth-day.jpg")
    .then(async (texture) => {
      if (disposed) {
        texture.dispose();
        return;
      }
      texture.colorSpace = SRGBColorSpace;
      texture.anisotropy = Math.min(
        8,
        renderer.capabilities.getMaxAnisotropy(),
      );
      earthMaterial.uniforms.dayMap.value = texture;
      await renderer.compileAsync(scene, camera);
      if (!disposed) {
        ready = true;
        onReady();
        begin();
      }
    })
    .catch(() => {});

  return () => {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    for (const playback of playbacks) {
      playback.stop();
    }
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    earthMaterial.uniforms.dayMap.value?.dispose();
    for (const disposable of [
      earthGeometry,
      earthMaterial,
      atmosphereGeometry,
      atmosphereMaterial,
      fireGeometry,
      fireMaterial,
      satelliteGeometry,
      satelliteMaterial,
    ]) {
      disposable.dispose();
    }
    renderer.dispose();
  };
}

function surfacePoint(latitude: number, longitude: number): Vector3 {
  const phi = latitude * RADIANS_PER_DEGREE;
  const lambda = longitude * RADIANS_PER_DEGREE;
  return new Vector3(
    Math.cos(phi) * Math.cos(lambda),
    Math.sin(phi),
    -Math.cos(phi) * Math.sin(lambda),
  );
}

function trackPoint(
  center: Vector3,
  forward: Vector3,
  normal: Vector3,
  along: number,
  across: number,
): Vector3 {
  return center
    .clone()
    .multiplyScalar(Math.cos(along))
    .addScaledVector(forward, Math.sin(along))
    .multiplyScalar(Math.cos(across))
    .addScaledVector(normal, Math.sin(across))
    .normalize();
}

function firePositions(): number[] {
  let seed = 20120;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const positions: number[] = [];
  while (positions.length < FIRE_COUNT * 3) {
    const latitude = PASS_AREA.latitude + (random() - 0.5) * 6;
    const longitude = PASS_AREA.longitude + (random() - 0.5) * 6;
    const inside =
      ((latitude - PASS_AREA.latitude) / 2.6) ** 2 +
        ((longitude - PASS_AREA.longitude) / 2.6) ** 2 <
      1;
    if (inside) {
      const point = surfacePoint(latitude, longitude).multiplyScalar(1.002);
      positions.push(point.x, point.y, point.z);
    }
  }
  return positions;
}
