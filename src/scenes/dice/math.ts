export const EPSILON = 1e-6;

export type Vec3 = readonly [number, number, number];

export type Polyhedron = {
  vertices: Vec3[];
  faces: number[][];
};

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function subtract(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function scale(vector: Vec3, factor: number): Vec3 {
  return [vector[0] * factor, vector[1] * factor, vector[2] * factor];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function length(vector: Vec3): number {
  return Math.sqrt(dot(vector, vector));
}

export function normalize(vector: Vec3): Vec3 {
  return scale(vector, 1 / length(vector));
}

export function average(points: Vec3[]): Vec3 {
  return scale(points.reduce(add, [0, 0, 0]), 1 / points.length);
}
