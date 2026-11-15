export const roverBay = {id:'rover',x:-3,z:6}
export const surveyBeacon = {id:'surveyBeacon',x:20,z:52}
export const homeBeacon = {...roverBay,id:'roverHome'}
export const dockingRadius = 3.2
export const surveyStages = ['parked','outbound','chooseRock','drill','stow','inbound','unload','done'] as const
export type Survey = typeof surveyStages[number]
export type SurveyWork = 'chooseRock'|'drill'|'stow'|'unload'
export const surveyWork = (leg:Survey|undefined):leg is SurveyWork=>leg==='chooseRock'||leg==='drill'||leg==='stow'||leg==='unload'
export const crystalRock = 2
export type RoverAction = 'board'|'arrive'|'pick'|'extract'|'pack'|'deliver'
export const driving = (leg:Survey|undefined)=>leg==='outbound'||leg==='inbound'
export function bearingBetween(from:{x:number;z:number},to:{x:number;z:number}){
 return Math.atan2(from.x-to.x,from.z-to.z)
}
export function nearRoute(x:number,z:number){
 const dx=surveyBeacon.x-roverBay.x,dz=surveyBeacon.z-roverBay.z
 const t=Math.max(0,Math.min(1,((x-roverBay.x)*dx+(z-roverBay.z)*dz)/(dx*dx+dz*dz)))
 return Math.hypot(x-roverBay.x-t*dx,z-roverBay.z-t*dz)<3.6
}
