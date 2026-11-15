export interface GameKeyEvent {
 code?:string
 key?:string
 keyCode?:number
 location?:number
}

const physicalKeys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyE','KeyQ','KeyR','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','ShiftLeft','ShiftRight','Enter','Space','Escape'])
const namedKeys:Record<string,string>={
 w:'KeyW',a:'KeyA',s:'KeyS',d:'KeyD',e:'KeyE',q:'KeyQ',r:'KeyR',
 arrowleft:'ArrowLeft',left:'ArrowLeft',arrowright:'ArrowRight',right:'ArrowRight',
 arrowup:'ArrowUp',up:'ArrowUp',arrowdown:'ArrowDown',down:'ArrowDown',
 enter:'Enter',return:'Enter',numpadenter:'Enter',
 ' ':'Space',space:'Space',spacebar:'Space',escape:'Escape',esc:'Escape'
}
const legacyKeys:Record<number,string>={13:'Enter',27:'Escape',32:'Space',37:'ArrowLeft',38:'ArrowUp',39:'ArrowRight',40:'ArrowDown',65:'KeyA',68:'KeyD',69:'KeyE',81:'KeyQ',82:'KeyR',83:'KeyS',87:'KeyW'}

// Embedded browsers can omit `code`. Use the same normalization for presses
// and releases so a fallback movement key cannot remain held indefinitely.
export function gameKey(event:GameKeyEvent):string {
 if(event.code==='NumpadEnter')return 'Enter'
 if(event.code&&physicalKeys.has(event.code))return event.code
 const key=event.key?.toLowerCase()
 if(key==='shift')return event.location===2?'ShiftRight':'ShiftLeft'
 if(key&&Object.hasOwn(namedKeys,key))return namedKeys[key]
 // Do not turn text composition or an unrelated named key into a game action.
 if(key&&key!=='unidentified')return ''
 if(event.keyCode===16)return event.location===2?'ShiftRight':'ShiftLeft'
 return event.keyCode===undefined?'':legacyKeys[event.keyCode]||''
}
