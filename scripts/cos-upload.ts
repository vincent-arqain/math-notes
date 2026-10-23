import COS from 'cos-nodejs-sdk-v5';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
import {open} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const partSize=1024*1024,partConcurrency=8;
const md5=(data:Buffer)=>createHash('md5').update(data).digest('base64');
const xml=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const field=(body:string,name:string)=>body.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1];
export type CosRequest=(method:string,query:Record<string,string>,headers:Record<string,string>,body?:Buffer|string)=>Promise<{body:string;headers:Headers}>;

// Use the official SDK only for signing. Raw requests have no SDK retry loop;
// the existing file worker owns retries and the 120-second process deadline.
export function signedRequest(bucket:string,region:string,key:string,transport:typeof fetch=fetch):CosRequest{
  const SecretId=process.env.RCLONE_CONFIG_COS_ACCESS_KEY_ID;
  const SecretKey=process.env.RCLONE_CONFIG_COS_SECRET_ACCESS_KEY;
  if(!SecretId||!SecretKey)throw new Error('Missing COS credentials');
  if(!/^[a-z0-9-]+$/.test(region))throw new Error('Invalid COS region');
  const host=`${bucket}.cos.${region}.myqcloud.com`;
  const pathname='/'+key.split('/').map(encodeURIComponent).join('/');
  // Leave a cleanup window before the parent process's 120-second hard stop.
  const deadline=AbortSignal.timeout(110_000);
  return async(method,query,headers,body)=>{
    const signedHeaders={host,...headers};
    const authorization=COS.getAuthorization({SecretId,SecretKey,Method:method as COS.Method,Key:key,Headers:signedHeaders,Query:query,Expires:300});
    const url=new URL(`https://${host}${pathname}`);
    for(const [name,value]of Object.entries(query))url.searchParams.set(name,value);
    const signal=method==='DELETE'?AbortSignal.timeout(5_000):AbortSignal.any([deadline,AbortSignal.timeout(105_000)]);
    const response=await transport(url,{method,headers:{...headers,Authorization:authorization},body:body as BodyInit|undefined,signal,redirect:'error'});
    const responseBody=await response.text();
    if(!response.ok||field(responseBody,'Code'))throw new Error(`COS HTTP ${response.status} ${field(responseBody,'Code')??''}: ${field(responseBody,'Message')??response.statusText}`);
    return {body:responseBody,headers:response.headers};
  };
}

export async function uploadParts(filename:string,request:CosRequest,log:(message:string)=>void=console.error){
  const file=await open(filename,'r');
  let uploadId:string|undefined,complete=false;
  try{
    const {size}=await file.stat();
    if(size<1)throw new Error('Cannot multipart-upload an empty file');
    const hash=createHash('md5');
    for await(const chunk of createReadStream(filename))hash.update(chunk);
    const digest=hash.digest('base64');
    const contentTypes:Record<string,string>={'.pdf':'application/pdf','.zip':'application/zip','.woff2':'font/woff2','.woff':'font/woff','.otf':'font/otf','.ttf':'font/ttf','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
    const initial=await request('POST',{uploads:''},{'content-type':contentTypes[path.extname(filename)]??'application/octet-stream','x-cos-meta-md5chksum':digest});
    uploadId=field(initial.body,'UploadId');
    if(!uploadId||!/^[A-Za-z0-9_.-]+$/.test(uploadId))throw new Error('Invalid COS multipart upload ID');
    const count=Math.ceil(size/partSize),parts:{PartNumber:number;ETag:string}[]=new Array(count);
    if(count>10_000)throw new Error('Too many COS upload parts');
    log(`MULTIPART size=${size}, part-size=${partSize}, parts=${count}, concurrency=${partConcurrency}`);
    let next=0,failed=false,error:unknown;
    await Promise.all(Array.from({length:Math.min(partConcurrency,count)},async()=>{
      while(!failed&&next<count){
        const index=next++,length=Math.min(partSize,size-index*partSize);
        try{
          const data=Buffer.alloc(length);
          const {bytesRead}=await file.read(data,0,length,index*partSize);
          if(bytesRead!==length)throw new Error('Source file changed during upload');
          const response=await request('PUT',{uploadId:uploadId!,partNumber:String(index+1)},{'content-md5':md5(data),'content-length':String(length)},data);
          const etag=response.headers.get('etag')?.replaceAll('"','');
          if(!etag||!/^[a-fA-F0-9]{32}$/.test(etag))throw new Error('Missing or invalid COS part ETag');
          parts[index]={PartNumber:index+1,ETag:etag};
          log(`PART ${index+1}/${count} uploaded (${length} bytes)`);
        }catch(cause){failed=true;error??=cause;}
      }
    }));
    if(failed)throw error;
    const body='<CompleteMultipartUpload>'+parts.map(part=>`<Part><PartNumber>${part.PartNumber}</PartNumber><ETag>"${xml(part.ETag)}"</ETag></Part>`).join('')+'</CompleteMultipartUpload>';
    await request('POST',{uploadId},{'content-type':'application/xml'},body);
    complete=true;
    const result=await request('HEAD',{},{});
    if(result.headers.get('content-length')!==String(size)||result.headers.get('x-cos-meta-md5chksum')!==digest)throw new Error('COS object size or MD5 metadata verification failed');
    log('VERIFIED complete object size and MD5 metadata');
  }catch(error){
    if(uploadId&&!complete){
      try{await request('DELETE',{uploadId},{});log('ABORTED incomplete multipart upload');}
      catch{log('WARNING: could not abort incomplete multipart upload');}
    }
    throw error;
  }finally{await file.close();}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [filename,destination]=process.argv.slice(2);
  const match=destination?.match(/^cos:([a-z0-9][a-z0-9-]*-[0-9]+)\/(.+)$/);
  Promise.resolve().then(()=>{
    if(!filename||!match)throw new Error('Expected a source file and cos:bucket/key destination');
    return uploadParts(filename,signedRequest(match[1],process.env.RCLONE_CONFIG_COS_REGION??'',match[2]));
  }).catch(error=>{console.error(error instanceof Error?error.message:String(error));process.exitCode=1;});
}
