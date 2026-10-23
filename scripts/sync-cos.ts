import {spawn} from 'node:child_process';
import path from 'node:path';
import {createInterface} from 'node:readline';
import {pathToFileURL} from 'node:url';

export const defaults={concurrency:8,fileTimeoutMs:120_000,listTimeoutMs:120_000,maxAttempts:3};
type Settings=typeof defaults;
type Log=(message:string)=>void;
type RunOptions={label:string;timeoutMs:number;log:Log};
export type RcloneRunner=(args:string[],options:RunOptions)=>Promise<string>;
export interface InventoryFile {Path:string;Size:number;IsDir:false;Hashes?:Record<string,string>}

// The worker pool owns retries. In rclone's S3 backend, a value of 1 still
// permits an AWS SDK retry; 0 disables those hidden SDK retries. DEBUG also
// exposes the backend pacer's remaining retries (e.g. malformed list responses).
const commonFlags=[
  '--config','/dev/null','--contimeout','10s','--timeout','30s',
  '--retries','1','--low-level-retries','0',
  '--log-level','DEBUG','--stats','10s','--stats-one-line',
];
const excluded=['.git/**','tauri/**','.github/workflows/**'];
const md5=(file:InventoryFile)=>file.Hashes?.md5?.toLowerCase()??'';
const validMd5=(value:string)=>/^[a-f0-9]{32}$/.test(value);
const reason=(error:unknown)=>error instanceof Error?error.message:String(error);
const annotation=(level:'warning'|'error',message:string)=>
  `::${level}::${message.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')}`;

// Spawn directly, without a shell: spaces and Chinese filenames stay intact.
// A process deadline bounds the whole file attempt, including all API calls,
// rather than just the I/O idle period controlled by rclone's --timeout.
export const runRclone:RcloneRunner=(args,{label,timeoutMs,log})=>new Promise((resolve,reject)=>{
  const secrets=Object.entries(process.env).filter(([name,value])=>value&&
    /^(?:RCLONE_CONFIG_.+_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN)|TENCENT_SECRET_ID|TENCENT_SECRET_KEY)$/.test(name)).map(([,value])=>value!);
  const child=spawn('rclone',args,{stdio:['ignore','pipe','pipe']});
  let output='',errorTail='',timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;child.kill('SIGKILL');},timeoutMs);
  const lines=createInterface({input:child.stderr});
  lines.on('line',raw=>{
    // Old rclone versions print environment credentials in DEBUG configuration
    // messages. Keep only retry diagnostics from DEBUG, and redact credentials
    // from every forwarded line before retaining it in the error buffer.
    const debug=raw.match(/\bDEBUG\s*:\s*(.*)/)?.[1];
    if(debug!==undefined&&!/^(?:pacer:|retry\b|retrying\b|low level retry\b)/i.test(debug))return;
    const line=secrets.reduce((message,secret)=>message.replaceAll(secret,'***'),raw);
    errorTail=(errorTail+line+'\n').slice(-8_000);
    log(`[${label}] ${line}`);
  });
  child.stdout.setEncoding('utf8');
  child.stdout.on('data',chunk=>{output+=chunk;});
  child.once('error',error=>{clearTimeout(timer);lines.close();reject(error);});
  child.once('close',(code,signal)=>{
    clearTimeout(timer);lines.close();
    if(timedOut)reject(new Error(`hard timeout after ${timeoutMs/1000}s; rclone killed${errorTail?'\n'+errorTail.trim():''}`));
    else if(code!==0)reject(new Error(`rclone exited ${code??signal}${errorTail?'\n'+errorTail.trim():''}`));
    else resolve(output);
  });
});

function parseInventory(raw:string,label:string):InventoryFile[]{
  const data:unknown=JSON.parse(raw);
  if(!Array.isArray(data))throw new Error(`${label}: expected an inventory array`);
  const seen=new Set<string>();
  for(const file of data){
    if(!file||typeof file.Path!=='string'||!file.Path||file.IsDir!==false||
      file.Path.split('/').some((part:string)=>!part||part==='.'||part==='..')||
      !Number.isSafeInteger(file.Size)||file.Size<0||seen.has(file.Path)){
      throw new Error(`${label}: invalid or duplicate inventory entry: ${JSON.stringify(file)}`);
    }
    if(file.Hashes!==undefined&&(!file.Hashes||typeof file.Hashes!=='object'||
      Object.values(file.Hashes).some(value=>typeof value!=='string'))){
      throw new Error(`${label}: invalid hashes for ${JSON.stringify(file.Path)}`);
    }
    seen.add(file.Path);
  }
  return data;
}

export function planSync(local:InventoryFile[],remote:InventoryFile[]){
  const destination=new Map(remote.map(file=>[file.Path,file]));
  const source=new Set(local.map(file=>file.Path));
  const uploads=local.filter(file=>{
    const hash=md5(file);
    if(!validMd5(hash))throw new Error(`Missing local MD5 for ${JSON.stringify(file.Path)}`);
    const other=destination.get(file.Path);
    // Unknown remote hashes must be uploaded once to establish a checksum;
    // size alone would miss same-size edits. Build timestamps do not matter.
    return !other||file.Size!==other.Size||hash!==md5(other);
  });
  return {uploads,skipped:local.length-uploads.length,deletions:remote.filter(file=>!source.has(file.Path))};
}

export async function syncDirectory(source:string,destination:string,options:{
  settings?:Partial<Settings>;run?:RcloneRunner;log?:Log;
}={}){
  const settings={...defaults,...options.settings};
  for(const [name,value]of Object.entries(settings)){
    if(!Number.isSafeInteger(value)||value<1)throw new Error(`${name} must be a positive integer`);
  }
  const run=options.run??runRclone,log=options.log??console.log;
  async function execute(args:string[],label:string,timeoutMs:number){
    for(let attempt=1;attempt<=settings.maxAttempts;attempt++){
      const tag=`${label} attempt ${attempt}/${settings.maxAttempts}`;
      log(`START ${tag} (hard timeout ${timeoutMs/1000}s)`);
      try{
        return await run([...args,...commonFlags],{label:tag,timeoutMs,log});
      }catch(error){
        const last=attempt===settings.maxAttempts;
        log(annotation(last?'error':'warning',`${tag}: ${reason(error)}${last?'; attempts exhausted':'; retrying this operation only'}`));
        if(last)throw new Error(`${label} failed after ${attempt} attempts`,{cause:error});
      }
    }
    throw new Error('Unreachable retry state');
  }
  async function inventory(root:string,label:string,filters:string[]=[]){
    const raw=await execute([
      'lsjson',root,'--recursive','--files-only','--hash-type','MD5',
      '--no-modtime','--no-mimetype',...filters,
    ],label,settings.listTimeoutMs);
    return parseInventory(raw,label);
  }
  async function parallel(files:InventoryFile[],action:(file:InventoryFile)=>Promise<void>){
    let next=0,failed=false,firstError:unknown;
    await Promise.all(Array.from({length:Math.min(settings.concurrency,files.length)},async()=>{
      while(!failed&&next<files.length){
        const file=files[next++];
        try{await action(file);}catch(error){failed=true;firstError??=error;}
      }
    }));
    if(failed)throw firstError;
  }

  log(`COS sync: concurrency=${settings.concurrency}, file timeout=${settings.fileTimeoutMs/1000}s/attempt, max attempts=${settings.maxAttempts}`);
  const local=await inventory(source,'list source',excluded.flatMap(pattern=>['--exclude',pattern]));
  if(!local.some(file=>file.Path==='index.html'&&file.Size>0))throw new Error('Refusing to sync without a non-empty source index.html');
  // List the entire bucket, including excluded paths, to retain the old
  // --delete-after / --delete-excluded mirror behavior after successful uploads.
  const remote=await inventory(destination,'list destination');
  const plan=planSync(local,remote);
  log(`PLAN upload=${plan.uploads.length}, unchanged=${plan.skipped}, delete-after-upload=${plan.deletions.length}`);
  try{
    await parallel(plan.uploads,async file=>{
      await execute([
        'copyto',path.join(source,file.Path),destination.replace(/\/$/,'')+'/'+file.Path,
        // Only planned new/changed files reach copyto. Force their upload so
        // a missing remote checksum cannot trigger rclone's size-only fallback.
        '--ignore-times','--transfers','1','--checkers','1',
        '--s3-upload-cutoff','5Mi','--s3-chunk-size','5Mi','--s3-upload-concurrency','2',
      ],`upload ${JSON.stringify(file.Path)}`,settings.fileTimeoutMs);
      log(`UPLOADED ${JSON.stringify(file.Path)}`);
    });
  }catch(error){
    log(annotation('error',`Upload failed; no stale objects will be deleted (${plan.deletions.length} pending).`));
    throw error;
  }
  await parallel(plan.deletions,async file=>{
    await execute(['deletefile',destination.replace(/\/$/,'')+'/'+file.Path],`delete ${JSON.stringify(file.Path)}`,settings.fileTimeoutMs);
    log(`DELETED ${JSON.stringify(file.Path)}`);
  });
  const summary={uploaded:plan.uploads.length,unchanged:plan.skipped,deleted:plan.deletions.length};
  log(`DONE uploaded=${summary.uploaded}, unchanged=${summary.unchanged}, deleted=${summary.deleted}`);
  return summary;
}

async function main(){
  const bucket=process.env.COS_BUCKET;
  if(!bucket||!/^[a-z0-9][a-z0-9-]*-[0-9]+$/.test(bucket))throw new Error('COS_BUCKET must be a bucket name ending in -APPID');
  await syncDirectory('dist/',`cos:${bucket}/`,{settings:{
    concurrency:Number(process.env.COS_UPLOAD_CONCURRENCY??defaults.concurrency),
    fileTimeoutMs:Number(process.env.COS_FILE_TIMEOUT_SECONDS??defaults.fileTimeoutMs/1000)*1000,
    maxAttempts:Number(process.env.COS_MAX_ATTEMPTS??defaults.maxAttempts),
  }});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  main().catch(error=>{console.error(annotation('error',reason(error)));process.exitCode=1;});
}
