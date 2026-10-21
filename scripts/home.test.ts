import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries,type PublicEntry} from '../src/content';
import {selectHomeEntries} from '../src/home';
import {compareRecentEntries,entryUrl,type Section} from '../src/model';
import {Home,Collection} from '../src/components';

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

test('empty and sparse homepages keep honest empty states and usable section/research links',()=>{
  assert.deepEqual(selectHomeEntries([]),{notes:[],problems:[],english:[],recent:[]});
  const empty=renderToStaticMarkup(createElement(Home,{items:[]}));
  assert.match(empty,/书房正在慢慢生长/);
  assert.equal((empty.match(/这一栏还没有公开内容/g)||[]).length,3);
  for(const href of ['/notes/','/problems/','/papers/','/english/'])assert.ok(empty.includes(`href="${href}"`));
  const sparse=selectHomeEntries([entry('only-writing','english',undefined,'writing')]);
  assert.deepEqual(ids(sparse.notes),[]);
  assert.deepEqual(ids(sparse.problems),[]);
  assert.equal(sparse.recent.length,1);
});

test('published Euler and algebra articles render before recent updates while all writing remains discoverable',async()=>{
  const items=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
  const selected=selectHomeEntries(items);
  const home=renderToStaticMarkup(createElement(Home,{items}));
  const highlights=home.split('id="recent-updates"')[0];
  const euler=items.find(item=>item.sourcePath==='notes/euler-series-harmonic-numbers.md')!;
  const algebra=items.find(item=>item.title==='高等代数七题：2020S14—2021A02')!;
  assert.ok(euler);assert.ok(algebra);
  for(const item of [euler,algebra]){
    assert.ok(highlights.includes(`href="${entryUrl(item)}/"`),item.title);
    assert.ok(highlights.includes(item.title));
  }
  assert.equal(selected.english.length,3);
  assert.equal(new Set(selected.english.map(item=>item.category.split('/')[0])).size,3);
  for(const category of ['writing','reading-types','vocabulary'])assert.ok(highlights.includes(`href="/english/?category=${category}"`));
  const htmlIds=[...home.matchAll(/\sid="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(htmlIds.length,new Set(htmlIds).size,'home fragment IDs must be unique');
  assert.ok(htmlIds.includes('recent-updates'));
  const writing=items.filter(item=>item.category==='writing');
  assert.equal(writing.length,32);
  for(const section of ['english',undefined] as const){
    const collection=renderToStaticMarkup(createElement(Collection,{items:section?items.filter(item=>item.section===section):items,section}));
    for(const item of writing)assert.ok(collection.includes(`href="${entryUrl(item)}/"`));
  }
});
