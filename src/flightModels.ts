import * as T from 'three'
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js'
import {Assembly} from './buildings'

// NASA Langley's Z-2 has one continuous surface. Bind the pressure suit once
// in its standing pose so the shoulders, elbows, hips and knees move with it.
let suitSource:Promise<{geo:T.BufferGeometry;material:T.Material|T.Material[]}>|undefined
export function loadFlightSuit(){
 return suitSource??=new GLTFLoader().loadAsync('./z2.glb').then(({scene})=>{
  scene.updateMatrixWorld(true)
  const mesh=scene.getObjectByProperty('isMesh',true) as T.Mesh
  const geo=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);geo.translate(0,-.99,0)
  const pos=geo.getAttribute('position'),weights=new Float32Array(pos.count*4),indices=new Uint16Array(pos.count*4)
  for(let i=0;i<pos.count;i++){
   const x=pos.getX(i),y=pos.getY(i)+.99,z=pos.getZ(i),left=x<0,ax=Math.abs(x)
   const smooth=T.MathUtils.smoothstep
   const arm=smooth(ax,.21,.32)*smooth(y,.80,1.02)*(1-smooth(y,1.52,1.64))
   const leg=(1-smooth(y,.85,1.04))*(1-arm)
   const fore=arm*(1-smooth(y,1.17,1.39))*(.32+.68*smooth(z,-.08,.27))
   const shin=leg*(1-smooth(y,.43,.68))
   const totals=[[0,1-arm-leg],[left?1:3,arm-fore],[left?2:4,fore],[left?5:7,leg-shin],[left?6:8,shin]].sort((a,b)=>b[1]-a[1]).slice(0,4)
   const total=totals.reduce((s,v)=>s+v[1],0)
   totals.forEach(([j,w],k)=>{indices[i*4+k]=j;weights[i*4+k]=w/total})
  }
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(indices,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(weights,4))
  mesh.geometry.dispose()
  return {geo,material:mesh.material}
 })
}
export function rigFlightSuit(source:Awaited<ReturnType<typeof loadFlightSuit>>){
 const bones=Array.from({length:9},()=>new T.Bone()),root=bones[0]
 for(let side=0;side<2;side++){
  const sign=side===0?-1:1,arm=bones[1+side*2],fore=bones[2+side*2],leg=bones[5+side*2],shin=bones[6+side*2]
  arm.position.set(sign*.27,.49,0);fore.position.set(sign*.045,-.22,.13);root.add(arm);arm.add(fore)
  leg.position.set(sign*.14,-.065,0);shin.position.set(0,-.42,.02);root.add(leg);leg.add(shin)
 }
 const suit=new T.SkinnedMesh(source.geo,source.material)
 suit.add(root);suit.bind(new T.Skeleton(bones));suit.castShadow=true;suit.receiveShadow=true;suit.frustumCulled=false
 function pose(t:number,brace:number,lift:number){
  for(let i=0;i<2;i++){
   const sign=i===0?-1:1
   bones[1+i*2].rotation.set(-brace*(i===0?.14:.06)+lift*.09,sign*brace*.025,sign*(brace*.055+lift*.12))
   bones[2+i*2].rotation.x=-brace*(i===0?.10:.06)+Math.sin(t*3+i)*lift*.045
   bones[5+i*2].rotation.set(-brace*.065+sign*(.08*brace+.20*lift),0,sign*(.025*brace+.05*lift))
   bones[6+i*2].rotation.x=brace*.08+lift*(.12+i*.09)
  }
 }
 return {suit,pose}
}

// Paint panel seams, thermal blankets and flight markings into the surface
// maps so the craft retains detail without a draw call per tile or fastener.
function skin(kind:'capsule'|'booster'|'blanket'){
 const c=document.createElement('canvas');c.width=1536;c.height=768
 const g=c.getContext('2d')!;let seed=1349
 const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)
 const blanket=kind==='blanket',boost=kind==='booster'
 const cols=blanket?32:boost?18:30,rows=blanket?6:boost?4:12
 g.fillStyle=blanket?'#5c4934':boost?'#737a79':'#969187';g.fillRect(0,0,c.width,c.height)
 for(let row=0;row<rows;row++)for(let col=-1;col<=cols;col++){
  const w=c.width/cols,h=c.height/rows,x=(col+(boost?0:row%2*.5))*w,y=row*h
  const v=Math.round((blanket?130:boost?202:205)+rand()*(blanket?56:22))
  g.fillStyle=blanket?'rgb('+v+','+(v*.78)+','+(v*.48)+')':'rgb('+v+','+(v-3)+','+(v-11)+')'
  g.fillRect(x+1.6,y+1.6,w-3,h-3)
  g.strokeStyle=blanket?'#47392955':'#fff9ea66';g.strokeRect(x+3,y+3,w-6,h-6)
  for(let j=0;j<(blanket?12:4);j++){
   if(blanket){g.strokeStyle=j%2?'#f9e4ba5c':'#493b3180';g.beginPath();g.moveTo(x+rand()*w,y+rand()*h);g.lineTo(x+rand()*w,y+rand()*h);g.stroke()}
   else{g.fillStyle='#595b59';g.fillRect(x+(j%2?w-7:5),y+(j>1?h-7:5),2.5,2.5)}
  }
 }
 if(boost){
  g.fillStyle='#384045';g.fillRect(0,575,c.width,98)
  for(let i=0;i<16;i++){g.fillStyle=i%2?'#c4c5bf':'#292e33';g.fillRect(i*96,555,48,22)}
  for(const x of [190,690,1200]){
   g.fillStyle='#293137';g.font='bold 63px Arial';g.fillText('SD–07',x,349)
   g.font='bold 18px Arial';g.fillText('SOLSTICE DYNAMICS',x,376)
   g.fillStyle='#b35a34';g.fillRect(x,393,135,8)
  }
 }
 const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4
 return new T.MeshStandardMaterial({map:tex,roughness:blanket?.46:.71,metalness:blanket?.48:.17})
}
export function ascentVehicle(){
 const hull=new Assembly(),ceramic=skin('capsule'),booster=skin('booster'),insulation=skin('blanket')
 const alloy=new T.MeshStandardMaterial({color:0x9fa7a9,metalness:.66,roughness:.33})
 const carbon=new T.MeshStandardMaterial({color:0x303538,metalness:.44,roughness:.55}),trim=new T.MeshStandardMaterial({color:0xb3653d,roughness:.60})
 const blue=new T.MeshPhysicalMaterial({color:0x142c3e,clearcoat:.95,roughness:.19,emissive:0x10212e,metalness:.46})
 hull.drum(carbon,[0,.56,0],.22,.47,.65);hull.drum(alloy,[0,.25,0],.455,.48,.065)
 for(let i=0;i<9;i++){const f=i/9;hull.drum(carbon,[0,.28+f*.55,0],.473-f*.22,.473-f*.22,.018)}
 hull.drum(insulation,[0,1.02,0],.83,.63,.40)
 hull.drum(booster,[0,1.92,0],.90,.84,1.5,64)
 hull.drum(alloy,[0,1.20,0],.87,.85,.09);hull.drum(carbon,[0,2.67,0],.93,.91,.12)
 hull.drum(insulation,[0,2.86,0],.94,.90,.27)
 hull.drum(carbon,[0,3.09,0],1.16,1.02,.22)
 hull.drum(ceramic,[0,3.91,0],.40,1.16,1.43,80)
 hull.drum(alloy,[0,4.66,0],.36,.42,.10);hull.drum(carbon,[0,4.75,0],.29,.35,.10)
 hull.drum(insulation,[0,4.83,0],.24,.29,.065)
 // Faired side tanks, feed lines and service-module thruster quads.
 for(const a of [Math.PI/2-.18,-Math.PI/2+.18,Math.PI]){
  const x=Math.sin(a),z=Math.cos(a)
  hull.drum(alloy,[x*.91,1.73,z*.91],.175,.175,.98)
  for(const y of [1.22,2.23])hull.add(new T.SphereGeometry(.177,20,12),alloy,[x*.91,y,z*.91],[0,0,0],[1,.78,1])
  for(const y of [1.42,1.96])hull.drum(carbon,[x*.91,y,z*.91],.185,.185,.055)
  hull.rod(trim,[x*.99,.93,z*.99],[x*.99,2.48,z*.99],.025)
  hull.box(carbon,[x*.92,2.56,z*.92],[.32,.20,.24],[0,a,0])
  for(const side of [-1,1])hull.add(new T.CylinderGeometry(.064,.037,.15,16),alloy,[x*1.065+z*side*.09,2.55,z*1.065-x*side*.09],[Math.PI/2,a,0])
 }
 // The front glazing follows the conical hull. Ribbed frames catch the rim light.
 for(const a of [-.40,.40,2.70,-2.70]){
  const r=.80,x=Math.sin(a),z=Math.cos(a),e=new T.Euler(-.48,a,0,'YXZ').reorder('XYZ')
  const rot:[number,number,number]=[e.x,e.y,e.z]
  hull.box(alloy,[x*r,3.92,z*r],[.49,.36,.042],rot)
  hull.box(carbon,[x*(r+.025),3.93,z*(r+.025)],[.44,.31,.04],rot)
  hull.box(blue,[x*(r+.042),3.935,z*(r+.042)],[.37,.238,.025],rot)
 }
 const vessel=hull.finish(),wings=new T.Group()
 for(const sign of [-1,1]){
  const side=new Assembly()
  side.rod(alloy,[sign*.72,2.25,0],[sign*1.42,2.25,0],.04)
  side.box(alloy,[sign*2.30,2.25,0],[1.89,.78,.06])
  for(let j=0;j<8;j++)for(let k=0;k<3;k++)side.box(blue,[sign*(1.50+j*.227),2.00+k*.251,.041],[.212,.22,.018])
  wings.add(side.finish())
 }
 wings.name='Orbit solar wings';wings.visible=false;vessel.add(wings)
 return vessel
}
