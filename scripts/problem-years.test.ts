import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fileURLToPath} from 'node:url';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadEntries} from '../src/content';
import {availableProblemYears,problemYears,problemIds,yearPDFs,ProblemYearPage,ProblemYears} from '../src/ProblemYears';

const entries=loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));

test('all completed batches appear once, indexed by problem years rather than upload date',async()=>{
  const items=await entries;
  const batches=items.filter(e=>e.problemIds?.length);
  assert.equal(batches.length,34);
  assert.equal(batches.reduce((n,e)=>n+e.problemIds!.length,0),237);
  assert.equal(new Set(batches.flatMap(e=>e.problemIds!)).size,237);
  assert.equal(new Set(batches.map(e=>e.attachmentPath)).size,34);
  assert.deepEqual(availableProblemYears(items),[2023,2022,2021,2020,2019,2018,2017,2016,2015,2014]);
  assert.deepEqual(problemYears({...batches[0],section:'english'}),[]);
  assert.deepEqual(problemYears({...batches[0],problemIds:[],body:'',title:'2026 年上传的 PDF',updated_at:'2026-10-22'}),[]);
});

test('every cross-year batch has identical read and download attachments in both year pages',async()=>{
  const items=await entries;
  const cross=items.filter(e=>problemYears(e).length>1);
  assert.equal(cross.length,7);
  for(const entry of cross){
    for(const year of problemYears(entry)){
      assert.equal(yearPDFs(items,year).filter(e=>e.id===entry.id).length,1);
      const html=renderToStaticMarkup(createElement(ProblemYearPage,{items,year}));
      const card=html.split(`data-pdf-id="${entry.id}"`)[1].split('</article>')[0];
      const url='/files/'+entry.attachmentPath!.split('/').map(encodeURIComponent).join('/');
      assert.ok(card.includes(`href="${url}" target="_blank" rel="noopener">阅读 PDF`));
      assert.ok(card.includes(`href="${url}" download="${entry.file_name}"`));
      for(const id of problemIds(entry))assert.ok(card.includes(id));
    }
    for(const year of availableProblemYears(items).filter(y=>!problemYears(entry).includes(y))){
      assert.ok(!yearPDFs(items,year).some(e=>e.id===entry.id));
    }
  }
});

test('year navigation has static links, unique current state, and S precedes A in a year',async()=>{
  const items=await entries;
  const html=renderToStaticMarkup(createElement(ProblemYears,{items,current:2023}));
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  assert.ok(html.includes('href="/problems/years/2023/" aria-current="page"'));
  for(let year=2014;year<=2023;year++)assert.ok(html.includes(`href="/problems/years/${year}/"`));
  const list=yearPDFs(items,2022);
  assert.match(list[0].title,/21A10/);
  assert.match(list.at(-2)!.title,/22A05/);
  assert.match(list.at(-1)!.title,/22A12/);
});

test('October 23 batch adds exactly seven new problems and one shared PDF',async()=>{
  const items=await entries;
  const attachmentPath='problems/22A12-A15_23S01-S03.pdf';
  const matching=items.filter(e=>e.attachmentPath===attachmentPath);
  assert.equal(matching.length,1,'The attachment must not create a second entry');
  const entry=matching[0];
  assert.deepEqual(entry.problemIds,['2022A12','2022A13','2022A14','2022A15','2023S01','2023S02','2023S03']);
  assert.deepEqual(problemYears(entry),[2022,2023]);
  assert.equal(yearPDFs(items,2022).length,6);
  assert.deepEqual(yearPDFs(items,2023).map(e=>e.id),[entry.id]);
  const grid=renderToStaticMarkup(createElement(ProblemYears,{items}));
  assert.ok(grid.includes('href="/problems/years/2023/"'));
  const oldIds=new Set(items.filter(e=>e.id!==entry.id).flatMap(e=>e.problemIds||[]));
  for(const id of entry.problemIds!)assert.ok(!oldIds.has(id));
});

test('every archived PDF retains its recorded bytes and metadata',async()=>{
  const items=await entries;
  const records=JSON.parse(await readFile(new URL('../docs/reviews/fudan-pdf-archive.json',import.meta.url),'utf8')) as {file:string;sha256:string;problemIds:string[];years:number[]}[];
  assert.equal(records.length,34);
  assert.equal(new Set(records.map(r=>r.file)).size,34);
  for(const record of records){
    const matching=items.filter(e=>e.attachmentPath===`problems/${record.file}`);
    assert.equal(matching.length,1,record.file);
    assert.deepEqual(matching[0].problemIds,record.problemIds,record.file);
    assert.deepEqual(problemYears(matching[0]),record.years,record.file);
    const bytes=await readFile(new URL(`../content/problems/${record.file}`,import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,record.file);
  }
});
