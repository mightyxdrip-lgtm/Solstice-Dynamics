import React,{useEffect,useRef,useState} from 'react'
import {ArrowRight,ArrowUp,ArrowDown,ArrowLeft,ChevronUp,Pause,Wind,Zap,Compass,MapPin,TriangleAlert,Target,Orbit} from 'lucide-react'
import {World,lockView,type WorldInput,type FieldStatus,type Phase} from './World'
import {fresh,validSave,current,type State} from './engine'
import {Workshop} from './Workshop'
import {enrollment,status} from './tasks'
import {tone,ambience} from './sound'
import {stationNames,type Zone,type Pose} from './navigation'
import {Terminal,type TerminalEvent} from './Terminal'
import {History} from './ui'
import './game.css'

const pilotKey='terravector.surface-pilot.v2',colonyKey='terravector.mars-control.v1'
const locations={hab:'Habitat 01',green:'Greenhouse',water:'Water plant',outside:'Elysium Planitia'}
const doorIDs={hab:'enterHab',green:'enterGreen',water:'enterWater'}

const wing:Record<string,Zone>={solarProbe:'outside',waterGauge:'water',greenSensor:'green',life:'hab',suit:'hab',reports:'hab',water:'water',green:'green',solar:'outside',shelter:'outside',enterHab:'outside',exit:'hab'}
const spawn=():Pose=>({zone:'hab',x:0,z:-1.46,yaw:0,pitch:-.06})
interface Pilot{pose:Pose;stage:number;suited:boolean;oxygen:number;battery:number;visit:number}
function newPilot(s:State):Pilot{return {pose:spawn(),stage:s.sol===1?0:8,suited:s.sol>1,oxygen:100,battery:100,visit:0}}
function load(){
 let s=fresh()
 try{
  const saved=JSON.parse(localStorage.getItem(colonyKey)||'null');if(validSave(saved))s=saved
  s=enrollment(s)
  const p=JSON.parse(localStorage.getItem(pilotKey)||'null')
  if(p&&p.sol===s.sol&&Object.hasOwn(locations,p.pose?.zone)&&['x','z','yaw','pitch'].every(k=>Number.isFinite(p.pose[k]))&&[p.stage,p.visit,p.oxygen,p.battery].every(Number.isFinite)&&p.stage>=0&&p.stage<=8&&typeof p.suited==='boolean')return {s,p:p as Pilot,existing:true}
 }catch{/* A fresh mission works when persistent storage is unavailable. */}
 s=enrollment(s);return {s,p:newPilot(s),existing:s.done>0}
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
 const [initial]=useState(load),[s,setS]=useState(initial.s),[phase,setScreen]=useState<Phase>('title'),[ready,setReady]=useState(false)
 const pilot=useRef<Pilot>(initial.p),state=useRef(s),mode=useRef<Phase>('title'),station=useRef(''),input=useRef<WorldInput>(null!)
 const [field,setField]=useState<FieldStatus>({zone:pilot.current.pose.zone,near:'',bearing:0,distance:-1,sprint:false})
 const [opened,setOpened]=useState(''),[confirm,setConfirm]=useState(false),[quality,setQuality]=useState<'economy'|'quality'>(()=>matchMedia('(pointer: coarse)').matches?'economy':'quality'),[online,setOnline]=useState(false)
 const [hint,setHint]=useState(''),[cycleText,setCycleText]=useState(''),[saved,setSaved]=useState(true),[started,setStarted]=useState(initial.existing),[,refresh]=useState(0)
 const [bench,setBench]=useState(false),[sound,setSound]=useState(true)
 function signal(ok:boolean){if(sound)tone(ok?540:175)}
 const touch=useRef({side:0,forward:0}),persistTimer=useRef(0),fadeTimer=useRef<ReturnType<typeof setTimeout>|null>(null),hintTimer=useRef<ReturnType<typeof setTimeout>|null>(null)
 const p=pilot.current,goal=objective(s,p),zone=p.pose.zone,dest=routed(goal.station,zone)
 function save(){try{localStorage.setItem(colonyKey,JSON.stringify(state.current));localStorage.setItem(pilotKey,JSON.stringify({...pilot.current,sol:state.current.sol}));setSaved(true)}catch{setSaved(false)}}
 function notice(text:string){setHint(text);if(hintTimer.current)clearTimeout(hintTimer.current);hintTimer.current=setTimeout(()=>setHint(''),4400)}
 function transition(v:Phase){mode.current=v;if(input.current)input.current.phase=v;setScreen(v);touch.current.side=0;touch.current.forward=0;if(v!=='play'&&document.pointerLockElement)document.exitPointerLock()}
 function start(){if(!ready)return;if(sound)tone(370);setStarted(true);save();if(state.current.status!=='active'){transition('end');return}transition('play');lockView();if(p.stage===0)notice('Junction J-2 is losing power. Suit up and check the array.')}
 function pause(){if(mode.current!=='play')return;transition('pause');setConfirm(false);save()}
 function resume(){transition('play');setOpened('');lockView()}
 function setColony(next:State){state.current=next;setS(next);save()}
 function progress(event:TerminalEvent){
  const pilotState=pilot.current
  const order=['life','suit','exit','solar','allocated','enterHab','review','advance']
  if(order[pilotState.stage]===event)pilotState.stage++
  if(event==='suit'){pilotState.suited=true;pilotState.oxygen=100;pilotState.battery=100}
  if(event==='advance'){
   if(state.current.status!=='active'){transition('end');setOpened('')}
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
 function interact(focused?:string){if(mode.current!=='play')return;const id=typeof focused==='string'?focused:station.current;if(!id)return
  if(id==='exit'||id.startsWith('enter')){moveZone(id);return}
  const m=status(state.current)
  setBench((id===m.station&&!m.complete)||['solarProbe','waterGauge','greenSensor'].includes(id));if(sound)tone(360)
  transition('terminal');setOpened(id);save()
 }
 function restart(){if(fadeTimer.current)clearTimeout(fadeTimer.current);const next=enrollment(fresh());pilot.current=newPilot(next);state.current=next;setS(next);station.current='';setField({near:'',distance:-1,bearing:0,sprint:false,zone:'hab'});setStarted(true);setConfirm(false);setOpened('');setHint('');resume();save();notice('Junction J-2 is losing power. Equip your EVA suit.')}
 function updateField(f:FieldStatus,seconds:number){
  if(mode.current!=='play')return
  const pilotState=pilot.current;station.current=f.near;setField(f)
  if(f.zone==='outside'){
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
 input.current={pose:p.pose,phase,state:s,quality,target:dest,station:opened,touch:touch.current,onUse:interact,onPause:pause,onReady:()=>setReady(true),onField:updateField,onControlHint:notice}
 useEffect(()=>{if(location.protocol!=='file:')fetch('/api/advisor/status').then(r=>r.ok&&r.json()).then(v=>setOnline(v?.online===true)).catch(()=>{});const unload=()=>{if(mode.current!=='title')save()};window.addEventListener('pagehide',unload);return()=>{window.removeEventListener('pagehide',unload);if(fadeTimer.current)clearTimeout(fadeTimer.current);if(hintTimer.current)clearTimeout(hintTimer.current)}},[])
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.code!=='Escape'||e.repeat)return;if(mode.current==='terminal'){e.preventDefault();resume()}else if(mode.current==='pause'&&phase==='pause'){e.preventDefault();setConfirm(false);resume()}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key)},[phase])
 useEffect(()=>ambience(sound&&phase==='play'&&zone==='outside'?1.2-current(s).sun:0),[sound,zone,phase,s.sol])
 const mission=status(s),prep=s.sol===1?2:0,evad=p.stage>=3||zone==='outside',completed=mission.step+(prep?(Number(p.suited)+Number(evad)):0)
 const checks=[...(prep?['Equip the EVA suit','Exit the habitat']:[]),...mission.checks]
 const heading=((Math.round(-p.pose.yaw*180/Math.PI)%360)+360)%360
 const padButton=(dir:string,axis:'side'|'forward',val:number,icon:React.ReactNode)=><button aria-label={'Move '+dir} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);touch.current[axis]=val}} onPointerUp={()=>touch.current[axis]=0} onPointerCancel={()=>touch.current[axis]=0}>{icon}</button>
 return <div className={'game phase-'+phase}><World input={input} quality={quality}/>
 {phase==='title'?<div className="splash"><div className="splash-top"><span className="studio"><img src="./planet.svg" alt=""/> TERRAVECTOR</span><span className="sector"><i/> ELYSIUM PLANITIA</span></div><div className="splash-copy"><div className="chapter"><b/> SURFACE EXPEDITION <span>/</span> 01</div><h1>MARS<span>//</span><br/>CONTROL</h1><p>Four astronauts. Seven sols. One outpost.</p><button className="enter" disabled={!ready} onClick={start}>{!ready?'Loading terrain…':started?'Resume mission':'Begin mission'}<ArrowRight size={21}/></button><div className="title-keys"><span><kbd>WASD</kbd> Move</span><span><kbd>Mouse</kbd> Look</span><span><kbd>E</kbd> Interact</span></div></div><div className="title-bottom"><span>JUNIOR ASTRONAUT MISSION TRAINER</span><span>NASA SPACE APPS 2026</span></div></div>:<>
 <header className="flight-top"><div className="flight-brand"><img src="./planet.svg" alt=""/><b>MARS<span>//</span>CONTROL</b></div><div className="flight-loc"><MapPin size={13}/>{locations[zone]}</div><span className="sol-label">SOL <strong>{fmt(s.sol)}</strong> / 07</span><button className="pause" aria-label="Pause mission" onClick={pause} disabled={phase!=='play'}><Pause size={16}/></button></header>
 {(phase==='play'||phase==='cycle')&&<><div className="objective"><small><Target size={13}/> CURRENT MISSION　{completed}/{checks.length}</small><b>{goal.title}</b><p className="now" key={goal.detail}>{dest==='exit'&&goal.station!=='exit'?'Cycle the airlock to begin your EVA.':dest.startsWith('enter')?'Enter '+stationNames[dest].replace(' airlock','')+' through the marked airlock.':goal.detail}</p><progress value={completed} max={checks.length}/><ul className="objective-list">{checks.map((c,i)=><li key={c} className={i<completed?'done':i===completed?'current':''}>{i<completed?'✓':i===completed?'▸':'·'}　{c}</li>)}</ul></div><div className="compassline" aria-label="Compass heading">{['N','NE','E','SE','S','SW','W','NW'][Math.round(heading/45)%8]}　{String(heading).padStart(3,'0')}°</div>
 {field.distance>=0&&<div className="navigation" title="Bearing to next station"><span style={{transform:'rotate('+(-field.bearing)+'rad)'}}>↑</span>{stationNames[dest]} <b>{Math.ceil(field.distance)} m</b></div>}
 <div className="crosshair" aria-hidden="true"/><div className="vitals"><div><Wind/><span>SUIT O₂</span><b>{Math.ceil(p.oxygen)}<em>%</em></b><i style={{width:p.oxygen+'%'}}/></div><div><Zap/><span>SUIT POWER</span><b>{Math.ceil(p.battery)}<em>%</em></b><i style={{width:p.battery+'%'}}/></div><small>{zone==='outside'?'EVA · EXTERIOR':'PRESSURIZED · INTERIOR'}</small></div>
 {field.near&&phase==='play'&&<button className="use-prompt" onClick={()=>interact()}><kbd>E</kbd> {stationNames[field.near]} <ArrowRight size={15}/></button>}
 <div className="motion-hint"><kbd>WASD</kbd> Move · <kbd>Shift</kbd> Sprint · <kbd>Esc</kbd> Pause</div>
 <div className="touch-pad">{padButton('forward','forward',1,<ArrowUp/>)}{padButton('left','side',-1,<ArrowLeft/>)}{padButton('back','forward',-1,<ArrowDown/>)}{padButton('right','side',1,<ArrowRight/>)}</div>
 {zone==='outside'&&(current(s).sun<.6||current(s).risk>2||p.oxygen<25||p.battery<25)&&<div className="hazard"><TriangleAlert size={13}/>{p.oxygen<25||p.battery<25?'Low suit reserve · return to an airlock':current(s).risk>2?'Solar particle alert':current(s).weather}</div>}</>}
 </>}
 {phase==='terminal'&&<Seat label={stationNames[opened]||'Terminal'}>{bench?<Workshop key={opened} id={opened} s={s} apply={setColony} close={resume} cue={signal}/>:<Terminal key={opened} id={opened} s={s} setS={setColony} onRecord={progress} onClose={resume} offlineOnline={online} suited={p.suited} inspectedLife={true} canAdvance={mission.complete}/>}</Seat>}
 {phase==='cycle'&&<div className="cycling"><span>{cycleText}</span></div>}
 {phase==='pause'&&<Seat label="Mission paused"><section className="pause-menu"><small>ARES–01 / FLIGHT MENU</small><h2>Mission paused</h2><p>{goal.detail}</p><label>Field audio <input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/></label><label>Graphics quality <select value={quality} onChange={e=>setQuality(e.target.value as 'quality'|'economy')}><option value="quality">High · shadows</option><option value="economy">Performance</option></select></label><p className="guidekeys">WASD to walk, Shift to sprint. Move the mouse to look. If your browser limits mouse capture, drag to look or use the arrow keys. Press E near equipment.</p><button className="enter" onClick={resume}>Return to field <ArrowRight/></button><button className="simple" onClick={()=>setConfirm(!confirm)}>{confirm?'Keep this mission':'Restart mission'}</button>{confirm&&<button className="danger" onClick={restart}>Replace this save and restart</button>}<small>{saved?'MISSION AUTOSAVED':'LOCAL STORAGE UNAVAILABLE'}</small></section></Seat>}
 {phase==='end'&&<Seat label="Mission debrief"><section className="pause-menu debrief"><small>ARES–01 / DEBRIEF</small><h2>{s.status==='success'?'Mission complete':'Mission ended'}</h2><p>{s.reason}</p><History s={s}/><details><summary>Decisions and consequences</summary>{s.log.map((l,i)=><p key={i}><strong>Sol {l.sol}</strong> · {l.text}</p>)}</details><button className="enter" onClick={restart}>Begin a new mission <ArrowRight/></button></section></Seat>}
 {hint&&phase==='play'&&<div className="radio-note" role="status"><i/>{hint}</div>}
 </div>
}

