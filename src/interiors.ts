import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type InteriorKind = 'hab' | 'green' | 'water'
type Blocker = { x: number, z: number, hx: number, hz: number }
type Station = { id: string, x: number, z: number }
type Pose = { x: number, z: number, yaw: number }
type Interior = {
  group: THREE.Group
  bounds: { minX: number, maxX: number, minZ: number, maxZ: number }
  blockers: Blocker[]
  stations: Station[]
  spawn: Pose
  doorSpawn: Pose
}

const rooms = {
  hab: { code: 'HAB / 01', name: 'HABITAT', color: '#65ddca', terminal: 'LIFE SUPPORT', id: 'life' },
  green: { code: 'GRH / 03', name: 'GREENHOUSE', color: '#a4d99e', terminal: 'GROW CONTROL', id: 'green' },
  water: { code: 'WTR / 02', name: 'WATER PROCESSOR', color: '#89c7e0', terminal: 'WATER RECOVERY', id: 'water' }
} as const

function panelArt(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const c = canvas.getContext('2d')
  if (c) draw(c)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
}

// Materials are unique to the returned group, allowing the owning scene to
// dispose the whole zone without invalidating another room's finishes.
export function createInterior(kind: InteriorKind): Interior {
  const room = rooms[kind]
  const group = new THREE.Group()
  group.name = room.name
  const blockers: Blocker[] = []
  const stations: Station[] = []
  const material = (color: string, metalness = .14, roughness = .65) => new THREE.MeshStandardMaterial({color,metalness,roughness})
  const shell = material('#c6c7ba'), lining = material('#8e9690'), frame = material('#4a5456', .48), graphite = material('#273034', .28)
  const dark = material('#151d20'), aluminum = material('#a1aaa4', .66), terra = material('#b95e3d')
  const ochre = material('#ce8e47'), floor = material('#414b49'), jacket = material('#e9dfcc', .08)
  const rubber = material('#292a29', .04), leaf = material('#688e45', .04), leafTip = material('#9bb858', .04)
  const cropSoil = material('#372c24'), fabric = material('#88978b', .02)
  const glow = (c: string) => new THREE.MeshBasicMaterial({color:c,toneMapped:false})
  const lamp = glow('#fff0d2'), diode = glow(room.color), amber = glow('#f39a54')
  const pieces = new Map<THREE.Material,THREE.BufferGeometry[]>()
  const cube = new THREE.BoxGeometry(1,1,1), cylinder = new THREE.CylinderGeometry(1,1,1,18)
  const sphere = new THREE.SphereGeometry(1,16,10), plane = new THREE.PlaneGeometry(1,1)
  const matrix = new THREE.Matrix4(), euler = new THREE.Euler(), rotation = new THREE.Quaternion()
  const point = new THREE.Vector3(), scale = new THREE.Vector3(), up = new THREE.Vector3(0,1,0)
  function piece(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx=0, ry=0, rz=0) {
    rotation.setFromEuler(euler.set(rx,ry,rz))
    matrix.compose(point.set(x,y,z),rotation,scale.set(sx,sy,sz))
    const geo = g.clone().applyMatrix4(matrix)
    if (!pieces.has(m)) pieces.set(m,[])
    pieces.get(m)!.push(geo)
  }
  function box(x: number,y: number,z: number,w: number,h: number,d: number,m: THREE.Material,rx=0,ry=0,rz=0) {
    piece(cube,m,x,y,z,w,h,d,rx,ry,rz)
  }
  function ball(x: number,y: number,z: number,rx: number,ry: number,rz: number,m: THREE.Material) {
    piece(sphere,m,x,y,z,rx,ry,rz)
  }
  function drum(x: number,y: number,z: number,r: number,h: number,m: THREE.Material) {
    piece(cylinder,m,x,y,z,r,h,r)
  }
  function pipe(a: number[], b: number[], r: number, m: THREE.Material) {
    const axis = new THREE.Vector3(b[0]-a[0], b[1]-a[1], b[2]-a[2])
    const length = axis.length()
    const q = new THREE.Quaternion().setFromUnitVectors(up,axis.normalize())
    const t = new THREE.Euler().setFromQuaternion(q)
    piece(cylinder,m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,length,r,t.x,t.y,t.z)
  }
  function placard(text: string, x: number,y: number,z: number,w: number,h: number, yaw=0, stripe=room.color as string) {
    const mat = panelArt(640,90,c=>{
      c.fillStyle='#273130'; c.fillRect(0,0,640,90)
      c.fillStyle=stripe;c.fillRect(0,0,11,90)
      c.fillStyle='#e7e8dc';c.font='bold 44px monospace';c.textBaseline='middle'
      c.fillText(text,27,48,588)
    })
    piece(plane,mat,x,y,z,w,h,1,0,yaw)
  }
  function hull() {
    box(0,-.13,0,11.5,.26,10.8,floor)
    box(0,3.77,0,11.5,.18,10.8,lining)
    box(0,1.8,-5.32,11.5,3.6,.18,lining)
    for (const side of [-1,1]) {
      box(side*5.67,1.8,0,.18,3.65,10.8,frame)
      for (let bay=0;bay<5;bay++) {
        const z=-4.21+bay*2.1
        box(side*5.56,1.93,z,.12,3.22,2.04,shell)
        box(side*5.47,.58,z,.08,.57,1.98,lining)
        box(side*5.43,.19,z,.12,.23,2.08,graphite)
        box(side*5.50,2.67,z,.032,.13,2.04,terra)
        box(side*5.46,3.24,z,.20,.36,.13,frame)
        box(side*5.13,3.50,z,.86,.13,.14,frame,0,0,-side*.53)
        for (const dz of [-.84,.84]) {
          box(side*5.477,2.95,z+dz,.032,.064,.064,frame)
          box(side*5.477,1.02,z+dz,.032,.064,.064,frame)
        }
        box(side*4.35,3.55,z-1.01,2.45,.16,.14,frame)
      }
      for (const x of [2.06,4.12]) box(side*x,.006,0,.019,.012,10.46,dark)
      for (const z of [-3.9,-1.3,1.3,3.9]) box(side*2.77,.006,z,5.55,.012,.022,dark)
      box(side*1.23,.008,.7,.041,.015,8.6,ochre)
      box(side*1.7,3.59,.05,.20,.11,8.95,frame)
      box(side*1.7,3.515,.05,.11,.034,8.76,lamp)
      for (let n=0;n<4;n++) box(side*1.7,3.49,-3.4+2.3*n,.18,.05,.074,graphite)
      pipe([side*4.81,3.32,-5.1],[side*4.81,3.32,5.1],.087,aluminum)
      pipe([side*4.58,3.36,-5.1],[side*4.58,3.36,5.1],.053,terra)
      for (let i=0;i<6;i++) {
        box(side*4.69,3.39,-4.5+i*1.8,.42,.21,.055,frame)
      }
    }
    for (let i=-2;i<=2;i++) {
      box(i*2.19,1.79,-5.19,2.15,3.48,.1,shell)
      box(i*2.19,.27,-5.08,2.13,.43,.13,lining)
      box(i*2.19,2.66,-5.119,2.15,.12,.06,terra)
    }
    // Recessed vestibule. Its side walls occupy the otherwise empty corners
    // of the rectangular movement bounds.
    for (const side of [-1,1]) {
      box(side*3.52,1.82,5.28,4.22,3.64,.2,shell)
      box(side*1.4,1.82,6.34,.18,3.64,2.27,frame)
      box(side*1.29,1.64,6.37,.07,2.95,1.98,lining)
      box(side*1.18,2.68,6.33,.06,.09,1.83,amber)
      blockers.push({x:side*3.57,z:6.45,hx:2.26,hz:1.28})
    }
    box(0,-.13,6.35,2.81,.26,2.35,floor)
    box(0,3.72,6.35,2.81,.26,2.35,graphite)
    box(0,1.82,7.49,2.8,3.65,.15,frame)
    box(0,1.4,7.35,2.23,2.82,.20,dark)
    for (const side of [-1,1]) {
      const door=new THREE.Group();door.name='airlockLeaf';door.userData.side=side
      for(const [x,y,z,w,h,d,mat] of [[.479,1.38,7.205,.935,2.51,.16,lining],[.57,1.78,7.110,.49,.41,.04,graphite],[.57,1.78,7.083,.40,.32,.025,material('#485957',.50)],[.35,.55,7.113,.58,.07,.04,terra]] as const){
        const face=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);face.position.set(side*x,y,z);door.add(face)
      }
      group.add(door)
      box(side*1.10,1.36,7.158,.064,2.27,.10,ochre)
    }
    box(0,2.90,7.15,1.36,.065,.12,lamp)
    placard('SURFACE AIRLOCK',0,3.20,7.17,2.19,.32,Math.PI,'#dfa46a')
    placard('AIRLOCK   >',2.58,2.11,5.16,1.61,.25,Math.PI,'#dfa46a')
    stations.push({id:'exit',x:0,z:6.87})
  }
  function consoleAt(id: string,label: string,x: number,z: number,color: string) {
    const display = panelArt(768,420,c=>{
      c.fillStyle='#09191d';c.fillRect(0,0,768,420)
      c.fillStyle='#142b2f';c.fillRect(0,0,768,55)
      c.fillStyle=color;c.fillRect(17,18,7,19);c.font='20px monospace';c.fillText(room.code+'   /   CREW ACCESS',37,35)
      c.fillStyle='#e5e8db';c.font='bold 48px sans-serif';c.fillText(label,27,122,710)
      c.strokeStyle='#28464a';c.lineWidth=2;c.beginPath();c.moveTo(28,150);c.lineTo(740,150);c.stroke()
      const channels = id==='life'?['AIR CYCLE','CO₂ SCRUBBER','CREW CABIN']:id==='green'?['IRRIGATION','GROW LIGHTS','HARVEST']:id==='water'?['FILTER BANK','CREW LOOP','PUMP CONTROL']:['SYSTEM HISTORY','FIELD REPORTS','CREW LOG']
      channels.forEach((channel,i)=>{
        c.fillStyle='#152a2e';c.fillRect(28,177+i*66,710,50)
        c.fillStyle=color;c.fillRect(28,177+i*66,4,50)
        c.font='22px monospace';c.fillText(channel,52,209+i*66)
        c.fillStyle='#8eaaa7';c.textAlign='right';c.fillText('›',714,209+i*66);c.textAlign='left'
      })
    })
    box(x,.54,z+.10,1.14,1.06,.64,graphite)
    box(x,.94,z+.11,2.18,.14,.92,shell)
    box(x,.90,z+.47,2.18,.11,.12,frame)
    box(x,1.19,z-.09,.27,.54,.16,frame)
    box(x,1.79,z-.11,1.97,1.13,.16,dark)
    piece(plane,display,x,1.79,z-.021,1.82,.994,1)
    box(x,1.01,z+.23,.84,.035,.27,dark)
    for (let row=0;row<3;row++) for (let i=0;i<10;i++) {
      box(x-.355+i*.078,1.033,z+.15+row*.063,.059,.018,.042,lining)
    }
    box(x+.70,1.02,z+.23,.23,.036,.22,frame)
    box(x+.70,1.045,z+.23,.11,.014,.10,diode)
    blockers.push({x,z:z+.10,hx:1.10,hz:.48})
    stations.push({id,x,z:z+.85})
  }
  function bunks() {
    for (const z of [-2.55,.77]) {
      for (const end of [-1,1]) {
        box(-4.78,1.30,z+end*1.34,1.32,2.60,.09,lining)
        box(-4.06,1.37,z+end*1.30,.08,2.72,.08,aluminum)
      }
      for(const y of [.49,1.65]) {
        box(-4.77,y,z,1.29,.12,2.67,frame)
        box(-4.78,y+.13,z,1.21,.20,2.50,jacket)
        box(-4.79,y+.25,z+.34,1.17,.11,1.60,fabric)
        box(-4.80,y+.27,z-.90,.88,.15,.42,lining)
        box(-5.35,y+.81,z-.59,.06,.055,.58,lamp)
        pipe([-4.08,y+.31,z-.2],[-4.08,y+.31,z+1.21],.022,aluminum)
      }
      for(let j=0;j<4;j++) pipe([-4.041,.18+j*.34,z-.90],[-4.041,.18+j*.34,z-.54],.024,aluminum)
      blockers.push({x:-4.78,z,hx:.75,hz:1.42})
    }
  }
  function suitRack() {
    box(4.67,1.24,.14,1.69,2.48,.71,frame)
    box(4.67,1.32,.55,1.43,2.11,.14,dark)
    box(4.67,2.30,.66,1.29,.047,.085,lamp)
    placard('EVA SUIT',4.67,2.66,.59,1.59,.23,0,'#dfa46a')
    for(const sign of [-1,1]){
      const x=4.67+sign*.18
      ball(x,.65,.73,.15,.39,.15,jacket)
      box(x,.26,.81,.28,.24,.37,graphite)
      ball(x,.82,.78,.15,.075,.15,terra)
      pipe([4.67+sign*.31,1.65,.73],[4.67+sign*.45,1.18,.81],.121,jacket)
      ball(4.67+sign*.45,1.15,.83,.115,.13,.12,graphite)
    }
    ball(4.67,1.42,.75,.345,.43,.226,jacket)
    box(4.67,1.48,.97,.32,.22,.13,frame)
    box(4.67,1.51,1.044,.17,.06,.015,diode)
    drum(4.67,1.79,.74,.236,.115,graphite)
    ball(4.67,2.028,.74,.258,.272,.252,jacket)
    ball(4.67,2.032,.84,.214,.158,.196,material('#896541',.72,.24))
    blockers.push({x:4.67,z:.26,hx:.92,hz:.80})
    stations.push({id:'suit',x:4.67,z:1.36})
  }
  function cropRacks() {
    const blade = new THREE.SphereGeometry(1,5,4)
    for(const side of [-1,1]) {
      for(let n=0;n<3;n++){
        const x=side*3.44,z=-2.95+n*2.78
        box(x,.40,z,2.36,.72,2.23,lining)
        box(x,.79,z,2.48,.15,2.32,frame)
        box(x,.88,z,2.31,.06,2.16,cropSoil)
        box(x,.43,z+1.14,1.93,.10,.035,terra)
        for(const end of [-1,1]) {
          box(x+end*1.22,1.61,z-1.04,.069,2.72,.069,aluminum)
          box(x,2.92,z+end*.51,2.37,.09,.19,frame)
          box(x,2.85,z+end*.51,2.15,.045,.095,lamp)
        }
        for(let a=0;a<4;a++) for(let b=0;b<3;b++){
          const cx=x-.81+a*.54,cz=z-.74+b*.72
          for(let i=0;i<5;i++) {
            const angle=i*2.4+a*.53+b*.81
            piece(blade,i%2?leaf:leafTip,cx+.093*Math.sin(angle),1.015+.028*Math.sin(a+b),cz+.093*Math.cos(angle),.077,.061,.17,.38,angle,0)
          }
        }
        blockers.push({x,z,hx:1.26,hz:1.18})
      }
    }
    blade.dispose()
  }
  function waterPlant() {
    for (const side of [-1,1]) {
      for(let i=0;i<3;i++) {
        const x=side*3.75,z=-3.03+i*2.70
        drum(x,.2,z,.85,.36,frame)
        drum(x,1.35,z,.76,1.96,shell)
        ball(x,2.31,z,.76,.24,.76,shell)
        for(const y of [.57,1.34,2.11]) drum(x,y,z,.79,.088,aluminum)
        drum(x,2.61,z,.21,.28,frame)
        pipe([x,2.70,z],[x,3.01,z],.119,aluminum)
        pipe([x,3.0,z],[side*4.82,3.0,z],.119,aluminum)
        pipe([x,.49,z],[side*2.74,.49,z],.093,frame)
        drum(side*2.85,.67,z,.13,.10,terra)
        box(x,1.58,z+.755,.59,.30,.065,graphite)
        box(x,1.62,z+.797,.42,.05,.03,diode)
        blockers.push({x,z,hx:.95,hz:.86})
      }
      pipe([side*4.82,3.0,-3.11],[side*4.82,3.0,2.55],.124,aluminum)
    }
  }
  hull()
  consoleAt(room.id,room.terminal,0,-4.62,room.color)
  placard(room.code+'   /   '+room.name,0,2.98,-5.075,3.25,.41)
  if(kind==='hab') {
    bunks()
    suitRack()
    consoleAt('reports','MISSION REPORTS',3.75,-4.48,'#f2ad6e')
  } else if(kind==='green') cropRacks()
  else waterPlant()
  if(kind!=='hab'){
    const water=kind==='water',x=water?-2.7:2.19,z=2.69
    const pilotLight=new THREE.Mesh(new THREE.SphereGeometry(.069,12,8),new THREE.MeshBasicMaterial({color:0xe5a368}));pilotLight.position.set(x,1.56,z+.11);pilotLight.name='processLight';group.add(pilotLight)
    stations.push({id:water?'waterGauge':'greenSensor',x,z:z+.38})
    box(x,1.32,z,.73,.54,.17,graphite)
    for(const sign of [-1,1]){
      ball(x+.17*sign,1.36,z+.10,.116,.116,.033,water?jacket:diode)
      box(x+.17*sign,1.38,z+.142,.015,.128,.013,terra,0,0,sign*.56)
      pipe([x+.2*sign,1.07,z],[x+.2*sign,.45,z],.039,aluminum)
    }
    placard(water?'DP-2   /   FILTER':'03   /   ROOT BED',x,1.74,z+.08,1.12,.20)
  }
  for(const [m,geometries] of pieces) {
    const merged=mergeGeometries(geometries)
    if(merged) {
      const mesh=new THREE.Mesh(merged,m)
      mesh.receiveShadow=true
      group.add(mesh)
    }
    geometries.forEach(g=>g.dispose())
  }
  ;[cube,cylinder,sphere,plane].forEach(g=>g.dispose())
  return {group, bounds:{minX:-5.42,maxX:5.42,minZ:-5.05,maxZ:7.02}, blockers, stations,
    spawn:{x:0,z:-1.46,yaw:0}, doorSpawn:{x:0,z:6.05,yaw:0}}
}
