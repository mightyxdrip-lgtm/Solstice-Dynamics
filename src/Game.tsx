import React,{useCallback,useEffect,useRef,useState} from 'react'
import {Footprints,Play,RotateCcw} from 'lucide-react'
import {Radio as RadioIcon,ArrowRight,ArrowUp,ArrowDown,ArrowLeft,ChevronUp,Pause,Wind,Zap,Compass,MapPin,TriangleAlert,Target,Orbit} from 'lucide-react'
import {World,isBeforeMission,lockView,focusView,type WorldInput,type FieldStatus,type Phase} from './World'
import {fresh,validSave,current,type State} from './engine'
import {Workshop} from './Workshop'
import {IntroVideo} from './IntroVideo'
import {StationIcon,stationLabels,ProgressDots,Hand,HelpCircle,Check} from './visualGuidance'
import {hardware} from './taskHardware'
import {archive} from './science'
import {enrollment,status,fieldAction,roverAction} from './tasks'
import {roverBay,surveyBeacon,bearingBetween,driving,surveyWork,type RoverAction} from './roverRoute'
import {RoverMap} from './RoverMap'
import {RoverSurvey} from './RoverSurvey'
import {neutralPad,useController} from './controller'
import type {SamplerInput} from './roverSampling'
import './expedition.css'
import {tone,ambience} from './sound'
import {stationNames,type Zone,type Pose} from './navigation'
import {Terminal,type TerminalEvent} from './Terminal'
import {History} from './ui'
import './game.css'
import './service.css'
import './visual.css'
import './pictorial.css'

const pilotKey='terravector.surface-pilot.v2',colonyKey='terravector.mars-control.v1'
const locations={hab:'Habitat 01',green:'Greenhouse',water:'Water plant',outside:'Elysium Planitia'}
const doorIDs={hab:'enterHab',green:'enterGreen',water:'enterWater'}

const wing:Record<string,Zone>={solarProbe:'outside',waterGauge:'water',greenSensor:'green',life:'hab',suit:'hab',reports:'hab',water:'water',green:'green',solar:'outside',shelter:'outside',enterHab:'outside',exit:'hab'}
const spawn=():Pose=>({zone:'hab',x:0,z:-1.46,yaw:0,pitch:-.06})
interface Pilot{pose:Pose;stage:number;suited:boolean;oxygen:number;battery:number;visit:number}
function newPilot(s:State):Pilot{
 const pose=spawn()
 const leg=s.fieldwork?.survey
 if(driving(leg)||surveyWork(leg)){
  const start=leg==='unload'||leg==='outbound'?roverBay:surveyBeacon
  Object.assign(pose,{zone:'outside',x:start.x,z:start.z,yaw:leg==='inbound'?bearingBetween(surveyBeacon,roverBay):bearingBetween(roverBay,surveyBeacon),pitch:0})
  return {pose,stage:s.sol===1?3:8,suited:true,oxygen:100,battery:100,visit:0}
 }
 if(s.sol===1)Object.assign(pose,{x:3.65,z:3.0,yaw:Math.atan2(-1.02,2.84),pitch:-.08})
 return {pose,stage:s.sol===1?0:8,suited:s.sol>1,oxygen:100,battery:100,visit:0}
}
function load(){
 let s=fresh()
 try{
  const saved=JSON.parse(localStorage.getItem(colonyKey)||'null');if(validSave(saved))s=saved
  s=enrollment(s)
  const p=JSON.parse(localStorage.getItem(pilotKey)||'null')
  if(p&&p.sol===s.sol&&Object.hasOwn(locations,p.pose?.zone)&&['x','z','yaw','pitch'].every(k=>Number.isFinite(p.pose[k]))&&[p.stage,p.visit,p.oxygen,p.battery].every(Number.isFinite)&&p.stage>=0&&p.stage<=8&&typeof p.suited==='boolean'){
   const leg=s.fieldwork?.survey
   if(surveyWork(leg)||driving(leg)&&(p.pose.zone!=='outside'||!p.suited)){
    Object.assign(p,{pose:newPilot(s).pose,suited:true})
   }
   return {s,p:p as Pilot,existing:true}
  }
 }catch{/* A fresh mission works when persistent storage is unavailable. */}
 s=enrollment(s);return {s,p:newPilot(s),existing:s.done>0||!!s.fieldwork?.survey}
}
function objective(s:State,p:Pilot){
 const m=status(s)
 if(!p.suited)return {station:'suit',title:m.title,detail:'Equip your EVA suit at the habitat rack.'}
 return {station:m.station,title:m.title,detail:m.tip}
}
function routed(station:string,zone:Zone){
 const dest=wing[station]||'outside'
 if(dest===zone)return station
 if(zone!=='outside')return 'exit'
 return dest==='outside'?station:doorIDs[dest]
}
const fmt=(n:number)=>String(n).padStart(2,'0')
function Seat({children,label}:{children:React.ReactNode,label:string}){
 const box=useRef<HTMLDialogElement>(null)
 useEffect(()=>{box.current?.showModal();return()=>{box.current?.close()}},[])
 return <dialog className="flight-dialog" aria-label={label} ref={box} onCancel={e=>e.preventDefault()}>{children}</dialog>
}
export function Game(){
 const pad=useRef(neutralPad()),[usingPad,setUsingPad]=useState(false)
 const [initial]=useState(load),[s,setS]=useState(initial.s),[phase,setScreen]=useState<Phase>('title'),[ready,setReady]=useState(false)
 const pilot=useRef<Pilot>(initial.p),state=useRef(s),mode=useRef<Phase>('title'),station=useRef(''),input=useRef<WorldInput>(null!)
 const homeMenu=useRef<HTMLElement>(null),replaying=useRef(false)
 const taskHint=useRef<HTMLDivElement>(null)
 const sampler=useRef<SamplerInput>({aim:0,drill:0,transfer:0,buttons:[]})
 const deliveryTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),[delivered,setDelivered]=useState(false)
 const [field,setField]=useState<FieldStatus>({zone:pilot.current.pose.zone,near:'',bearing:0,distance:-1,sprint:false})
 const [opened,setOpened]=useState(''),[confirm,setConfirm]=useState(false),[quality,setQuality]=useState<'economy'|'quality'>(()=>matchMedia('(pointer: coarse)').matches?'economy':'quality'),[online,setOnline]=useState(false)
 const [hint,setHint]=useState(''),[cycleText,setCycleText]=useState(''),[saved,setSaved]=useState(true),[started,setStarted]=useState(initial.existing),[,refresh]=useState(0)
 const [toolHint,setToolHint]=useState('')
 const [gesture,setGesture]=useState('Drag here')
 const [useMiss,setUseMiss]=useState(false),useTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const [bench,setBench]=useState(false),[sound,setSound]=useState(true)
 function signal(ok:boolean){if(sound)tone(ok?540:175)}
 const touch=useRef({side:0,forward:0}),persistTimer=useRef(0),fadeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),hintTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const p=pilot.current,goal=objective(s,p),zone=p.pose.zone,dest=routed(goal.station,zone)
 function save(){try{localStorage.setItem(colonyKey,JSON.stringify(state.current));localStorage.setItem(pilotKey,JSON.stringify({...pilot.current,sol:state.current.sol}));setSaved(true)}catch{setSaved(false)}}
 function notice(text:string){setHint(text);if(hintTimer.current)clearTimeout(hintTimer.current);hintTimer.current=setTimeout(()=>setHint(''),4400)}
 function transition(v:Phase){mode.current=v;if(input.current)input.current.phase=v;setScreen(v);touch.current.side=0;touch.current.forward=0;if(v!=='play'&&document.pointerLockElement)document.exitPointerLock()}
 function endScene(){if(mode.current==='finale')transition('end')}
 const dismissFilm=useCallback(()=>{if(mode.current==='title')transition('arriving')},[])
 const showHome=useCallback(()=>{if(mode.current==='arriving')transition('home')},[])
 function beginMission(){
  if(!ready||mode.current!=='home')return
  setStarted(true);save()
  if(state.current.status!=='active'){transition('end');return}
  if(surveyWork(state.current.fieldwork?.survey)){transition('survey');return}
  transition('play')
  if(sound)tone(370)
  lockView()
  if(!pilot.current.suited)notice('Junction J-2 is losing power. Suit up and check the array.')
 }
 function pause(){if(mode.current!=='play'&&mode.current!=='survey')return;transition('pause');setConfirm(false);save()}
 function resume(){setOpened('');if(surveyWork(state.current.fieldwork?.survey)){transition('survey');return}transition('play');lockView()}
 function escape(){if(mode.current==='play'||mode.current==='survey')pause();else if(mode.current==='terminal'||mode.current==='pause'){setConfirm(false);resume()}}
 function setColony(next:State){state.current=next;setS(next);save()}
 function surveyMove(action:RoverAction,rock?:number){
  const pose=pilot.current.pose,before=state.current
  if(mode.current!==(surveyWork(before.fieldwork?.survey)?'survey':'play')||!pilot.current.suited)return
  const next=roverAction(before,action,pose,rock)
  if(next===before)return
  const leg=next.fieldwork!.survey
  if(action==='board')Object.assign(pose,{x:roverBay.x,z:roverBay.z,yaw:bearingBetween(roverBay,surveyBeacon),pitch:0})
  if(action==='arrive'){
   const site=leg==='unload'?roverBay:surveyBeacon
   Object.assign(pose,{x:site.x,z:site.z,yaw:bearingBetween(roverBay,surveyBeacon),pitch:0});sampler.current.aim=0
  }
  if(leg==='inbound')pose.yaw=bearingBetween(surveyBeacon,roverBay)
  if(leg==='done'){
   Object.assign(pose,{x:roverBay.x-1.95,z:roverBay.z+.15,yaw:0,pitch:0})
   setDelivered(true);clearTimeout(deliveryTimer.current);deliveryTimer.current=setTimeout(()=>setDelivered(false),3500)
  }
  station.current='';touch.current.side=0;touch.current.forward=0
  setField({near:'',zone:'outside',bearing:0,distance:-1,sprint:false})
  setColony(next);transition(surveyWork(leg)?'survey':'play');signal(true)
 }
 function operate(cmd:string,val=0){
  const before=state.current
  if(mode.current!=='terminal'||!bench||status(before).station!==opened)return false
  const next=fieldAction(before,opened,cmd,val)
  if(next===before){signal(false);setToolHint('Outside tolerance. Check the markings and try again.');return false}
  setColony(next);signal(true)
  setToolHint(next.fieldwork!.step!==before.fieldwork!.step?'Check passed.':cmd==='wire'?'Connection seated.':cmd==='tick'?'Stable reading recorded.':'Reading recorded.')
  return true
 }
 function progress(event:TerminalEvent){
  const pilotState=pilot.current
  const order=['life','suit','exit','solar','allocated','enterHab','review','advance']
  if(order[pilotState.stage]===event)pilotState.stage++
  if(event==='suit'){pilotState.suited=true;pilotState.oxygen=100;pilotState.battery=100}
  if(event==='advance'){
   if(state.current.status!=='active'){transition(state.current.stormEnding?'finale':'end');setOpened('')}
   else {resume();notice('Shift recorded. Sol '+fmt(state.current.sol)+' is underway.')}
  }
  refresh(t=>t+1);save()
 }
 function moveZone(id:string){
  if(!pilot.current.suited&&id==='exit'){notice('Equip the EVA suit at the habitat rack first.');return}
  const previous=pilot.current.pose.zone
  const targetZone:Zone=id==='exit'?'outside':id==='enterHab'?'hab':id==='enterGreen'?'green':'water'
  setCycleText(targetZone==='outside'?'Depressurizing airlock':'Pressurizing airlock');transition('cycle');if(sound)tone(220,.4);station.current=''
  fadeTimer.current=setTimeout(()=>{
   const a=pilot.current
   if(targetZone==='outside'){
    const exit=previous==='hab'?[-8,2.65,-2.84]:previous==='green'?[6,9.5,Math.PI]:[8.55,-5.5,Math.PI]
    Object.assign(a.pose,{x:exit[0],z:exit[1],yaw:exit[2],pitch:0,zone:'outside'})
   }else Object.assign(a.pose,{x:0,z:6.05,yaw:0,pitch:0,zone:targetZone})
   if(id==='exit'&&previous==='hab')a.stage=Math.max(3,a.stage)
   if(a.stage===5&&id==='enterHab')a.stage=6
   if(targetZone!=='outside'){a.oxygen=100;a.battery=100}
   setField({zone:targetZone,near:'',distance:-1,bearing:0,sprint:false});transition('play');save()
   notice(targetZone==='outside'?'EVA active. Follow the objective bearing.':'Cabin pressure nominal. Suit reserves replenished.')
  },1050)
 }
 function interact(focused?:string){if(mode.current!=='play')return;const id=typeof focused==='string'?focused:station.current
  if(useTimer.current)clearTimeout(useTimer.current)
  if(!id){setUseMiss(true);useTimer.current=setTimeout(()=>setUseMiss(false),1800);return}
  setUseMiss(false)
  if(id==='exit'||id.startsWith('enter')){moveZone(id);return}
  if(id==='rover'){surveyMove('board');return}
  const m=status(state.current)
  setToolHint('');setBench((id===m.station&&!m.complete)||['solarProbe','waterGauge','greenSensor'].includes(id));if(sound)tone(360)
  transition('terminal');setOpened(id);save()
 }
 function restart(){if(fadeTimer.current)clearTimeout(fadeTimer.current);const next=enrollment(fresh());pilot.current=newPilot(next);state.current=next;setS(next);station.current='';setField({near:'',distance:-1,bearing:0,sprint:false,zone:'hab'});setStarted(true);setConfirm(false);setOpened('');setHint('');resume();save();notice('Junction J-2 is losing power. Equip your EVA suit.')}
 function updateField(f:FieldStatus,seconds:number){
  if(mode.current!=='play')return
  const pilotState=pilot.current;station.current=f.near;setField(f)
  if(f.zone==='outside'&&!driving(state.current.fieldwork?.survey)){
   pilotState.oxygen=Math.max(0,pilotState.oxygen-seconds*(f.sprint?.18:.105))
   pilotState.battery=Math.max(0,pilotState.battery-seconds*(f.sprint?.15:.075)*(1.5-current(state.current).sun*.5))
   if(pilotState.battery<=0||pilotState.oxygen<=0){
    const next=structuredClone(state.current);next.reserves.crew=Math.max(0,next.reserves.crew-9);next.reserves.power=Math.max(0,next.reserves.power-6)
    next.log.push({sol:next.sol,text:'Emergency EVA return used 6 kWh and reduced crew condition by 9 points.'})
    if(next.reserves.crew<60||next.reserves.power===0){next.status='failure';next.reason='EVA recovery exhausted the colony safety margin. Return through an airlock before your suit reserves run out.';next.done=next.sol;next.history.push({sol:next.sol,reserves:{...next.reserves}});transition('end')}
    Object.assign(pilotState.pose,spawn());pilotState.oxygen=100;pilotState.battery=100;station.current='';setColony(next);notice('Emergency return to habitat. Crew −9 points, battery −6 kWh.')
   }
  }
  persistTimer.current+=seconds;if(persistTimer.current>2){save();persistTimer.current=0}
 }
 const mission=status(s),service=phase==='terminal'&&bench&&!mission.complete&&opened===mission.station,tool=service?hardware(s):null
 const onboard=driving(s.fieldwork?.survey)&&zone==='outside'
 const roverStep=s.fieldwork?.survey
 input.current={taskHint,pad:pad.current,sampler:sampler.current,service,onFinaleEnd:endScene,onDock:()=>surveyMove('arrive'),onOperate:operate,onToolHint:setToolHint,onGesture:setGesture,pose:p.pose,phase,state:s,quality,target:dest,station:opened,touch:touch.current,onUse:interact,onPause:pause,onEscape:escape,onReady:()=>setReady(true),onField:updateField,onControlHint:notice}
 useController(input,setUsingPad)
 useEffect(()=>()=>clearTimeout(deliveryTimer.current),[])
 useEffect(()=>{if(location.protocol!=='file:')fetch('/api/advisor/status').then(r=>r.ok&&r.json()).then(v=>setOnline(v?.online===true)).catch(()=>{});const unload=()=>{if(!isBeforeMission(mode.current))save()};window.addEventListener('pagehide',unload);return()=>{window.removeEventListener('pagehide',unload);if(fadeTimer.current)clearTimeout(fadeTimer.current);if(hintTimer.current)clearTimeout(hintTimer.current);if(useTimer.current)clearTimeout(useTimer.current)}},[])
 useEffect(()=>{if(phase==='home')homeMenu.current?.focus({preventScroll:true})},[phase])
 // Modal dialogs make the canvas inert until React removes them. Restore
 // keyboard focus after that commit, even when pointer lock is unavailable.
 useEffect(()=>{if(phase!=='play')return;const frame=requestAnimationFrame(()=>focusView());return()=>cancelAnimationFrame(frame)},[phase])
 useEffect(()=>ambience(sound&&phase==='play'&&zone==='outside'?1.2-current(s).sun:0),[sound,zone,phase,s.sol])
 const prep=s.sol===1?2:0,evad=p.stage>=3||zone==='outside',completed=mission.step+(prep?(Number(p.suited)+Number(evad)):0)
 const checks=[...(prep?['Equip the EVA suit','Exit the habitat']:[]),...mission.checks]
 const heading=((Math.round(-p.pose.yaw*180/Math.PI)%360)+360)%360
 const padButton=(dir:string,axis:'side'|'forward',val:number,icon:React.ReactNode)=><button aria-label={'Move '+dir} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch.current[axis]=val}} onPointerUp={()=>touch.current[axis]=0} onPointerCancel={()=>touch.current[axis]=0}>{icon}</button>
 return <div className={'game phase-'+phase+(onboard?' driving':'')+(usingPad?' using-pad':'')}><World input={input} quality={quality}/>
 <div ref={taskHint} className="task-help-marker" hidden role="img" aria-label={'Next task location. '+stationLabels[dest]}>
  <TriangleAlert className="task-help-symbol" size={52} fill="#ffd05c" stroke="#302718" strokeWidth={2.4} aria-hidden="true"/>
  <span className="task-help-direction"><ChevronUp size={27} aria-hidden="true"/></span>
 </div>
 {isBeforeMission(phase)?<>
  {phase!=='title'&&<main className="mission-home" ref={homeMenu} tabIndex={-1} aria-label="Home" inert={phase!=='home'}>
   <div className="home-content">
    <h1 aria-label="Solstice Dynamics">SOLSTICE<br/><span>DYNAMICS</span></h1>
    <div className="home-actions">
     <button className="enter home-play" onClick={beginMission} disabled={!ready} aria-label={!ready?'Loading terrain':s.status!=='active'?'Mission results':started?'Resume mission':'Play'}>
      {ready?<Play size={19} fill="currentColor" aria-hidden="true"/>:<span className="loading-orbit" aria-hidden="true"/>}
      {!ready?'Loading…':s.status!=='active'?'Mission results':started?'Resume':'Play'}
     </button>
     <button className="home-replay" onClick={()=>{replaying.current=true;transition('title')}}><RotateCcw size={17} aria-hidden="true"/>Replay intro</button>
    </div>
   </div>
  </main>}
  {phase!=='home'&&<IntroVideo arriving={phase==='arriving'} replay={replaying.current} onDismiss={dismissFilm} onFadeEnd={showHome}/>}
 </>:phase==='finale'?<button className="film-skip" onClick={endScene}>Skip scene <ArrowRight size={16}/></button>:phase==='end'&&s.stormEnding?null:<>
 <header className="flight-top"><div className="flight-brand"><img src="./planet.svg" alt=""/><b>SOLSTICE <span>DYNAMICS</span></b></div><div className="flight-loc"><MapPin size={13}/>{locations[zone]}</div><span className="sol-label">SOL <strong>{fmt(s.sol)}</strong> / 07</span><button className="pause" aria-label="Pause mission" onClick={pause} disabled={phase!=='play'&&phase!=='survey'}><Pause size={16}/></button></header>
 {phase==='survey'&&surveyWork(roverStep)&&<RoverSurvey key={roverStep} usingPad={usingPad} stage={roverStep} controls={sampler.current} onAction={surveyMove}/>}
 {delivered&&phase==='play'&&<div className="core-delivered" role="status"><Check size={19}/> Sample delivered</div>}
 {(phase==='play'||phase==='cycle')&&<><div className="objective visual-objective"><div><StationIcon id={dest}/><b>{stationLabels[dest]}</b></div><ProgressDots value={completed} total={checks.length}/></div><details className="mission-help"><summary aria-label="Mission help"><HelpCircle size={18}/></summary><b>{goal.title}</b><p>{goal.detail}</p><ul>{checks.map((c,i)=><li key={c}>{i<completed?'✓':'·'} {c}</li>)}</ul></details><div className="compassline" aria-label="Compass heading">{['N','NE','E','SE','S','SW','W','NW'][Math.round(heading/45)%8]}　{String(heading).padStart(3,'0')}°</div>
 {field.distance>=0&&phase==='play'&&<div className="navigation task-bearing" aria-label={'Your next task is this way. '+stationLabels[dest]+', '+Math.ceil(field.distance)+' meters'}><span style={{transform:'rotate('+(-field.bearing)+'rad)'}}>↑</span><div>Your next task is this way</div><StationIcon id={dest} size={17}/><b>{Math.ceil(field.distance)} m</b></div>}
 {onboard&&<RoverMap pose={p.pose} returning={s.fieldwork?.survey==='inbound'}/>}
 <div className="crosshair" aria-hidden="true"/><div className="vitals"><div><Wind/><span>O₂</span><b>{Math.ceil(p.oxygen)}<em>%</em></b><i style={{width:p.oxygen+'%'}}/></div><div><Zap/><b>{Math.ceil(p.battery)}<em>%</em></b><i style={{width:p.battery+'%'}}/></div></div>
 {field.near&&phase==='play'&&<button className="use-prompt" onClick={()=>interact()} aria-label={stationNames[field.near]}><kbd>{usingPad?'A / ×':'E'}</kbd><StationIcon id={field.near}/> {stationLabels[field.near]} <ArrowRight size={15}/></button>}
 {!field.near&&useMiss&&phase==='play'&&<div className="use-prompt reach-hint" role="status"><kbd>{usingPad?'A / ×':'E'}</kbd><ArrowUp size={20}/> Move closer</div>}
 <div className="motion-hint" aria-label={onboard?'Drive and steer':'Move and look'}>{usingPad?(onboard?<><kbd>RT / LT</kbd> Drive <kbd>L</kbd> Steer</>:<><kbd>L</kbd> Walk <kbd>R</kbd> Look</>):onboard?<><kbd>W / S</kbd> Drive <kbd>A / D</kbd> Steer</>:<><kbd>WASD</kbd><Footprints size={16}/></>}</div>
 <div className="touch-pad">{padButton('forward','forward',1,<ArrowUp/>)}{padButton('left','side',-1,<ArrowLeft/>)}{padButton('back','forward',-1,<ArrowDown/>)}{padButton('right','side',1,<ArrowRight/>)}</div>
 {zone==='outside'&&(current(s).sun<.6||current(s).risk>2||p.oxygen<25||p.battery<25)&&<div className="hazard"><TriangleAlert size={13}/>{p.oxygen<25||p.battery<25?'Low suit reserve · return to an airlock':current(s).risk>2?'Solar particle alert':current(s).weather}</div>}</>}
 </>}
 {service&&tool&&<><section className="service-caption visual-caption"><Hand size={28}/><h2 aria-label={tool.title}>{usingPad?'A / × · Grab or release':gesture}</h2></section>
 {usingPad&&<div className="pad-tool-hint"><kbd>LB / RB</kbd> Tool <kbd>✥</kbd> Move</div>}
 <aside className="service-controls"><span className="tool-feedback" role="status" aria-label={toolHint||'Grab the highlighted tool'} title={toolHint}>{toolHint.includes('passed')||toolHint.includes('recorded')||toolHint.includes('seated')?<Check size={26}/>:toolHint.includes('tolerance')||toolHint.includes('Match')?'↺':<Hand size={23}/>}</span><button aria-label="Return to field" onClick={resume}><ArrowRight size={21}/></button></aside>
 <details className="service-help"><summary aria-label="Help"><HelpCircle size={22}/></summary><p>{tool.hint}</p><p>{tool.reading}</p><p>{usingPad?'Bumpers select the tool. A / × grabs or releases. The D-pad moves it.':'Grab and drag with a mouse or finger. Q/R selects a tool. E or Enter grabs and releases. WASD or arrow keys move it.'}</p>{s.sol===4&&mission.step===0&&<p>{archive.flare.record} {archive.dose.context} · {archive.dose.record}</p>}</details></>}
 {phase==='terminal'&&!service&&<Seat label={stationNames[opened]||'Terminal'}>{bench?<Workshop key={opened} id={opened} s={s} close={resume}/>:<Terminal key={opened} id={opened} s={s} setS={setColony} onRecord={progress} onClose={resume} offlineOnline={online} suited={p.suited} inspectedLife={true} canAdvance={mission.complete}/>}</Seat>}
 {phase==='cycle'&&<div className="cycling"><span>{cycleText}</span></div>}
 {phase==='pause'&&<Seat label="Mission paused"><section className="pause-menu"><small>ARES–01 / FLIGHT MENU</small><h2>Mission paused</h2><p>{goal.detail}</p><label>Field audio <input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/></label><label>Graphics quality <select value={quality} onChange={e=>setQuality(e.target.value as 'quality'|'economy')}><option value="quality">High · sharp shadows</option><option value="economy">Performance · native resolution</option></select></label><p className="guidekeys">{usingPad?'Left stick walks or steers. Right stick looks. A / × uses equipment. B / ○ goes back. D-pad selects. Menu pauses.':'WASD to walk, Shift to sprint. Move the mouse to look, or use the arrow keys. Press E near equipment.'}</p><button className="enter" onClick={resume}>Return to field <ArrowRight/></button><button className="simple" onClick={()=>transition('home')}>Home</button><button className="simple" onClick={()=>setConfirm(!confirm)}>{confirm?'Keep this mission':'Restart mission'}</button>{confirm&&<button className="danger" onClick={restart}>Replace this save and restart</button>}<small>{saved?'MISSION AUTOSAVED':'LOCAL STORAGE UNAVAILABLE'}</small></section></Seat>}
 {phase==='end'&&<Seat label="Mission debrief">{s.stormEnding?<section className="pause-menu storm-result">
  {s.stormEnding==='escape'?<Orbit size={42} aria-hidden="true"/>:<Wind size={42} aria-hidden="true"/>}
  <h2>{s.stormEnding==='escape'?'Crew escaped':'Lost in the storm'}</h2><p>{s.reason}</p>
  <button className="enter" onClick={()=>transition('finale')}><Play size={17}/> Replay ending</button>
  <button className="simple" onClick={restart}>New mission</button>
 </section>:<section className="pause-menu debrief"><small>ARES–01 / DEBRIEF</small><h2>{s.status==='success'?'Mission complete':'Mission ended'}</h2><p>{s.reason}</p><History s={s}/><details><summary>Decisions and consequences</summary>{s.log.map((l,i)=><p key={i}><strong>Sol {l.sol}</strong> · {l.text}</p>)}</details><button className="enter" onClick={restart}>Begin a new mission <ArrowRight/></button></section>}</Seat>}
 {hint&&phase==='play'&&<details className="radio-note"><summary aria-label="Mission radio"><RadioIcon/></summary><p>{hint}</p></details>}
 </div>
}

