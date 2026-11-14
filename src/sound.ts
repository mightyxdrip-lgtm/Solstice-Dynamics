let context:AudioContext|undefined
export function ambience(level:number){
 if(!context||level<=0)return
 try{
 const audio=context,source=audio.createBufferSource(),filter=audio.createBiquadFilter(),mix=audio.createGain()
 const buffer=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),samples=buffer.getChannelData(0);let last=0
 for(let i=0;i<samples.length;i++){last=(last+(Math.random()-.5)*.1)/1.06;samples[i]=last*4}
 source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=460+level*650;mix.gain.value=.072*level
 source.connect(filter).connect(mix).connect(audio.destination);source.start()
 return ()=>{source.stop();source.disconnect();filter.disconnect();mix.disconnect()}
 }catch{return}
}
export function tone(hz:number,duration=.13){
 try{context??=new AudioContext();if(context.state==='suspended')void context.resume().catch(()=>{})
 const t=context.currentTime,osc=context.createOscillator(),gain=context.createGain();osc.type='sine';osc.frequency.setValueAtTime(hz,t);osc.frequency.exponentialRampToValueAtTime(hz*.84,t+duration);gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.042,t+.018);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);osc.connect(gain).connect(context.destination);osc.start(t);osc.stop(t+duration+.01);osc.onended=()=>{osc.disconnect();gain.disconnect()}
 }catch{/* Audio may be disabled by the browser. */}
}
