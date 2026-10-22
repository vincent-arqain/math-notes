import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries} from '../src/content';
import {ExamDirectory,examYear} from '../src/ExamDirectory';
import {Collection} from '../src/components';
import config from '../site.config.json';

const entries=loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
const decode=(value:string)=>value.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');

test('all 29 published exam years link directly to their original PDF and download',async()=>{
  const items=(await entries).filter(entry=>entry.category==='exams');
  assert.equal(items.length,29);
  const html=renderToStaticMarkup(createElement(ExamDirectory,{items:[...items].reverse()}));
  const years=[...html.matchAll(/<span>(\d{4}) 年<\/span>/g)].map(match=>Number(match[1]));
  assert.deepEqual(years,Array.from({length:29},(_,index)=>2026-index));
  for(const entry of items){
    const year=examYear(entry);
    const href='/files/english/exams/'+encodeURIComponent(`${year}英一.pdf`);
    assert.ok(html.includes(`class="exam-year-link" href="${href}"`),entry.title);
    assert.ok(html.includes(`class="exam-download" href="${href}" download="${year}英一.pdf"`),entry.title);
    assert.equal(entry.attachmentPath,`english/exams/${year}英一.pdf`);
  }
});

test('year recognition avoids update dates and keeps unknown years, web articles and download-only assets accessible',async()=>{
  const sample=(await entries).find(entry=>entry.category==='exams')!;
  const unknown={...sample,id:'unknown',title:'试题汇编',file_name:null,tags:'[]',attachmentPath:null,body:'试题正文'};
  assert.equal(examYear(unknown),null);
  assert.equal(examYear({...unknown,file_name:'2001试题.pdf'}),2001);
  assert.equal(examYear({...unknown,tags:'["2010"]'}),2010);
  assert.equal(examYear({...unknown,title:'2010—2023 年试题汇编'}),null);
  const download={...unknown,id:'download',title:'2024 年真题',file_name:'2024试卷.zip',attachmentUrl:'https://github.com/example/library/releases/download/exams/2024.zip'};
  const html=renderToStaticMarkup(createElement(ExamDirectory,{items:[unknown,download,{...sample,section:'notes'}]}));
  assert.match(html,/class="exam-year-link" href="\/english\/unknown\/"/);
  assert.match(html,/年份未标注/);
  assert.ok(html.includes(`class="exam-year-link" href="${download.attachmentUrl}" download="2024试卷.zip"`));
  assert.equal((html.match(/data-exam-id=/g)||[]).length,2);
});

test('exam category deep links, search, category switches and browser history show the correct years once',async()=>{
  const items=(await entries).filter(entry=>entry.section==='english');
  const html=renderToStaticMarkup(createElement(Collection,{items,section:'english'}));
  const attributes=(tag:string)=>Object.fromEntries([...tag.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,key,value])=>[key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),decode(value)]));
  const rows=[...html.matchAll(/<article\b[^>]+>/g)].map(([tag])=>({dataset:attributes(tag),hidden:false}));
  const cards=[...html.matchAll(/<div\b[^>]*data-exam-id="[^"]+"[^>]*>/g)].map(([tag])=>({dataset:attributes(tag),hidden:false}));
  const handlers=new Map<string,(event?:any)=>void>();
  const filters=[...html.matchAll(/<a\b[^>]*data-filter="([^"]*)"[^>]*href="([^"]*)"/g)].map(([,filter,href])=>({dataset:{filter},href:new URL(decode(href),config.siteUrl).href,setAttribute(){},removeAttribute(){},addEventListener(type:string,fn:(event:any)=>void){handlers.set(filter+':'+type,fn);}}));
  const query={value:''},category={value:''},count={textContent:''},empty={hidden:true},directory={hidden:true},list={hidden:false};
  const form={addEventListener(type:string,fn:()=>void){handlers.set(type,fn);}};
  const location=new URL('english/?category=exams',config.siteUrl);
  const collection={querySelector:(selector:string)=>({'form':form,'[data-exam-directory]':directory,'.entry-list':list})[selector],querySelectorAll:(selector:string)=>({'[data-entry]':rows,'[data-filter]':filters,'[data-exam-id]':cards})[selector]||[]};
  vm.runInNewContext(await readFile(new URL('../public/site.js',import.meta.url),'utf8'),{
    document:{querySelector:()=>collection,getElementById:(id:string)=>({query,category,'result-count':count,'no-results':empty})[id]},
    location,URL,URLSearchParams,history:{pushState(_state:unknown,_title:string,url:string){location.href=new URL(url,location).href;}},
    FormData:class{*[Symbol.iterator](){yield ['q',query.value];yield ['category',category.value];}},
    addEventListener:(type:string,fn:()=>void)=>handlers.set(type,fn),
  });
  const visible=()=>cards.filter(card=>!card.hidden);
  const search=(text:string)=>{query.value=text;handlers.get('submit')!({preventDefault(){}});};
  const click=(filter:string,event={button:0,preventDefault(){}})=>handlers.get(filter+':click')!(event);
  assert.equal(directory.hidden,false);assert.equal(list.hidden,true);assert.equal(visible().length,29);
  assert.match(count.textContent,/^29 份/);
  search('2024');assert.equal(visible().length,1);
  assert.equal(visible()[0].dataset.examId,items.find(entry=>entry.category==='exams'&&examYear(entry)===2024)!.id);
  const yearSearch=location.href;
  search('没有这份试卷');assert.equal(visible().length,0);assert.equal(empty.hidden,false);
  location.href=yearSearch;handlers.get('popstate')!();assert.equal(visible().length,1);assert.equal(empty.hidden,true);
  click('writing');assert.equal(directory.hidden,true);assert.equal(list.hidden,false);
  click('exams');assert.equal(directory.hidden,false);assert.equal(visible().length,1);
  search('');click('');assert.equal(directory.hidden,true);assert.equal(list.hidden,false);
  assert.equal(rows.filter(row=>!row.hidden).length,items.length);
  click('exams');assert.equal(visible().length,29);assert.equal(list.hidden,true);
  const before=location.href;
  handlers.get('writing:click')!({button:0,ctrlKey:true,preventDefault(){assert.fail('modified clicks keep native navigation');}});
  assert.equal(location.href,before);
});
