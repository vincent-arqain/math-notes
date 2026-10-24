import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries} from '../src/content';
import {entryUrl} from '../src/model';
import Markdown from '../src/Markdown';
import {SentencePatterns} from '../src/SentencePatterns';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const entries=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
const course=entries.filter(entry=>entry.sourcePath.startsWith('english/sentence-patterns/'));
const guide=course.find(entry=>entry.category==='sentence-patterns')!;
const writing=course.find(entry=>entry.category==='sentence-patterns/writing')!;
const lessons=course.filter(entry=>/^R\d{2}｜/.test(entry.title));
const html=(body:string)=>renderToStaticMarkup(createElement(Markdown,{body}));

test('the source syllabus is complete, public, and connected to the existing sentence collection',()=>{
  assert.equal(course.length,14);
  assert.deepEqual(lessons.map(entry=>entry.title.slice(0,3)).sort(),Array.from({length:12},(_,i)=>'R'+String(i+1).padStart(2,'0')));
  const v1=entries.find(entry=>entry.sourcePath==='english/sentences/sentence-v1-index.md')!;
  for(const lesson of lessons){
    for(const heading of ['识别标志','找主干','拆解结构','中文直译','易错点','练习','参考答案'])assert.ok(lesson.body.includes('## '+heading),lesson.sourcePath+': '+heading);
    assert.ok(lesson.body.includes(entryUrl(guide)+'/'));
    assert.ok(lesson.body.includes(entryUrl(v1)+'/'));
    assert.ok(guide.body.includes(entryUrl(lesson)+'/'));
  }
  assert.deepEqual([...writing.body.matchAll(/^## (W\d{2})$/gm)].map(m=>m[1]),Array.from({length:10},(_,i)=>'W'+String(i+1).padStart(2,'0')));
  for(const entry of course){
    assert.equal(entry.attachmentPath,null);
    assert.doesNotMatch(entry.body,/四级\s*\d|目标\s*\d+\s*分|libfile_|file_000|oai-library:/);
  }
  assert.ok(v1.body.includes(entryUrl(guide)+'/'));
});

test('every course chapter and article link has a unique, existing destination',()=>{
  const cache=new Map<string,string>();
  const rendered=(body:string)=>{if(!cache.has(body))cache.set(body,html(body));return cache.get(body)!;};
  for(const entry of course){
    const page=rendered(entry.body);
    const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size);
    for(const [,href] of page.matchAll(/href="([^"]+)"/g)){
      if(!href.startsWith('#')&&!/^\/english\/[a-f0-9]{24}\//.test(href))continue;
      const target=new URL(href,'https://example.com'+entryUrl(entry)+'/');
      const destination=entries.find(item=>entryUrl(item)+'/'===target.pathname);
      assert.ok(destination,`${entry.sourcePath} → ${href}`);
      if(target.hash){
        const id=decodeURIComponent(target.hash.slice(1));
        assert.ok(rendered(destination.body).includes(`id="${id}"`),`${entry.sourcePath} → ${href}`);
      }
    }
  }
  const panel=renderToStaticMarkup(createElement(SentencePatterns,{items:entries}));
  assert.ok(panel.includes(`href="${entryUrl(guide)}/"`));
});

test('quick references render as accessible scrollable tables and keep unsafe HTML disabled',()=>{
  const reading=html(guide.body),templates=html(writing.body);
  assert.equal((reading.match(/<tr>/g)||[]).length,13);
  assert.equal((templates.match(/<tr>/g)||[]).length,11);
  assert.match(reading,/role="region" aria-label="表格，可横向滚动" tabindex="0"/);
  assert.doesNotMatch(html('<script>alert(1)</script>\n\n| a | b |\n| - | - |\n| [bad](javascript:alert) | x |'),/<script|href="javascript:/);
});

test('initial chapter links realign after fonts load without interrupting the reader',async()=>{
  const script=await readFile(new URL('../public/site.js',import.meta.url),'utf8');
  for(const scenario of ['normal','touch','wheel','keyboard','pointer','changed','malformed','outside']){
    let ready!:()=>void;
    const fontReady=new Promise<void>(resolve=>{ready=resolve;});
    const handlers=new Map<string,()=>void>();
    const calls:unknown[]=[];
    const target={scrollIntoView:(options:unknown)=>calls.push(options)};
    const location={hash:scenario==='malformed'?'#%ZZ':'#'+encodeURIComponent('阅读句式速查表')};
    const article={contains:()=>scenario!=='outside'};
    vm.runInNewContext(script,{
      location,
      document:{readyState:'loading',querySelector:(selector:string)=>selector==='.article-shell'?article:null,fonts:{ready:fontReady},getElementById:(id:string)=>id==='阅读句式速查表'?target:null},
      addEventListener:(event:string,fn:()=>void)=>handlers.set(event,fn),
      removeEventListener:(event:string)=>handlers.delete(event),
      requestAnimationFrame:(fn:()=>void)=>fn(),
    });
    const event={touch:'touchstart',wheel:'wheel',keyboard:'keydown',pointer:'pointerdown'}[scenario];
    if(event)handlers.get(event)!();
    if(scenario==='changed')location.hash='#w09';
    handlers.get('load')!();handlers.delete('load');
    ready();await fontReady;await Promise.resolve();
    assert.equal(calls.length,scenario==='normal'?1:0,scenario);
    assert.equal(handlers.size,0,scenario);
  }
});
