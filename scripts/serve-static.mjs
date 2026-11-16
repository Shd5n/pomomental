import http from 'node:http';
import { createReadStream } from 'node:fs';
import { access, readFile, realpath, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const projectPath = path.resolve(path.dirname(scriptPath), '..');
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://*.supabase.co wss://*.supabase.co; media-src 'self' blob: data:; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.supabase.co; frame-ancestors 'none'";
const MIME = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.webmanifest':'application/manifest+json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.webp':'image/webp', '.gif':'image/gif', '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.otf':'font/otf',
  '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg', '.flac':'audio/flac', '.mp4':'video/mp4',
};
const BASE_HEADERS = {
  'Content-Security-Policy': CSP, 'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'strict-origin-when-cross-origin', 'Cross-Origin-Resource-Policy':'same-origin',
  'X-Frame-Options':'DENY', 'Cache-Control':'no-cache, max-age=0, must-revalidate',
};

async function defaultRoot() {
  for (const candidate of [path.join(projectPath,'standalone'),projectPath,path.join(projectPath,'public')]) {
    try { await access(path.join(candidate,'focus.html')); return candidate; } catch { /* Try the next supported layout. */ }
  }
  throw new Error('No PomoMental static build was found. Run the static build first or provide --root.');
}

function installationId(root) {
  return createHash('sha256').update(root.replaceAll('\\','/').toLowerCase()).digest('hex').slice(0,16);
}

export async function startStaticServer({root,port=5187,quiet=false}={}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535.');
  const resolvedRoot = await realpath(root || await defaultRoot());
  const title = await readFile(path.join(resolvedRoot,'focus.html'),'utf8');
  if (!title.includes('<title>PomoMental</title>')) throw new Error('The selected folder is not a PomoMental application.');
  let buildId='development';
  try { const build=JSON.parse(await readFile(path.join(resolvedRoot,'pomomental-build.json'),'utf8'));if(build.app==='PomoMental')buildId=String(build.buildId||'development'); } catch { /* Source previews have no build manifest. */ }
  const rootId=installationId(resolvedRoot);
  const server=http.createServer(async(req,res)=>{
    for(const [name,value] of Object.entries(BASE_HEADERS))res.setHeader(name,value);
    function reply(status,message){res.statusCode=status;res.setHeader('Content-Type','text/plain; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(req.method==='HEAD'?undefined:message);}
    const boundPort=server.address()?.port;
    const hosts=new Set([`127.0.0.1:${boundPort}`,`localhost:${boundPort}`]);
    if(!hosts.has(String(req.headers.host||'').toLowerCase()))return reply(403,'Localhost access only.');
    if(req.headers.origin && ![`http://127.0.0.1:${boundPort}`,`http://localhost:${boundPort}`].includes(req.headers.origin))return reply(403,'Cross-origin requests are not allowed.');
    // OAuth/email callbacks are ordinary top-level GET navigations from Supabase.
    // Permit those while still refusing another site's subresource requests.
    if(req.headers['sec-fetch-site']==='cross-site'&&req.headers['sec-fetch-mode']!=='navigate')return reply(403,'Cross-site requests are not allowed.');
    if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return reply(405,'Method not allowed.');}
    const raw=String(req.url||'/');
    if(!raw.startsWith('/')||raw.startsWith('//'))return reply(400,'Invalid request path.');
    let pathname;
    try{pathname=decodeURIComponent(raw.split('?')[0]);}catch{return reply(400,'Invalid path encoding.');}
    const segments=pathname.split('/');
    if(pathname.includes('\\')||pathname.includes('\0')||pathname.includes(':')||segments.some(part=>part==='..'||part.startsWith('.')))return reply(400,'Invalid request path.');
    if(pathname==='/__pomomental_health'){
      res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
      return res.end(req.method==='HEAD'?undefined:JSON.stringify({app:'PomoMental',kind:'local-static',version:1,rootId,buildId}));
    }
    if(pathname==='/')pathname='/index.html';
    if(pathname.startsWith('/scripts/')||pathname.startsWith('/desktop/')||pathname==='/pomomental-build.json')return reply(404,'Not found.');
    const extension=path.extname(pathname).toLowerCase();
    if(!MIME[extension])return reply(404,'Not found.');
    const filename=path.resolve(resolvedRoot,'.'+pathname);
    const relative=path.relative(resolvedRoot,filename);
    if(relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative))return reply(403,'Path is outside the app.');
    try{
      const actual=await realpath(filename),actualRelative=path.relative(resolvedRoot,actual);
      if(actualRelative.startsWith('..'+path.sep)||actualRelative==='..'||path.isAbsolute(actualRelative))return reply(403,'Path is outside the app.');
      const info=await stat(actual);if(!info.isFile())return reply(404,'Not found.');
      res.setHeader('Content-Type',MIME[extension]);res.setHeader('Content-Length',info.size);
      if(['/config.js','/auth.js','/admin.js','/focus.html','/index.html'].includes(pathname))res.setHeader('Cache-Control','no-store');
      if(pathname==='/sw.js')res.setHeader('Service-Worker-Allowed','/');
      if(req.method==='HEAD')return res.end();
      const stream=createReadStream(actual);stream.on('error',()=>{if(!res.headersSent)reply(500,'Unable to read the asset.');else res.destroy();});stream.pipe(res);
    }catch(error){return reply(['ENOENT','ENOTDIR'].includes(error.code)?404:500,error.code==='ENOENT'?'Not found.':'Unable to read the asset.');}
  });
  server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{server.off('error',reject);resolve();});});
  const url=`http://127.0.0.1:${server.address().port}/focus.html`;
  if(!quiet)console.log(`PomoMental local app: ${url}\nOnly this computer can connect. Stop this server with Ctrl+C.`);
  return {server,url,root:resolvedRoot,rootId};
}

async function main(){
  const options={};
  for(let index=2;index<process.argv.length;index++){
    const arg=process.argv[index];
    if(arg==='--root'){if(!process.argv[index+1])throw new Error('--root needs a folder.');options.root=process.argv[++index];}
    else if(arg==='--port'){options.port=Number(process.argv[++index]);if(!Number.isInteger(options.port)||options.port<1||options.port>65535)throw new Error('--port must be 1–65535.');}
    else if(arg==='--quiet')options.quiet=true;
    else if(arg==='--help'){console.log('Usage: node scripts/serve-static.mjs [--root FOLDER] [--port 5187] [--quiet]');return;}
    else throw new Error(`Unknown argument: ${arg}`);
  }
  const {server}=await startStaticServer(options);
  const stop=()=>server.close(()=>{process.exitCode=0;});
  process.once('SIGINT',stop);process.once('SIGTERM',stop);
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(scriptPath))main().catch(error=>{console.error(`PomoMental: ${error.code==='EADDRINUSE'?'This port is already occupied. Select another port; no process was stopped.':error.message}`);process.exitCode=1;});

