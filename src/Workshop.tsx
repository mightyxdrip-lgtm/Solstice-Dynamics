import {calculate,type State} from './engine'
import {status} from './tasks'
import {stationNames} from './navigation'
import {Check,StationIcon,stationLabels} from './visualGuidance'
import {ArrowRight} from 'lucide-react'
import {Science} from './science'
import './workshop.css'

export function Workshop({s,id,close}:{s:State;id:string;close:()=>void}){
 const mission=status(s),f=s.fieldwork!,b=calculate(s)
 const result=s.sol===1?'Generation rose from '+calculate({...s,fieldwork:{...f,solar:'fault'}}).solar+' to '+b.solar+' kWh/sol. Dispatch priority: '+s.settings.priority+'.'
  :s.sol===2?'Recovery verified. '+b.recovered+' L/sol returned to the loop.'
  :s.sol===3?'Stable crop cycle. Projected yield: '+b.harvest+' rations.'
  :s.sol===4?'All four crew have a powered shelter berth.':'Equipment passed its field checks.'
 return <section className="workbench"><header><div><StationIcon id={id}/><h2>{mission.complete?'Complete':'Next'}</h2></div><button aria-label="Close instrument" onClick={close}>×</button></header>
 <div className="bench-body">
 {mission.complete&&<div className="completion-check" aria-label="Mission complete"><Check size={68}/></div>}
 <button className="go-task" aria-label="Return to field" onClick={close}><StationIcon id={mission.station} size={38}/><b>{stationLabels[mission.station]}</b><ArrowRight/></button>
 {mission.complete&&<details><summary>Results</summary><p>{result}</p><Science sol={s.sol}/></details>}</div></section>
}

