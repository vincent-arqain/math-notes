import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {loadEntries} from '../src/content';
import {FinalExamDirectory,finalExamEntries} from '../src/FinalExamDirectory';
import {problemYears,yearPDFs} from '../src/ProblemYears';
import {entryUrl} from '../src/model';

test('final exams use cohort navigation and never enter A/S year archives',async()=>{
  const items=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
  const finals=finalExamEntries(items);
  assert.equal(finals.length,1);
  const entry=finals[0];
  assert.equal(entry.category,'final-exams/2014');
  assert.deepEqual(problemYears(entry),[]);
  assert.ok(!yearPDFs(items,2014).some(e=>e.id===entry.id));
  for(const course of ['I','II'])for(const number of ['07','08'])assert.ok(entry.body.includes(`［14级高代 ${course} 期末 ${number}］`));
  const html=renderToStaticMarkup(createElement(FinalExamDirectory,{items}));
  assert.ok(html.includes('id="final-exams"'));
  assert.ok(html.includes(`href="${entryUrl(entry)}/"`));
  assert.ok(html.includes('14级'));
  assert.equal(renderToStaticMarkup(createElement(FinalExamDirectory,{items:[]})),'');
  assert.deepEqual(finalExamEntries([{...entry,section:'english'},{...entry,category:'final-exams/unknown'}]),[]);
});

test('October 24 PDFs preserve all original bytes and have one entry each',async()=>{
  const items=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
  const records=JSON.parse(await readFile(new URL('../docs/reviews/fudan-oct24-pdfs.json',import.meta.url),'utf8')) as {file:string;bytes:number;sha256:string}[];
  assert.equal(records.length,3);
  for(const record of records){
    assert.equal(items.filter(e=>e.attachmentPath===`problems/${record.file}`).length,1);
    const bytes=await readFile(new URL(`../content/problems/${record.file}`,import.meta.url));
    assert.equal(bytes.length,record.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256);
  }
  assert.deepEqual(yearPDFs(items,2023).flatMap(e=>e.problemIds||[]).filter(id=>id.startsWith('2023')),Array.from({length:15},(_,i)=>`2023S${String(i+1).padStart(2,'0')}`));
});
