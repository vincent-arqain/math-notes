import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import vm from 'node:vm';
import {loadEntries} from '../src/content';
import {Collection} from '../src/components';
import Markdown from '../src/Markdown';
import config from '../site.config.json';

const content=fileURLToPath(new URL('../content/',import.meta.url));
const manifest=JSON.parse(await readFile(new URL('./fixtures/article-v0-parity.json',import.meta.url),'utf8'));
const all=await loadEntries(content);
const entries=all.filter(e=>e.sourcePath.startsWith('english/writing/article-v0-'));
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
const digest=(s:string)=>createHash('sha256').update(normalize(s)).digest('hex');
const entry=(name:string)=>entries.find(e=>e.sourcePath===`english/writing/article-v0-${name}.md`)!;

test('article-v0 preserves all 28 source models and 28 templates without a PDF or image attachment',async()=>{
  assert.equal(entries.length,32);
  assert.equal(manifest.entries.length,28);
  for(const kind of ['short','long']){
    assert.deepEqual(manifest.entries.filter((e:any)=>e.kind===kind).map((e:any)=>e.year).sort(),Array.from({length:14},(_,i)=>2010+i));
  }
  for(const source of manifest.entries){
    const e=entries.find(e=>e.sourcePath===source.path)!;
    assert.ok(e,source.path);
    for(const [heading,key] of [['范文','modelSha256'],['模板','templateSha256']]){
      const section=e.body.split(`\n## ${heading}\n`)[1]?.split('\n## ')[0];
      assert.ok(section,`${source.path}: ${heading}`);
      const text=section.split('\n').filter((line:string)=>line.startsWith('>')).map((line:string)=>line.replace(/^> ?/,'').replace(/\\$/,'')).join('\n');
      assert.equal(digest(text),source[key],`${source.path}: ${heading} must match the source PDF text`);
    }
    for(const heading of ['题意概述','合理补充的情境细节','核心表达','迁移方法'])assert.ok(e.body.includes(heading));
    assert.ok(e.body.includes(`PDF第${source.sourcePages.join('—')}页`));
    if(source.kind==='long')assert.match(e.body,/### 图意说明/);
  }
  for(const e of entries){
    assert.equal(e.category,'writing');
    assert.equal(e.attachmentPath,null);
    assert.doesNotMatch(e.body,/!\[|<img\b|data:image|\]\([^)]*\.pdf(?:[#?][^)]*)?\)/i);
  }
  const files=await readdir(new URL('../content/english/writing/',import.meta.url));
  assert.ok(files.every(f=>f==='.gitkeep'||f.endsWith('.md')));
});

test('writing year, function and theme navigation resolves to each model, template and transfer method',()=>{
  const html=new Map(entries.map(e=>[e.id,renderToStaticMarkup(createElement(Markdown,{body:e.body}))]));
  for(const [id,page]of html){
    const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,id);
    for(const [,raw]of page.matchAll(/href="([^"]+)"/g)){
      const target=new URL(raw.replaceAll('&amp;','&'),`https://local.test/english/${id}/`);
      if(target.origin!=='https://local.test'||!target.pathname.startsWith('/english/'))continue;
      const targetId=target.pathname.split('/')[2];
      if(!targetId)continue; // Existing collection search.
      assert.ok(html.has(targetId),target.href);
      if(target.hash)assert.ok(html.get(targetId)!.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`),target.href);
    }
  }
  const hub=html.get(entry('index').id)!;
  for(const source of manifest.entries){
    const target=entries.find(e=>e.sourcePath===source.path)!;
    for(const heading of ['范文','模板','迁移方法'])assert.ok(hub.includes(`/english/${target.id}/#${encodeURIComponent(heading)}`)||hub.includes(`/english/${target.id}/#${heading}`));
    assert.ok(hub.includes(`id="${source.year}年"`));
  }
  for(const name of ['short','long','practice'])assert.ok(hub.includes(`/english/${entry(name).id}/`));
});

test('existing collection script filters the real writing entries by year, function, theme and English phrase',async()=>{
  const html=renderToStaticMarkup(createElement(Collection,{items:all,section:'english'}));
  const decode=(s:string)=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const rows=[...html.matchAll(/<article\b[^>]+>/g)].map(([tag])=>({dataset:{category:decode(tag.match(/data-category="([^"]*)"/)![1]),readingTopics:decode(tag.match(/data-reading-topics="([^"]*)"/)![1]),search:decode(tag.match(/data-search="([^"]*)"/)![1])},hidden:false}));
  const handlers=new Map<string,(event?:any)=>void>();
  const query={value:''},category={value:''},count={textContent:''},empty={hidden:true};
  const location=new URL('english/?category=writing',config.siteUrl);
  const collection={querySelector:()=>({addEventListener:(type:string,fn:()=>void)=>handlers.set(type,fn)}),querySelectorAll:(selector:string)=>selector==='[data-entry]'?rows:[]};
  vm.runInNewContext(await readFile(new URL('../public/site.js',import.meta.url),'utf8'),{
    document:{querySelector:()=>collection,getElementById:(id:string)=>({query,category,'result-count':count,'no-results':empty})[id]},
    location,URL,URLSearchParams,history:{pushState(_state:unknown,_title:string,url:string){location.href=new URL(url,location).href;}},
    FormData:class{*[Symbol.iterator](){yield ['q',query.value];yield ['category',category.value];}},
    addEventListener:(type:string,fn:()=>void)=>handlers.set(type,fn),
  });
  const visible=()=>rows.filter(e=>!e.hidden);
  const search=(text:string)=>{query.value=text;handlers.get('submit')!({preventDefault(){}});return visible();};
  assert.equal(visible().length,32);
  for(const year of Array.from({length:14},(_,i)=>2010+i))for(const kind of ['小作文','大作文'])assert.equal(search(`${year}年${kind}`).length,1,`${year}年${kind}`);
  for(const [q,n]of Object.entries({'小作文-推荐':3,'小作文-建议':3,'小作文-邀请':3,'小作文-通知':4,'小作文-回复':1,'大作文-态度与行动':4,'大作文-选择与学习':4,'大作文-亲情与教育':2,'大作文-公共生活':2,'大作文-文化与社会':2}))assert.equal(search(q).length,n,q);
  assert.equal(search('our Aiding Rural Primary School project').length,1);
  assert.equal(search('not-a-real-writing-query').length,0);
  assert.equal(empty.hidden,false);
  location.search='?category=writing&q='+encodeURIComponent('2023年小作文');handlers.get('popstate')!();
  assert.equal(visible().length,1);
  assert.equal(query.value,'2023年小作文');
});
