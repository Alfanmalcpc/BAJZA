import fs from 'node:fs';
import path from 'node:path';

const outDir = path.resolve('src/assets/models');
fs.mkdirSync(outDir, { recursive: true });

const TAU = Math.PI * 2;
function sphere(positions, normals, indices, center, scale, segments = 24, rings = 16) {
  const start = positions.length / 3;
  for (let y = 0; y <= rings; y++) {
    const v = y / rings;
    const phi = v * Math.PI;
    const sy = Math.cos(phi);
    const rr = Math.sin(phi);
    for (let x = 0; x <= segments; x++) {
      const u = x / segments * TAU;
      const nx = Math.cos(u) * rr;
      const nz = Math.sin(u) * rr;
      positions.push(center[0] + nx * scale[0], center[1] + sy * scale[1], center[2] + nz * scale[2]);
      normals.push(nx, sy, nz);
    }
  }
  for (let y = 0; y < rings; y++) for (let x = 0; x < segments; x++) {
    const a = start + y * (segments + 1) + x;
    const b = a + segments + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
}

function cylinder(positions, normals, indices, center, radius, height, segments = 20, scale = [1, 1, 1]) {
  const start = positions.length / 3;
  const y0 = center[1] - height / 2, y1 = center[1] + height / 2;
  for (const y of [y0, y1]) for (let x = 0; x <= segments; x++) {
    const a = x / segments * TAU, nx = Math.cos(a), nz = Math.sin(a);
    positions.push(center[0] + nx * radius * scale[0], y, center[2] + nz * radius * scale[2]);
    normals.push(nx, 0, nz);
  }
  for (let x = 0; x < segments; x++) {
    const a = start + x, b = start + segments + 1 + x;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const top = positions.length / 3;
  positions.push(center[0], y1, center[2]); normals.push(0, 1, 0);
  const bottom = positions.length / 3;
  positions.push(center[0], y0, center[2]); normals.push(0, -1, 0);
  for (let x = 0; x < segments; x++) {
    const t = start + segments + 1 + x, tn = start + segments + 1 + x + 1;
    const bo = start + x, bn = start + x + 1;
    indices.push(t, top, tn, bo, bn, bottom);
  }
}

function makeAvatar(gender) {
  const meshes = [];
  const materials = [
    { name: 'Skin warm', color: [0.95, 0.56, 0.39, 1], roughness: .52 },
    { name: gender === 'female' ? 'Chestnut hair' : 'Midnight hair', color: gender === 'female' ? [0.28, 0.12, 0.07, 1] : [0.035, 0.06, 0.11, 1], roughness: .32 },
    { name: 'BAJA blue outfit', color: [0.08, 0.32, 0.86, 1], roughness: .62 },
    { name: 'Shoe rubber', color: [0.035, 0.055, 0.11, 1], roughness: .38 },
    { name: 'Eye white', color: [0.97, 0.99, 1, 1], roughness: .2 },
    { name: 'Eye iris', color: gender === 'female' ? [0.16, 0.07, 0.03, 1] : [0.025, 0.05, 0.09, 1], roughness: .25 },
    { name: 'Accent pink', color: [1, 0.27, 0.48, 1], roughness: .45 },
    { name: 'Sole', color: [0.78, 0.84, 0.92, 1], roughness: .44 }
  ];
  const add = (name, type, args, material) => meshes.push({ name, type, args, material });
  add('Head', 'sphere', [[0, 1.55, 0], [.67, .70, .60]], 0);
  if (gender === 'female') {
    add('Long hair crown', 'sphere', [[0, 1.98, .01], [.72, .48, .65]], 1);
    add('Long hair back', 'sphere', [[0, 1.58, .19], [.73, .66, .48]], 1);
    add('Left ponytail', 'sphere', [[-.61, 1.75, .13], [.22, .48, .25]], 1);
    add('Right ponytail', 'sphere', [[.61, 1.75, .13], [.22, .48, .25]], 1);
    add('Hair fringe', 'sphere', [[0, 1.88, -.51], [.62, .18, .18]], 1);
  } else {
    add('Short hair crown', 'sphere', [[0, 1.98, .01], [.71, .43, .62]], 1);
    add('Hair fringe', 'sphere', [[0, 1.87, -.52], [.58, .16, .16]], 1);
  }
  add('Torso', 'sphere', [[0, .65, 0], gender === 'female' ? [.60, .65, .47] : [.66, .68, .49]], 2);
  add('Left arm', 'cylinder', [[-.69, .68, 0], .14, .64], 0);
  add('Right arm', 'cylinder', [[.69, .68, 0], .14, .64], 0);
  add('Left leg', 'cylinder', [[-.25, -.02, 0], .18, .66], 2);
  add('Right leg', 'cylinder', [[.25, -.02, 0], .18, .66], 2);
  add('Left shoe', 'sphere', [[-.28, -.45, -.08], [.34, .16, .38]], 3);
  add('Right shoe', 'sphere', [[.28, -.45, -.08], [.34, .16, .38]], 3);
  add('Left shoe sole', 'sphere', [[-.28, -.50, -.09], [.35, .055, .39]], 7);
  add('Right shoe sole', 'sphere', [[.28, -.50, -.09], [.35, .055, .39]], 7);
  add('Left eye white', 'sphere', [[-.23, 1.54, -.57], [.13, .16, .075]], 4);
  add('Right eye white', 'sphere', [[.23, 1.54, -.57], [.13, .16, .075]], 4);
  add('Left iris', 'sphere', [[-.23, 1.54, -.638], [.065, .085, .035]], 5);
  add('Right iris', 'sphere', [[.23, 1.54, -.638], [.065, .085, .035]], 5);
  add('Nose', 'sphere', [[0, 1.39, -.61], [.07, .055, .045]], 0);
  add('Smile', 'sphere', [[0, 1.29, -.59], [.13, .035, .025]], 5);
  add('Left cheek', 'sphere', [[-.43, 1.38, -.57], [.11, .055, .025]], 6);
  add('Right cheek', 'sphere', [[.43, 1.38, -.57], [.11, .055, .025]], 6);
  if (gender === 'female') add('Skirt hem', 'sphere', [[0, .39, .03], [.64, .18, .52]], 2);

  const buffer = [];
  const views = [], accessors = [];
  const addAccessor = (values, componentType, type, target) => {
    const bytes = componentType === 5126 ? 4 : 2;
    const offset = buffer.length;
    while (buffer.length % 4) buffer.push(0);
    const start = buffer.length;
    if (componentType === 5126) for (const v of values) { const b = Buffer.alloc(4); b.writeFloatLE(v, 0); buffer.push(...b); }
    else for (const v of values) { const b = Buffer.alloc(2); b.writeUInt16LE(v, 0); buffer.push(...b); }
    const count = values.length / ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[type]);
    const min = type === 'VEC3' ? [Infinity, Infinity, Infinity] : undefined, max = type === 'VEC3' ? [-Infinity, -Infinity, -Infinity] : undefined;
    if (min) for (let i = 0; i < count; i++) for (let j = 0; j < 3; j++) { const v = values[i * 3 + j]; min[j] = Math.min(min[j], v); max[j] = Math.max(max[j], v); }
    const idx = accessors.length;
    accessors.push({ bufferView: views.length, componentType, count, type, ...(min ? { min, max } : {}) });
    views.push({ buffer: 0, byteOffset: start, byteLength: buffer.length - start, ...(target ? { target } : {}) });
    return idx;
  };
  const gltfMeshes = [], nodes = [];
  for (const item of meshes) {
    const pos = [], norm = [], ind = [];
    if (item.type === 'sphere') sphere(pos, norm, ind, item.args[0], item.args[1]);
    else cylinder(pos, norm, ind, item.args[0], item.args[1], item.args[2], 20);
    const pi = addAccessor(pos, 5126, 'VEC3', 34962);
    const ni = addAccessor(norm, 5126, 'VEC3', 34962);
    const ii = addAccessor(ind, 5123, 'SCALAR', 34963);
    gltfMeshes.push({ name: item.name, primitives: [{ attributes: { POSITION: pi, NORMAL: ni }, indices: ii, material: item.material }] });
    nodes.push({ name: item.name, mesh: gltfMeshes.length - 1 });
  }
  const raw = Buffer.from(buffer);
  return {
    asset: { version: '2.0', generator: 'BAJA Chibi Avatar Studio' },
    scene: 0,
    scenes: [{ name: `${gender === 'female' ? 'Perempuan' : 'Laki-laki'} Chibi`, nodes: nodes.map((_, i) => i), extras: { gender, style: 'realistic-chibi', accessoryAnchors: { headwear: [0, 2.35, 0], eyewear: [0, 1.55, -0.64], backItem: [0, .68, .52], footwear: [0, -.45, -.08] } } }],
    nodes, meshes: gltfMeshes, materials: materials.map(m => ({ name: m.name, pbrMetallicRoughness: { baseColorFactor: m.color, metallicFactor: 0, roughnessFactor: m.roughness } })),
    buffers: [{ byteLength: raw.length, uri: `data:application/octet-stream;base64,${raw.toString('base64')}` }],
    bufferViews: views, accessors
  };
}

for (const gender of ['male', 'female']) fs.writeFileSync(path.join(outDir, `${gender}.gltf`), JSON.stringify(makeAvatar(gender), null, 2));
