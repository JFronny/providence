/**
 * 3D CSS dice shape builders.
 *
 * Polyhedral faces are generated from exact vertex meshes. Each face gets a
 * matrix3d transform that maps its local 2D polygon onto the corresponding
 * plane in 3D, so adjacent edges meet instead of relying on hand-tuned tilts.
 */
import "src/scenes/dice/dice-shapes.css";
import { POLYHEDRA, type Polyhedron, type Vec3 } from "src/scenes/dice/dice-polyhedra.generated";

type FaceGeometry = {
  vertices: Vec3[];
  normal: Vec3;
  xAxis: Vec3;
  yAxis: Vec3;
};

const EPSILON = 1e-6;

function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function scale(v: Vec3, factor: number): Vec3 {
  return [v[0] * factor, v[1] * factor, v[2] * factor];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function length(v: Vec3): number {
  return Math.sqrt(dot(v, v));
}

function normalize(v: Vec3): Vec3 {
  return scale(v, 1 / length(v));
}

function average(points: Vec3[]): Vec3 {
  return scale(points.reduce(add, [0, 0, 0] as Vec3), 1 / points.length);
}

function formatNumber(value: number): string {
  const rounded = Math.abs(value) < 1e-10 ? 0 : value;
  return rounded.toFixed(8).replace(/\.?0+$/, "");
}

function geometryForFace(polyhedron: Polyhedron, indices: number[]): FaceGeometry {
  const vertices = indices.map((index) => polyhedron.vertices[index]);
  const centre = average(vertices);
  let normal = normalize(cross(subtract(vertices[1], vertices[0]), subtract(vertices[2], vertices[0])));
  if (dot(normal, centre) < 0) normal = scale(normal, -1);

  const screenDown: Vec3 = [0, 1, 0];
  let yAxis = subtract(screenDown, scale(normal, dot(screenDown, normal)));
  if (length(yAxis) < EPSILON) {
    const fallback: Vec3 = [0, 0, -1];
    yAxis = subtract(fallback, scale(normal, dot(fallback, normal)));
  }
  yAxis = normalize(yAxis);
  const xAxis = normalize(cross(yAxis, normal));

  return { vertices, normal, xAxis, yAxis };
}

function faceMatrix(geometry: FaceGeometry): {
  transform: string;
  clipPath: string;
  width: number;
  height: number;
  labelX: number;
  labelY: number;
} {
  const { vertices, normal, xAxis, yAxis } = geometry;
  const projected = vertices.map((vertex) => [dot(vertex, xAxis), dot(vertex, yAxis)] as const);
  const minX = Math.min(...projected.map(([x]) => x));
  const maxX = Math.max(...projected.map(([x]) => x));
  const minY = Math.min(...projected.map(([, y]) => y));
  const maxY = Math.max(...projected.map(([, y]) => y));
  const width = maxX - minX;
  const height = maxY - minY;
  const planeOffset = dot(normal, vertices[0]);
  const origin = add(add(scale(xAxis, minX), scale(yAxis, minY)), scale(normal, planeOffset));
  const localCentre = average(vertices);
  const labelX = dot(localCentre, xAxis) - minX;
  const labelY = dot(localCentre, yAxis) - minY;

  const transform = `matrix3d(${[
    xAxis[0],
    xAxis[1],
    xAxis[2],
    0,
    yAxis[0],
    yAxis[1],
    yAxis[2],
    0,
    normal[0],
    normal[1],
    normal[2],
    0,
    origin[0],
    origin[1],
    origin[2],
    1,
  ]
    .map(formatNumber)
    .join(",")})`;
  const clipPath = `polygon(${projected
    .map(([x, y]) => `${formatNumber(((x - minX) / width) * 100)}% ${formatNumber(((y - minY) / height) * 100)}%`)
    .join(",")})`;

  return { transform, clipPath, width, height, labelX, labelY };
}

function landingMatrix(geometry: FaceGeometry): string {
  const { xAxis, yAxis, normal } = geometry;
  return `matrix3d(${[
    xAxis[0],
    yAxis[0],
    normal[0],
    0,
    xAxis[1],
    yAxis[1],
    normal[1],
    0,
    xAxis[2],
    yAxis[2],
    normal[2],
    0,
    0,
    0,
    0,
    1,
  ]
    .map(formatNumber)
    .join(",")})`;
}

function polyFace(dieClass: keyof typeof POLYHEDRA, geometry: FaceGeometry, color: string, label: string): HTMLElement {
  const matrix = faceMatrix(geometry);
  const element = document.createElement("div");
  element.className = `die-face-poly die-face-${dieClass}`;
  element.style.width = `${matrix.width}px`;
  element.style.height = `${matrix.height}px`;
  element.style.clipPath = matrix.clipPath;
  element.style.transform = matrix.transform;
  element.style.backgroundColor = color;

  const value = document.createElement("span");
  value.className = "die-face-value";
  value.textContent = label;
  value.style.left = `${matrix.labelX}px`;
  value.style.top = `${matrix.labelY}px`;
  element.appendChild(value);
  return element;
}

function wrap(containerClass: string, innerClass: string, finalTransform: string, faces: HTMLElement[]): HTMLElement {
  const inner = document.createElement("div");
  inner.className = `die-inner ${innerClass}`;
  inner.dataset.final = finalTransform;
  for (const face of faces) inner.appendChild(face);

  const container = document.createElement("div");
  container.className = `die-container ${containerClass}`;
  container.appendChild(inner);
  return container;
}

function extraSpin() {
  return {
    rx: (Math.floor(Math.random() * 3) + 2) * 360,
    ry: (Math.floor(Math.random() * 3) + 2) * 360,
  };
}

const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [25, 25],
    [75, 75],
  ],
  3: [
    [25, 25],
    [50, 50],
    [75, 75],
  ],
  4: [
    [25, 25],
    [75, 25],
    [25, 75],
    [75, 75],
  ],
  5: [
    [25, 25],
    [75, 25],
    [50, 50],
    [25, 75],
    [75, 75],
  ],
  6: [
    [25, 25],
    [75, 25],
    [25, 50],
    [75, 50],
    [25, 75],
    [75, 75],
  ],
};

const D6_ROTATIONS: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(-90deg)",
  6: "rotateX(180deg) rotateY(0deg)",
};

export function createD6(value: number): HTMLElement {
  const size = 80;
  const half = size / 2;
  const faceTransforms: Record<number, string> = {
    1: `rotateY(0deg) translateZ(${half}px)`,
    2: `rotateY(-90deg) translateZ(${half}px)`,
    3: `rotateX(90deg) translateZ(${half}px)`,
    4: `rotateX(-90deg) translateZ(${half}px)`,
    5: `rotateY(90deg) translateZ(${half}px)`,
    6: `rotateY(180deg) translateZ(${half}px)`,
  };

  const faces: HTMLElement[] = [];
  for (let number = 1; number <= 6; number++) {
    const element = document.createElement("div");
    element.className = "die-face die-face-d6";
    element.style.transform = faceTransforms[number];
    for (const [x, y] of PIP_LAYOUTS[number]) {
      const pip = document.createElement("span");
      pip.className = "die-pip";
      pip.style.left = `${x}%`;
      pip.style.top = `${y}%`;
      element.appendChild(pip);
    }
    faces.push(element);
  }

  const { rx, ry } = extraSpin();
  return wrap("die-container-d6", "die-inner-d6", `rotateX(${rx}deg) rotateY(${ry}deg) ${D6_ROTATIONS[value]}`, faces);
}

export function createCoin(value: number): HTMLElement {
  const label = value === 1 ? "H" : "T";
  const backLabel = value === 1 ? "T" : "H";
  const extraY = (Math.floor(Math.random() * 4) + 3) * 360;
  const finalY = value === 1 ? 0 : 180;

  const front = document.createElement("div");
  front.className = "die-face die-face-coin-front";
  front.textContent = label;

  const back = document.createElement("div");
  back.className = "die-face die-face-coin-back";
  back.textContent = backLabel;

  return wrap("die-container-coin", "die-inner-coin", `rotateY(${extraY + finalY}deg)`, [front, back]);
}

function createPolyhedron(dieClass: keyof typeof POLYHEDRA, value: number, color: string): HTMLElement {
  const polyhedron = POLYHEDRA[dieClass];
  const geometries = polyhedron.faces.map((indices) => geometryForFace(polyhedron, indices));
  const faces = geometries.map((geometry, index) => polyFace(dieClass, geometry, color, String(index + 1)));
  const { rx, ry } = extraSpin();
  const final = `rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(0deg) ${landingMatrix(geometries[value - 1])}`;
  return wrap(`die-container-${dieClass}`, `die-inner-${dieClass}`, final, faces);
}

export function createD4(value: number, color: string): HTMLElement {
  return createPolyhedron("d4", value, color);
}

export function createD8(value: number, color: string): HTMLElement {
  return createPolyhedron("d8", value, color);
}

export function createD10(value: number, color: string): HTMLElement {
  return createPolyhedron("d10", value, color);
}

export function createD12(value: number, color: string): HTMLElement {
  return createPolyhedron("d12", value, color);
}

export function createD20(value: number, color: string): HTMLElement {
  return createPolyhedron("d20", value, color);
}
