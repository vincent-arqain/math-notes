import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import vm from 'node:vm';
import {loadEntries} from '../src/content';
import {tagsOf} from '../src/model';
import {Collection,Home} from '../src/components';
import Markdown from '../src/Markdown';
import config from '../site.config.json';

const manifest=JSON.parse(await readFile(new URL('./fixtures/sentence-v1-source.json',import.meta.url),'utf8'));
const all=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
const entries=all.filter(e=>e.sourcePath.startsWith('english/sentences/sentence-v1-'));
const get=(code:string)=>entries.find(e=>e.sourcePath===manifest.entries.find((r:any)=>r.code===code).path)!;
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
const digest=(s:string)=>createHash('sha256').update(normalize(s)).digest('hex');

test('Sentence-v1 retains both 37-item curricula and source positions without publishing source files or PDFs',async()=>{
  assert.equal(entries.length,75);
  assert.equal(manifest.entries.length,74);
  for(const part of ['L','F'])assert.deepEqual(manifest.entries.filter((r:any)=>r.part===part).map((r:any)=>r.number),Array.from({length:37},(_,n)=>n+1));
  assert.equal(new Set(manifest.entries.map((r:any)=>`${r.year}/${r.text}`)).size,37);
  assert.equal(manifest.entries.filter((r:any)=>r.sourceChecked).length,32);
  for(const source of manifest.entries){
    const e=get(source.code);
    assert.equal(e.category,'sentences');
    assert.ok(e.body.includes(`${source.year}年考研英语阅读 Part A，Text ${source.text}，P${source.paragraph}`),source.code);
    for(const tag of [source.code,source.year+'年',`Text ${source.text}`,source.part==='L'?'经典长难句':'词熟句难'])assert.ok(tagsOf(e).includes(tag),`${source.code}: ${tag}`);
    const value=e.body.split('\n## 考场价值\n\n')[1]?.split('\n\n')[0];
    assert.equal(digest(value),source.publishedExamValueSha256,`${source.code}: teaching value lost`);
    if(!['F13','F27','F32'].includes(source.code))assert.equal(digest(value),source.sourceExamValueSha256,`${source.code}: source teaching changed without review`);
    assert.match(e.body,/不是历年试题原句/);
    const training=e.body.split('\n').filter(l=>l.startsWith('> ')).map(l=>l.slice(2)).join('\n');
    assert.ok(training);
    assert.ok(!manifest.entries.some((r:any)=>r.originalSentenceSha256===digest(training)),source.code);
    for(const heading of ['题源信息','题源教学要点','原创英文训练','训练句直译','训练句拆解','低词汇量读法','考场价值'])assert.ok(e.body.includes(heading),`${source.code}: ${heading}`);
  }
  for(const e of entries){
    assert.equal(e.attachmentPath,null);
    assert.doesNotMatch(e.body,/!\[|<img\b|data:image|\]\([^)]*\.pdf(?:[#?][^)]*)?\)/i);
    assert.doesNotMatch(e.body,/\*\*原句\*\*：|\*\*直译\*\*：/);
  }
  const files=await readdir(new URL('../content/english/sentences/',import.meta.url));
  assert.ok(files.every(f=>f==='.gitkeep'||f.endsWith('.md')));
});

test('classification/year navigation reaches all 74 entries and every related entry and fragment resolves',()=>{
  const html=new Map(entries.map(e=>[e.id,renderToStaticMarkup(createElement(Markdown,{body:e.body}))]));
  const hub=entries.find(e=>e.sourcePath===manifest.hub)!;
  const index=html.get(hub.id)!;
  for(const part of ['经典长难句','词熟句难']){
    assert.ok(index.includes(`id="${part}"`));
    for(const year of [2006,2007,2008,2009,2014,2015,2016,2018,2019,2020])assert.ok(index.includes(`id="${part}-${year}年"`));
  }
  for(const source of manifest.entries){
    const e=get(source.code);
    assert.ok(index.includes(`/english/${e.id}/`),`${source.code}: not indexed`);
    assert.ok(html.get(e.id)!.includes(`/english/${hub.id}/`),`${source.code}: no return route`);
  }
  for(const [id,page]of html){
    const ids=[...page.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
    assert.equal(ids.length,new Set(ids).size,id);
    for(const [,raw]of page.matchAll(/href="([^"]+)"/g)){
      const target=new URL(raw.replaceAll('&amp;','&'),`https://local.test/english/${id}/`);
      if(target.origin!=='https://local.test'||!target.pathname.startsWith('/english/'))continue;
      const targetId=target.pathname.split('/')[2]||id;
      if(target.pathname==='/english/')continue;
      assert.ok(html.has(targetId),target.href);
      if(target.hash)assert.ok(html.get(targetId)!.includes(`id="${decodeURIComponent(target.hash.slice(1))}"`),target.href);
    }
  }
});

test('real collection search finds sentence-level grammar, difficulty, source year and article identifiers',async()=>{
  const html=renderToStaticMarkup(createElement(Collection,{items:all,section:'english'}));
  const decode=(s:string)=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const rows=[...html.matchAll(/<article\b[^>]+>/g)].map(([tag])=>({dataset:{category:decode(tag.match(/data-category="([^"]*)"/)![1]),readingTopics:decode(tag.match(/data-reading-topics="([^"]*)"/)![1]),search:decode(tag.match(/data-search="([^"]*)"/)![1])},hidden:false}));
  const handlers=new Map<string,(event?:any)=>void>();
  const query={value:''},category={value:''},count={textContent:''},empty={hidden:true};
  const location=new URL('english/?category=sentences',config.siteUrl);
  const collection={querySelector:()=>({addEventListener:(type:string,fn:()=>void)=>handlers.set(type,fn)}),querySelectorAll:(selector:string)=>selector==='[data-entry]'?rows:[]};
  vm.runInNewContext(await readFile(new URL('../public/site.js',import.meta.url),'utf8'),{
    document:{querySelector:()=>collection,getElementById:(id:string)=>({query,category,'result-count':count,'no-results':empty})[id]},
    location,URL,URLSearchParams,history:{pushState(_state:unknown,_title:string,url:string){location.href=new URL(url,location).href;}},
    FormData:class{*[Symbol.iterator](){yield ['q',query.value];yield ['category',category.value];}},
    addEventListener:(type:string,fn:()=>void)=>handlers.set(type,fn),
  });
  const visible=()=>rows.filter(e=>!e.hidden);
  const search=(text:string)=>{query.value=text;handlers.get('submit')!({preventDefault(){}});return visible();};
  assert.equal(visible().length,75);
  assert.equal(search('句库目录').length,1,'home entry must select the hub rather than a random sentence');
  const home=renderToStaticMarkup(createElement(Home,{items:all}));
  assert.ok(home.includes('href="/english/?category=sentences"'),'home opens the full long-sentence category');
  assert.ok(search('经典长难句 2014年 Text 1').some(r=>r.dataset.search.includes(get('L17').title.toLowerCase())));
  assert.ok(search('词熟句难 2009年 Text 1').some(r=>r.dataset.search.includes(get('F13').title.toLowerCase())));
  for(const q of ['倒装','嵌套从句','否定范围','条件范围','熟词僻义'])assert.ok(search(q).length>1,q);
  assert.ok(search('L17').some(r=>r.dataset.search.includes('will they be allowed')));
  assert.ok(search('F19').some(r=>r.dataset.search.includes('诺贝尔奖')));
  assert.ok(search('spare driver').length===1);
  assert.equal(search('not-a-real-sentence-query').length,0);
  assert.equal(empty.hidden,false);
  location.search='?category=sentences&q='+encodeURIComponent('经典长难句 2014年 Text 1');handlers.get('popstate')!();
  assert.ok(visible().some(r=>r.dataset.search.includes(get('L17').title.toLowerCase())));
  location.search='?category=writing&q='+encodeURIComponent('L17');handlers.get('popstate')!();
  assert.equal(visible().length,0,'sentence tags must not create another category');
});

test('reviewed explanations preserve grammatical roles, pronoun antecedents and nonexclusive conditions',()=>{
  assert.match(get('L04').body,/并不是两个 what 从句互相嵌套/);
  assert.match(get('L19').body,/不是主语与助动词倒装/);
  assert.match(get('L24').body,/不能称为并列宾语从句/);
  assert.match(get('L26').body,/不是主句表语从句/);
  assert.match(get('L36').body,/that 引导宾语从句/);
  assert.match(get('F13').body,/This 紧承末段/);
  assert.match(get('F19').body,/先行词是前一句的 Nobels/);
  assert.match(get('F27').body,/不是 only when/);
});
