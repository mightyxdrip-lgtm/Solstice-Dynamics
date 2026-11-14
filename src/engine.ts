export type Resource = 'oxygen'|'water'|'food'|'power'|'crew'
export type Reserves = Record<Resource,number>
export const capacities: Reserves = {oxygen:20, water:100, food:40, power:100, crew:100}
export const units = {oxygen:'kg', water:'L', food:'rations', power:'kWh', crew:'%'}
export const resources = Object.keys(capacities) as Resource[]
export type Mode = 'balanced'|'life'|'crops'
export type Management = {priority:Mode, air:'normal'|'eco', irrigation:'standard'|'low'|'high'}
export type State = {
 version:1, sol:number, done:number, reserves:Reserves, parts:number, actions:number,
 condition:number, solar:number, shield:number, recycled:number, choice:number|null,
 investigated:boolean, settings:Management, status:'active'|'success'|'failure', reason:string,
 history:{sol:number,reserves:Reserves}[], log:{sol:number,text:string}[]
}
type Effect = Partial<Reserves> & {condition?:number, parts?:number, recycled?:number, protection?:number, harvest?:number}
type Option = {name:string, detail:string, effect:Effect}
type Event = {title:string,category:string,description:string,options:Option[],lesson:string,weather:string,temp:number,wind:number,sun:number,risk:number}
export const events:Event[]=[
 {title:'Dust front inbound',category:'Weather advisory',description:'A dust front will dim the array during this sol. Choose how the crew should prepare.',options:[{name:'Shed auxiliary loads',detail:'Save 8 kWh. Reduced cabin comfort costs 2 crew points.',effect:{power:8,crew:-2}},{name:'Keep the habitat powered',detail:'Maintain crew comfort. Draw an extra 7 kWh from storage.',effect:{power:-7,crew:1}}],lesson:'Dust in the atmosphere blocks sunlight. A charged battery lets the crew ride out a drop in generation.',weather:'Rising dust',temp:-58,wind:18,sun:.74,risk:1},
 {title:'Recycler pressure drop',category:'Water systems',description:'A clogged filter is limiting water recovery. The crew can replace it or bypass the unit.',options:[{name:'Fit a spare filter',detail:'Use 1 spare to increase water recovery by 15 percentage points for the mission.',effect:{parts:-1,recycled:.15}},{name:'Flush the filter',detail:'Spend 9 L of clean water to clear the obstruction for this shift.',effect:{water:-9}}],lesson:'Recycling reduces the amount of stored water needed per sol. Worn filters put that recovery at risk.',weather:'Dust storm',temp:-66,wind:32,sun:.35,risk:1},
 {title:'Grow lights requested',category:'Greenhouse request',description:'The mature crop is ready for a final lighting cycle, but the lamps share a bus with life support.',options:[{name:'Power the grow lights',detail:'Allocate 11 kWh for 5 extra rations from the mature crop.',effect:{power:-11,harvest:5}},{name:'Trim the harvest',detail:'Switch off auxiliary lamps. Gain 4 kWh of headroom but lose 2 rations.',effect:{power:4,food:-2}}],lesson:'A controlled growing environment exchanges electricity and water for food. Harvests here represent an established crop.',weather:'Clearing skies',temp:-52,wind:13,sun:.83,risk:1},
 {title:'Solar particle alert',category:'Radiation advisory',description:'A simulated particle event raises exposure outside the shelter. Schedule the crew’s shift.',options:[{name:'Shelter the crew',detail:'Use 6 kWh for shelter operations. Add 3 protection levels for this sol.',effect:{power:-6,protection:3}},{name:'Continue surface work',detail:'Recover 1 spare outside. Existing shielding determines crew exposure.',effect:{parts:1}}],lesson:'A shelter and shorter exposure times reduce risk from a solar particle event. Shielding does not remove all radiation.',weather:'Clear skies',temp:-55,wind:8,sun:1,risk:4},
 {title:'Habitat seal wear',category:'Maintenance alert',description:'The airlock seal is leaking. A permanent repair uses a spare, while a temporary patch consumes stored oxygen.',options:[{name:'Replace the seal',detail:'Spend 1 spare. Restore 13 equipment condition points.',effect:{parts:-1,condition:13}},{name:'Install a temporary patch',detail:'Lose 5 kg of oxygen and 9 equipment condition points.',effect:{oxygen:-5,condition:-9}}],lesson:'A spare can prevent a small leak from consuming reserves every time the airlock cycles.',weather:'Thin haze',temp:-60,wind:17,sun:.8,risk:1},
 {title:'Supply crate released',category:'Crew allocation',description:'The crew has time to unpack one pallet before the evening cold sets in.',options:[{name:'Unload potable water',detail:'Add 16 L to water storage. EVA effort costs 3 crew points.',effect:{water:16,crew:-3}},{name:'Unload food and spares',detail:'Add 6 rations and 1 spare. The heated cart uses 5 kWh.',effect:{food:6,parts:1,power:-5}}],lesson:'Supply margins give the crew choices. An extra spare is valuable only if food and water last long enough to use it.',weather:'Blowing dust',temp:-64,wind:24,sun:.55,risk:2},
 {title:'Final shift handover',category:'Mission closeout',description:'Prepare the outpost for the next crew. Choose which reserve to protect during handover.',options:[{name:'Run a quiet shift',detail:'Save 9 kWh and use 2 stored rations for ready-made meals.',effect:{power:9,food:-2}},{name:'Service the habitat',detail:'Spend 5 kWh to recover 8 condition points and 3 crew points.',effect:{power:-5,condition:8,crew:3}}],lesson:'A successful handover leaves operational equipment and a safe crew as well as positive reserves.',weather:'Clear skies',temp:-51,wind:9,sun:.98,risk:1}
]
const limit=(n:number,a=0,b=100)=>Math.min(b,Math.max(a,n))
const round=(n:number)=>Math.round(n*100)/100
export const pct=(s:Reserves,k:Resource)=>Math.round(100*s[k]/capacities[k])
export const current=(s:State)=>events[s.sol-1]
export function fresh():State{
 const reserves={oxygen:17,water:78,food:28,power:82,crew:94}
 return {version:1,sol:1,done:0,reserves,parts:4,actions:2,condition:90,solar:0,shield:1,recycled:.64,choice:null,investigated:false,settings:{priority:'balanced',air:'normal',irrigation:'standard'},status:'active',reason:'',history:[{sol:0,reserves:{...reserves}}],log:[{sol:1,text:'Surface link established. Four crew checked in at Ares Outpost.'}]}
}
export const jobs={
 array:{name:'Extend solar array',parts:2,energy:3,detail:'Add 8 kWh of clear-sky capacity per sol.'},
 repair:{name:'Service equipment',parts:1,energy:2,detail:'Restore up to 22 equipment condition points.'},
 shield:{name:'Reinforce shelter',parts:1,energy:4,detail:'Add one permanent shielding level (maximum 4).'},
 survey:{name:'Survey the terrain',parts:0,energy:2,detail:'Reveal the next sol’s weather and sunlight forecast.'}
} as const
export type Job=keyof typeof jobs
export function jobBlock(s:State,k:Job){
 if(s.status!=='active')return 'Mission closed'
 if(s.actions<1)return 'No crew actions left'
 if(s.parts+(s.choice===null?0:Math.min(0,current(s).options[s.choice].effect.parts||0))<jobs[k].parts)return 'Insufficient uncommitted spares'
 if(s.reserves.power<jobs[k].energy)return 'Insufficient battery reserve'
 if(k==='repair'&&s.condition>=100)return 'Equipment at full condition'
 if(k==='shield'&&s.shield>=4)return 'Shielding at maximum'
 if(k==='survey'&&(s.investigated||s.sol===7))return s.sol===7?'Final shift':'Forecast acquired'
 return ''
}
export function forecast(s:State){const e=events[s.sol];return e?`Sol ${s.sol+1} · ${e.weather}, ${Math.round(e.sun*100)}% sunlight, ${e.wind} km/h winds.`:'Final shift.'}
export function performJob(s:State,k:Job):State {
 if(jobBlock(s,k))return s
 const next=structuredClone(s),job=jobs[k]
 next.parts-=job.parts;next.reserves.power-=job.energy;next.actions--
 if(k==='array')next.solar++
 if(k==='repair')next.condition=limit(s.condition+22)
 if(k==='shield')next.shield++
 if(k==='survey')next.investigated=true
 next.log.push({sol:s.sol,text:`${job.name}: −${job.energy} kWh, ${job.parts} spares used. ${k==='survey'?forecast(s):job.detail}`})
 return next
}
export function selectChoice(s:State,i:number):State {
 const opt=current(s).options[i]
 if(s.status!=='active'||!opt||s.parts+(opt.effect.parts||0)<0)return s
 return {...s,choice:i}
}
export function changeSettings(s:State,patch:Partial<Management>):State{
 return s.status==='active'?{...s,settings:{...s.settings,...patch}}:s
}
export function calculate(s:State){
 const e=current(s), f:Effect=s.choice===null?{}:e.options[s.choice].effect
 const {priority,air,irrigation}=s.settings
 const condition=limit(s.condition+(f.condition||0))
 const efficiency=.55+.45*condition/100
 const solar=round((34+8*s.solar)*e.sun*efficiency)
 const airLoad=(air==='eco'?6:10)+(priority==='life'?3:0)
 const waterLoad=priority==='life'?9:7
 const cropLoad=(priority==='crops'?14:priority==='life'?4:8)*(irrigation==='low'?.65:irrigation==='high'?1.2:1)
 const demand=round(8+airLoad+waterLoad+cropLoad)
 const available=Math.max(0,s.reserves.power+solar+(f.power||0))
 const powered=Math.min(1,available/demand)
 const flushBoost=s.sol===2&&s.choice===1?.15:0
 const recovered=round(Math.min(12,12*limit(s.recycled+(f.recycled||0)+flushBoost,0,.95)*efficiency*powered*(waterLoad/7)))
 const irrigationWater=irrigation==='low'?2:irrigation==='high'?7:4
 const wet=Math.min(1,Math.max(0,s.reserves.water+(f.water||0)+recovered-12)/irrigationWater)
 const harvest=round((cropLoad/8)*3.2*efficiency*powered*wet+(f.harvest||0)*powered*wet)
 const oxygenMade=round(airLoad*.33*efficiency*powered)
 const radiationLoss=Math.max(0,e.risk-s.shield-(f.protection||0))*6
 const result:Reserves={
 oxygen:s.reserves.oxygen+(f.oxygen||0)+oxygenMade-3.4,
 water:s.reserves.water+(f.water||0)+recovered-12-irrigationWater*wet,
 food:s.reserves.food+(f.food||0)+harvest-4,
 power:available-demand,
 crew:s.reserves.crew+(f.crew||0)-radiationLoss-(1-powered)*18-(air==='eco'?2:0)-(irrigation==='high'?1:0)
 }
 for(const k of resources)result[k]=round(limit(result[k],0,capacities[k]))
 return {result,solar,demand,available,powered,recovered,harvest,oxygenMade,radiationLoss,condition:Math.max(0,condition-5),recycled:limit(s.recycled+(f.recycled||0),0,.95)}
}
export function advance(s:State):State{
 if(s.status!=='active'||s.choice===null)return s
 const opt=current(s).options[s.choice]
 if(s.parts+(opt.effect.parts||0)<0)return s
 const p=calculate(s),next=structuredClone(s)
 next.reserves=p.result;next.condition=p.condition;next.recycled=p.recycled;next.parts+=opt.effect.parts||0;next.done=s.sol
 next.history.push({sol:s.sol,reserves:{...p.result}})
 next.log.push({sol:s.sol,text:`${opt.name}. ${opt.detail} ${s.settings.priority} power priority, ${s.settings.air} air cycle, ${s.settings.irrigation} irrigation. Generated ${p.solar} kWh, recovered ${p.recovered} L, harvested ${p.harvest} rations.`})
 const empty=resources.find(k=>k!=='crew'&&p.result[k]<=0)
 if(empty||p.result.crew<60||p.condition<30){
 next.status='failure'
 const tips={oxygen:'Keep the air cycle at normal or give life support priority.',water:'Reduce irrigation, replace the recycler filter, or unload potable water.',food:'Give grow lights more power or unload the food pallet.',power:'Extend the array before dusty weather or shed auxiliary loads.',crew:'Schedule shelter time and preserve crew comfort.'}
 next.reason=empty?`The ${empty} reserve reached zero. ${tips[empty]}`:p.result.crew<60?'Crew condition fell below 60%. Schedule shelter time and protect crew comfort.':'Equipment condition fell below 30%. Service the equipment before another shift.'
 }else if(s.sol===7){next.status='success';next.reason='All seven shifts are complete. The crew is safe and every essential reserve is above zero.'}
 else {
 next.sol++;next.actions=2;next.choice=null;next.investigated=false
 if(next.sol===2)next.recycled=round(next.recycled-.15)
 }
 return next
}
export function validSave(v:unknown):v is State{
 if(!v||typeof v!=='object')return false
 const s=v as State
 const reservesOk=(r:Reserves)=>r&&resources.every(k=>Number.isFinite(r[k])&&r[k]>=0&&r[k]<=capacities[k])
 return s.version===1&&Number.isInteger(s.sol)&&s.sol>=1&&s.sol<=7&&Number.isInteger(s.done)&&s.done>=0&&s.done<=7&&
 ['active','success','failure'].includes(s.status)&&(s.status==='active'?s.sol===s.done+1:s.sol===s.done)&&reservesOk(s.reserves)&&
 ['condition','solar','parts','shield','actions','recycled'].every(k=>Number.isFinite(s[k as keyof State]))&&s.parts>=0&&s.actions>=0&&s.actions<=2&&
 [null,0,1].includes(s.choice)&&['balanced','life','crops'].includes(s.settings?.priority)&&['normal','eco'].includes(s.settings?.air)&&['standard','low','high'].includes(s.settings?.irrigation)&&Array.isArray(s.log)&&s.log.every(x=>Number.isInteger(x.sol)&&typeof x.text==='string')&&
 Array.isArray(s.history)&&s.history.length===s.done+1&&s.history.every((x,i)=>x.sol===i&&reservesOk(x.reserves))
}

