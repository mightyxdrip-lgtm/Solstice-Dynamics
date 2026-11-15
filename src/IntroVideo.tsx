import {useEffect,useRef,useState} from 'react'
import {SkipForward} from 'lucide-react'
import './intro.css'

type IntroProps={
 arriving:boolean
 replay:boolean
 onDismiss:()=>void
 onFadeEnd:()=>void
}

export function IntroVideo({arriving,replay,onDismiss,onFadeEnd}:IntroProps){
 const film=useRef<HTMLVideoElement>(null)
 const overlay=useRef<HTMLElement>(null)
 const [still,setStill]=useState(()=>!replay&&matchMedia('(prefers-reduced-motion: reduce)').matches)
 const [ended,setEnded]=useState(false)
 const poster='./intro-poster.jpg'

 useEffect(()=>{
  const video=film.current
  if(!video)return
  let active=true
  video.play().catch(()=>{if(active&&!video.ended)setStill(true)})
  return ()=>{active=false}
 },[])

 useEffect(()=>{
  if(arriving||(!ended&&!still))return
  const enterWhenVisible=()=>{if(!document.hidden)onDismiss()}
  document.addEventListener('visibilitychange',enterWhenVisible)
  enterWhenVisible()
  return ()=>document.removeEventListener('visibilitychange',enterWhenVisible)
 },[ended,still,arriving,onDismiss])

 useEffect(()=>{
  if(!arriving)return
  film.current?.pause()
  const node=overlay.current
  if(!node||!node.animate||matchMedia('(prefers-reduced-motion: reduce)').matches){onFadeEnd();return}
  const fade=node.animate([{opacity:1,offset:0},{opacity:1,offset:.12},{opacity:0}],{
   duration:900,easing:'ease-in-out',fill:'forwards'
  })
  fade.onfinish=onFadeEnd
  return ()=>{fade.onfinish=null;fade.cancel()}
 },[arriving,onFadeEnd])

 return <section className={'opening-film'+(arriving?' is-arriving':'')} ref={overlay} aria-label="Solstice Dynamics">
  {still?<img src={poster} alt="Mars viewed from orbit"/>:
   <video ref={film} autoPlay muted playsInline preload="auto" poster={poster} onEnded={()=>setEnded(true)} onError={()=>setStill(true)} aria-label="Arrival on Mars">
    <source src="./intro.mp4" type="video/mp4"/>
   </video>}
  <div className="opening-actions"><h1>SOLSTICE <span>DYNAMICS</span></h1>
   <button className="enter" disabled={arriving} onClick={onDismiss}>
    <SkipForward size={21} aria-hidden="true"/>Skip intro
   </button>
  </div>
 </section>
}
