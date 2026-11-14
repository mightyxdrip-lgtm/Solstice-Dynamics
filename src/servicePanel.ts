import * as T from 'three'
import type {Grip,Hardware} from './taskHardware'

const steel=0x77888b,graphite=0x242f32,orange=0xef9850,blue=0x72cbe0
const clamp=T.MathUtils.clamp
export function mountServicePanel(station:string,model:Hardware,commit:(cmd:string,v?:number)=>boolean,feedback:(text:string)=>void){
 const root=new T.Group(),plate=new T.Group();root.add(plate)
 const mounts:Record<string,[number,number,number,number,number]>={
 solarProbe:[-5.55,1.23,3.57,Math.PI,.46],solar:[-5.55,1.35,7.10,Math.PI,.46],
 waterGauge:[-2.7,1.32,2.86,0,.43],greenSensor:[2.19,1.32,2.86,0,.43],
 water:[0,1.76,-4.52,0,.68],green:[0,1.76,-4.52,0,.68],life:[0,1.76,-4.52,0,.68],
 reports:[3.75,1.76,-4.38,0,.68],shelter:[0,1.13,-8.78,0,.51]}
 const [x,y,z,yaw,scale]=mounts[station];root.position.set(x,y,z);root.rotation.y=yaw;root.scale.setScalar(scale)
 const materials=new Map<number,T.MeshStandardMaterial>(),owned:T.Material[]=[],textures:T.Texture[]=[]
 function paint(c:number){let m=materials.get(c);if(!m){m=new T.MeshStandardMaterial({color:c,roughness:.5,metalness:.26});materials.set(c,m)}return m}
 function part(parent:T.Object3D,geo:T.BufferGeometry,color:number,x:number,y:number,z:number){
  const m=new T.Mesh(geo,paint(color));m.position.set(x,y,z);parent.add(m);return m
 }
 const box=(p:T.Object3D,x:number,y:number,z:number,w:number,h:number,d:number,c:number)=>part(p,new T.BoxGeometry(w,h,d),c,x,y,z)
 function disk(p:T.Object3D,x:number,y:number,z:number,r:number,d:number,c:number,n=32){
  const o=part(p,new T.CylinderGeometry(r,r,d,n),c,x,y,z);o.rotation.x=Math.PI/2;return o
 }
 function ring(p:T.Object3D,x:number,y:number,z:number,r:number,t:number,c:number,n=32){return part(p,new T.TorusGeometry(r,t,8,n),c,x,y,z)}
 function label(text:string,x:number,y:number,width:number,height:number,ink='#dfeae3',back='#182629'){
  const canvas=document.createElement('canvas');canvas.width=Math.round(128*width/height);canvas.height=128
  const ctx=canvas.getContext('2d')!
  function draw(v:string){ctx.fillStyle=back;ctx.fillRect(0,0,canvas.width,128);ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold '+Math.min(92,canvas.width*1.48/Math.max(1,v.length))+'px Consolas, monospace';ctx.fillText(v,canvas.width/2,67,canvas.width*.93)}
  draw(text);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;textures.push(tex)
  const m=new T.MeshBasicMaterial({map:tex,toneMapped:false});owned.push(m)
  const q=new T.Mesh(new T.PlaneGeometry(width,height),m);q.position.set(x,y,.077);plate.add(q)
  return (v:string)=>{draw(v);tex.needsUpdate=true}
 }
 box(plate,0,0,-.09,2.70,1.52,.22,steel);box(plate,0,0,.024,2.58,1.40,.055,graphite)
 for(const a of [-1,1])for(const b of [-1,1]){disk(plate,a*1.23,b*.635,.057,.031,.025,steel,10);box(plate,a*1.23,b*.635,.078,.032,.006,.004,graphite)}
 const screen=label(model.reading,0,.55,2.27,.168,'#a2f6cf','#102727')
 box(plate,-1.21,.55,.075,.032,.15,.026,orange)
 const tools:T.Group[]=[],cables:(T.Mesh|undefined)[]=[],homes:T.Vector3[]=[],readouts:(((v:string)=>void)|undefined)[]=[],values:number[]=[],ports:T.Vector2[]=[]
 const vector=(x:number,y:number,z:number)=>new T.Vector3(x,y,z)
 const hitMeshes:T.Mesh[]=[],portRims:T.Mesh[]=[]
 function target(parent:T.Object3D,index:number,w:number,h:number){
  const mat=new T.MeshBasicMaterial({visible:false});owned.push(mat);const hit=new T.Mesh(new T.BoxGeometry(w,h,.20),mat)
  hit.userData.grip=index;hit.position.z=.045;parent.add(hit);hitMeshes.push(hit)
 }
 model.ports.forEach(p=>{
  const n=p.shape||20;disk(plate,p.x,p.y,.085,.14,.05,0x101918,n);portRims.push(ring(plate,p.x,p.y,.115,.104,.018,p.color||steel,n))
  label(p.name,p.x,p.y-.205,.41,.085);ports.push(new T.Vector2(p.x,p.y))
 })
 function cable(i:number){
  const g=model.grips[i],tip=tools[i].position,base=homes[i]
  const start=vector(base.x-.19,base.y-.03,.08)
  const path=new T.CatmullRomCurve3([start,vector(start.x-.01,start.y-.09,.135),vector((start.x+tip.x)*.5,Math.min(start.y,tip.y)-.15,.18),vector(tip.x-.07,tip.y,.17)])
  const geo=new T.TubeGeometry(path,20,.026,8,false),old=cables[i]
  if(old){old.geometry.dispose();old.geometry=geo}else{const tube=new T.Mesh(geo,paint(g.color||blue));plate.add(tube);cables[i]=tube}
 }
 function placeValue(g:Grip,i:number,value:number){
  const frac=(value-g.min!)/(g.max!-g.min!);values[i]=value
  if(g.kind==='slide')tools[i].position.y=-.25+.56*frac
  if(g.kind==='turn')tools[i].rotation.z=(.75-1.5*frac)*Math.PI
  let text=value+(g.unit||'');if(g.cmd==='valve'&&g.kind==='turn')text=(31+value*7)+' kPa'
  readouts[i]?.(text)
 }
 model.grips.forEach((g,i)=>{
  const tool=new T.Group();tool.position.set(g.x,g.y,.115);tools.push(tool);homes.push(tool.position.clone());plate.add(tool)
  const c=g.color||orange
  if(g.kind==='dock'){
   if(g.cmd==='berth'){box(tool,0,0,.03,.33,.19,.085,c);box(tool,0,.035,.08,.22,.022,.012,graphite)}
   else if(g.cmd==='wire'||g.cmd==='scan'){
    disk(tool,0,0,.015,.111,.12,0x172024,g.shape||18);disk(tool,0,0,.103,.098,.10,c,g.shape||18);disk(tool,0,0,.17,.048,.035,steel,g.shape||18)
    disk(plate,g.x-.19,g.y-.03,.082,.055,.055,steel)
   }else{disk(tool,0,0,.035,.105,.09,steel);disk(tool,0,0,.12,.089,.12,c,8)}
   label(g.name,g.x,g.y-.202,.40,.087);if(g.locked&&g.dest!==undefined){const p=ports[g.dest];tool.position.set(p.x,p.y,.115)}
   if(g.cmd==='wire'||g.cmd==='scan')cable(i)
   target(tool,i,.31,.30)
  }else if(g.kind==='turn'){
   disk(plate,g.x,g.y,.069,.326,.063,steel);disk(plate,g.x,g.y,.109,.292,.035,0x142124)
   for(let j=0;j<=12;j++){const a=(.75-j*.125)*Math.PI;const tick=box(plate,g.x-Math.sin(a)*.288,g.y+Math.cos(a)*.288,.135,.013,.03,.01,0xe7cf9e);tick.rotation.z=a}
   ring(tool,0,0,.096,.205,.042,c);disk(tool,0,0,.068,.069,.10,steel)
   for(let j=0;j<3;j++){const a=j*Math.PI*2/3;box(tool,Math.sin(a)*.10,Math.cos(a)*.10,.083,.041,.19,.05,c).rotation.z=-a}
   box(tool,0,.203,.15,.037,.065,.024,0xfff7da)
   readouts[i]=label('',g.x,-.36,.58,.13,'#99efd2');label(g.name,g.x,-.535,.54,.085);target(tool,i,.60,.60);placeValue(g,i,g.initial!)
  }else if(g.kind==='slide'){
   box(plate,g.x,0,.08,.065,.66,.05,0x0b1213);box(plate,g.x+.17,.033,.09,.047,.18,.02,0x68bb89)
   box(tool,0,0,.065,.31,.096,.10,c);box(tool,0,0,.124,.22,.013,.015,graphite)
   readouts[i]=label('',g.x,-.395,.45,.109,'#99efd2');label(g.name,g.x,-.535,.49,.085);target(tool,i,.37,.19);placeValue(g,i,g.initial!)
  }else{
   box(plate,g.x,g.y-.146,.069,.105,.36,.029,0x0c1517);box(plate,g.x,g.y-.31,.079,.23,.024,.023,steel)
   box(tool,0,0,.075,.255,.103,.115,c);box(tool,0,0,.139,.17,.018,.011,graphite)
   label(g.name,g.x,g.y-.402,.42,.083);target(tool,i,.34,.21)
  }
 })
 const focusRing=ring(plate,0,0,.34,.169,.009,0xffdf91);focusRing.visible=false
 let selected=-1,hover=-1,drag=false,portIndex=-1,holdTime=0,settled=false
 const ray=new T.Raycaster(),plane=new T.Plane(new T.Vector3(0,0,1),0),local=new T.Vector3(),worldPlane=new T.Plane()
 function localPoint(ev:PointerEvent,canvas:HTMLCanvasElement,camera:T.Camera){
  const r=canvas.getBoundingClientRect();ray.setFromCamera(new T.Vector2(((ev.clientX-r.left)/r.width)*2-1,1-((ev.clientY-r.top)/r.height)*2),camera as T.PerspectiveCamera)
  worldPlane.copy(plane).applyMatrix4(root.matrixWorld)
  if(!ray.ray.intersectPlane(worldPlane,local))return false
  root.worldToLocal(local);return true
 }
 function showFocus(i:number){focusRing.visible=i>=0;if(i>=0){const pos=tools[i].position;focusRing.position.set(pos.x,pos.y,.335);focusRing.scale.setScalar(model.grips[i].kind==='turn'?1.72:1)}}
 function drawGrip(i:number){const g=model.grips[i];if(g.cmd==='wire'||g.cmd==='scan')cable(i);showFocus(i)}
 function hoverAt(){const h=ray.intersectObjects(hitMeshes,false).find(hit=>!model.grips[hit.object.userData.grip].locked);return h?h.object.userData.grip as number:-1}
 function cancel(){if(selected>=0&&drag){const g=model.grips[selected];if(g.kind==='pull'||g.kind==='dock'){tools[selected].position.copy(homes[selected]);drawGrip(selected)}else placeValue(g,selected,g.initial!)}drag=false;selected=-1;portIndex=-1;holdTime=0;settled=false;showFocus(-1)}
 function down(ev:PointerEvent,canvas:HTMLCanvasElement,camera:T.Camera){
  if(!localPoint(ev,canvas,camera))return
  const i=hoverAt();if(i<0)return
  cancel();selected=i;drag=true;canvas.focus({preventScroll:true});canvas.setPointerCapture(ev.pointerId);showFocus(i);canvas.style.cursor='grabbing'
 }
 function move(ev:PointerEvent,canvas:HTMLCanvasElement,camera:T.Camera){
  if(!localPoint(ev,canvas,camera))return
  if(!drag){hover=hoverAt();showFocus(hover);canvas.style.cursor=hover<0?'default':'grab';return}
  const i=selected,g=model.grips[i],p=tools[i].position
  if(g.kind==='dock'){
   p.set(clamp(local.x,-1.2,1.2),clamp(local.y,-.47,.43),.145)
   portIndex=ports.findIndex(q=>Math.hypot(q.x-p.x,q.y-p.y)<.162)
  }else if(g.kind==='turn'){
   const angle=clamp(Math.atan2(local.x-g.x,local.y-g.y),-.75*Math.PI,.75*Math.PI)
   placeValue(g,i,Math.round(g.min!+(angle/(1.5*Math.PI)+.5)*(g.max!-g.min!)))
  }else if(g.kind==='slide'){placeValue(g,i,Math.round(g.min!+clamp((local.y+.25)/.56,0,1)*(g.max!-g.min!)))}
  else p.y=clamp(local.y,g.y-.31,g.y)
  drawGrip(i)
 }
 function finish(){
  if(!drag||selected<0)return
  const i=selected,g=model.grips[i],p=tools[i].position;let ok=false
  if(g.kind==='dock'&&portIndex>=0){
   const dest=model.ports[portIndex].value
   if(g.cmd==='berth'&&dest!==g.value)feedback('Match the tag to its numbered berth.')
   else ok=commit(g.cmd,g.cmd==='wire'?g.value!*2+dest:g.cmd==='berth'?g.value:dest)
  }else if(g.kind==='turn'||g.kind==='slide'){
   if(g.cmd==='local'){feedback('Set to '+values[i]+(g.unit||'')+'. Pull the test handle.');ok=true}
   else ok=commit(g.cmd,values[i])
  }else if(g.kind==='pull'&&p.y<=g.y-.24){
   if(g.cmd==='tick'){if(!settled)feedback('Keep holding RUN through all four readings.')}
   else {const dialIndex=model.grips.findIndex(v=>v.cmd==='local');ok=commit(g.cmd,dialIndex>=0?values[dialIndex]:g.value)}
  }else feedback(g.kind==='pull'?'Pull the handle to its lower stop.':'Release the tool over a contact.')
  if(g.kind==='dock'||g.kind==='pull'){p.copy(homes[i]);drawGrip(i)}
  if(!ok&&(g.kind==='turn'||g.kind==='slide'))placeValue(g,i,g.initial!)
  drag=false;holdTime=0;selected=-1;portIndex=-1;settled=false;showFocus(-1)
 }
 function tick(dt:number){
  if(!drag||selected<0||settled)return
  const g=model.grips[selected]
  if(g.cmd!=='tick'||tools[selected].position.y>g.y-.24){holdTime=0;return}
  holdTime+=Math.min(dt,.15)
  if(holdTime>.72){holdTime=0;if(!commit('tick'))settled=true}
 }
 function keyboard(e:KeyboardEvent){
  const ids=model.grips.map((g,i)=>g.locked?-1:i).filter(i=>i>=0)
  if(!ids.length)return false
  if(e.code==='KeyQ'||e.code==='KeyR'){
   cancel();const delta=e.code==='KeyR'?1:-1;hover=ids[(ids.indexOf(hover)+delta+ids.length)%ids.length];showFocus(hover);feedback(model.grips[hover].name+' selected.');return true
  }
  const i=drag?selected:ids.includes(hover)?hover:ids[0],g=model.grips[i]
  if(e.code==='Enter'||e.code==='Space'){
   if(e.repeat)return true
   if(!drag){selected=i;hover=i;drag=true;portIndex=-1;showFocus(i);feedback(g.name+' in hand. Use arrow keys, then Enter to release.')}
   else finish()
   return true
  }
  if(!drag||!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.code))return false
  const sign=e.code==='ArrowUp'||e.code==='ArrowRight'?1:-1
  if(g.kind==='dock'){portIndex=portIndex<0?0:(portIndex+sign+ports.length)%ports.length;const p=ports[portIndex];tools[i].position.set(p.x,p.y,.145);feedback(model.ports[portIndex].name)}
  else if(g.kind==='pull')tools[i].position.y=e.code==='ArrowDown'?g.y-.31:g.y
  else placeValue(g,i,clamp(values[i]+sign,g.min!,g.max!))
  drawGrip(i);return true
 }
 function cameraView(camera:T.Camera,aspect:number){
  root.updateMatrixWorld(true)
  const dist=Math.max(1.84,2.57/aspect)
  camera.position.copy(root.localToWorld(vector(.055,.12,dist)))
  camera.lookAt(root.localToWorld(vector(0,.02,0)))
 }
 function sync(next:Hardware){screen(next.reading);next.grips.forEach((g,i)=>{if(g.locked!==model.grips[i].locked&&g.locked&&g.dest!==undefined){
   const p=ports[g.dest];tools[i].position.set(p.x,p.y,.115);if(g.cmd==='wire')cable(i)
  }model.grips[i].locked=g.locked
  if((g.kind==='turn'||g.kind==='slide')&&g.cmd!=='local'&&(!drag||selected!==i))placeValue(g,i,g.initial!)
  model.grips[i].initial=g.initial
 });next.ports.forEach((p,i)=>{if(p.color!==model.ports[i].color){portRims[i].material=paint(p.color||steel)}});model.ports=next.ports}
 function dispose(){root.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose()});materials.forEach(m=>m.dispose());owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose())}
 return {root,down,move,finish,cancel,tick,keyboard,cameraView,sync,dispose}
}

