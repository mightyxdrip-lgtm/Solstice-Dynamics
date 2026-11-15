import * as T from 'three'
import {Assembly} from './buildings'
import {terrainHeight} from './terrain'
import {bearingBetween,crystalRock,roverBay,surveyBeacon,surveyWork,type Survey} from './roverRoute'

export interface SamplerInput {
 aim:number
 drill:number
 transfer:number
 buttons:(HTMLButtonElement|null)[]
 pressTool?:(index:number)=>void
 releaseTool?:()=>void
}
const up=new T.Vector3(0,1,0)
const stoneOffsets=[[1.28,-2.83],[0,-3.05],[-1.24,-2.60]]
export function createRoverSampler(vehicle:T.Group,fixtures:T.Group,folded:T.Group){
 const paint=(color:number,roughness=.7)=>new T.MeshStandardMaterial({color,roughness,metalness:.22})
 const cream=paint(0xf0ddbb),dark=paint(0x303a41),gold=paint(0xeaa44a),steel=paint(0xaeafb0,.32)
 const gem=new T.MeshStandardMaterial({color:0x55e0ff,emissive:0x137fa3,emissiveIntensity:.8,roughness:.22,metalness:.25})
 const heading=bearingBetween(roverBay,surveyBeacon)
 function fixture(site:typeof roverBay,x:number,z:number){
  const group=new T.Group()
  const wx=site.x+Math.cos(heading)*x+Math.sin(heading)*z,wz=site.z-Math.sin(heading)*x+Math.cos(heading)*z
  group.position.set(wx,terrainHeight(wx,wz),wz);group.rotation.y=heading;fixtures.add(group);return group
 }
 const rocks=stoneOffsets.map(([x,z],index)=>{
  const rock=fixture(surveyBeacon,x,z),specimen=new Assembly()
  const base=paint([0x8d5740,0x534441,0x715b51][index])
  specimen.add(new T.DodecahedronGeometry(1),base,[0,.13,0],[.32,index*1.2,.13],[.51,.30,.39])
  for(let j=0;j<4;j++){
   const a=j*2.4,dx=Math.sin(a)*.20,dz=Math.cos(a)*.15
   if(index===crystalRock){
    const h=.24+j*.039
    specimen.add(new T.CylinderGeometry(.082,.12,h,5),gem,[dx,.28+h*.43,dz],[.13*j,0,dx])
    specimen.add(new T.ConeGeometry(.083,.12,5),gem,[dx,.32+h*.90,dz],[.13*j,0,dx])
   }else{
    specimen.add(new T.IcosahedronGeometry(1,0),base,[dx,.26,dz],[.3,a,.23],[.18,.11,.15])
   }
  }
  const boulder=specimen.finish();rock.add(boulder);return rock
 })
 const carrier=new Assembly()
 carrier.drum(dark,[0,.07,0],.22,.24,.14,16)
 carrier.drum(cream,[0,.20,0],.22,.22,.13,16)
 carrier.drum(gold,[0,.30,0],.24,.24,.07,16)
 carrier.drum(dark,[0,.341,0],.186,.186,.012,16)
 const socket=carrier.finish();socket.position.set(.63,1.28,-.59);vehicle.add(socket)
 const lab=fixture(roverBay,1.35,-2.42),bench=new Assembly()
 for(const x of [-.38,.38])for(const z of [-.25,.25])bench.rod(steel,[x,0,z],[x,.67,z],.045)
 bench.box(cream,[0,.69,0],[1.02,.15,.72]);bench.box(dark,[0,.79,0],[.86,.07,.58])
 bench.drum(gold,[0,.85,0],.20,.21,.09,14);bench.drum(dark,[0,.901,0],.15,.15,.025,14)
 lab.add(bench.finish())
 const arm=new T.Group();vehicle.add(arm)
 const upper=new T.Mesh(new T.CylinderGeometry(.078,.10,1,12),cream)
 const fore=new T.Mesh(new T.CylinderGeometry(.059,.077,1,12),steel)
 const hose=new T.Mesh(new T.CylinderGeometry(.025,.025,1,8),dark)
 const baseJoint=new T.Mesh(new T.SphereGeometry(.142,16,10),gold),elbowJoint=baseJoint.clone(),wrist=baseJoint.clone()
 const head=new Assembly();head.drum(dark,[0,.075,0],.14,.14,.19,16);head.drum(gold,[0,.028,0],.149,.149,.065,16)
 head.drum(steel,[0,-.105,0],.055,.046,.19,10)
 for(let i=0;i<6;i++)head.box(dark,[Math.sin(i)*.044,-.06-i*.018,Math.cos(i)*.044],[.055,.016,.06],[0,i,.3])
 const drillHead=head.finish();arm.add(upper,fore,hose,baseJoint,elbowJoint,wrist,drillHead)
 arm.traverse(o=>{if(o instanceof T.Mesh)o.castShadow=true})
 const sample=new Assembly();sample.drum(gem,[0,.12,0],.082,.077,.24,7)
 sample.drum(cream,[0,0,0],.104,.104,.045,12);sample.drum(gold,[0,.24,0],.103,.103,.045,12)
 const core=sample.finish();vehicle.add(core)
 const delivered=core.clone();delivered.position.set(0,.88,0);lab.add(delivered)
 const dust=new T.InstancedMesh(new T.IcosahedronGeometry(.026,0),paint(0xdc925c),18)
 arm.add(dust);dust.frustumCulled=false
 const debris=new T.Object3D(),v=new T.Vector3(),tip=new T.Vector3(),from=new T.Vector3(),to=new T.Vector3()
 const base=new T.Vector3(.62,1,-.94),elbow=new T.Vector3(),headPos=new T.Vector3(),aim=new T.Vector3()
 const facing=new T.Vector3(),lens=new T.Vector3(),anchor=new T.Vector3(),socketTop=new T.Vector3(.63,1.65,-.59)
 const ray=new T.Raycaster(),pointer=new T.Vector2()
 function hit(leg:Survey|undefined,camera:T.Camera,x:number,y:number){
  if(!surveyWork(leg))return -1
  const targets=leg==='chooseRock'?rocks:leg==='drill'?[rocks[crystalRock],drillHead]:leg==='stow'?[socket,core]:[lab,core]
  ray.setFromCamera(pointer.set(x,y),camera)
  const first=ray.intersectObjects(targets,true)[0]
  if(!first)return -1
  let node:T.Object3D|null=first.object
  while(node){const index=targets.indexOf(node as T.Group);if(index>=0)return index;node=node.parent}
  return -1
 }
 let previous:Survey|undefined,siteAim=false
 function worldPoint(root:T.Object3D,h:number,out:T.Vector3){return root.localToWorld(out.set(0,h,0))}
 function localPoint(root:T.Object3D,h:number,out:T.Vector3){return vehicle.worldToLocal(worldPoint(root,h,out))}
 function link(mesh:T.Mesh,a:T.Vector3,b:T.Vector3){
  v.subVectors(b,a);mesh.position.copy(a).addScaledVector(v,.5);mesh.scale.y=v.length()
  mesh.quaternion.setFromUnitVectors(up,v.normalize())
 }
 function update(leg:Survey|undefined,controls:SamplerInput,camera:T.Camera,width:number,height:number,dt:number,clock:number){
  const work=surveyWork(leg),changed=leg!==previous
  previous=leg;folded.visible=!work;arm.visible=work
  core.visible=leg==='stow'||leg==='inbound'||leg==='unload';delivered.visible=leg==='done'
  if(!work){if(core.visible)core.position.copy(socketTop);siteAim=false;return changed}
  let rock=leg==='chooseRock'?controls.aim:crystalRock
  const seek=rocks[rock]
  const progress=controls.drill,transfer=T.MathUtils.smoothstep(controls.transfer,0,1)
  if(leg==='unload'){
   from.copy(socketTop);localPoint(lab,.90,to)
  }else{
   localPoint(seek,rock===crystalRock?.62:.43,from);to.copy(socketTop)
  }
  if(leg==='chooseRock'||leg==='drill'){
   aim.copy(from);aim.y+=leg==='drill'?.30-progress*.34:.28
   if(!siteAim)tip.copy(aim)
   tip.lerp(aim,1-Math.exp(-dt*11));siteAim=true
  }else{
   core.position.lerpVectors(from,to,transfer)
   core.position.y+=(1-transfer)*(leg==='stow'?.28:0)+Math.sin(transfer*Math.PI)*.87
   tip.copy(core.position);tip.y+=.33
  }
  headPos.copy(tip);headPos.y+=.19
  elbow.lerpVectors(base,headPos,.48);elbow.y=Math.max(base.y+.39,headPos.y+.24)+Math.sin(transfer*Math.PI)*.12
  link(upper,base,elbow);link(fore,elbow,headPos)
  from.copy(base);from.x+=.085;to.copy(elbow);to.x+=.08;link(hose,from,to)
  baseJoint.position.copy(base);elbowJoint.position.copy(elbow);wrist.position.copy(headPos);wrist.scale.setScalar(.7)
  drillHead.position.copy(tip);drillHead.rotation.y=leg==='drill'&&progress>0?clock*25:0
  dust.visible=leg==='drill'&&progress>.35
  if(dust.visible){
   for(let i=0;i<dust.count;i++){
    const u=(clock*2.3+i/18)%1,a=i*2.4
    debris.position.set(tip.x+Math.sin(a)*u*.46,tip.y-.18+Math.sin(u*Math.PI)*.24,tip.z+Math.cos(a)*u*.46)
    debris.scale.setScalar(1-u);debris.updateMatrix();dust.setMatrixAt(i,debris.matrix)
   }
   dust.instanceMatrix.needsUpdate=true
  }
  const aspect=width/height,extra=Math.max(0,1.18/aspect-1)
  vehicle.localToWorld(lens.set(.28,2.72+extra*.68,-5.34-extra*1.25))
  vehicle.localToWorld(facing.set(.05,.81,-1.49));camera.position.copy(lens);camera.lookAt(facing);camera.updateMatrixWorld()
  controls.buttons.forEach((btn,i)=>{
   if(!btn)return
   if(leg==='stow')worldPoint(socket,.45,anchor)
   else if(leg==='unload')worldPoint(lab,1.03,anchor)
   else worldPoint(rocks[leg==='drill'?crystalRock:i],.31,anchor)
   anchor.project(camera)
   const x=T.MathUtils.clamp((anchor.x+1)*width*.5,30,width-30)
   const y=T.MathUtils.clamp((1-anchor.y)*height*.5+30,70,height-58)
   btn.style.left=x+'px';btn.style.top=y+'px';btn.style.visibility='visible'
  })
  return true
 }
 return {update,hit}
}
