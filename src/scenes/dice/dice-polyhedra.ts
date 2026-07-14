import {
  average,
  cross,
  dot,
  EPSILON,
  normalize,
  scale,
  subtract,
  type Vec3,
  length,
  type Polyhedron,
} from "src/scenes/dice/math.ts";

const POLY_RADIUS = 40;
const D10_HEIGHT_SCALE = 1.2;

export type PolyhedronDie = "d4" | "d8" | "d10" | "d12" | "d20";

function convexFaces(vertices: Vec3[]): number[][] {
  const faceMap: Map<
    string,
    {
      indices: number[];
      normal: Vec3;
    }
  > = new Map();

  for (let i = 0; i < vertices.length - 2; i++) {
    for (let j = i + 1; j < vertices.length - 1; j++) {
      for (let k = j + 1; k < vertices.length; k++) {
        let normal = cross(subtract(vertices[j], vertices[i]), subtract(vertices[k], vertices[i]));
        if (length(normal) < EPSILON) continue;
        normal = normalize(normal);

        const planeOffset = dot(normal, vertices[i]);
        const distances = vertices.map((vertex) => dot(normal, vertex) - planeOffset);
        const allBelow = distances.every((distance) => distance <= EPSILON);
        const allAbove = distances.every((distance) => distance >= -EPSILON);
        if (!allBelow && !allAbove) continue;

        if (planeOffset < 0) normal = scale(normal, -1);
        const outwardOffset = Math.abs(planeOffset);
        const indices = vertices
          .map((vertex, index) => (Math.abs(dot(normal, vertex) - outwardOffset) < EPSILON ? index : -1))
          .filter((index) => index >= 0);
        const key = [...indices].sort((a, b) => a - b).join(",");
        if (!faceMap.has(key)) faceMap.set(key, { indices, normal });
      }
    }
  }

  return [...faceMap.values()].map(({ indices, normal }) => {
    const centre = average(indices.map((index) => vertices[index]));
    const xAxis = normalize(subtract(vertices[indices[0]], centre));
    const yAxis = cross(normal, xAxis);
    const ordered = [...indices].sort((a, b) => {
      const aOffset = subtract(vertices[a], centre);
      const bOffset = subtract(vertices[b], centre);
      const aAngle = Math.atan2(dot(aOffset, yAxis), dot(aOffset, xAxis));
      const bAngle = Math.atan2(dot(bOffset, yAxis), dot(bOffset, xAxis));
      return aAngle - bAngle;
    });

    const orderedNormal = cross(
      subtract(vertices[ordered[1]], vertices[ordered[0]]),
      subtract(vertices[ordered[2]], vertices[ordered[0]]),
    );
    return dot(orderedNormal, normal) < 0 ? ordered.reverse() : ordered;
  });
}

function scaledPolyhedron(vertices: Vec3[]): Polyhedron {
  const radius = Math.max(...vertices.map(length));
  const scaledVertices = vertices.map((vertex) => scale(vertex, POLY_RADIUS / radius));
  return { vertices: scaledVertices, faces: convexFaces(scaledVertices) };
}

function dualVertices(polyhedron: Polyhedron): Vec3[] {
  return polyhedron.faces.map((indices) => {
    const points = indices.map((index) => polyhedron.vertices[index]);
    const normal = normalize(cross(subtract(points[1], points[0]), subtract(points[2], points[0])));
    const outward = dot(normal, average(points)) < 0 ? scale(normal, -1) : normal;
    return scale(outward, 1 / dot(outward, points[0]));
  });
}

function makeTetrahedron(): Polyhedron {
  return scaledPolyhedron([
    [1, 1, 1],
    [-1, -1, 1],
    [-1, 1, -1],
    [1, -1, -1],
  ]);
}

function makeOctahedron(): Polyhedron {
  return scaledPolyhedron([
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ]);
}

function makeIcosahedron(): Polyhedron {
  const phi = (1 + Math.sqrt(5)) / 2;
  return scaledPolyhedron([
    [0, 1, phi],
    [0, -1, phi],
    [0, 1, -phi],
    [0, -1, -phi],
    [1, phi, 0],
    [-1, phi, 0],
    [1, -phi, 0],
    [-1, -phi, 0],
    [phi, 0, 1],
    [phi, 0, -1],
    [-phi, 0, 1],
    [-phi, 0, -1],
  ]);
}

function makeDodecahedron(): Polyhedron {
  return scaledPolyhedron(dualVertices(makeIcosahedron()));
}

function makePentagonalTrapezohedron(): Polyhedron {
  const sides = 5;
  const radius = 1;
  const halfHeight =
    radius * D10_HEIGHT_SCALE * Math.sqrt(Math.sin(Math.PI / sides) ** 2 - Math.sin(Math.PI / (2 * sides)) ** 2);
  const antiprismVertices: Vec3[] = [];

  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides;
    antiprismVertices.push([radius * Math.cos(angle), radius * Math.sin(angle), halfHeight]);
  }
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides + Math.PI / sides;
    antiprismVertices.push([radius * Math.cos(angle), radius * Math.sin(angle), -halfHeight]);
  }

  const antiprism = {
    vertices: antiprismVertices,
    faces: convexFaces(antiprismVertices),
  };
  return scaledPolyhedron(dualVertices(antiprism));
}

function cleanNumber(value: number): number {
  const rounded = Math.abs(value) < 1e-12 ? 0 : Number(value.toFixed(10));
  return Object.is(rounded, -0) ? 0 : rounded;
}

function cleanVertex(value: Vec3): Vec3 {
  return [cleanNumber(value[0]), cleanNumber(value[1]), cleanNumber(value[2])];
}

function cleanPolyhedron(polyhedron: Polyhedron): Polyhedron {
  return {
    vertices: polyhedron.vertices.map(cleanVertex),
    faces: polyhedron.faces,
  };
}

function generatePolyhedra(): Record<PolyhedronDie, Polyhedron> {
  const polyhedra: Record<PolyhedronDie, Polyhedron> = {
    d4: cleanPolyhedron(makeTetrahedron()),
    d8: cleanPolyhedron(makeOctahedron()),
    d10: cleanPolyhedron(makePentagonalTrapezohedron()),
    d12: cleanPolyhedron(makeDodecahedron()),
    d20: cleanPolyhedron(makeIcosahedron()),
  };

  const expectedFaceCounts = { d4: 4, d8: 8, d10: 10, d12: 12, d20: 20 };
  for (const [die, expected] of Object.entries(expectedFaceCounts)) {
    const actual = polyhedra[die as PolyhedronDie].faces.length;
    if (actual !== expected) throw new Error(`${die} generated ${actual} faces; expected ${expected}`);
  }

  return polyhedra;
}

export const POLYHEDRA: Record<PolyhedronDie, Polyhedron> = generatePolyhedra();
