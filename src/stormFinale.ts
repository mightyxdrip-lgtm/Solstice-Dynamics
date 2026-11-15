import * as T from 'three'
import {Assembly} from './buildings'
import {terrainHeight} from './terrain'
import {ascentVehicle,loadFlightSuit,rigFlightSuit} from './flightModels'
import type {StormEnding} from './engine'

const clamp = T.MathUtils.clamp
const ease = (a:number, b:number, t:number) => T.MathUtils.smoothstep(t, a, b)
const metal = (color:number, metalness=.22) => new T.MeshStandardMaterial({color, metalness, roughness:.46})
const seconds = {escape:12, swept:8.6}

function capsule() {
 const ship=ascentVehicle(),flame=new T.Group()
 for(const [r,len,color] of [[.49,2.25,0xff9947],[.29,1.55,0xffeac1]]){
  const plume=new T.ShaderMaterial({transparent:true,blending:T.AdditiveBlending,depthWrite:false,uniforms:{color:{value:new T.Color(color)}},
   vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
   fragmentShader:'uniform vec3 color;varying vec2 vUv;void main(){float bands=.87+.13*cos(vUv.x*62.83);gl_FragColor=vec4(color,clamp(vUv.y*1.3,0.,1.)*bands);\n#include <colorspace_fragment>\n}'})
  const mesh=new T.Mesh(new T.CylinderGeometry(r,.045,len,32,1,true),plume)
  mesh.position.y=-len/2;flame.add(mesh)
 }
 flame.position.y=.37;ship.add(flame)
 return {ship,flame}
}

function astronaut() {
 const shell=metal(0xe9ded0), joint=metal(0x333842), stripe=metal(0xef6527)
 const visor=new T.MeshStandardMaterial({color:0x92562b,metalness:.48,roughness:.15,emissive:0x291309})
 const body=new Assembly()
 const oval=(assembly:Assembly, material:T.Material, at:[number,number,number], scale:[number,number,number])=>
  assembly.add(new T.SphereGeometry(1,24,16),material,at,[0,0,0],scale)
 oval(body,stripe,[0,.03,0],[.34,.41,.245])
 body.box(shell,[0,.08,.19],[.43,.36,.115]);body.box(joint,[0,.11,.255],[.27,.15,.025])
 body.box(stripe,[0,.10,.272],[.16,.04,.02]);body.drum(joint,[0,.35,0],.25,.26,.10)
 body.box(joint,[0,-.17,.194],[.47,.045,.062]);body.box(shell,[.06,-.17,.235],[.073,.057,.026])
 for(const side of [-1,1]){
  body.rod(shell,[side*.22,.25,.19],[side*.255,-.11,.17],.022)
  body.rod(joint,[side*.235,-.09,.12],[side*.27,-.15,-.25],.035)
  oval(body,shell,[side*.255,.04,-.26],[.083,.25,.082])
 }
 body.box(shell,[0,.10,-.235],[.52,.60,.24]);body.box(stripe,[0,.06,-.36],[.46,.12,.04])
 oval(body,shell,[0,.64,0],[.335,.34,.31]);oval(body,joint,[0,.64,.159],[.295,.235,.19])
 oval(body,visor,[0,.635,.183],[.27,.212,.182])
 oval(body,new T.MeshBasicMaterial({color:0xffcc8a}),[-.068,.72,.349],[.087,.012,.012])
 const suit=body.finish()
 const limbs=(side:number,arm:boolean)=>{
  const limb=new Assembly(),length=arm?.56:.72,radius=arm?.102:.139
  oval(limb,shell,[0,-length*.52,0],[radius,length*.54,radius])
  limb.drum(stripe,[0,-length*.34,0],radius*.98,radius,.102)
  limb.drum(joint,[0,-length*.66,0],radius*.93,radius*.91,.082)
  oval(limb,joint,[0,-length-.015,.028],[radius*.98,radius*.87,radius*(arm?1:1.36)])
  const part=limb.finish();part.position.set(side*(arm?.321:.161),arm?.23:-.24,0)
  suit.add(part);return part
 }
 return {suit,arms:[limbs(-1,true),limbs(1,true)],legs:[limbs(-1,false),limbs(1,false)]}
}

// A mottled alpha texture keeps each dust billow soft at its edges.
function dustTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128
 const g=canvas.getContext('2d')!
 for(let i=0;i<29;i++){
  const a=i*2.39996,r=37*Math.sqrt(i/29),x=64+Math.cos(a)*r,y=64+Math.sin(a)*r
  const grad=g.createRadialGradient(x,y,0,x,y,22+9*Math.sin(i))
  grad.addColorStop(0,'rgba(255,255,255,.62)');grad.addColorStop(.45,'rgba(255,255,255,.30)');grad.addColorStop(1,'rgba(255,255,255,0)')
  g.fillStyle=grad;g.fillRect(0,0,128,128)
 }
 const rgba=g.getImageData(0,0,128,128)
 for(let y=0;y<128;y++)for(let x=0;x<128;x++){
  const i=(y*128+x)*4,fold=Math.sin(x*.19+Math.sin(y*.23)*2.4)+Math.cos(y*.14+Math.sin(x*.28)*1.9)
  rgba.data[i+3]=Math.max(0,rgba.data[i+3]*(.86+.17*fold))
 }
 g.putImageData(rgba,0,0);return new T.CanvasTexture(canvas)
}

function marsSurface(){
 const w=1536,h=768,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h
 const ctx=canvas.getContext('2d')!,pixels=ctx.createImageData(w,h)
 let seed=73451
 const rand=()=>((seed=(Math.imul(1664525,seed)+1013904223)>>>0)/4294967296)
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const a=x/w*Math.PI*2,b=y/h*Math.PI,i=(y*w+x)*4
  const ridges=Math.sin(a*25+3.5*Math.sin(3*a+18*b)+b*60)
  const dune=Math.cos(40*b+ridges*3+12*a)+Math.sin(a*72+b*56+3*ridges)
  const tone=200+12*ridges+8*dune+16*rand()
  pixels.data[i]=tone+19;pixels.data[i+1]=tone*.93+12;pixels.data[i+2]=tone*.89+7;pixels.data[i+3]=255
 }
 ctx.putImageData(pixels,0,0)
 for(let i=0;i<4200;i++){
  const x=rand()*w,y=rand()*h,r=.6+Math.pow(rand(),5)*9
  ctx.beginPath();ctx.ellipse(x,y,r*1.2,r*.73,0,0,Math.PI*2);ctx.fillStyle='rgba(108,79,64,.20)';ctx.fill()
  ctx.beginPath();ctx.ellipse(x,y,r*1.2,r*.73,0,.15,2.95);ctx.strokeStyle='rgba(249,224,175,.42)';ctx.lineWidth=Math.max(.55,r*.13);ctx.stroke()
 }
 const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=T.RepeatWrapping
 return texture
}

function orbitView(ship:T.Group){
 const space=new T.Group(),planetGeometry=new T.SphereGeometry(48,160,104)
 const pos=planetGeometry.getAttribute('position'), colors=new Float32Array(pos.count*3)
 const color=new T.Color(),sand=new T.Color(0xde9564),rock=new T.Color(0x733c32)
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i)/48,y=pos.getY(i)/48,z=pos.getZ(i)/48
  const s=Math.sin(11*x+4*z+3*Math.sin(y*6))+Math.sin(z*20+4*Math.sin(x*9+y*8))*.38+Math.sin(x*61+z*35+y*47)*.18
  color.copy(rock).lerp(sand,clamp(.55+s*.31,0,1));color.toArray(colors,i*3)
 }
 planetGeometry.setAttribute('color',new T.BufferAttribute(colors,3))
 const planet=new T.Mesh(planetGeometry,new T.MeshStandardMaterial({map:marsSurface(),vertexColors:true,roughness:1}))
 planet.position.set(-10,-48,-22);planet.rotation.z=-.27;space.add(planet)
 const air=new T.Mesh(new T.SphereGeometry(48.36,100,64),new T.ShaderMaterial({
  transparent:true,depthWrite:false,uniforms:{tint:{value:new T.Color(0xffbc87)}},
  vertexShader:'varying vec3 n;varying vec3 eye;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalMatrix*normal;eye=-p.xyz;gl_Position=projectionMatrix*p;}',
  fragmentShader:'varying vec3 n;varying vec3 eye;uniform vec3 tint;void main(){float rim=pow(1.-max(dot(normalize(n),normalize(eye)),0.),5.);gl_FragColor=vec4(tint,rim*.9);\n#include <colorspace_fragment>\n}'
 }));air.position.copy(planet.position);space.add(air)
 const stars=new Float32Array(1500)
 for(let i=0;i<500;i++){
  stars[i*3]=Math.sin(i*1.7894)*145;stars[i*3+1]=Math.cos(i*4.353)*69;stars[i*3+2]=-74-25*Math.sin(i*3.6)
 }
 const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.BufferAttribute(stars,3))
 space.add(new T.Points(starGeo,new T.PointsMaterial({color:0xf0e1d0,size:.112,sizeAttenuation:true})))
 const sun=new T.DirectionalLight(0xffdec2,3.2);sun.position.set(-18,24,16)
 space.add(sun,new T.AmbientLight(0xa1b9d2,1.15),ship)
 return space
}

export function createStormFinale(scene:T.Scene, exterior:T.Group, modules:T.Group[]){
 const ground=new T.Group(),{ship,flame}=capsule(),orbiter=ship.clone(),orbit=orbitView(orbiter)
 const suit=new T.Group(),pad=new Assembly(),plate=metal(0x514c48)
 let disposed=false,ready=false,animateSuit:(t:number,brace:number,lift:number)=>void=()=>{}
 let skeleton:T.Skeleton|undefined
 loadFlightSuit().then(source=>{
  if(disposed)return
  const actor=rigFlightSuit(source);skeleton=actor.suit.skeleton;suit.add(actor.suit);animateSuit=actor.pose;ready=true
 }).catch(()=>{
  if(disposed)return
  const backup=astronaut();suit.add(backup.suit);ready=true
  animateSuit=(t,brace,lift)=>backup.arms.forEach((arm,i)=>{arm.rotation.z=(i===0?-1:1)*(.15+brace*.64+lift*.54);arm.rotation.x=-.25+Math.sin(t*3+i)*lift*.28})
 })
 pad.drum(plate,[0,.085,0],1.95,2.04,.18,12)
 const steel=metal(0xb7aaa0,.50),charcoal=metal(0x363839)
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=Math.sin(a),z=Math.cos(a)
  pad.rod(steel,[x*1.78,.14,z*1.78],[x*.73,1.01,z*.73],.067,10)
  pad.rod(charcoal,[x*1.08,.17,z*1.08],[x*.73,1.01,z*.73],.054,10)
  pad.drum(charcoal,[x*1.77,.19,z*1.77],.135,.17,.14)
 }
 const launchPad=pad.finish(),padX=-4.4,padZ=13.8,padY=terrainHeight(padX,padZ)
 launchPad.position.set(padX,padY,padZ)
 const fill=new T.HemisphereLight(0xffeddb,0xb78778,1.05)
 ground.add(launchPad,ship,suit,fill);exterior.add(ground);scene.add(orbit)
 const texture=dustTexture()
 const launchDust=Array.from({length:14},(_,i)=>{
  const cloud=new T.Sprite(new T.SpriteMaterial({map:texture,color:i%2?0xdfb89a:0xac8369,transparent:true,depthWrite:false}))
  ground.add(cloud);return cloud
 })
 const dust=Array.from({length:35},(_,i)=>{
  const material=new T.SpriteMaterial({map:texture,color:[0xaf6542,0xc08456,0xdd9c67,0x8c553a][i%4],transparent:true,depthWrite:false,fog:false})
  const cloud=new T.Sprite(material);ground.add(cloud);return cloud
 })
 const streakCount=110,streakPos=new Float32Array(streakCount*6),streakGeo=new T.BufferGeometry()
 streakGeo.setAttribute('position',new T.BufferAttribute(streakPos,3).setUsage(T.DynamicDrawUsage))
 const streaks=new T.LineSegments(streakGeo,new T.LineBasicMaterial({color:0xffc693,transparent:true,opacity:.32,depthWrite:false}))
 streaks.frustumCulled=false;ground.add(streaks)
 const debris=new T.InstancedMesh(new T.BoxGeometry(1,1,1),metal(0xe4ddca),55),dummy=new T.Object3D()
 const fragments=[0xb6a79a,0x7e8c8f,0xb74c23,0x343c42,0xccb79b]
 for(let i=0;i<debris.count;i++)debris.setColorAt(i,new T.Color(fragments[i%fragments.length]))
 debris.frustumCulled=false;ground.add(debris)
 const originals=modules.map(m=>({pos:m.position.clone(),rot:m.rotation.clone(),scale:m.scale.clone()}))
 const sky=new T.Color(0x080c17),fog=new T.FogExp2(0xcb9673,.012)
 const wrap=(n:number,m:number)=>((n%m)+m)%m
 function wind(t:number,strength:number,frontZ:number){
  dust.forEach((p,i)=>{
   const width=12+(i%5)*2.7
   p.position.set(wrap(i*11.7+t*(1.1+strength*3.2),99)-49,1+(i%3)*3+Math.sin(i+t*.62)*.9,frontZ-(i%5)*2.2)
   p.scale.set(width*1.46,width,1);p.material.opacity=(.34+strength*.57)*(i%3===0?.86:1)
   p.material.rotation=Math.sin(i*4+t*.18)*.43
  })
  for(let i=0;i<streakCount;i++){
   const j=6*i,x=wrap(i*8.71+t*(7+strength*19),48)-24,y=wrap(i*3.83+t*.29,9),z=wrap(i*5.91+t*.9,36)-16
   streakPos[j]=x;streakPos[j+1]=y;streakPos[j+2]=z
   streakPos[j+3]=x+.24+strength*.96;streakPos[j+4]=y+.08*strength;streakPos[j+5]=z+.035
  }
  streakGeo.attributes.position.needsUpdate=true;streaks.material.opacity=.12+strength*.26
 }
 function wreck(t:number){
  modules.forEach((module,i)=>{
   const original=originals[i],f=ease(.33+i*.13,2.55+i*.15,t)
   module.scale.y=original.scale.y*(1-.77*f);module.rotation.z=original.rot.z+(.25+i%2*.14)*f
   module.position.y=original.pos.y-.62*f;module.position.x=original.pos.x+1.3*f
  })
  debris.visible=t>.4
  for(let i=0;i<debris.count;i++){
   const center=originals[i%modules.length].pos,age=clamp(t-.45-(i%11)*.105,0,3.2)
   const x=center.x+Math.cos(i*2.8)*2+(2.3+i%4)*age
   const z=center.z+Math.sin(i*1.8)*2+.5*age
   const y=Math.max(.22,1.6+(3.1+i%4)*age-2.9*age*age)
   dummy.position.set(x,y,z);dummy.rotation.set(age*(1+i%3),i+age*.9,age*1.9)
   const k=age===0?0:1;dummy.scale.set(k*(.42+.19*(i%4)),k*.10,k*(.35+.27*(i%3)))
   dummy.updateMatrix();debris.setMatrixAt(i,dummy.matrix)
  }
  debris.instanceMatrix.needsUpdate=true
 }
 function reset(){
  modules.forEach((m,i)=>{const o=originals[i];m.position.copy(o.pos);m.rotation.copy(o.rot);m.scale.copy(o.scale)})
  orbit.visible=ground.visible=false
 }
 function draw(ending:StormEnding,elapsed:number,camera:T.Camera,aspect:number){
  const t=Math.min(seconds[ending],elapsed),space=ending==='escape'&&t>=4.1&&t<7.05
  orbit.visible=space;ground.visible=exterior.visible=!space
  scene.background=space?sky:null;scene.fog=space?null:fog
  ship.visible=launchPad.visible=ending==='escape'&&t<4.1;suit.visible=ending==='swept';debris.visible=false
  launchDust.forEach((p,i)=>{
   const age=Math.max(0,t-.56-i%4*.065),a=i*2.399
   p.visible=ship.visible&&age>0
   if(!p.visible)return
   const radial=.5+age*(1.26+(i%3)*.51)
   p.position.set(padX+Math.sin(a)*radial,padY+.30+age*.20,padZ+Math.cos(a)*radial)
   p.scale.setScalar(.4+age*1.13);p.material.opacity=Math.min(.6,age*1.4)*Math.max(.1,1-age*.19)
  })
  const distance=Math.max(1,1/Math.max(.46,aspect))
  if(space){
   const k=(t-4.1)/2.95
   orbiter.getObjectByName('Orbit solar wings')!.visible=true
   orbiter.position.set(-2.6+4.2*k,.62+.85*k,0);orbiter.rotation.set(-.16,-.29+.21*k,-.98-.13*k)
   orbiter.scale.setScalar(.94-.12*k)
   camera.position.set(0,1.4,9.4*distance);camera.lookAt(.3,1.95,0)
  }else if(ending==='escape'&&t<4.1){
   const lift=Math.max(0,t-.9),height=.92*lift*lift
   ship.position.set(padX,padY+.18+height,padZ);ship.rotation.y=.18
   flame.visible=t>.45;flame.scale.set(1,clamp((t-.45)*2,.04,1.55)+Math.sin(t*31)*.07,1)
   wind(t,.24,-12+t*.73);fog.density=.014
   camera.position.set(padX+1.55+t*.15,padY+1.29+height*.28,padZ+6.25*distance+t*.24)
   camera.lookAt(padX,padY+2.35+height*.91,padZ)
  }else if(ending==='escape'){
   const k=t-7.05,strength=ease(.15,2.8,k)
   wind(t,.53+strength*.47,-17+strength*17);wreck(k);fog.density=.012+.009*strength
   camera.position.set(14.8*distance,11.4*distance,22.5*distance-k*.28);camera.lookAt(-1,1.05,-2.6)
  }else{
   const lift=ease(2.5,7.65,t),brace=ease(.35,2.45,t),fade=ease(6.15,7.95,t)
   suit.position.set(-.65+lift*9,terrainHeight(-.65,11)+1.01+4.3*lift+.38*Math.sin(lift*6),11-10.3*lift)
   suit.rotation.set(-.20*brace+lift*1.46,.28-.36*brace+3.1*lift,.24*brace-lift*4.2)
   suit.scale.setScalar(1-fade);suit.visible=fade<1
   animateSuit(t,brace,lift)
   wind(t,.27+.73*brace,-13+ease(1,7.9,t)*22);fog.density=.014+lift*.028
   camera.position.set(.32+lift*3.3,1.34+lift*1.5,11+(2.55+lift*3.7)*distance)
   camera.lookAt(-.55+lift*6.85,1.07+lift*3.45,11-lift*7.7)
  }
  if(ending==='swept')return t<2.5?'The astronaut braces as the wall of dust approaches.':'The wind lifts the astronaut and sweeps them into the storm.'
  if(space)return 'The crew capsule flies above the curve of Mars.'
  return t<4.1?'The crew capsule lifts off from the outpost.':'Back at the outpost, the storm tears the base apart.'
 }
 function dispose(){
  disposed=true;skeleton?.dispose()
  reset();exterior.remove(ground);scene.remove(orbit)
  const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>()
  for(const root of [ground,orbit])root.traverse(obj=>{
   if(obj instanceof T.Mesh||obj instanceof T.Points||obj instanceof T.LineSegments)geometries.add(obj.geometry)
   if(obj instanceof T.Mesh||obj instanceof T.Points||obj instanceof T.LineSegments||obj instanceof T.Sprite)
    for(const m of Array.isArray(obj.material)?obj.material:[obj.material])materials.add(m)
  })
  geometries.forEach(g=>g.dispose());materials.forEach(m=>{if(m instanceof T.MeshStandardMaterial)m.map?.dispose();m.dispose()});debris.dispose();texture.dispose()
 }
 reset()
 return {draw,reset,dispose,seconds,waiting:(ending:StormEnding)=>ending==='swept'&&!ready}
}
