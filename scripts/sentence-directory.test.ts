import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries} from '../src/content';
import {sentenceGroups,sentenceSource,SentenceYearPage,SentenceDirectory,sentenceTextUrl,sentenceYearUrl} from '../src/SentenceDirectory';
import {Collection,Article} from '../src/components';
import {sentencePatternCategories,validCategory,entryUrl} from '../src/model';
import {SentencePatterns} from '../src/SentencePatterns';
import config from '../site.config.json';

const items=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('./fixtures/sentence-v1-source.json',import.meta.url),'utf8'));
const groups=sentenceGroups(items);

test('all 74 source sentences are reached by the correct year and Text without duplicates',()=>{
  assert.deepEqual(groups.map(group=>group.year),[2020,2019,2018,2016,2015,2014,2009,2008,2007,2006]);
  const reached:string[]=[];
  const directory=renderToStaticMarkup(createElement(SentenceDirectory,{items}));
  for(const group of groups){
    assert.ok(directory.includes(`href="${sentenceYearUrl(group.year)}"`));
    const yearPage=renderToStaticMarkup(createElement(SentenceYearPage,{items,year:group.year}));
    for(const text of group.texts){
      if(!text.entries.length){assert.ok(!yearPage.includes(`href="${sentenceTextUrl(group.year,text.text)}"`));continue;}
      assert.ok(yearPage.includes(`href="${sentenceTextUrl(group.year,text.text)}"`));
      const page=renderToStaticMarkup(createElement(SentenceYearPage,{items,year:group.year,text:text.text}));
      const expected=manifest.entries.filter((entry:any)=>entry.year===group.year&&entry.text===text.text);
      assert.deepEqual(text.entries.map(entry=>entry.sourcePath).sort(),expected.map((entry:any)=>entry.path).sort());
      for(const entry of text.entries){
        reached.push(entry.id);
        assert.ok(page.includes(`href="${entryUrl(entry)}/"`));
        const article=renderToStaticMarkup(createElement(Article,{entry}));
        assert.ok(article.includes(`href="${sentenceTextUrl(group.year,text.text)}"`));
      }
    }
    const ids=[...yearPage.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(ids.length,new Set(ids).size);
  }
  assert.equal(reached.length,74);assert.equal(new Set(reached).size,74);
  assert.equal((renderToStaticMarkup(createElement(SentenceYearPage,{items,year:2018})).match(/暂未收录/g)||[]).length,3);
});

test('only unambiguous source tags determine year and Text; other materials stay reachable',()=>{
  const sample=groups[0].entries[0].entry;
  const unknown={...sample,id:'unclassified-sentence',title:'其他句子',tags:'[]'};
  assert.equal(sentenceSource(unknown),null);
  assert.equal(sentenceSource({...sample,tags:'["2018年","2019年","Text 1"]'}),null);
  assert.equal(sentenceSource({...sample,tags:'["2018年","Text 1","Text 2"]'}),null);
  assert.equal(sentenceSource({...sample,tags:'["2018年","Text 5"]'}),null);
  assert.equal(sentenceSource({...sample,category:'writing'}),null);
  assert.deepEqual(sentenceSource({...unknown,tags:'["2006年","Text 4"]'}),{year:2006,text:4});
  const directory=renderToStaticMarkup(createElement(SentenceDirectory,{items:[unknown,...items]}));
  assert.ok(directory.includes(`href="${entryUrl(unknown)}/"`));
  const hub=items.find(entry=>entry.sourcePath===manifest.hub)!;
  assert.ok(directory.includes(`href="${entryUrl(hub)}/"`));
  const order=(value:ReturnType<typeof sentenceGroups>)=>value.map(group=>({year:group.year,entries:group.entries.map(item=>item.entry.id),texts:group.texts.map(text=>text.entries.map(entry=>entry.id))}));
  assert.deepEqual(order(sentenceGroups([...items].reverse())),order(groups));
});

test('new sentence-pattern categories have genuine empty counts and are accepted for content',()=>{
  assert.equal(validCategory('sentence-patterns'),true);
  const panel=renderToStaticMarkup(createElement(SentencePatterns,{items}));
  for(const category of sentencePatternCategories){
    assert.equal(validCategory(category.id),true);
    assert.ok(panel.includes(`data-filter="${category.id}"`));
    assert.ok(panel.includes(category.label));
  }
  assert.equal((panel.match(/0 份资料/g)||[]).length,3);
  const page=renderToStaticMarkup(createElement(Collection,{items,section:'english'}));
  const reading=page.match(/<nav aria-label="阅读题型分类">([\s\S]*?)<\/nav>/)![1];
  assert.equal((reading.match(/data-filter=/g)||[]).length,7);
  assert.ok(!reading.includes('sentence-patterns'));
});

test('sentence browsing, cross-year search, pattern filters and browser history do not hide other categories',async()=>{
  const html=renderToStaticMarkup(createElement(Collection,{items,section:'english'}));
  const decode=(s:string)=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const attrs=(tag:string)=>Object.fromEntries([...tag.matchAll(/data-([a-z-]+)="([^"]*)"/g)].map(([,key,value])=>[key.replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase()),decode(value)]));
  const rows=[...html.matchAll(/<article\b[^>]+>/g)].map(([tag])=>({dataset:attrs(tag),hidden:false}));
  const handlers=new Map<string,(event?:any)=>void>();
  const filters=[...html.matchAll(/<a\b[^>]*data-filter="([^"]*)"[^>]*href="([^"]*)"/g)].map(([,filter,href])=>({dataset:{filter},href:new URL(decode(href),config.siteUrl).href,current:'',setAttribute(_key:string,value:string){this.current=value;},removeAttribute(){this.current='';},addEventListener(type:string,fn:(event:any)=>void){handlers.set(filter+':'+type,fn);}}));
  const query={value:''},category={value:''},count={textContent:''},empty={hidden:true},sentences={hidden:true},patterns={hidden:true},exams={hidden:true},list={hidden:false};
  const form={addEventListener(type:string,fn:()=>void){handlers.set(type,fn);}};
  const location=new URL('english/?category=sentences',config.siteUrl);
  const collection={querySelector:(selector:string)=>({'form':form,'[data-exam-directory]':exams,'[data-sentence-directory]':sentences,'[data-sentence-patterns]':patterns,'.entry-list':list})[selector],querySelectorAll:(selector:string)=>({'[data-entry]':rows,'[data-filter]':filters})[selector]||[]};
  vm.runInNewContext(await readFile(new URL('../public/site.js',import.meta.url),'utf8'),{
    document:{querySelector:()=>collection,getElementById:(id:string)=>({query,category,'result-count':count,'no-results':empty})[id]},
    location,URL,URLSearchParams,history:{pushState(_state:unknown,_title:string,url:string){location.href=new URL(url,location).href;}},
    FormData:class{*[Symbol.iterator](){yield ['q',query.value];yield ['category',category.value];}},
    addEventListener:(type:string,fn:()=>void)=>handlers.set(type,fn),
  });
  const click=(filter:string)=>handlers.get(filter+':click')!({button:0,preventDefault(){}});
  const search=(value:string)=>{query.value=value;handlers.get('submit')!({preventDefault(){}});};
  assert.equal(sentences.hidden,false);assert.equal(list.hidden,true);assert.equal(patterns.hidden,true);
  search('2006年 Text 1');assert.equal(sentences.hidden,true);assert.equal(list.hidden,false);assert.ok(rows.some(row=>!row.hidden));
  search('no-such-sentence');assert.equal(empty.hidden,false);
  search('');assert.equal(sentences.hidden,false);assert.equal(list.hidden,true);
  click('sentence-patterns');assert.equal(sentences.hidden,true);assert.equal(patterns.hidden,false);assert.equal(list.hidden,false);
  for(const group of sentencePatternCategories){click(group.id);assert.equal(patterns.hidden,false);assert.equal(filters.find(link=>link.dataset.filter===group.id)!.current,'page');assert.equal(filters.find(link=>link.dataset.filter==='sentence-patterns')!.current,'page');}
  click('exams');assert.equal(patterns.hidden,true);assert.equal(exams.hidden,false);
  click('writing');assert.equal(exams.hidden,true);assert.equal(list.hidden,false);assert.equal(rows.filter(row=>!row.hidden).length,32);
  location.search='?category=sentences';handlers.get('popstate')!();assert.equal(sentences.hidden,false);assert.equal(list.hidden,true);
  click('');assert.equal(sentences.hidden,true);assert.equal(list.hidden,false);
});
