import {useEffect,useLayoutEffect,useRef,useState} from 'react'
import {ArrowDownToLine,ChevronLeft,ChevronRight,Crosshair,Drill,Gem,Hand,PackageCheck,TestTubeDiagonal} from 'lucide-react'
import {gameKey} from './input'
import {crystalRock,type RoverAction,type SurveyWork} from './roverRoute'
import type {SamplerInput} from './roverSampling'

const labels={chooseRock:'Pick the blue crystal',drill:'Hold to drill',stow:'Stow the core',unload:'Give the core to the lab'}
const stages=['chooseRock','drill','stow','unload'] as const
export function RoverSurvey({stage,controls,onAction,usingPad}:{stage:SurveyWork;controls:SamplerInput;onAction:(action:RoverAction,rock?:number)=>void;usingPad:boolean}){
 const [selected,setSelected]=useState(controls.aim),[miss,setMiss]=useState(-1)
 const held=useRef(false),moving=useRef(false),committed=useRef(false),panel=useRef<HTMLElement>(null)
 const missTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const send=useRef(onAction);send.current=onAction
 function aim(index:number){if(index<0||index>2)return;controls.aim=index;setSelected(index)}
 function pick(i:number){
  if(committed.current)return
  aim(i);clearTimeout(missTimer.current)
  if(i!==crystalRock){
   setMiss(i);missTimer.current=setTimeout(()=>setMiss(-1),750);return
  }
  committed.current=true;send.current('pick',i)
 }
 function start(){
  if(committed.current)return
  if(stage==='chooseRock'){pick(controls.aim);return}
  if(stage==='drill')held.current=true
  else moving.current=true
 }
 function release(){held.current=false}
 useLayoutEffect(()=>{
  controls.drill=0;controls.transfer=0;held.current=moving.current=committed.current=false
  panel.current?.focus({preventScroll:true})
  return ()=>{held.current=moving.current=false;controls.drill=0;controls.transfer=0;clearTimeout(missTimer.current)}
 },[controls,stage])
 useEffect(()=>{
  let frame=0,previous=performance.now()
  controls.pressTool=i=>{if(stage==='chooseRock')pick(i);else start()};controls.releaseTool=release
  function animate(now:number){
   const dt=Math.min(.15,(now-previous)/1000);previous=now
   if(!committed.current&&!document.hidden){
    if(stage==='drill'){
     controls.drill=held.current?Math.min(1,controls.drill+dt/1.45):0
     if(controls.drill>=1){committed.current=true;held.current=false;send.current('extract')}
    }else if(moving.current){
     controls.transfer=Math.min(1,controls.transfer+dt/1.05)
     if(controls.transfer>=1){committed.current=true;send.current(stage==='stow'?'pack':'deliver')}
    }
    panel.current?.style.setProperty('--fill',Math.round(Math.max(controls.drill,controls.transfer)*360)+'deg')
   }
   frame=requestAnimationFrame(animate)
  }
  function down(e:KeyboardEvent){
   if(e.altKey||e.ctrlKey||e.metaKey)return
   const k=gameKey(e)
   if(stage==='chooseRock'&&['ArrowLeft','KeyA','ArrowRight','KeyD'].includes(k)){
    e.preventDefault();if(!e.repeat)aim((controls.aim+(k==='ArrowLeft'||k==='KeyA'?2:1))%3);return
   }
   if(k!=='KeyE'&&k!=='Enter'&&k!=='Space')return
   // Native activation preserves tab order when someone uses the individual rock buttons.
   if(stage==='chooseRock'&&k!=='KeyE'&&e.target instanceof HTMLElement&&e.target.closest('button'))return
   if(k!=='KeyE'&&e.target instanceof HTMLElement&&e.target.closest('.pause'))return
   e.preventDefault()
   if(!e.repeat)start()
  }
  function up(e:KeyboardEvent){if(['KeyE','Space','Enter'].includes(gameKey(e)))release()}
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release)
  frame=requestAnimationFrame(animate)
  return ()=>{controls.pressTool=undefined;controls.releaseTool=undefined;cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release)}
 },[stage,controls])
 const Act=stage==='drill'?Drill:stage==='stow'?ArrowDownToLine:PackageCheck
 const Symbol=stage==='chooseRock'?Gem:stage==='drill'?Drill:stage==='stow'?TestTubeDiagonal:PackageCheck
 return <section className="sample-work" ref={panel} aria-label="Rover sampling arm" tabIndex={-1}>
  <div className="sample-cue"><Symbol aria-hidden="true"/><h2>{labels[stage]}</h2>
   <span aria-label={'Step '+(stages.indexOf(stage)+1)+' of 4'}>{stages.map((s,i)=><i key={s} className={i<=stages.indexOf(stage)?'lit':''}/>)}</span>
  </div>
  {stage==='chooseRock'?[0,1,2].map(i=><button key={i} className={'sample-pin '+(i===selected?'selected ':'')+(miss===i?'miss':'')}
    ref={el=>{controls.buttons[i]=el}} aria-label={['Rust-colored rock','Dark rock','Blue crystal rock'][i]} aria-pressed={selected===i}
    onFocus={()=>aim(i)} onClick={()=>pick(i)}>{miss===i?'×':<Crosshair size={23}/>}</button>):
   <button className="sample-pin sample-action" ref={el=>{controls.buttons[0]=el}} aria-label={labels[stage]}
    onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);if(stage==='drill')start()}}
    onPointerUp={release} onLostPointerCapture={release} onPointerCancel={release}
    onClick={()=>{if(stage!=='drill')start()}}><Act aria-hidden="true"/></button>}
  <div className="sample-keys">
   {stage==='chooseRock'?<><button aria-label="Aim left" onClick={()=>aim((controls.aim+2)%3)}><ChevronLeft/></button>
    <button onClick={start} aria-label="Pick aimed rock"><kbd>{usingPad?'A / ×':'E'}</kbd><Crosshair/></button>
    <button aria-label="Aim right" onClick={()=>aim((controls.aim+1)%3)}><ChevronRight/></button></>:
    <span><kbd>{usingPad?'A / ×':'E'}</kbd><span>{stage==='drill'?'Hold':'Press'}</span><Hand size={16}/></span>}
  </div>
 </section>
}
