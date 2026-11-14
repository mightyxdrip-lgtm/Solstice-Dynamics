import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { State } from './engine'

type Point = [number, number, number]
const up = new T.Vector3(0, 1, 0)
const tau = Math.PI * 2
const mat = (color: number, roughness = .67, metalness = .23) =>
  new T.MeshStandardMaterial({ color, roughness, metalness })

/** Bake small fittings into one draw call per finish. Positions are local to the facility. */
class Assembly {
  bins = new Map<T.Material, T.BufferGeometry[]>()
  add(geometry: T.BufferGeometry, material: T.Material, at: Point, rot: Point = [0,0,0], scale: Point = [1,1,1]) {
    const q = new T.Quaternion().setFromEuler(new T.Euler(...rot))
    const transform = new T.Matrix4().compose(new T.Vector3(...at), q, new T.Vector3(...scale))
    this.collect(geometry, material, transform)
  }
  collect(source: T.BufferGeometry, material: T.Material, transform: T.Matrix4) {
    const geometry = source.index ? source.toNonIndexed() : source
    if (source !== geometry) source.dispose()
    geometry.applyMatrix4(transform)
    geometry.clearGroups()
    const bin = this.bins.get(material) ?? []
    bin.push(geometry)
    this.bins.set(material, bin)
  }
  box(m: T.Material, at: Point, size: Point, rot: Point = [0,0,0]) {
    this.add(new T.BoxGeometry(...size), m, at, rot)
  }
  drum(m: T.Material, at: Point, upper: number, lower: number, height: number, n = 32) {
    this.add(new T.CylinderGeometry(upper,lower,height,n), m, at)
  }
  rod(m: T.Material, a: Point, b: Point, r: number, n = 8) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), direction = end.clone().sub(start)
    const mid = start.addScaledVector(direction, .5)
    const q = new T.Quaternion().setFromUnitVectors(up, direction.clone().normalize())
    this.collect(new T.CylinderGeometry(r,r,direction.length(),n),m,
      new T.Matrix4().compose(mid,q,new T.Vector3(1,1,1)))
  }
  finish() {
    const group = new T.Group()
    for (const [material,geometries] of this.bins) {
      const combined = mergeGeometries(geometries)
      if (!combined) throw new Error('Incompatible module geometry')
      const mesh = new T.Mesh(combined,material)
      mesh.castShadow = !material.transparent
      mesh.receiveShadow = true
      group.add(mesh)
      geometries.forEach(g => g.dispose())
    }
    this.bins.clear()
    return group
  }
}

function canvasTexture(w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width=w; canvas.height=h
  const g=canvas.getContext('2d')!
  paint(g)
  const texture=new T.CanvasTexture(canvas)
  texture.colorSpace=T.SRGBColorSpace
  texture.anisotropy=4
  return texture
}

function hullSkin() {
  const skin=canvasTexture(1024,256,g=>{
    g.fillStyle='#d7cbb9';g.fillRect(0,0,1024,256)
    // Sand abrasion, fastener rows and removable exterior insulation panels.
    let seed=84299
    const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
    for(let segment=0;segment<16;segment++){
      const x=segment*64
      g.fillStyle='rgba(102,75,55,'+(random()*.095)+')';g.fillRect(x,0,64,256)
      g.strokeStyle='#8f877f';g.lineWidth=1;g.strokeRect(x+1,2,62,248)
      g.fillStyle='#e3dfd3';g.fillRect(x+2,0,1,246)
      for(let j=0;j<8;j++){
        g.fillStyle='#767269'
        g.fillRect(x+4,13+31*j,1.4,1.4);g.fillRect(x+59,13+31*j,1.4,1.4)
      }
      if(segment%3===1){g.fillStyle='#9b5031';g.fillRect(x+9,67,13,3);g.fillStyle='#64696b';g.fillRect(x+9,73,22,1)}
    }
    for(let i=0;i<12500;i++){g.fillStyle=random()>.5?'rgba(42,38,32,.075)':'rgba(255,242,211,.095)';g.fillRect(random()*1024,random()*256,1.4,1.4)}
    const dirt=g.createLinearGradient(0,160,0,256);dirt.addColorStop(0,'rgba(110,63,34,0)');dirt.addColorStop(1,'rgba(118,68,38,.34)');g.fillStyle=dirt;g.fillRect(0,160,1024,96)
  })
  return new T.MeshStandardMaterial({map:skin,color:0xfff4e4,roughness:.77,metalness:.13})
}

function plate(title:string,sub:string, light=false){
  const map=canvasTexture(512,192,g=>{
    g.fillStyle=light?'#ded6bd':'#283030';g.fillRect(0,0,512,192)
    g.fillStyle='#d8733c';g.fillRect(0,0,13,192)
    g.fillStyle=light?'#343b39':'#e3dfcd'
    g.font='bold 76px Arial';g.fillText(title,27,105)
    g.font='bold 22px monospace';g.fillText(sub,30,151)
    g.fillStyle='#93978e';g.fillRect(396,137,79,3)
  })
  return new T.MeshStandardMaterial({map,roughness:.78,metalness:.12})
}

function solarSkin(){
  return new T.MeshStandardMaterial({map:canvasTexture(512,288,g=>{
    g.fillStyle='#8d9da4';g.fillRect(0,0,512,288)
    g.fillStyle='#243b51';g.fillRect(4,4,504,280)
    for(let y=0;y<6;y++)for(let x=0;x<12;x++){
      const left=6+x*41.7,top=6+y*46.2
      g.fillStyle=['#223754','#2a4261','#273c58','#2b4461'][(x*3+y*5)%4]
      g.beginPath();g.moveTo(left+3,top);g.lineTo(left+38,top);g.lineTo(left+40,top+3);g.lineTo(left+40,top+41);g.lineTo(left+37,top+44);g.lineTo(left+2,top+44);g.lineTo(left,top+42);g.lineTo(left,top+3);g.closePath();g.fill()
      g.strokeStyle='#718b9f';g.lineWidth=.6
      for(let j=1;j<8;j++){g.beginPath();g.moveTo(left+2,top+j*5.5);g.lineTo(left+38,top+j*5.5);g.stroke()}
      g.fillStyle='#9aa8a7';g.fillRect(left+18.5,top+1,.85,41)
    }
    g.fillStyle='#a2a8a8';g.fillRect(253,0,4,288)
  }),color:0xe8f3ff,roughness:.37,metalness:.25})
}

const ringPoint=(r:number,h:number,a:number):Point=>[Math.sin(a)*r,h,Math.cos(a)*r]
function ladder(b:Assembly,m:T.Material, x:number,z:number,base:number,top:number,width=.4){
  for(const side of [-1,1])b.rod(m,[x+side*width/2,base,z],[x+side*width/2,top,z],.03)
  for(let y=base+.12;y<top;y+=.26)b.rod(m,[x-width/2,y,z],[x+width/2,y,z],.024)
}

/** Mid-height ribbed pressure passage between facilities, with ground-mounted supports. */
function passage(b:Assembly,m:T.Material,ribs:T.Material,a:Point,end:Point,radius=.57){
  b.rod(m,a,end,radius,20)
  const p=new T.Vector3(...a),q=new T.Vector3(...end),dir=q.clone().sub(p).normalize()
  const count=Math.max(2,Math.ceil(p.distanceTo(q)/.88))
  for(let i=0;i<=count;i++){
    const center=p.clone().lerp(q,i/count),left=center.clone().addScaledVector(dir,-.045),right=center.clone().addScaledVector(dir,.045)
    b.rod(ribs,left.toArray() as Point,right.toArray() as Point,radius+.035,20)
    if(i%3===1)b.box(ribs,[center.x,Math.max(.08,(center.y-radius)/2),center.z],[.45,Math.max(.16,center.y-radius),.44])
  }
}

export function createBuildings(){
  const ivory=hullSkin(), bone=mat(0xc8bca6), alloy=mat(0x8c9391,.5,.56), titanium=mat(0x596369,.58,.46)
  const graphite=mat(0x303738,.66,.28), rubber=mat(0x24282a,.9,.05), ochre=mat(0xa8502e), gold=mat(0xc69748)
  const sand=mat(0xa46e51,.93,.02), green=mat(0x758547,.86,.05), leaf=mat(0x3e683e,.86,.05)
  const window=mat(0x374f51,.24,.48);window.emissive.setHex(0xa97d48);window.emissiveIntensity=.3
  const glow=mat(0xffd49b,.55,.1);glow.emissive.setHex(0xffb36a);glow.emissiveIntensity=.75
  const growLight=mat(0xffe2a2);growLight.emissive.setHex(0xffb17d)
  const glass=new T.MeshStandardMaterial({color:0x9ccbc3,roughness:.2,metalness:.22,transparent:true,opacity:.26,depthWrite:false,side:T.DoubleSide})
  const pv=solarSkin()

  const hab=new Assembly()
  hab.drum(graphite,[0,.33,0],3.05,3.02,.48)
  hab.drum(ivory,[0,2.15,0],2.97,3.34,3.4,48)
  for (const [r,y,h] of [[3.34,.52,.14],[3.24,1.47,.05],[3.11,2.84,.12],[3.02,3.75,.15]])hab.drum(alloy,[0,y,0],r,r+.01,h,48)
  hab.drum(ochre,[0,1.18,0],3.285,3.30,.18,48)
  hab.drum(bone,[0,3.98,0],2.35,3.05,.39,48)
  hab.drum(titanium,[0,4.23,0],1.42,1.48,.22)
  hab.drum(ivory,[0,4.42,0],1.05,1.44,.20)
  for(let i=0;i<16;i++){
    const a=i*tau/16
    hab.box(graphite,ringPoint(3.09,3.2,a),[1.04,.59,.09],[0,a,0])
    hab.box(window,ringPoint(3.143,3.2,a),[.88,.41,.035],[0,a,0])
    hab.box(alloy,ringPoint(3.18,3.47,a),[1.10,.052,.13],[0,a,0])
    if(i%2===0){
      hab.rod(titanium,ringPoint(3.1,1.65,a),ringPoint(3.58,.16,a),.10)
      hab.box(graphite,ringPoint(3.59,.13,a),[.64,.16,.43],[0,a,0])
      hab.rod(alloy,ringPoint(2.82,3.94,a),ringPoint(2.82,4.31,a),.028)
      hab.rod(alloy,ringPoint(2.82,4.30,a),ringPoint(2.82,4.30,a+tau/8),.029)
    }
  }
  hab.box(titanium,[0,1.32,3.17],[1.67,2.0,1.02]);hab.box(ivory,[0,1.42,3.53],[1.55,1.86,.55])
  hab.box(ochre,[0,1.34,3.83],[1.2,1.53,.09]);hab.box(graphite,[0,1.35,3.89],[1.03,1.38,.08])
  hab.box(bone,[0,1.33,3.945],[.88,1.19,.04]);hab.box(window,[0,1.53,3.98],[.57,.38,.04])
  hab.box(glow,[0,2.20,3.84],[.74,.065,.12])
  for(let i=0;i<4;i++)hab.box(alloy,[0,.48-i*.11,3.97+i*.29],[1.37,.12,.35])
  for(const sign of [-1,1]){
    hab.rod(gold,[sign*.77,.62,3.72],[sign*.77,1.29,3.72],.034)
    hab.rod(gold,[sign*.77,1.29,3.72],[sign*.77,.74,5.0],.034)
    hab.rod(gold,[sign*.77,.74,5.0],[sign*.77,.15,5.0],.034)
  }
  const habLabel=plate('HAB 01','ARES  /  CREW SYSTEMS',true)
  for(const a of [-1,1.18,3.0])hab.add(new T.PlaneGeometry(1.45,.64),habLabel,ringPoint(3.215,2.1,a),[0,a,0])
  hab.rod(titanium,[-1.3,4.05,.25],[-1.3,5.35,.25],.085)
  // A paraboloid of revolution with a visible feed horn.
  const dishCurve=Array.from({length:13},(_,i)=>{const r=i*.063;return new T.Vector2(r,.43*r*r)})
  const dishMetal=alloy.clone();dishMetal.side=T.DoubleSide
  hab.add(new T.LatheGeometry(dishCurve,32),dishMetal,[-1.3,5.17,.25],[-.32,0,-.50])
  hab.rod(titanium,[-1.28,5.18,.22],[-1.00,5.79,.08],.036)
  hab.rod(alloy,[1.15,4.03,-.6],[1.15,6.35,-.6],.035)
  hab.rod(titanium,[1.15,4.03,-.6],[1.15,4.96,-.6],.085)
  hab.box(ochre,[1.15,6.31,-.6],[.09,.16,.09])
  hab.drum(bone,[-.20,4.33,-1.92],.43,.43,.56,18);hab.drum(titanium,[-.2,4.64,-1.92],.51,.48,.08,20)
  passage(hab,ivory,titanium,[2.85,.94,1.42],[10.7,.94,5.52])
  passage(hab,ivory,titanium,[2.18,.92,-2.17],[6.45,.92,-7.09])

  const water=new Assembly()
  water.box(titanium,[0,.17,0],[6.95,.24,4.46])
  water.box(graphite,[0,.34,0],[6.72,.16,4.22])
  for(const [x,z,h] of [[-1.64,-.27,3.65],[.71,-.60,4.12],[2.30,.84,2.6]]){
    const r=h>3?1.0:.66
    water.drum(titanium,[x,.58,z],r*.88,r*.96,.32)
    water.drum(alloy,[x,.77+h*.5,z],r,r,h,36)
    water.add(new T.SphereGeometry(r,28,12,0,tau,0,Math.PI*.5),alloy,[x,.77+h,z],[0,0,0],[1,.37,1])
    for(let j=0;j<5;j++)water.drum(j===0||j===4?titanium:bone,[x,.85+j*(h-.16)/4,z],r+.025,r+.025,j===2?.13:.052)
    ladder(water,gold,x+.08,z+r+.08,.55,.93+h,.33)
    water.drum(graphite,[x,1.17+h,z],.25,.27,.15)
    water.rod(ochre,[x,1.22+h,z],[x,1.60+h,z],.115)
    water.rod(ochre,[x,1.6+h,z],[x,1.6+h,z-.92],.115)
    water.rod(ochre,[x,1.6+h,z-.92],[x,.77,z-.92],.115)
    water.box(bone,[x,.9+h*.52,z+r],[.46,.66,.055])
  }
  water.box(ivory,[-1.45,1.12,1.42],[2.15,1.53,1.22])
  water.add(new T.PlaneGeometry(1.39,.52),plate('WTR 02','CLOSED LOOP'),[-1.45,1.35,2.038])
  for(let j=0;j<9;j++)water.box(graphite,[-2.27+j*.20,.81,2.04],[.105,.36,.05])
  water.rod(titanium,[-1.6,.65,1.2],[2.55,.65,1.2],.23)
  water.rod(gold,[1.22,.82,1.42],[1.22,1.46,1.42],.047)
  water.add(new T.TorusGeometry(.23,.031,8,20),ochre,[1.22,1.46,1.42],[Math.PI/2,0,0])
  for(const x of [-3.21,3.21])for(const z of [-1.8,1.8])water.box(bone,[x,.23,z],[.45,.42,.45])
  for(let j=0;j<2;j++)passage(water,j?titanium:ochre,graphite,[-3.15,.37+j*.29,.05],[-7.5,.37+j*.29,-2.1],.125)

  const greenhouse=new Assembly()
  greenhouse.drum(titanium,[0,.18,0],3.81,3.65,.33,48)
  greenhouse.drum(ivory,[0,.46,0],3.64,3.78,.34,48)
  greenhouse.drum(ochre,[0,.68,0],3.65,3.66,.105,48)
  greenhouse.drum(graphite,[0,.69,0],3.52,3.52,.045,48)
  const domeRadius=3.56,domeHeight=2.99,segments=16,bands=5
  const node=(band:number,i:number):Point=>{
    const angle=(i+(band%2)*.5)*tau/segments,latitude=band*Math.PI/(2*bands)
    return [domeRadius*Math.cos(latitude)*Math.cos(angle),.72+domeHeight*Math.sin(latitude),domeRadius*Math.cos(latitude)*Math.sin(angle)]
  }
  const glassVertices:number[]=[]
  const triangle=(a:Point,b:Point,c:Point)=>glassVertices.push(...a,...b,...c)
  for(let row=0;row<bands;row++){
    for(let i=0;i<segments;i++){
      const a=node(row,i),b=node(row,i+1)
      greenhouse.rod(alloy,a,b,.032)
      if(row===bands-1){const top=node(bands,0);triangle(a,b,top);greenhouse.rod(alloy,a,top,.03);continue}
      const vertex=i+row%2,c=node(row+1,vertex),d=node(row+1,vertex-1)
      triangle(a,b,c);triangle(a,c,d)
      greenhouse.rod(alloy,a,c,.032);greenhouse.rod(alloy,a,d,.032)
    }
  }
  const panels=new T.BufferGeometry()
  panels.setAttribute('position',new T.Float32BufferAttribute(glassVertices,3));panels.computeVertexNormals()
  panels.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(glassVertices.length/3*2),2))
  greenhouse.add(panels,glass,[0,0,0])
  greenhouse.drum(bone,[0,3.71,0],.19,.31,.1,16)
  for(let row=-2;row<=2;row++){
    const x=row*1.04,length=5.2-Math.abs(row)*.77
    greenhouse.box(bone,[x,.84,0],[.72,.24,length])
    greenhouse.box(graphite,[x,.97,0],[.66,.04,length-.09])
    const count=Math.floor(length/.42)
    for(let j=0;j<count;j++){
      const z=(j-(count-1)/2)*.41
      greenhouse.add(new T.IcosahedronGeometry(.21,0),j%3?green:leaf,[x-.13,1.13,z],[0,j*.7,0],[.82,1.1,1])
      greenhouse.add(new T.IcosahedronGeometry(.22,0),j%3?leaf:green,[x+.14,1.15,z+.05],[0,j*.3,.14],[.83,1.34,.8])
    }
  }
  for(const x of [-1.4,1.4]){
    greenhouse.rod(titanium,[x,1,-1.7],[x,2.1,-1.7],.043);greenhouse.rod(titanium,[x,1,1.7],[x,2.1,1.7],.043)
    greenhouse.box(growLight,[x,2.12,0],[.11,.09,3.47])
  }
  greenhouse.box(ivory,[0,.93,3.35],[1.63,1.5,1.41])
  greenhouse.box(titanium,[0,.86,4.07],[1.25,1.32,.07])
  greenhouse.box(graphite,[0,.83,4.12],[.95,1.13,.06])
  greenhouse.box(window,[0,1.01,4.155],[.72,.45,.04])
  greenhouse.add(new T.PlaneGeometry(1.1,.34),plate('AGR 03','CROP LAB'),[0,1.56,4.07])

  function panelRack(x:number,z:number){
    const rack=new Assembly()
    rack.box(titanium,[x,.12,z],[.83,.20,.83])
    rack.drum(alloy,[x,.67,z],.128,.20,.99,12)
    rack.rod(ochre,[x-.64,1.11,z],[x+.64,1.11,z],.115)
    for(const side of [-1,1])rack.rod(titanium,[x,.68,z],[x+side*1.02,1.13,z],.055)
    const support=rack.finish(),table=new Assembly(),tilt=-.37
    table.box(alloy,[0,0,0],[3.18,.12,1.97],[tilt,0,0])
    table.add(new T.PlaneGeometry(3.11,1.90),pv,[0,.071,-.026],[-Math.PI/2+tilt,0,0])
    const panel=table.finish();panel.name='collector';panel.position.set(x,1.31,z);support.add(panel);return support
  }
  const solar=new T.Group()
  for(const x of [-1.78,1.78])for(const z of [-2.14,.20,2.54])solar.add(panelRack(x,z))
  const solarKit=new Assembly()
  solarKit.box(bone,[3.73,.56,-1.1],[.72,.95,1.22]);solarKit.box(ochre,[3.73,1.09,-1.1],[.81,.15,1.35])
  solarKit.add(new T.PlaneGeometry(.61,.28),plate('PV 04','DC BUS'),[3.73,.72,-.482])
  solarKit.rod(rubber,[3.63,.13,-1.13],[3.17,.13,-3.1],.067)
  solarKit.rod(rubber,[3.17,.13,-3.1],[2.08,.13,-5.96],.067)
  solar.add(solarKit.finish())

  const shelter=new Assembly()
  const width=2.29,length=5.12
  shelter.box(titanium,[0,.18,0],[4.93,.35,5.48])
  // The vault is formed by parallel protective arches resting at ground level.
  const arch=(r:number,z:number,t:number):Point=>[r*Math.cos(t),.23+r*.82*Math.sin(t),z]
  const vault:number[]=[]
  for(let i=0;i<24;i++){
    const a=i*Math.PI/24,b=(i+1)*Math.PI/24
    const p=arch(width,-length/2,a),q=arch(width,-length/2,b),r=arch(width,length/2,a),s=arch(width,length/2,b)
    vault.push(...p,...q,...s,...p,...s,...r,...r,...s,0,.23,length/2,...q,...p,0,.23,-length/2)
  }
  const shell=new T.BufferGeometry();shell.setAttribute('position',new T.Float32BufferAttribute(vault,3));shell.computeVertexNormals()
  shell.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(vault.length/3*2),2))
  const shellMat=sand.clone();shellMat.side=T.DoubleSide
  shelter.add(shell,shellMat,[0,0,0])
  for(let j=0;j<7;j++)for(let i=0;i<12;i++)shelter.rod(titanium,arch(width+.04,-2.58+j*.86,i*Math.PI/12),arch(width+.04,-2.58+j*.86,(i+1)*Math.PI/12),.064)
  shelter.box(bone,[0,1.02,2.65],[2.08,1.75,.44]);shelter.box(ochre,[0,.97,2.90],[1.58,1.51,.15])
  shelter.box(graphite,[0,.93,3.00],[1.27,1.37,.11]);shelter.box(alloy,[0,.94,3.07],[1.13,1.24,.05])
  shelter.add(new T.PlaneGeometry(.76,.28),plate('SHL 05','REFUGE'),[0,1.11,3.10])
  shelter.box(glow,[0,1.89,2.9],[.72,.085,.17])
  for(const x of [-1.8,1.8]){shelter.rod(titanium,[x,1.15,-1.7],[x,2.73,-1.7],.17);shelter.drum(bone,[x,2.76,-1.7],.30,.25,.12,20)}

  const modules=[hab.finish(),water.finish(),greenhouse.finish(),solar,shelter.finish()]
  const positions:Point[]=[[-8,0,-3],[10,0,-9],[6,0,4],[-10,0,8],[0,0,-12]]
  for(let i=0;i<modules.length;i++){
    modules[i].position.set(...positions[i]);modules[i].userData.moduleIndex=i
    modules[i].name=['Habitat','Water processor','Greenhouse','Solar array','Storm shelter'][i]
  }
  const solarExtensions:T.Group[]=[]
  const shielding:T.Group[]=[]
  for(let level=0;level<3;level++){
    const wall=new Assembly()
    for(const side of [-1,1])for(let j=0;j<5;j++){
      const x=side*(2.36-level*.29),z=-2.08+j*1.03
      wall.box(sand,[x,.40+level*.49,z],[.73,.65,.97],[0,.04*side,0])
      wall.box(titanium,[x,.42+level*.49,z-.25],[.75,.68,.055])
      wall.box(titanium,[x,.42+level*.49,z+.25],[.75,.68,.055])
    }
    const g=wall.finish();modules[4].add(g);g.visible=false;shielding.push(g)
  }
  // Habitat fan speed and greenhouse lamp output follow the commanded settings.
  const fan=new Assembly()
  for(let i=0;i<5;i++){const a=i*tau/5;fan.box(graphite,ringPoint(.24,0,a),[.145,.055,.38],[0,a+.25,0])}
  const rotor=fan.finish();rotor.position.set(-.2,4.71,-1.92);modules[0].add(rotor)
  const faultPanels=[solar.children[1],solar.children[4]].map(g=>g.getObjectByName('collector')!)
  let targetTilt=0,fanRate=1
  function update(state:State) {
    targetTilt=state.fieldwork?.solar==='repaired'?0:-.70
    const requested=Math.max(0,Math.min(14,Math.trunc(state.solar)))
    while(solarExtensions.length<requested){
      const i=solarExtensions.length
      const rack=panelRack(-5.21-3.46*Math.floor(i/3),-2.14+(i%3)*2.34)
      solar.add(rack);solarExtensions.push(rack)
    }
    solarExtensions.forEach((rack,i)=>{rack.visible=i<requested})
    shielding.forEach((layer,i)=>{layer.visible=i<state.shield-1})
    growLight.emissiveIntensity=state.status==='failure'?.06:state.settings.priority==='crops'?1.65:state.settings.priority==='life'?.25:.72
    window.emissiveIntensity=state.settings.air==='eco'?.13:.34
    fanRate=state.status==='failure'?0:state.settings.air==='eco'?.65:1.5
  }
  function animate(time:number){rotor.rotation.y=time*fanRate;for(const panel of faultPanels)panel.rotation.x+=(targetTilt-panel.rotation.x)*.12}
  return {modules,update,animate}
}

