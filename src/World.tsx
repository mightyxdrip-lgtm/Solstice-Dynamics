import React,{useEffect,useRef,useState} from 'react'
import * as T from 'three'
import {Canvas,useFrame,useThree} from '@react-three/fiber'
import {PerspectiveCamera} from '@react-three/drei/core/PerspectiveCamera.js'
import {createTerrain,terrainHeight,boulderColliders} from './terrain'
import {createBuildings} from './buildings'
import {createInterior} from './interiors'
import {mountServicePanel} from './servicePanel'
import {hardware} from './taskHardware'
import {createCrewShadow} from './crewShadow'
import {surfaceProps} from './siteProps'
import {current,type State} from './engine'
import {nearestStation,walk,obstructed,outerBoxes,outerStations,outsideBounds,type Pose,type Zone,type Circle} from './navigation'

export type Phase='title'|'play'|'terminal'|'pause'|'cycle'|'end'
export interface FieldStatus {near:string;distance:number;bearing:number;zone:Zone;sprint:boolean}
export interface WorldInput {
 pose:Pose;phase:Phase;state:State;target:string;station:string;quality:'economy'|'quality'
 service:boolean;onOperate:(cmd:string,v?:number)=>boolean;onToolHint:(text:string)=>void
 touch:{side:number;forward:number};onUse:(id?:string)=>void;onPause:()=>void
 onField:(f:FieldStatus,seconds:number)=>void;onReady:()=>void;onControlHint:(s:string)=>void
}
export function lockView(){
 const c=document.querySelector<HTMLCanvasElement>('.world canvas')
 if(!c)return
 c.focus({preventScroll:true})
 try {const p=c.requestPointerLock?.();if(p)p.catch(()=>{})}catch{/* Drag and keyboard look remain available. */}
}
const v=(x:number,y:number,z:number)=>new T.Vector3(x,y,z)
function makeSky(){
 const material=new T.ShaderMaterial({
  side:T.BackSide,depthWrite:false,fog:false,
  uniforms:{haze:{value:.25},sunDirection:{value:v(-.67,.26,-.55).normalize()}},
  vertexShader:'varying vec3 ray;void main(){ray=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec3 ray;uniform vec3 sunDirection;uniform float haze;
  void main(){vec3 n=normalize(ray);float h=max(n.y,0.);float angle=max(dot(n,sunDirection),0.);
  vec3 low=mix(vec3(.78,.425,.235),vec3(.48,.245,.13),haze);
  vec3 high=mix(vec3(.145,.235,.31),vec3(.34,.22,.18),haze);
  vec3 col=mix(low,high,smoothstep(-.06,.80,h));
  col+=vec3(.6,.32,.10)*pow(angle,14.)+vec3(1.,.67,.32)*pow(angle,135.);
  col+=vec3(2.7,2.4,1.9)*smoothstep(.99986,.99997,angle);
  gl_FragColor=vec4(col,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  }`})
 const dome=new T.Mesh(new T.SphereGeometry(420,40,20),material)
 dome.renderOrder=-10
 return dome
}
function beacon(){
 const c=document.createElement('canvas');c.width=128;c.height=128;const g=c.getContext('2d')!
 g.lineJoin='round';g.beginPath();g.moveTo(64,13);g.lineTo(104,53);g.lineTo(64,93);g.lineTo(24,53);g.closePath();g.fillStyle='#252821df';g.fill();g.strokeStyle='#ffbb76';g.lineWidth=6;g.stroke();g.fillStyle='#ffcc92';g.fillRect(58,43,12,20);g.fillRect(62,95,4,21)
 const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace
 const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:false,depthWrite:false,toneMapped:false}));sprite.renderOrder=9
 return sprite
}
function buildWorld(){
 const exterior=new T.Group(),models=createBuildings(),sky=makeSky()
 exterior.add(createTerrain(),...models.modules,surfaceProps(),sky)
 const sun=new T.DirectionalLight(0xffddae,3.1);sun.position.set(-41,29,-27);sun.castShadow=true
 sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-36,right:36,bottom:-36,top:36,near:1,far:120})
 sun.shadow.bias=-.00035;sun.shadow.normalBias=.035;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true
 exterior.add(sun,new T.HemisphereLight(0xffddd1,0xb48062,1.3))
 const points=new Float32Array(220*3)
 for(let i=0;i<points.length;i+=3){points[i]=Math.sin(i*207.73)*28;points[i+1]=.14+Math.abs(Math.sin(i*17.77))*6;points[i+2]=Math.cos(i*73.51)*25}
 const dustGeometry=new T.BufferGeometry();dustGeometry.setAttribute('position',new T.BufferAttribute(points,3))
 const dust=new T.Points(dustGeometry,new T.PointsMaterial({size:.045,color:0xf5bf83,transparent:true,opacity:.20,depthWrite:false}));exterior.add(dust)
 const rooms={hab:createInterior('hab'),green:createInterior('green'),water:createInterior('water')}
 for(const room of Object.values(rooms)){
  room.group.visible=false
  room.group.add(new T.HemisphereLight(0xe3edf1,0x96816e,1.6))
  for(const z of [-2.9,3.0]){
   const light=new T.PointLight(z<0?0xd9edff:0xffce91,34,12,2)
   light.position.set(0,2.91,z);room.group.add(light)
  }
 }
 const circles:Circle[]=[{x:-8,z:-3,radius:3.35},{x:6,z:4,radius:3.6},...boulderColliders]
 for(const [ax,az,bx,bz] of [[-5.15,-1.58,2.7,2.52],[-5.82,-5.17,-1.55,-10.09]]){
  const n=Math.ceil(Math.hypot(bx-ax,bz-az)/.48)
  for(let i=0;i<=n;i++)circles.push({x:ax+(bx-ax)*i/n,z:az+(bz-az)*i/n,radius:.69})
 }
 const marker=beacon(),halo=new T.Mesh(new T.RingGeometry(.62,.67,40),new T.MeshBasicMaterial({color:0xffbb75,transparent:true,opacity:.8,side:T.DoubleSide,depthWrite:false}))
 halo.rotation.x=-Math.PI/2
 const lamps:T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>[]=[];exterior.traverse(o=>{if(o.name==='relayLight')lamps.push(o as typeof lamps[number])})
 const jumpers=[exterior.getObjectByName('jumper0')!,exterior.getObjectByName('jumper1')!]
 return {exterior,models,rooms,sun,sky,dust,circles,marker,halo,lamps,jumpers}
}
const fieldKeys=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight'])
function Scene({input}:{input:React.RefObject<WorldInput>}){
 const {scene,gl,size}=useThree()
 const [world]=useState(buildWorld),[shadow]=useState(createCrewShadow)
 const panel=useRef<ReturnType<typeof mountServicePanel>|null>(null),panelKey=useRef(''),panelState=useRef<State|null>(null),activePointer=useRef<number|null>(null)
 const liveCamera=useRef<T.Camera|null>(null),shadowStamp=useRef(''),shadowTime=useRef(0)
 const key=useRef(new Set<string>()),clock=useRef({time:0,ui:0,bob:0,step:0}),lastState=useRef<State|null>(null),lastPhase=useRef<Phase|null>(null)
 const fog=useRef(new T.FogExp2(0xc69b7b,.007))
 useEffect(()=>{
  const canvas=gl.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','First-person Mars outpost. WASD to walk, drag or move mouse to look, E to use.')
  const keys=key.current
  let dragging=false,lastX=0,lastY=0,lockedBefore=false
  const look=(dx:number,dy:number)=>{const a=input.current;if(a.phase!=='play')return;a.pose.yaw-=dx*.0024;a.pose.pitch=T.MathUtils.clamp(a.pose.pitch-dy*.0022,-1.34,1.34)}
  function onDown(e:PointerEvent){if(input.current.service&&panel.current&&liveCamera.current){if(activePointer.current===null){activePointer.current=e.pointerId;panel.current.down(e,canvas,liveCamera.current)}return}if(input.current.phase!=='play')return;dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.focus();canvas.setPointerCapture(e.pointerId);if(e.pointerType==='mouse')lockView()}
  function onMove(e:PointerEvent){if(input.current.service&&panel.current&&liveCamera.current){if(activePointer.current===null||activePointer.current===e.pointerId)panel.current.move(e,canvas,liveCamera.current);return}if(document.pointerLockElement===canvas){look(e.movementX,e.movementY)}else if(dragging){look(e.clientX-lastX,e.clientY-lastY);lastX=e.clientX;lastY=e.clientY}}
  function release(e:PointerEvent){dragging=false;if(e.pointerId===activePointer.current){if(e.type==='pointercancel')panel.current?.cancel();else panel.current?.finish();activePointer.current=null;canvas.style.cursor='default'}}
  function keyDown(e:KeyboardEvent){const a=input.current;if(a.service&&panel.current&&e.target===canvas&&panel.current.keyboard(e)){e.preventDefault();return}if(a.phase!=='play')return
   if(fieldKeys.has(e.code)){keys.add(e.code);e.preventDefault()}
   if(e.code==='KeyE'&&!e.repeat){a.onUse(nearestStation(a.pose,a.pose.zone==='outside'?outerStations:world.rooms[a.pose.zone].stations));e.preventDefault()}
   if(e.code==='Escape'&&!e.repeat){a.onPause();e.preventDefault()}
  }
  function keyUp(e:KeyboardEvent){keys.delete(e.code)}
  function lockChanged(){const locked=document.pointerLockElement===canvas;if(lockedBefore&&!locked&&input.current.phase==='play')input.current.onPause();lockedBefore=locked}
  function blur(){keys.clear();dragging=false;if(input.current.phase==='play')input.current.onPause()}
  function lockDenied(){if(input.current.phase==='play')input.current.onControlHint('Drag to look, or use the arrow keys.')}
  canvas.addEventListener('pointerdown',onDown);window.addEventListener('pointermove',onMove);window.addEventListener('pointerup',release)
  window.addEventListener('pointercancel',release);window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur)
  document.addEventListener('pointerlockchange',lockChanged);document.addEventListener('pointerlockerror',lockDenied)
  input.current.onReady()
  return()=>{canvas.removeEventListener('pointerdown',onDown);window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);document.removeEventListener('pointerlockchange',lockChanged);document.removeEventListener('pointerlockerror',lockDenied)
  panel.current?.dispose();panel.current=null;shadow.dispose()
  const materials=new Set<T.Material>(),textures=new Set<T.Texture>()
  for(const root of [world.exterior,...Object.values(world.rooms).map(r=>r.group)])root.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}})
  for(const m of materials){for(const t of Object.values(m))if(t instanceof T.Texture)textures.add(t);m.dispose()}for(const t of textures)t.dispose();world.sun.shadow.dispose()
  }
 },[gl,world,input])
 useFrame(({camera},dt)=>{
  const a=input.current,p=a.pose,st=clock.current,delta=Math.min(dt,.065),title=a.phase==='title'
  if(lastPhase.current!==a.phase){key.current.clear();st.ui=0;lastPhase.current=a.phase}
  liveCamera.current=camera
  const serviceKey=a.service?a.station+'/'+a.state.sol+'/'+a.state.fieldwork?.step:''
  if(panelKey.current!==serviceKey){
   if(panel.current){scene.remove(panel.current.root);panel.current.dispose();panel.current=null}
   gl.domElement.style.cursor='';activePointer.current=null;panelKey.current=serviceKey
   if(serviceKey){
    panel.current=mountServicePanel(a.station,hardware(a.state),(cmd,v)=>input.current.onOperate(cmd,v),msg=>input.current.onToolHint(msg))
    scene.add(panel.current.root);panelState.current=a.state;gl.domElement.focus({preventScroll:true})
   }
  }
  if(panel.current&&a.state!==panelState.current){panel.current.sync(hardware(a.state));panelState.current=a.state}
  const cast=!title&&a.phase!=='end'&&p.zone==='outside'&&a.quality==='quality'&&Math.hypot(p.x,p.z)<26
  if(shadow.body.visible!==cast){world.sun.shadow.needsUpdate=true;shadow.body.visible=cast}
  shadow.mesh.visible=!cast&&!title&&a.phase!=='end'
  world.marker.visible=world.halo.visible=false
  const exterior=title||p.zone==='outside'
  world.exterior.visible=exterior
  for(const [name,room] of Object.entries(world.rooms))room.group.visible=!exterior&&p.zone===name
  scene.fog=exterior?fog.current:null
  scene.background=exterior?null:roomBackground
  if(lastState.current!==a.state){
   const weather=current(a.state);world.models.update(a.state);world.sun.intensity=1.2+weather.sun*2.7;world.sun.shadow.needsUpdate=true
   fog.current.density=.0038+(1-weather.sun)*.035;world.sky.material.uniforms.haze.value=1-weather.sun
   const f=a.state.fieldwork
   
   for(const name of ['green','water'] as const){
    const lamp=world.rooms[name].group.getObjectByName('processLight') as T.Mesh<T.BufferGeometry,T.MeshBasicMaterial>
    lamp.material.color.setHex(name==='water'?(f?.pump===4?0x7dffc2:0xff9e57):((f?.dwell||0)>=4?0x7dffc2:0xffa464))
    if(name==='green')for(const light of world.rooms.green.group.children)if(light instanceof T.PointLight)light.intensity=f&&a.state.sol===3?15+f.lamp*.4:34
   }
   world.dust.material.opacity=.12+(1-weather.sun)*.82;lastState.current=a.state
  }
  const fault=a.state.fieldwork?.solar
  world.jumpers.forEach((lead,i)=>lead.visible=!(a.service&&a.station==='solarProbe')&&(fault==='repaired'||!!((a.state.fieldwork?.plugs||0)&(1<<i))))
  for(const lamp of world.lamps)lamp.material.color.setHex(fault==='repaired'?0x88ffbc:fault==='isolated'?0xffba55:Math.sin(st.time*6)>.1?0xff562d:0x743126)
  if(!exterior){const room=world.rooms[p.zone as 'hab'|'water'|'green'];for(const door of room.group.children){if(door.name==='airlockLeaf')door.position.x=T.MathUtils.damp(door.position.x,a.phase==='cycle'?door.userData.side*.97:0,5,dt)}}
  if(title||a.phase==='play'){st.time+=delta;world.models.animate(st.time);world.dust.position.x=Math.sin(st.time*.17)*3;world.dust.position.z=Math.cos(st.time*.14)}
  if(title){
   const drift=matchMedia('(prefers-reduced-motion: reduce)').matches?0:Math.sin(st.time*.055)
   const narrow=size.width/size.height<1.15
   camera.position.set(13+drift*1.9,narrow?9:7.2,narrow?35:25.5);camera.lookAt(narrow?-3.2:-5.6,2.3,-1.8)
   return
  }
  let sprint=false
  if(a.phase==='play'){
   const k=key.current
   p.yaw+=((k.has('ArrowLeft')?1:0)-(k.has('ArrowRight')?1:0))*delta*1.65
   p.pitch=T.MathUtils.clamp(p.pitch+((k.has('ArrowUp')?1:0)-(k.has('ArrowDown')?1:0))*delta*1.3,-1.34,1.34)
   const forward=Number(k.has('KeyW'))-Number(k.has('KeyS'))+a.touch.forward
   const side=Number(k.has('KeyD'))-Number(k.has('KeyA'))+a.touch.side
   sprint=(k.has('ShiftLeft')||k.has('ShiftRight'))&&Math.hypot(forward,side)>0
   const room=p.zone==='outside'?null:world.rooms[p.zone]
   const extra=exterior&&a.state.solar?Array.from({length:a.state.solar},(_,i)=>({x:-15.21-3.46*Math.floor(i/3),z:5.86+(i%3)*2.34,hx:1.6,hz:.93})):[]
   const blocked=room?(x:number,z:number)=>obstructed(x,z,room.bounds,room.blockers,[]):(x:number,z:number)=>obstructed(x,z,outsideBounds,extra.length?outerBoxes.concat(extra):outerBoxes,world.circles)
   const moved=walk(p,side,forward,delta*(sprint?5.1:2.65),blocked);st.step+=moved*2.8;st.bob+=(Number(moved>.0001)-st.bob)*.15
   const stations=room?room.stations:outerStations,goal=stations.find(t=>t.id===a.target)
   if(goal){
    const dist=Math.hypot(goal.x-p.x,goal.z-p.z),y=exterior?terrainHeight(goal.x,goal.z):0
    world.marker.visible=true;world.marker.position.set(goal.x,y+1.96+.055*Math.sin(st.time*2.5),goal.z)
    world.marker.scale.setScalar(Math.min(1.7,.35+dist*.043))
    world.halo.visible=dist<4;world.halo.position.set(goal.x,y+.032,goal.z)
   }
   st.ui+=dt
   if(st.ui>.12){
    const bearing=goal?Math.atan2(-(goal.x-p.x),-(goal.z-p.z))-p.yaw:0
    a.onField({near:nearestStation(p,stations),distance:goal?Math.hypot(goal.x-p.x,goal.z-p.z):-1,bearing,zone:p.zone,sprint},Math.min(st.ui,.4));st.ui=0
   }
  }
  if(cast){
   shadow.poseBody(p,st.step,st.bob);shadowTime.current+=dt
   if(shadowTime.current>=.085){const stamp=[p.x,p.z,p.yaw,Math.sin(st.step)*st.bob].map(n=>Math.round(n*60)).join(',')
    if(shadowStamp.current!==stamp){world.sun.shadow.needsUpdate=true;shadowStamp.current=stamp}shadowTime.current=0}
  }else if(shadow.mesh.visible)shadow.update(p,st.step,st.bob,current(a.state).sun)
  if(panel.current){panel.current.cameraView(camera,size.width/size.height);panel.current.tick(dt);return}
  if(a.phase==='terminal'&&p.zone==='outside'&&(a.station==='solarProbe'||a.station==='solar')){
   const test=a.station==='solarProbe',z=test?3.9:7.35
   camera.position.set(-4.46,1.71,z-1.62)
   camera.lookAt(-5.55-(size.width/size.height>1.15?.78:0),1.26,z-.03);return
  }
  const floor=p.zone==='outside'?terrainHeight(p.x,p.z):0
  camera.position.set(p.x,floor+1.62+Math.sin(st.step)*.027*st.bob,p.z);camera.rotation.order='YXZ';camera.rotation.set(p.pitch,p.yaw,0)
 })
 return <><PerspectiveCamera makeDefault fov={65} near={.045} far={600}/><primitive object={shadow.body}/><primitive object={shadow.mesh}/><primitive object={world.marker}/><primitive object={world.halo}/><primitive object={world.exterior}/>{Object.values(world.rooms).map(r=><primitive object={r.group} key={r.group.uuid}/>)}</>
}
const roomBackground=new T.Color(0x182026)
class RenderError extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false}
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="render-error">The 3D renderer could not start. Enable hardware acceleration or open the game in a WebGL 2 browser, then reload.</div>:this.props.children}
}
export function World({input,quality}:{input:React.RefObject<WorldInput>,quality:'economy'|'quality'}){
 return <div className="world"><RenderError><Canvas dpr={quality==='quality'?[1,1.5]:.85} shadows={quality==='quality'?{type:T.PCFSoftShadowMap}:false} gl={{antialias:true,powerPreference:'high-performance',alpha:false}} fallback={<p className="render-error">WebGL 2 is required for this game. Enable browser hardware acceleration and reload.</p>}><Scene input={input}/></Canvas></RenderError></div>
}

