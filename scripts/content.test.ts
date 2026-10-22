import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {loadEntries,parseDocument,safeRelative} from '../src/content';
import Markdown from '../src/Markdown';

test('reject traversal and hidden paths',()=>{
  for(const p of ['../secret','notes/../secret','/etc/data','C:/secret','notes/.env','notes\\secret'])assert.throws(()=>safeRelative(p));
  assert.equal(safeRelative('notes/极限.pdf'),'notes/极限.pdf');
});
test('reject draft and private status in public content',()=>{
  for(const fields of ['draft: true','status: draft','deleted_at: 2026-10-12'])assert.throws(()=>parseDocument(`---\n${fields}\n---\nprivate`));
});
test('reading answers and core vocabulary load independently from existing English categories',async()=>{
  const root=await mkdtemp(path.join(os.tmpdir(),'math-english-categories-'));
  try{
    for(const category of ['reading-answers','core-vocabulary','vocabulary','translation']){
      await mkdir(path.join(root,'english',category),{recursive:true});
      await writeFile(path.join(root,'english',category,'entry.md'),`---\ntitle: ${category}\n---\n正文`);
    }
    const entries=await loadEntries(root);
    assert.deepEqual(entries.map(e=>e.category).sort(),['core-vocabulary','reading-answers','translation','vocabulary']);
    assert.equal(new Set(entries.map(e=>e.id)).size,4);
  }finally{await rm(root,{recursive:true,force:true});}
});
test('preserve body, titles, categories and attach original files only once',async()=>{
  const temp=await mkdtemp(path.join(os.tmpdir(),'math-garden-test-'));
  const root=path.join(temp,'content');
  try{
    await mkdir(path.join(root,'english','reading-types','inference'),{recursive:true});
    await mkdir(path.join(root,'notes'),{recursive:true});
    const body='原始推导：$x^2$\n\n$$\\sum_{i=1}^n i$$\n';
    await writeFile(path.join(root,'notes','proof.md'),`---\ntitle: 测试证明\ntags: [极限]\nattachment: notes/original.pdf\nupdated_at: "2026-10-12"\n---\n${body}`);
    await writeFile(path.join(root,'notes','original.pdf'),'%PDF-1.4\noriginal bytes');
    await writeFile(path.join(root,'english','reading-types','inference','推理题.txt'),'原文');
    const entries=await loadEntries(root);
    assert.equal(entries.length,2);
    const proof=entries.find(e=>e.title==='测试证明')!;
    assert.equal(proof.body,body);
    assert.equal(proof.attachmentPath,'notes/original.pdf');
    assert.equal(entries.find(e=>e.section==='english')!.category,'reading-types/inference');
    const rendered=renderToStaticMarkup(createElement(Markdown,{body}));
    assert.match(rendered,/class="katex"/);
    const unsafe=renderToStaticMarkup(createElement(Markdown,{body:'<script>alert(1)</script>\n\n[x](javascript:alert(1))'}));
    assert.doesNotMatch(unsafe,/<script|href="javascript:/);
  }finally{await rm(temp,{recursive:true,force:true});}
});
