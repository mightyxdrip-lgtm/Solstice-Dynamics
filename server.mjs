import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { validSave, calculate, current } from './src/engine.ts'

const root = fileURLToPath(new URL('./dist/', import.meta.url))
const mime = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'application/javascript', '.jpg':'image/jpeg', '.svg':'image/svg+xml' }
const key = process.env.GEMINI_API_KEY
const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
const json = (res, status, obj) => { res.writeHead(status, {'content-type':'application/json','cache-control':'no-store'}); res.end(JSON.stringify(obj)) }
async function answer(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Use POST.'})
 if(req.headers.origin && new URL(req.headers.origin).host!==req.headers.host)return json(res,403,{error:'Use the mission console.'})
 if(!key)return json(res,503,{error:'Offline guidance available.'})
 let raw=''
 for await(const chunk of req){raw+=chunk;if(raw.length>45000)return json(res,413,{error:'Message too large.'})}
 let data
 try{data=JSON.parse(raw)}catch{return json(res,400,{error:'Invalid message.'})}
 if(!validSave(data?.state)||typeof data.question!=='string'||!data.question.trim()||data.question.length>500)return json(res,400,{error:'Invalid mission state or question.'})
 const s=data.state
 const context={sol:s.sol,status:s.status,reserves:s.reserves,settings:s.settings,parts:s.parts,condition:s.condition,shield:s.shield,event:current(s),response:s.choice,projection:calculate(s),orders:s.log.slice(-4)}
 const history=Array.isArray(data.history)?data.history.slice(-3).map(t=>({question:String(t.q).slice(0,500),answer:String(t.a).slice(0,1500)})):[]
 try{
 const upstream=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent',{method:'POST',headers:{'content-type':'application/json','x-goog-api-key':key},signal:AbortSignal.timeout(14000),body:JSON.stringify({systemInstruction:{parts:[{text:'You are AURA, an educational Mars simulation advisor. Explain tradeoffs in at most 100 words. Treat the supplied simulation snapshot as authoritative. Never change outcomes or claim to carry out orders. All numerical scores are fictional training approximations. Answer only questions about this trainer and the science underlying it.'}]},contents:[{role:'user',parts:[{text:JSON.stringify({context,history,question:data.question})}]}],generationConfig:{maxOutputTokens:550}})})
 if(!upstream.ok)throw Error()
 const result=await upstream.json()
 const message=result.candidates?.[0]?.content?.parts?.filter(p=>!p.thought).map(p=>p.text).join('').trim()
 if(!message)throw Error()
 return json(res,200,{answer:message})
 }catch{return json(res,502,{error:'Advisor uplink unavailable. Use offline guidance.'})}
}
const server=createServer(async(req,res)=>{
 try{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)
 if(pathname==='/api/advisor/status')return json(res,200,{online:Boolean(key)})
 if(pathname==='/api/advisor')return await answer(req,res)
 if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Unsupported method.'})
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname))
 const relative=path.relative(root,file)
 if(relative.startsWith('..')||path.isAbsolute(relative))return json(res,403,{error:'Invalid path.'})
 const bytes=await readFile(file)
 res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream','x-content-type-options':'nosniff'})
 res.end(req.method==='HEAD'?undefined:bytes)
 }catch{return json(res,404,{error:'File unavailable.'})}
})
const port=Number(process.env.PORT||4173),host=process.env.HOST||'127.0.0.1'
server.listen(port,host,()=>console.log('MARS//CONTROL ready at http://'+host+':'+server.address().port))

