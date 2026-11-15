import {useEffect,type RefObject} from 'react'
import type {WorldInput} from './World'

export const neutralPad=()=>({side:0,forward:0,lookX:0,lookY:0,throttle:0,sprint:false})
const trimmed=(axis:number)=>Math.sign(axis)*Math.max(0,(Math.min(1,Math.abs(axis))-.17)/.83)
function key(code:string,pressed:boolean){
 const value=code.startsWith('Key')?code.slice(3).toLowerCase():code
 const target=document.querySelector('.world canvas')??window
 target.dispatchEvent(new KeyboardEvent(pressed?'keydown':'keyup',{code,key:value,bubbles:true,cancelable:true}))
}
function menuItems(){
 const root=document.querySelector('dialog[open]')??document.querySelector('.game')
 return [...(root?.querySelectorAll<HTMLElement>('button,summary,select,input,a[href]')??[])].filter(el=>
  !el.matches(':disabled')&&!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')
}
function navigate(direction:number,items:HTMLElement[]){
 if(!items.length)return
 const active=document.activeElement as HTMLElement,at=items.indexOf(active)
 if(at>=0&&active instanceof HTMLSelectElement&&direction>=14){
  active.selectedIndex=Math.max(0,Math.min(active.options.length-1,active.selectedIndex+(direction===15?1:-1)))
  active.dispatchEvent(new Event('change',{bubbles:true}));return
 }
 const next=at<0?0:(at+(direction===12||direction===14?-1:1)+items.length)%items.length
 items[next].focus({preventScroll:true});items[next].scrollIntoView({block:'nearest',inline:'nearest'})
}

/** Poll standard Web Gamepad controls. A held button has a single owner across screen changes. */
export function useController(input:RefObject<WorldInput>,show:(using:boolean)=>void){
 useEffect(()=>{
  if(!navigator.getGamepads)return
  let frame=0,prior:boolean[]=[],connected=-1,using=false,heldAction=false
  let direction=-1,repeatAt=0,screen='',suspended=false
  const release=()=>{if(heldAction){key('KeyE',false);heldAction=false}}
  const reset=()=>{release();Object.assign(input.current.pad,neutralPad());direction=-1}
  function indicate(value:boolean){if(using!==value){using=value;show(value)}}
  const physical=(event:Event)=>{if(event.isTrusted)indicate(false)}
  function blur(){suspended=true;reset()}
  function focus(){suspended=false;prior=[];connected=-1}
  function tick(now:number){
   frame=requestAnimationFrame(tick)
   if(document.hidden||suspended)return
   let pads:(Gamepad|null)[]=[]
   try{pads=Array.from(navigator.getGamepads())}catch{return}
   const mapped=pads.filter((p):p is Gamepad=>!!p&&p.connected&&p.mapping==='standard')
   const pad=mapped.find(p=>p.index===connected)??mapped.find(p=>p.buttons.some(b=>b.pressed))??mapped[0]
   if(!pad){
    if(connected!==-1){reset();indicate(false);if(['play','survey'].includes(input.current.phase))input.current.onPause()}
    connected=-1;prior=[];return
   }
   if(connected!==pad.index){reset();prior=[];connected=pad.index}
   const buttons=pad.buttons.map(b=>b.pressed),edge=(i:number)=>!!buttons[i]&&!prior[i]
   const a=input.current,play=a.phase==='play',survey=a.phase==='survey',instrument=a.phase==='terminal'&&a.service
   const axes=pad.axes.map(trimmed)
   const side=axes[0]||0,forward=-(axes[1]||0),lookX=axes[2]||0,lookY=axes[3]||0
   if(buttons.some((b,i)=>b&&!prior[i])||axes.some(v=>Math.abs(v)>.12))indicate(true)
   if(screen!==a.phase){release();direction=-1;screen=a.phase}
   if(!buttons[0])release()
   Object.assign(a.pad,play?{side,forward,lookX,lookY,sprint:!!buttons[10],throttle:(pad.buttons[7]?.value||0)-(pad.buttons[6]?.value||0)}:neutralPad())
   let dir=[12,13,14,15].find(i=>buttons[i])??-1
   if(dir===-1&&!play&&Math.max(Math.abs(side),Math.abs(forward))>.47)
    dir=Math.abs(side)>Math.abs(forward)?side>0?15:14:forward>0?12:13
   const step=dir>=0&&(dir!==direction||now>=repeatAt)
   if(step)repeatAt=now+(direction===dir?145:380)
   direction=dir
   const pulse=(code:string)=>{key(code,true);key(code,false)}
   if(edge(9)&&['play','survey','pause','terminal'].includes(a.phase)){a.onEscape()}
   else if(edge(1)&&['pause','terminal','survey','play'].includes(a.phase)){a.onEscape()}
   else if(play){
    if(edge(0))pulse('KeyE')
   }else if(survey||instrument){
    if(step)pulse(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'][dir-12])
    if(instrument&&edge(4))pulse('KeyQ')
    if(instrument&&edge(5))pulse('KeyR')
    if(edge(0)){heldAction=true;key('KeyE',true)}
   }else if(['title','home','terminal','pause','end','finale'].includes(a.phase)){
    const items=(step||edge(0))?menuItems():[]
    if(step)navigate(dir,items)
    if(edge(0)){
     const current=document.activeElement as HTMLElement,target=items.includes(current)?current:items[0]
     if(target&&!(target instanceof HTMLSelectElement)){target.focus();target.click()}
    }
   }
   prior=buttons
  }
  window.addEventListener('keydown',physical,true);window.addEventListener('pointerdown',physical,true)
  window.addEventListener('blur',blur);window.addEventListener('focus',focus)
  frame=requestAnimationFrame(tick)
  return ()=>{cancelAnimationFrame(frame);reset();window.removeEventListener('keydown',physical,true);window.removeEventListener('pointerdown',physical,true);window.removeEventListener('blur',blur);window.removeEventListener('focus',focus)}
 },[input,show])
}
