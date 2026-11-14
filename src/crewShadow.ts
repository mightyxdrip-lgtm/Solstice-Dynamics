import * as T from 'three'
import {terrainHeight} from './terrain'
import type {Pose} from './navigation'

// Project the articulated suit onto a small terrain-following receiver. This
// keeps the moving silhouette independent of the outpost's cached shadow map.
export function createCrewShadow(){
 const body=new T.Group(),skin=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false})
 const unit=new T.SphereGeometry(1,12,9)
 function limb(parent:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number){
  const o=new T.Mesh(unit,skin);o.position.set(x,y,z);o.scale.set(w,h,d);o.castShadow=true;parent.add(o);return o
 }
 limb(body,0,1.16,0,.242,.36,.18);limb(body,0,1.61,-.018,.185,.199,.18)
 limb(body,0,1.23,.18,.20,.29,.115);limb(body,.14,1.55,.19,.024,.19,.024)
 const limbs=[-1,1].map(side=>{
  const leg=new T.Group(),arm=new T.Group();body.add(leg,arm)
  leg.position.set(side*.127,.91,0);arm.position.set(side*.231,1.38,0)
  limb(leg,0,-.245,0,.113,.265,.115);limb(leg,0,-.636,.01,.094,.235,.096);limb(leg,0,-.835,-.061,.11,.083,.165)
  limb(arm,side*.043,-.145,.015,.099,.171,.103);limb(arm,side*.082,-.36,-.016,.083,.16,.086);limb(arm,side*.09,-.493,-.039,.077,.085,.078)
  return {side,leg,arm}
 })
 body.visible=false;body.name='EVA suit shadow caster'
 const canvas=document.createElement('canvas');canvas.width=canvas.height=256
 const ctx=canvas.getContext('2d')!,texture=new T.CanvasTexture(canvas)
 const span=6.8,geo=new T.PlaneGeometry(span,span,12,12);geo.rotateX(-Math.PI/2)
 const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({map:texture,transparent:true,opacity:.51,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}))
 mesh.name='Astronaut ground shadow';mesh.renderOrder=2;mesh.visible=false
 let last='',lastX=Infinity,lastZ=Infinity,lastZone=''
 function update(p:Pose,step:number,bob:number,sun:number){
  const outside=p.zone==='outside',stride=Math.round(Math.sin(step)*bob*12)/12
  const yaw=Math.round(p.yaw*65)/65
  const dirX=outside?41/29:.42,dirZ=outside?27/29:-.65
  mesh.position.set(p.x+dirX*.90,0,p.z+dirZ*.90);mesh.material.opacity=outside?.33+sun*.23:.37
  if(p.x!==lastX||p.z!==lastZ||p.zone!==lastZone){
   const pos=geo.getAttribute('position')
   for(let i=0;i<pos.count;i++)pos.setY(i,outside?terrainHeight(mesh.position.x+pos.getX(i),mesh.position.z+pos.getZ(i))+.018:.021)
   pos.needsUpdate=true;mesh.frustumCulled=false;lastX=p.x;lastZ=p.z;lastZone=p.zone
  }
  const key=[p.zone,yaw,stride].join('/')
  if(last===key)return;last=key
  const k=256/span
  function project(x:number,h:number,z:number){return [128+(Math.cos(yaw)*x+Math.sin(yaw)*z+dirX*(h-.90))*k,128+(-Math.sin(yaw)*x+Math.cos(yaw)*z+dirZ*(h-.90))*k]}
  ctx.clearRect(0,0,256,256);ctx.fillStyle=ctx.strokeStyle='#191619';ctx.lineCap='round';ctx.lineJoin='round'
  function capsule(a:number[],b:number[],radius:number){const start=project(a[0],a[1],a[2]),end=project(b[0],b[1],b[2]);ctx.lineWidth=radius*2*k;ctx.beginPath();ctx.moveTo(start[0],start[1]);ctx.lineTo(end[0],end[1]);ctx.stroke()}
  for(const side of [-1,1]){
   const swing=side*stride
   capsule([side*.125,.9,0],[side*.14,.45,swing*.15],.112)
   capsule([side*.14,.45,swing*.15],[side*.155,.085,swing*.26],.093)
   capsule([side*.155,.065,swing*.26],[side*.155,.065,swing*.26-.17],.108)
   capsule([side*.225,1.36,0],[side*.32,1.10,-swing*.10],.094)
   capsule([side*.32,1.10,-swing*.10],[side*.34,.88,-.09-swing*.20],.079)
  }
  capsule([0,.91,0],[0,1.39,0],.235);capsule([0,1.04,.19],[0,1.42,.19],.18)
  capsule([0,1.57,-.012],[0,1.66,-.025],.178);capsule([.12,1.38,.22],[.12,1.73,.22],.022)
  texture.needsUpdate=true
 }
 function poseBody(p:Pose,step:number,bob:number){
  body.position.set(p.x,terrainHeight(p.x,p.z),p.z);body.rotation.y=p.yaw
  for(const {side,leg,arm} of limbs){const stride=Math.sin(step)*bob*side;leg.rotation.x=stride*.35;arm.rotation.x=-stride*.43}
 }
 return {mesh,body,update,poseBody,dispose(){mesh.material.dispose();mesh.geometry.dispose();texture.dispose();unit.dispose();skin.dispose()}}
}

