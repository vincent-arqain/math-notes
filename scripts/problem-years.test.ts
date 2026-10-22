import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {fileURLToPath} from 'node:url';
import {loadEntries} from '../src/content';
import {availableProblemYears,problemYears,problemIds,yearPDFs,ProblemYearPage,ProblemYears} from '../src/ProblemYears';

const entries=loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));

test('all completed batches appear once, indexed by problem years rather than upload date',async()=>{
  const items=await entries;
  const batches=items.filter(e=>e.problemIds?.length);
  assert.equal(batches.length,33);
  assert.equal(batches.reduce((n,e)=>n+e.problemIds!.length,0),230);
  assert.equal(new Set(batches.flatMap(e=>e.problemIds!)).size,230);
  assert.equal(new Set(batches.map(e=>e.attachmentPath)).size,33);
  assert.deepEqual(availableProblemYears(items),[2022,2021,2020,2019,2018,2017,2016,2015,2014]);
  assert.deepEqual(problemYears({...batches[0],section:'english'}),[]);
  assert.deepEqual(problemYears({...batches[0],problemIds:[],body:'',title:'2026 年上传的 PDF',updated_at:'2026-10-22'}),[]);
});

test('every cross-year batch has identical read and download attachments in both year pages',async()=>{
  const items=await entries;
  const cross=items.filter(e=>problemYears(e).length>1);
  assert.equal(cross.length,6);
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
  const html=renderToStaticMarkup(createElement(ProblemYears,{items,current:2022}));
  assert.equal((html.match(/aria-current="page"/g)||[]).length,1);
  for(let year=2014;year<=2022;year++)assert.ok(html.includes(`href="/problems/years/${year}/"`));
  const list=yearPDFs(items,2022);
  assert.match(list[0].title,/21A10/);
  assert.match(list.at(-1)!.title,/22A05/);
});
