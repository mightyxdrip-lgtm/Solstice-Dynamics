import {readFile,writeFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const root=fileURLToPath(new URL('../dist/',import.meta.url))
let html=await readFile(path.join(root,'index.html'),'utf8')
const jsPath=html.match(/<script[^>]+src="([^"]+)"/)?.[1]
const cssPath=html.match(/<link[^>]+href="([^"]+\.css)"/)?.[1]
if(!jsPath||!cssPath)throw new Error('Build the Vite client before exporting.')
let js=await readFile(path.join(root,jsPath),'utf8')
const css=await readFile(path.join(root,cssPath),'utf8')
for(const [file,mime] of [['./planet.svg','image/svg+xml']]){
 const uri='data:'+mime+';base64,'+(await readFile(path.join(root,file))).toString('base64')
 if(!js.includes(file))throw new Error('Missing built asset reference '+file)
 js=js.replaceAll(file,uri);html=html.replaceAll(file,uri)
}
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,'')
 .replace(/<link[^>]+href="[^"]+\.css"[^>]*>/,()=>'<style>'+css+'</style>')
 .replace('</body>',()=>'<script type="module">'+js.replace(/<\/script/gi,'<\\/script')+'</script></body>')
const notices=await readFile(path.join(root,'NOTICE.txt'),'utf8')
html=html.replace('</html>',()=>'<script type="text/plain" id="third-party-notices">'+notices.replaceAll('<','&lt;')+'</script></html>')
const target=process.argv[2]||'MARS-CONTROL.html'
await writeFile(target,html)
console.log('Standalone edition written to '+target)

