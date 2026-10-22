import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries} from '../src/content';
import {matchesCategory,tagsOf} from '../src/model';
import {Collection} from '../src/components';
import Markdown from '../src/Markdown';
import {readFile,mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import config from '../site.config.json';

const root=new URL('../content/',import.meta.url);
const sourcePath='english/reading-types/seven-reading-types.md';
const topics=['细节题','主旨题','推理题','词义句意题','作者态度题','例证题','篇章结构题'];

test('Chinese document labels render their intended emphasis while code and escaped markers stay literal',()=>{
  const body=[
    '**题目（转述）：**给定 $x$。',
    '**解：**记变量为 $x$。',
    String.raw`\*\*解：\*\*保留字面标记。`,
    '`**解：**保留行内代码`',
    '~~~text\n**解：**保留代码块\n~~~',
  ].join('\n\n');
  const html=renderToStaticMarkup(createElement(Markdown,{body}));
  assert.match(html,/<p><strong>题目（转述）：<\/strong>给定/);
  assert.match(html,/<p><strong>解：<\/strong>记变量为/);
  assert.match(html,/<p>\*\*解：\*\*保留字面标记。<\/p>/);
  assert.match(html,/<code>\*\*解：\*\*保留行内代码<\/code>/);
  assert.match(html,/<code class="language-text">\*\*解：\*\*保留代码块/);
});

test('Markdown headings provide unique Chinese and formatted fragment targets per document',()=>{
  const body='[导航](#细节题)\n\n## 细节题\n\n## **细节题**\n\n## 细节题-1\n\n## A [linked](https://example.com) `word`\n\n## !!!\n\n## Main';
  const render=()=>renderToStaticMarkup(createElement(Markdown,{body}));
  const html=render();
  const ids=[...html.matchAll(/<h\d id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,['细节题','细节题-1','细节题-1-1','a-linked-word','section','main-1']);
  assert.match(html,/href="#(?:细节题|%E7%BB%86%E8%8A%82%E9%A2%98)"/);
  assert.equal(render(),html,'IDs must reset for each document render');
  assert.doesNotMatch(renderToStaticMarkup(createElement(Markdown,{body:'<h2 id="unsafe">raw</h2>\n\n<script>alert(1)</script>'})),/id="unsafe"|<script/);
});

test('reading guide loads in its parent category and every internal link resolves',async()=>{
  const {fileURLToPath}=await import('node:url');
  const entry=(await loadEntries(fileURLToPath(root))).find(e=>e.sourcePath===sourcePath)!;
  assert.ok(entry);
  assert.equal(entry.section,'english');
  assert.equal(entry.category,'reading-types');
  assert.equal(entry.readingTopics?.length,7);
  assert.equal(entry.subject,'考研英语一阅读理解');
  assert.ok(matchesCategory(entry.category,'reading-types'));
  assert.ok(topics.every(topic=>tagsOf(entry).includes(topic)));
  const html=renderToStaticMarkup(createElement(Markdown,{body:entry.body}));
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(m=>decodeURIComponent(m[1]));
  assert.ok(targets.length>=topics.length);
  for(const target of targets)assert.ok(ids.includes(target),`Missing target: ${target}`);
  for(const topic of topics){
    assert.ok(targets.includes(topic),`Missing navigation: ${topic}`);
    assert.match(html,new RegExp(`<h2 id="${topic}">${topic}</h2>`));
  }
  // These terms occur in the body, rather than only the title/tags.
  for(const section of ['english',undefined] as const){
    const collection=renderToStaticMarkup(createElement(Collection,{items:[entry],section}));
    const search=collection.match(/data-search="([^"]+)"/)?.[1]||'';
    for(const query of ['过度推断','qualified success','张冠李戴','必要条件'])assert.ok(search.includes(query));
    assert.match(collection,/data-category="reading-types"/);
    for(const topic of entry.readingTopics||[])assert.ok(collection.includes('/#'+encodeURIComponent(topicLabel(topic))));
  }
});

function topicLabel(category:string){return topics[['detail','main-idea','inference','meaning','attitude','example','structure'].indexOf(category.split('/')[1])];}

test('reading topic metadata rejects invalid, duplicate and misplaced categories',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'reading-meta-'));
  try{
    await mkdir(path.join(root,'english','reading-types'),{recursive:true});
    const file=path.join(root,'english','reading-types','guide.md');
    for(const fields of ['reading_topics: detail','reading_topics: [reading-types/unknown]','reading_topics: [writing]','reading_topics: [reading-types/detail, reading-types/detail]','category: writing\nreading_topics: [reading-types/detail]']){
      await writeFile(file,`---\n${fields}\n---\n## 细节题`);
      await assert.rejects(loadEntries(root),/reading_topics/);
    }
    await writeFile(file,'---\nreading_topics: [reading-types/detail]\n---\n## 细节题');
    assert.deepEqual((await loadEntries(root))[0].readingTopics,['reading-types/detail']);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('real collection data and site script support all seven filters, search and history',async()=>{
  const guide=(await loadEntries(fileURLToPath(root))).find(e=>e.sourcePath===sourcePath)!;
  const items=[guide,{...guide,id:'unrelated',category:'writing',readingTopics:[],title:'Writing',body:'',description:'',subject:''},{...guide,id:'detail',category:'reading-types/detail',readingTopics:[],title:'Detail',body:'',description:'',subject:''}];
  const html=renderToStaticMarkup(createElement(Collection,{items,section:'english'}));
  const decode=(s:string)=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const entries=[...html.matchAll(/<article\b[^>]+>/g)].map(([tag])=>({dataset:{category:decode(tag.match(/data-category="([^"]*)"/)![1]),readingTopics:decode(tag.match(/data-reading-topics="([^"]*)"/)![1]),search:decode(tag.match(/data-search="([^"]*)"/)![1])},hidden:false}));
  const handlers=new Map<string,(event?:any)=>void>();
  const filters=[...html.matchAll(/<a\b[^>]*data-filter="([^"]*)"[^>]*href="([^"]*)"/g)].map(([,filter,href])=>({dataset:{filter},href:new URL(decode(href),config.siteUrl).href,current:'',setAttribute(_key:string,value:string){this.current=value;},removeAttribute(){this.current='';},addEventListener(type:string,fn:(event:any)=>void){handlers.set(filter+':'+type,fn);}}));
  const query={value:''},category={value:''},count={textContent:''},empty={hidden:true};
  const location=new URL('english/?category=reading-types%2Finference',config.siteUrl);
  const historyUrls:string[]=[location.href];let historyIndex=0;
  const form={addEventListener(type:string,fn:()=>void){handlers.set(type,fn);}};
  const collection={querySelector:()=>form,querySelectorAll:(selector:string)=>selector==='[data-entry]'?entries:filters};
  vm.runInNewContext(await readFile(new URL('../public/site.js',import.meta.url),'utf8'),{
    document:{querySelector:()=>collection,getElementById:(id:string)=>({query,category,'result-count':count,'no-results':empty})[id]},
    location,URL,URLSearchParams,history:{pushState(_state:unknown,_title:string,url:string){location.href=new URL(url,location).href;historyUrls.splice(++historyIndex);historyUrls.push(location.href);}},
    FormData:class{*[Symbol.iterator](){yield ['q',query.value];yield ['category',category.value];}},
    addEventListener:(type:string,fn:()=>void)=>handlers.set(type,fn),
  });
  const visible=()=>entries.map((e,i)=>e.hidden?-1:i).filter(i=>i>=0);
  const click=(filter:string)=>handlers.get(filter+':click')!({button:0,preventDefault(){}});
  const search=(text:string)=>{query.value=text;handlers.get('submit')!({preventDefault(){}});};
  assert.deepEqual(visible(),[0],'deep-linked child filter must include the guide');
  for(const topic of guide.readingTopics!){click(topic);assert.ok(!entries[0].hidden);assert.ok(entries[1].hidden,'tags alone must not add a category');assert.equal(filters.find(f=>f.dataset.filter===topic)!.current,'page');}
  click('reading-types');assert.deepEqual(visible(),[0,2]);
  click('reading-types/inference');
  for(const text of ['七类题型','过度推断','QUALIFIED SUCCESS','必要条件 张冠李戴']){search(text);assert.deepEqual(visible(),[0]);assert.equal(empty.hidden,true);}
  search('nonexistent-term');assert.deepEqual(visible(),[]);assert.equal(empty.hidden,false);assert.match(count.textContent,/^0 份/);
  location.href=historyUrls[--historyIndex];handlers.get('popstate')!();assert.deepEqual(visible(),[0]);
  location.href=historyUrls[++historyIndex];handlers.get('popstate')!();assert.deepEqual(visible(),[]);
  search('过度推断');click('reading-types/detail');assert.deepEqual(visible(),[0]);assert.equal(new URL(filters[0].href).searchParams.get('q'),'过度推断');
  search('');click('writing');assert.deepEqual(visible(),[1]);
  click('uncategorized');assert.deepEqual(visible(),[]);
  click('');assert.deepEqual(visible(),[0,1,2]);
});

test('link verifier accepts encoded Chinese fragments and rejects missing local targets',async()=>{
  const temp=await mkdtemp(path.join(tmpdir(),'reading-verify-'));
  const run=()=>spawnSync(process.execPath,[fileURLToPath(new URL('./verify.mjs',import.meta.url))],{cwd:temp,encoding:'utf8'});
  try{
    for(const dir of ['search','manage']){await mkdir(path.join(temp,'dist',dir),{recursive:true});await writeFile(path.join(temp,'dist',dir,'index.html'),'<meta name="robots" content="noindex,follow">');}
    const file=path.join(temp,'dist','index.html');
    await writeFile(file,`<h2 id="细节题">细节题</h2><a href="#${encodeURIComponent('细节题')}">局部</a><a href="${config.siteUrl}#细节题">完整网址</a>`);
    assert.equal(run().status,0);
    for(const href of ['#不存在',config.siteUrl+'#不存在','missing/']){
      await writeFile(file,`<a href="${href}">缺失目标</a>`);
      const result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/页内锚点不存在|链接目标不存在/);
    }
  }finally{await rm(temp,{recursive:true,force:true});}
});
