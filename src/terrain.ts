import * as THREE from 'three'
import {nearRoute} from './roverRoute.ts'

// Distances are metres. Keep the central grade level so tunnels, footings and
// machinery can share a datum. The surrounding landscape uses the same height
// field for its mesh, outcrops and rover tracks.
const TAU = Math.PI * 2
const GRADE = -0.055

function mix(a: number, b: number, weight: number) {
  return a + (b - a) * weight
}

function ramp(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function hash(x: number, z: number) {
  let v = Math.imul(x, 374761393) + Math.imul(z, 668265263)
  v = Math.imul(v ^ (v >>> 13), 1274126177)
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296
}

function noise(x: number, z: number, period = 0) {
  const i = Math.floor(x), j = Math.floor(z)
  const u = ramp(0, 1, x - i), v = ramp(0, 1, z - j)
  const a = period ? ((i % period) + period) % period : i
  const b = period ? ((j % period) + period) % period : j
  const c = period ? (a + 1) % period : i + 1
  const d = period ? (b + 1) % period : j + 1
  return mix(mix(hash(a, b), hash(c, b), u), mix(hash(a, d), hash(c, d), u), v)
}

function seedStream(seed: number) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function terrainHeight(x: number, z: number) {
  const padDistance = Math.max(Math.abs(x), Math.abs(z))
  if (padDistance <= 22) return GRADE
  const radius = Math.hypot(x, z), a = Math.atan2(x, -z)
  const wash = noise(x * .027 + 51, z * .027 - 17)
  const gullies = Math.abs(noise(x * .077, z * .077 + 5) - .48)
  const detail = noise(x * .16 + 13, z * .16)
  const floor = 2.4 * (wash - .49) + .54 * (detail - .5)
  // Asymmetric, scalloped escarpments expose their steeper face to the basin.
  const innerRim = 79 + 14 * Math.sin(3 * a + .75) + 11 * Math.sin(6 * a) + 5 * Math.cos(11 * a + .7)
  const outerRim = 148 + 16 * Math.cos(3 * a + 1.9) + 13 * Math.sin(5 * a - .6)
  const shoulder = radius - innerRim + 8 * (wash - .5)
  const innerProfile = ramp(-20, 4, shoulder) * (1 - ramp(5, 47, shoulder))
  const innerHeight = 8 + 9 * (.5 + .5 * Math.sin(2 * a - .6)) + 9 * noise(x * .044, z * .044 + 20) + 11 * gullies
  const outerShoulder = radius - outerRim + 14 * wash
  const outerProfile = ramp(-25, 10, outerShoulder) * (1 - ramp(12, 65, outerShoulder))
  const outerHeight = 19 + 13 * Math.cos(3 * a + .6) + 19 * wash + 8 * detail
  const scree = innerProfile * (1.9 * Math.sin(shoulder * .85 + wash * 3) + 2.8 * (detail - .5))
  let impact = 0
  for (const [cx, cz, radius, depth] of [[36,17,8,2.2],[-38,-30,11,3],[-8,54,15,3.4],[53,-22,6,1.4]]) {
    const r = Math.hypot(x-cx,z-cz) / radius
    if (r < 1.35) impact += -depth * Math.max(0,1-r*r) + .21 * depth * Math.exp(-((r-1)**2)/.02)
  }
  return GRADE + impact + ramp(22, 40, padDistance) * (floor + innerProfile * innerHeight + outerProfile * outerHeight + scree)
}

function repeatTexture(data: Uint8Array, size: number, isColor: boolean) {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 8
  if (isColor) texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

function regolith() {
  const size = 768, pixels = size * size
  const height = new Float32Array(pixels), rough = new Uint8Array(pixels * 4)
  const color = new Uint8Array(pixels * 4), normal = new Uint8Array(pixels * 4)
  const random = seedStream(475841)
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = z / size
      const warp = noise(6 * u, 6 * v, 6)
      const patches = noise(15 * u, 15 * v, 15)
      const grit = noise(116 * u, 116 * v, 116)
      const fine = noise(293 * u, 293 * v, 293)
      const ripple = Math.sin(TAU * (v * 13 + u * 4 + .94 * warp + .19 * patches))
      const grain = random() - .5
      height[z * size + x] = .34 * warp + .25 * patches + .21 * grit + .10 * fine + .075 * ripple + .055 * grain
    }
  }
  // Pebble relief is stamped across wrapped edges so it tiles continuously.
  for (let i = 0; i < 6200; i++) {
    const cx = (random() * size) | 0, cz = (random() * size) | 0
    const r = .7 + 3.8 * random() ** 3
    for (let dz = -5; dz <= 5; dz++) {
      for (let dx = -5; dx <= 5; dx++) {
        const d2 = (dx * dx + 1.4 * dz * dz) / (r * r)
        if (d2 < 1) height[((cz + dz + size) % size) * size + ((cx + dx + size) % size)] += .38 * (1 - d2)
      }
    }
  }
  for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
      const i = (z * size + x) * 4, h = height[i / 4]
      const dx = (height[z * size + (x + 1) % size] - height[z * size + (x + size - 1) % size]) * 2.2
      const dz = (height[((z + 1) % size) * size + x] - height[((z + size - 1) % size) * size + x]) * 2.2
      const n = 1 / Math.hypot(dx, dz, 1), albedo = Math.min(250, 197 + 91 * (h - .35))
      const gritGloss = Math.min(253, Math.max(150, 213 + 60*h - 95*Math.abs(dx)))
      rough.set([gritGloss,gritGloss,gritGloss,255],i)
      const mineral = noise(x / size * 55, z / size * 55, 55)
      color.set([albedo, albedo * (.95 + mineral * .045), albedo * (.88 + mineral * .09), 255], i)
      normal.set([127.5 * (1 - dx * n), 127.5 * (1 - dz * n), 127.5 * (1 + n), 255], i)
    }
  }
  return { roughnessMap: repeatTexture(rough,size,false), map: repeatTexture(color, size, true), normalMap: repeatTexture(normal, size, false) }
}

function buildBasin() {
  const segments = 280
  const geometry = new THREE.PlaneGeometry(480, 480, segments, segments)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position')
  const uvs = geometry.getAttribute('uv')
  const colors = new Float32Array(positions.count * 3)
  const base = new THREE.Color(), ochre = new THREE.Color('#bc7852'), umber = new THREE.Color('#945a42')
  const rock = new THREE.Color('#845541'), pale = new THREE.Color('#bd8862')
  const stretch = (n: number) => 240 * Math.sign(n) * (.36 * Math.abs(n) + .64 * Math.abs(n) ** 1.7)
  for (let i = 0; i < positions.count; i++) {
    const x = stretch(positions.getX(i) / 240), z = stretch(positions.getZ(i) / 240)
    const y = terrainHeight(x, z)
    positions.setXYZ(i, x, y, z)
    uvs.setXY(i, x / 7.7, -z / 7.7)
    const deposits = noise(x * .075 + 8, z * .075 - 63)
    const stone = noise(x * .24, z * .24 + 2)
    const beds = Math.sin(y * 1.22 + z * .033 + x * .011 + .88 * deposits)
    base.copy(umber).lerp(ochre, .18 + .8 * deposits)
    base.lerp(rock, ramp(2.4, 14, y) * (.45 + .32 * beds))
    base.lerp(pale, ramp(4, 9, y) * ramp(.48, .97, beds) * .55)
    base.multiplyScalar(.91 + .18 * stone)
    // Soft pooled shadow under foundations supplements the moving-direction shadows.
    let contact=0
    for(const [cx,cz,rx,rz] of [[-8,-3,4.3,4.1],[10,-9,4.2,3.0],[6,4,4.5,4.5],[0,-12,3.1,3.5]]){
      const d=((x-cx)/rx)**2+((z-cz)/rz)**2
      contact=Math.max(contact,.45*(1-ramp(.62,1.48,d)))
    }
    base.multiplyScalar(1-contact)
    base.toArray(colors, i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  const soil = new THREE.MeshStandardMaterial({
    ...regolith(), vertexColors: true, roughness: 1, metalness: 0, normalScale: new THREE.Vector2(.72, .72)
  })
  const ground = new THREE.Mesh(geometry, soil)
  ground.name = 'Elysium basin and layered escarpments'
  ground.receiveShadow = true
  return ground
}

const footprints = [[-8, -3, 4.8], [10, -9, 5.1], [6, 4, 5], [-10, 8, 6.9], [0, -12, 5]]
// Populated alongside the seeded mesh transforms in createTerrain().
export const boulderColliders: {x:number, z:number, radius:number}[] = []

function rockField() {
  boulderColliders.length = 0
  const group = new THREE.Group(), random = seedStream(17012026)
  const textureSize = 256, albedo = new Uint8Array(textureSize * textureSize * 4)
  for (let z = 0; z < textureSize; z++) for (let x = 0; x < textureSize; x++) {
    const broad = noise(x / 32, z / 32, 8)
    const grain = noise(x / 3.2, z / 3.2, 80)
    const vein = Math.abs(noise(x / 12.8, z / 12.8, 20) - .5)
    const brightness = 160 + broad * 58 + grain * 27 + (vein < .035 ? 13 : 0)
    albedo.set([brightness, brightness, brightness, 255], (z * textureSize + x) * 4)
  }
  const material = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .96, map: repeatTexture(albedo, textureSize, true)})
  const placement = new THREE.Object3D(), color = new THREE.Color()
  const dark = new THREE.Color('#684737'), light = new THREE.Color('#b0876b')
  for (let variety = 0; variety < 5; variety++) {
    const geometry = new THREE.IcosahedronGeometry(1, variety === 0 ? 2 : 1)
    const vertices = geometry.getAttribute('position')
    for (let i = 0; i < vertices.count; i++) {
      const x = vertices.getX(i), y = vertices.getY(i), z = vertices.getZ(i)
      const jitter = .72 + .46 * noise(x * 3 + y + 18 * variety, z * 2.5 + y * 3)
      vertices.setXYZ(i, (x + .19 * y) * jitter, Math.min(.77, y) * jitter, z * jitter)
    }
    geometry.computeVertexNormals()
    const count = 225
    const mesh = new THREE.InstancedMesh(geometry, material, count)
    mesh.name = 'Basalt fragments'
    mesh.receiveShadow = true
    mesh.castShadow = variety === 0
    for (let i = 0; i < count; i++) {
      const angle = random() * TAU
      const distance = 9 + 124 * random() ** 1.6
      const x = distance * Math.cos(angle), z = distance * Math.sin(angle)
      const clear = nearRoute(x,z) || footprints.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) || distance < 15
      const size = (variety === 0 ? .29 + random() ** 4 * 1.6 : .055 + random() ** 3 * .62) * (clear ? .10 : 1)
      placement.position.set(x, terrainHeight(x, z) + .07 * size, z)
      placement.rotation.set(random() * .28, random() * TAU, random() * .42)
      placement.scale.set(size * (1 + random() * .64), size * (.47 + .52 * random()), size * (.74 + random() * .45))
      if (placement.scale.y > .45) boulderColliders.push({x,z,radius:.75 * Math.max(placement.scale.x, placement.scale.z)})
      placement.updateMatrix()
      mesh.setMatrixAt(i, placement.matrix)
      mesh.setColorAt(i, color.copy(dark).lerp(light, random() ** 1.5))
    }
    group.add(mesh)
  }
  return group
}

function surfaceGravel() {
  const group = new THREE.Group(), random = seedStream(368421)
  const material = new THREE.MeshStandardMaterial({color: 0xffffff, roughness: .97, flatShading: true})
  const stone = new THREE.Object3D(), color = new THREE.Color()
  const dark = new THREE.Color('#50483f'), light = new THREE.Color('#b49072')
  for (let variety = 0; variety < 3; variety++) {
    const geometry = new THREE.IcosahedronGeometry(1, 0), positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i)
      const erosion = .77 + .37 * noise(x * 5 + variety * 17, z * 5 + y)
      positions.setXYZ(i, x * erosion + y * .16, y * erosion, z * erosion)
    }
    geometry.computeVertexNormals()
    const mesh = new THREE.InstancedMesh(geometry, material, 600)
    mesh.name = 'Surface gravel and wind-sorted fragments'
    mesh.receiveShadow = true
    for (let i = 0; i < mesh.count; i++) {
      const angle = random() * TAU, radius = 2 + 60 * random() ** 1.7
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius
      const foundation = footprints.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r * .72)
      const cluster = .45 + .55 * noise(x * .19 + 7, z * .19)
      const size = (.022 + random() ** 2 * .12) * cluster * (foundation ? .16 : 1)
      stone.position.set(x, terrainHeight(x, z) + size * .13, z)
      stone.rotation.set(random() * .5, random() * TAU, random() * .4)
      stone.scale.set(size * (1 + random() * .8), size * (.25 + .18 * random()), size * (.65 + random() * .45))
      stone.updateMatrix();mesh.setMatrixAt(i, stone.matrix)
      mesh.setColorAt(i, color.copy(dark).lerp(light, random()))
    }
    group.add(mesh)
  }
  return group
}

function exposedStrata(){
  const random=seedStream(9037),mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.85,1,.42,7,1),new THREE.MeshStandardMaterial({roughness:.92}),108)
  const stone=new THREE.Object3D(),color=new THREE.Color();let i=0
  for(const [cx,cz] of [[-26,-24],[27,10],[-36,16],[16,-39]]){
    for(let ledge=0;ledge<7;ledge++){
      const x=cx+ledge*1.12,z=cz+Math.sin(ledge*.6)*1.5,y=terrainHeight(x,z)
      const levels=ledge%3===0?3:4
      for(let layer=0;layer<levels;layer++){
        const w=1.83-.18*layer+random()*.34
        stone.position.set(x+.12*layer,y+.18+layer*.27,z);stone.rotation.set(.05,.64+.16*random(),-.064);stone.scale.set(w,1.08,w*.72);stone.updateMatrix();mesh.setMatrixAt(i,stone.matrix)
        color.setHex(layer%2?0xa77453:0x80543f);mesh.setColorAt(i++,color)
      }
      boulderColliders.push({x,z,radius:1.18})
    }
  }
  mesh.count=i;mesh.receiveShadow=true;mesh.castShadow=true;return mesh
}
function roverTracks() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(9, 0, 39), new THREE.Vector3(5.3, 0, 23), new THREE.Vector3(-.6, 0, 13),
    new THREE.Vector3(-1.1, 0, 8), new THREE.Vector3(-3.2, 0, 3.9), new THREE.Vector3(-5.4, 0, .8)
  ])
  const steps = 115, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  const length = curve.getLength()
  for (const axle of [-.63, .63]) {
    const start = positions.length / 3
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, p = curve.getPointAt(t), tangent = curve.getTangentAt(t)
      for (const edge of [-.145, .145]) {
        const x = p.x - tangent.z * (axle + edge), z = p.z + tangent.x * (axle + edge)
        positions.push(x, terrainHeight(x, z) + .016, z)
        uvs.push(edge < 0 ? 0 : 1, t * length / .55)
      }
      if (i < steps) {
        const j = start + i * 2
        indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3)
      }
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  const size = 64, data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / (size - 1), v = y / size
    const tread = Math.cos(TAU * (v * 3 - .45 * Math.abs(2 * u - 1)))
    const alpha = (29 + 60 * ramp(.12, .65, tread)) * ramp(0, .12, u) * (1 - ramp(.88, 1, u))
    data.set([76, 46, 34, alpha], (y * size + x) * 4)
  }
  const material = new THREE.MeshBasicMaterial({map: repeatTexture(data, size, true), transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1})
  const mesh = new THREE.Mesh(geometry, material)
  mesh.name = 'Rover tread impressions'
  return mesh
}

export function createTerrain(): THREE.Group {
  const terrain = new THREE.Group()
  terrain.name = 'Martian surface'
  terrain.add(buildBasin(), rockField(), surfaceGravel(), exposedStrata(), roverTracks())
  return terrain
}
