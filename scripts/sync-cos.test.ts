import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {planSync,syncDirectory,runRclone,type InventoryFile,type RcloneRunner} from './sync-cos';

const file=(Path:string,hash='a'.repeat(32),Size=10):InventoryFile=>({Path,Size,IsDir:false,Hashes:{md5:hash}});
const local=[file('index.html'),file('files/中文 附件.pdf')];
const list=(files:InventoryFile[])=>JSON.stringify(files);

test('COS plan uses MD5 and size, including same-size edits and unknown multipart hashes',()=>{
  const source=[file('index.html'),file('same-size.txt','b'.repeat(32)),file('new/中文 附件.pdf'),file('unknown.pdf'),file('size.txt')];
  const remote=[file('index.html','A'.repeat(32)),file('same-size.txt'),{...file('unknown.pdf'),Hashes:{}},file('size.txt','a'.repeat(32),11),file('old.js'),file('.git/config')];
  const plan=planSync(source,remote);
  assert.equal(plan.skipped,1);
  assert.deepEqual(plan.uploads.map(f=>f.Path),['same-size.txt','new/中文 附件.pdf','unknown.pdf','size.txt']);
  assert.deepEqual(plan.deletions.map(f=>f.Path),['old.js','.git/config']);
  assert.throws(()=>planSync([{...file('index.html'),Hashes:{}}],[]),/Missing local MD5/);
});

test('COS sync skips identical files, bounds concurrent uploads and deletes only after uploads finish',async()=>{
  const source=[...local,file('third.txt'),file('fourth.txt')],remote=[file('index.html'),file('old.js'),file('.git/config')];
  const calls:string[][]=[],logs:string[]=[];
  let active=0,maxActive=0,completed=0;
  const run:RcloneRunner=async(args,options)=>{
    calls.push(args);
    if(args[0]==='lsjson')return list(args[1]==='dist/'?source:remote);
    if(args[0]==='copyto'){
      assert.equal(options.timeoutMs,120_000);
      active++;maxActive=Math.max(maxActive,active);
      await new Promise(resolve=>setImmediate(resolve));
      active--;completed++;
    }else if(args[0]==='deletefile')assert.equal(completed,3);
    else assert.fail(`Unexpected operation: ${args[0]}`);
    return '';
  };
  const summary=await syncDirectory('dist/','cos:example-123/',{run,log:message=>logs.push(message),settings:{concurrency:2}});
  assert.deepEqual(summary,{uploaded:3,unchanged:1,deleted:2});
  assert.equal(maxActive,2);
  assert.deepEqual(calls.filter(args=>args[0]==='copyto').map(args=>args[1]),['dist/files/中文 附件.pdf','dist/third.txt','dist/fourth.txt']);
  assert.equal(calls.find(args=>args[1]==='dist/files/中文 附件.pdf')?.[2],'cos:example-123/files/中文 附件.pdf');
  const sourceListing=calls.find(args=>args[0]==='lsjson'&&args[1]==='dist/')!;
  for(const excluded of ['.git/**','tauri/**','.github/workflows/**'])assert.ok(sourceListing.includes(excluded));
  assert.ok(calls.every(args=>args[args.indexOf('--retries')+1]==='1'&&args[args.indexOf('--low-level-retries')+1]==='0'));
  assert.ok(logs.some(line=>line==='DONE uploaded=3, unchanged=1, deleted=2'));
});

test('COS retries only the failed file and logs each error before starting the next attempt',async()=>{
  const logs:string[]=[],uploads:string[]=[],events:string[]=[];
  let attempts=0;
  const run:RcloneRunner=async args=>{
    if(args[0]==='lsjson')return list(args[1]==='dist/'?local:[]);
    if(args[0]==='copyto'){
      uploads.push(args[1]);events.push('upload '+args[1]);
      if(args[1].endsWith('.pdf')&&++attempts<3)throw new Error('HTTP 400 UserNetworkTooSlow: User network is too slow');
    }
    return '';
  };
  await syncDirectory('dist/','cos:example-123/',{run,settings:{concurrency:1},log:message=>{logs.push(message);events.push(message);}});
  assert.equal(uploads.filter(name=>name.endsWith('index.html')).length,1);
  assert.equal(attempts,3);
  const failures=logs.filter(line=>line.startsWith('::warning::'));
  assert.equal(failures.length,2);
  assert.ok(failures.every(line=>line.includes('中文 附件.pdf')&&line.includes('UserNetworkTooSlow')));
  const retried=events.reduce<number[]>((indexes,event,index)=>event==='upload dist/files/中文 附件.pdf'?[...indexes,index]:indexes,[]);
  assert.ok(events.slice(retried[0]+1,retried[1]).some(event=>event.includes('UserNetworkTooSlow')));
});

test('exhausted file retries stop new uploads and prevent all stale-object deletion',async()=>{
  const logs:string[]=[],calls:string[][]=[];
  const run:RcloneRunner=async args=>{
    calls.push(args);
    if(args[0]==='lsjson')return list(args[1]==='dist/'?local:[file('old.js')]);
    throw new Error('HTTP 403 AccessDenied');
  };
  await assert.rejects(syncDirectory('dist/','cos:example-123/',{run,settings:{maxAttempts:2,concurrency:1},log:message=>logs.push(message)}),/failed after 2 attempts/);
  assert.equal(calls.filter(args=>args[0]==='copyto').length,2);
  assert.ok(calls.filter(args=>args[0]==='copyto').every(args=>args[1]==='dist/index.html'));
  assert.ok(calls.every(args=>args[0]!=='deletefile'));
  assert.ok(logs.some(line=>line.startsWith('::error::')&&line.includes('index.html')&&line.includes('AccessDenied')));
  assert.ok(logs.some(line=>line.includes('no stale objects will be deleted')));
});

test('failed or malformed bucket inventories and empty builds never upload or delete',async()=>{
  for(const failure of ['HTTP 403 AccessDenied','malformed','unsafe path','duplicate','empty build']){
    const calls:string[][]=[];
    const run:RcloneRunner=async args=>{
      calls.push(args);
      assert.equal(args[0],'lsjson');
      if(args[1]==='dist/')return list(failure==='empty build'?[]:local);
      if(failure==='malformed')return '{}';
      if(failure==='unsafe path')return list([file('../outside.txt')]);
      if(failure==='duplicate')return list([file('old.js'),file('old.js')]);
      throw new Error(failure);
    };
    await assert.rejects(syncDirectory('dist/','cos:example-123/',{run,settings:{maxAttempts:2},log:()=>{}}));
    assert.ok(calls.every(args=>args[0]==='lsjson'));
    if(failure==='HTTP 403 AccessDenied')assert.equal(calls.filter(args=>args[1]!=='dist/').length,2);
    if(failure==='empty build')assert.equal(calls.length,1);
  }
});

test('a second sync of identical build contents makes no upload or delete requests',async()=>{
  const remote:InventoryFile[]=[],calls:string[][]=[];
  const run:RcloneRunner=async args=>{
    calls.push(args);
    if(args[0]==='lsjson')return list(args[1]==='dist/'?local:remote);
    assert.equal(args[0],'copyto');
    remote.push(local.find(file=>path.join('dist',file.Path)===args[1])!);
    return '';
  };
  await syncDirectory('dist/','cos:example-123/',{run,log:()=>{}});
  calls.length=0;
  assert.deepEqual(await syncDirectory('dist/','cos:example-123/',{run,log:()=>{}}),{uploaded:0,unchanged:2,deleted:0});
  assert.ok(calls.every(args=>args[0]==='lsjson'));
});

test('the process deadline kills an active transfer while streaming retries and redacting credentials',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'cos-timeout-'));
  const originalPath=process.env.PATH;
  const originalSecret=process.env.RCLONE_CONFIG_TEST_SECRET_ACCESS_KEY;
  try{
    await writeFile(path.join(directory,'rclone'),'#!/usr/bin/env node\nprocess.stderr.write(\'DEBUG : Setting secret_access_key="mock-test-secret" from environment variable\\nDEBUG : pacer: low level retry 1/2 (error HTTP 500)\\nERROR : UserNetworkTooSlow mock-test-secret\\n\'); setInterval(()=>process.stderr.write("transfer is still active\\n"),20);\n',{mode:0o755});
    process.env.PATH=directory+path.delimiter+originalPath;
    process.env.RCLONE_CONFIG_TEST_SECRET_ACCESS_KEY='mock-test-secret';
    const logs:string[]=[],started=Date.now();
    let emitted!:()=>void;
    const liveError=new Promise<void>(resolve=>{emitted=resolve;});
    const transfer=runRclone([],{label:'upload "中文 附件.pdf" attempt 1/3',timeoutMs:1_000,log:message=>{
      logs.push(message);if(message.includes('UserNetworkTooSlow'))emitted();
    }});
    const deadline=assert.rejects(transfer,(error:Error)=>{
      assert.match(error.message,/hard timeout after 1s; rclone killed/);
      assert.doesNotMatch(error.message,/mock-test-secret/);
      return true;
    });
    await Promise.race([liveError,transfer]);
    assert.ok(Date.now()-started<1_000,'the first error must be visible while the transfer is running');
    await deadline;
    assert.ok(Date.now()-started<5_000);
    assert.ok(logs.some(line=>line.includes('中文 附件.pdf')&&line.includes('UserNetworkTooSlow')));
    assert.ok(logs.some(line=>line.includes('pacer: low level retry')));
    assert.ok(logs.every(line=>!line.includes('mock-test-secret')&&!line.includes('Setting secret_access_key')));
    assert.ok(logs.some(line=>line.includes('UserNetworkTooSlow ***')));
    assert.ok(logs.some(line=>line.includes('still active')));
  }finally{
    if(originalPath===undefined)delete process.env.PATH;else process.env.PATH=originalPath;
    if(originalSecret===undefined)delete process.env.RCLONE_CONFIG_TEST_SECRET_ACCESS_KEY;else process.env.RCLONE_CONFIG_TEST_SECRET_ACCESS_KEY=originalSecret;
    await rm(directory,{recursive:true,force:true});
  }
});

test('rclone process output preserves split UTF-8 filenames and reports nonzero exit details',async()=>{
  const directory=await mkdtemp(path.join(os.tmpdir(),'cos-output-'));
  const originalPath=process.env.PATH;
  try{
    await writeFile(path.join(directory,'rclone'),'#!/usr/bin/env node\nif(process.argv.includes("--fail")){process.stderr.write("ERROR : HTTP 403 AccessDenied\\n");process.exitCode=3;}else{const data=Buffer.from(\'["中文 附件.pdf"]\');process.stdout.write(data.subarray(0,3));setTimeout(()=>process.stdout.end(data.subarray(3)),30);}\n',{mode:0o755});
    process.env.PATH=directory+path.delimiter+originalPath;
    const options={label:'test inventory',timeoutMs:3_000,log:()=>{}};
    assert.equal(await runRclone([],options),'["中文 附件.pdf"]');
    await assert.rejects(runRclone(['--fail'],options),/rclone exited 3[\s\S]*HTTP 403 AccessDenied/);
  }finally{
    if(originalPath===undefined)delete process.env.PATH;else process.env.PATH=originalPath;
    await rm(directory,{recursive:true,force:true});
  }
});
