import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createHash,randomBytes} from 'node:crypto';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {signedRequest,uploadParts} from './cos-upload';

const digest=(data:Buffer)=>createHash('md5').update(data).digest('base64');

for(const mode of ['success','failed part','wrong final size'] as const)test(`native COS multipart over real HTTP: ${mode}`,async t=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'cos-parts-'));
  t.after(()=>rm(dir,{recursive:true,force:true}));
  const originalId=process.env.RCLONE_CONFIG_COS_ACCESS_KEY_ID,originalKey=process.env.RCLONE_CONFIG_COS_SECRET_ACCESS_KEY;
  process.env.RCLONE_CONFIG_COS_ACCESS_KEY_ID='test-id';
  process.env.RCLONE_CONFIG_COS_SECRET_ACCESS_KEY='test-secret';
  t.after(()=>{
    if(originalId===undefined)delete process.env.RCLONE_CONFIG_COS_ACCESS_KEY_ID;else process.env.RCLONE_CONFIG_COS_ACCESS_KEY_ID=originalId;
    if(originalKey===undefined)delete process.env.RCLONE_CONFIG_COS_SECRET_ACCESS_KEY;else process.env.RCLONE_CONFIG_COS_SECRET_ACCESS_KEY=originalKey;
  });
  const data=randomBytes(3*1024*1024+17),filename=path.join(dir,'中文 空格.pdf');
  await writeFile(filename,data);
  const parts=new Map<number,Buffer>(),requests:string[]=[],errors:unknown[]=[];
  let active=0,maxActive=0,metadata='',complete=false;
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url!,'http://localhost');
      assert.equal(decodeURIComponent(url.pathname),'/files/中文 空格.pdf');
      assert.match(req.headers.authorization??'',/q-sign-algorithm=sha1.*q-signature=/);
      assert.ok(!req.headers.authorization?.includes('test-secret'));
      requests.push(req.method!+' '+(url.searchParams.has('uploads')?'init':url.searchParams.has('partNumber')?'part':url.searchParams.has('uploadId')?'upload':'object'));
      if(req.method==='POST'&&url.searchParams.has('uploads')){
        metadata=String(req.headers['x-cos-meta-md5chksum']);
        assert.equal(req.headers['content-type'],'application/pdf');
        res.end('<InitiateMultipartUploadResult><UploadId>test-upload-1</UploadId></InitiateMultipartUploadResult>');
      }else if(req.method==='PUT'){
        active++;maxActive=Math.max(active,maxActive);
        const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk);
        const bytes=Buffer.concat(chunks),number=Number(url.searchParams.get('partNumber'));
        assert.ok(bytes.length<=1024*1024);
        assert.equal(String(bytes.length),req.headers['content-length']);
        assert.equal(digest(bytes),req.headers['content-md5']);
        parts.set(number,bytes);
        await new Promise(resolve=>setTimeout(resolve,25*(5-number)));
        active--;
        if(mode==='failed part'&&number===1){res.statusCode=500;res.end('<Error><Code>InternalError</Code><Message>part failed</Message></Error>');}
        else {res.setHeader('etag','"'+createHash('md5').update(bytes).digest('hex')+'"');res.end();}
      }else if(req.method==='POST'){
        const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(chunk);
        const body=Buffer.concat(chunks).toString();
        assert.deepEqual([...body.matchAll(/<PartNumber>(\d+)<\/PartNumber>/g)].map(match=>Number(match[1])),[1,2,3,4]);
        assert.deepEqual(Buffer.concat([1,2,3,4].map(number=>parts.get(number)!)),data);
        complete=true;res.end('<CompleteMultipartUploadResult><ETag>complete</ETag></CompleteMultipartUploadResult>');
      }else if(req.method==='HEAD'){
        assert.ok(complete);res.setHeader('content-length',String(data.length+(mode==='wrong final size'?1:0)));
        res.setHeader('x-cos-meta-md5chksum',metadata);res.end();
      }else if(req.method==='DELETE'){res.statusCode=204;res.end();}
      else assert.fail('unexpected request');
    }catch(error){errors.push(error);res.statusCode=500;res.end('<Error><Code>TestFailure</Code></Error>');}
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  t.after(()=>new Promise<void>((resolve,reject)=>{server.close(error=>error?reject(error):resolve());server.closeAllConnections();}));
  const address=server.address();assert.ok(address&&typeof address==='object');
  const transport:typeof fetch=(input,options)=>{
    const url=new URL(String(input));
    assert.equal(url.host,'example-123.cos.ap-guangzhou.myqcloud.com');
    url.protocol='http:';url.host=`127.0.0.1:${address.port}`;
    return fetch(url,options);
  };
  const logs:string[]=[];
  const upload=uploadParts(filename,signedRequest('example-123','ap-guangzhou','files/中文 空格.pdf',transport),line=>logs.push(line));
  if(mode==='success'){
    await upload;
    assert.equal(metadata,digest(data));assert.equal(maxActive,4);
    assert.ok(logs.some(line=>line.includes('VERIFIED')));
  }else await assert.rejects(upload,mode==='failed part'?/HTTP 500 InternalError: part failed/:/size or MD5 metadata verification failed/);
  assert.deepEqual(errors,[]);
  assert.equal(requests.filter(request=>request==='PUT part').length,4,'no hidden SDK or HTTP retries');
  assert.equal(requests.filter(request=>request==='DELETE upload').length,mode==='failed part'?1:0);
  assert.equal(complete,mode!=='failed part');
});
