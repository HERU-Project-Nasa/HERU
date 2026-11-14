import { BackSide, Color, ShaderMaterial, type Texture, Vector3 } from "three";

export type EarthTextures = { day: Texture; night: Texture; water: Texture };

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

const EARTH_FRAGMENT_SHADER = `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform sampler2D waterMap;
uniform vec3 sunDirection;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float sunCosine = dot(normal, sunDirection);
  float viewCosine = max(dot(normal, viewDirection), 0.0);

  vec3 day = texture2D(dayMap, vUv).rgb;
  vec3 night = texture2D(nightMap, vUv).rgb;
  float water = texture2D(waterMap, vUv).r;

  float sunlight = max(sunCosine, 0.0);
  vec3 dayColor = day * pow(sunlight, 0.85) * 1.2;

  vec3 halfway = normalize(sunDirection + viewDirection);
  float halfwayCosine = max(dot(normal, halfway), 0.0);
  float glint = pow(halfwayCosine, 400.0) * 0.6 + pow(halfwayCosine, 40.0) * 0.03;
  dayColor += vec3(1.0, 0.93, 0.82) * glint * water * smoothstep(0.0, 0.25, sunCosine);

  float cityLights = clamp(night.r - 0.6 * night.b, 0.0, 1.0);
  vec3 nightColor = night * vec3(1.05, 1.1, 1.2) + vec3(1.0, 0.72, 0.38) * cityLights * 1.6;
  float darkness = 1.0 - smoothstep(-0.18, 0.06, sunCosine);

  vec3 color = dayColor + nightColor * darkness;

  float rim = pow(1.0 - viewCosine, 4.0);
  float sunlitRim = smoothstep(-0.25, 0.5, sunCosine);
  vec3 sky = vec3(0.3, 0.55, 1.0);
  color = mix(color, sky * (0.25 + 0.7 * sunlitRim), rim * (0.4 + 0.3 * sunlitRim));

  float twilight = smoothstep(-0.2, 0.0, sunCosine) * (1.0 - smoothstep(0.0, 0.25, sunCosine));
  color += vec3(0.9, 0.4, 0.15) * twilight * rim * 0.25;

  gl_FragColor = vec4(color, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const ATMOSPHERE_FRAGMENT_SHADER = `
uniform vec3 sunDirection;
uniform vec3 glowColor;
uniform float limbCosine;

varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 viewDirection = normalize(cameraPosition - vPosition);
  float edge = clamp(-dot(normalize(vNormal), viewDirection) / limbCosine, 0.0, 1.0);

  vec3 viewAxis = normalize(cameraPosition);
  vec3 outward = normalize(vPosition);
  vec3 limb = normalize(outward - dot(outward, viewAxis) * viewAxis);
  float sunlit = smoothstep(-0.35, 0.45, dot(limb, sunDirection));

  float glow = pow(edge, 2.6) * mix(0.7, 1.0, sunlit);
  vec3 color = mix(glowColor, vec3(0.62, 0.8, 1.0), pow(edge, 8.0) * 0.7);

  gl_FragColor = vec4(color, glow);
  #include <colorspace_fragment>
}
`;

export function createEarthMaterial(
  textures: EarthTextures,
  sunDirection: Vector3,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      dayMap: { value: textures.day },
      nightMap: { value: textures.night },
      waterMap: { value: textures.water },
      sunDirection: { value: sunDirection },
    },
    vertexShader: SURFACE_VERTEX_SHADER,
    fragmentShader: EARTH_FRAGMENT_SHADER,
  });
}

export function createAtmosphereMaterial(
  atmosphereRadius: number,
  sunDirection: Vector3,
): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection },
      glowColor: { value: new Color("#1b69d2") },
      limbCosine: {
        value: Math.sqrt(1 - 1 / (atmosphereRadius * atmosphereRadius)),
      },
    },
    vertexShader: SURFACE_VERTEX_SHADER,
    fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
    side: BackSide,
    transparent: true,
    depthWrite: false,
  });
}
