import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries,type PublicEntry} from '../src/content';
import {selectHomeEntries} from '../src/home';
import {compareRecentEntries,entryUrl,englishStudyCategories,type Section} from '../src/model';
import {Home,Collection,Layout,MathOverview} from '../src/components';

function entry(id:string,section:Section,updated_at='2026-10-20T00:00:00.000Z',category=''):PublicEntry {
  return {id,section,updated_at,category,title:id,owner_id:'',description:'',subject:'',tags:'[]',body:'',source_url:'',status:'published',file_key:null,file_name:null,file_type:null,file_size:null,version:1,created_at:updated_at,deleted_at:null,sourcePath:`${section}/${id}.md`,attachmentPath:null};
}
const ids=(items:PublicEntry[])=>items.map(item=>item.id);

test('batch publishing keeps independent math highlights and the true six most recent updates',()=>{
  const writing=Array.from({length:32},(_,i)=>entry(`a-writing-${String(i).padStart(2,'0')}`,'english',undefined,'writing'));
  const items=[...writing,entry('problem-new','problems'),entry('note-new','notes','2026-10-19'),entry('note-old','notes','2026-10-18'),entry('note-older','notes','2026-10-17'),entry('problem-old','problems','2026-10-18'),entry('problem-older','problems','2026-10-17')];
  const before=JSON.stringify(items);
  Object.freeze(items);items.forEach(Object.freeze);
  const selected=selectHomeEntries(items);
  assert.deepEqual(ids(selected.notes),['note-new','note-old']);
  assert.deepEqual(ids(selected.problems),['problem-new','problem-old']);
  assert.deepEqual(ids(selected.english),[writing[0].id]);
  assert.deepEqual(ids(selected.recent),ids(writing.slice(0,6)));
  assert.equal(JSON.stringify(items),before,'selection must not edit metadata or input order');
});

test('home selection uses date then ID consistently even for unordered input and date ties',()=>{
  const items=[entry('z','notes','2026-10-19'),entry('b','notes'),entry('a','notes'),entry('newest','problems','2026-10-21')];
  const selected=selectHomeEntries(items);
  assert.deepEqual(ids(selected.notes),['a','b']);
  assert.deepEqual(ids(selected.recent),['newest','a','b','z']);
  assert.deepEqual(selectHomeEntries([...items].reverse()),selected);
  assert.deepEqual(selected.recent,[...items].sort(compareRecentEntries));
});

test('English highlights take the latest item from up to three distinct top-level categories',()=>{
  const items=[
    entry('writing-new','english','2026-10-23','writing'),
    entry('writing-old','english','2026-10-22','writing'),
    entry('detail','english','2026-10-21','reading-types/detail'),
    entry('inference','english','2026-10-20','reading-types/inference'),
    entry('vocabulary','english','2026-10-19','vocabulary'),
    entry('sentences','english','2026-10-18','sentences'),
  ];
  assert.deepEqual(ids(selectHomeEntries(items).english),['writing-new','detail','vocabulary']);
  assert.deepEqual(ids(selectHomeEntries([entry('uncategorized','english')]).english),['uncategorized']);
});

test('home exposes three fixed study areas and nine English destinations without decorative imagery',()=>{
  const home=renderToStaticMarkup(createElement(Home,{items:[]}));
  assert.match(home,/暂无公开资料/);
  assert.doesNotMatch(home,/<(?:svg|figure|img)\b|一间安静的电子书房|思考的地方/);
  const areas=[...home.matchAll(/<h2 id="(math|problems|english)-heading">/g)].map(m=>m[1]);
  assert.deepEqual(areas,['math','problems','english']);
  for(const href of ['/math/','/notes/','/problems/','/papers/','/essays/','/problems/#problem-index'])assert.ok(home.includes(`href="${href}"`));
  assert.equal(englishStudyCategories.length,9);
  for(const category of englishStudyCategories){
    assert.ok(home.includes(`href="/english/?category=${category.id}"`));
    assert.ok(home.includes(category.label));
  }
  const html=renderToStaticMarkup(createElement(Layout,{title:'数学',path:'/notes/',children:null}));
  const nav=html.match(/<nav aria-label="主导航">([\s\S]*?)<\/nav>/)![1];
  assert.equal((nav.match(/<a /g)||[]).length,4);
  assert.match(nav,/<a href="\/math\/" aria-current="page">数学/);
  for(const href of ['/books/','/links/','/about/','/manage/'])assert.ok(html.includes(`href="${href}"`));
});

test('math overview preserves real articles and home retains the true recent entries',async()=>{
  const items=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
  const selected=selectHomeEntries(items);
  const home=renderToStaticMarkup(createElement(Home,{items}));
  const math=renderToStaticMarkup(createElement(MathOverview,{items}));
  for(const source of ['notes/euler-series-harmonic-numbers.md','problems/algebra-2020s14-2021a02.md']){
    const item=items.find(e=>e.sourcePath===source)!;
    assert.ok(item);
    assert.ok(math.includes(`href="/${item.section}/"`));
  }
  for(const section of ['notes','problems','papers','essays'])for(const item of items.filter(e=>e.section===section).slice(0,3)){
    assert.ok(math.includes(`href="${entryUrl(item)}/"`));assert.ok(math.includes(item.title));
  }
  const recent=home.split('id="recent-updates"')[1];
  for(const item of selected.recent)assert.ok(recent.includes(`href="${entryUrl(item)}/"`));
  const htmlIds=[...home.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(htmlIds.length,new Set(htmlIds).size);
  const writing=items.filter(item=>item.category==='writing');
  assert.equal(writing.length,32);
  for(const section of ['english',undefined] as const){
    const collection=renderToStaticMarkup(createElement(Collection,{items:section?items.filter(item=>item.section===section):items,section}));
    for(const item of writing)assert.ok(collection.includes(`href="${entryUrl(item)}/"`));
  }
});
