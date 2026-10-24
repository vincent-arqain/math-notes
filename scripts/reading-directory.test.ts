import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries} from '../src/content';
import {readingGroups,readingKinds,readingSource,readingYearUrl,ReadingDirectory,ReadingYearPage,ReadingIndexPage} from '../src/ReadingDirectory';
import {Article} from '../src/components';
import {entryUrl} from '../src/model';

const items=await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
const manifest=JSON.parse(await readFile(new URL('../docs/reviews/reading-1998-2007.json',import.meta.url),'utf8'));
const groups=readingGroups(items);

test('all ten years expose the original, translation and vocabulary PDFs with unchanged bytes',async()=>{
  assert.deepEqual(groups.map(group=>group.year),[2007,2006,2005,2004,2003,2002,2001,2000,1999,1998]);
  assert.equal(manifest.files.length,30);
  const reached=new Set<string>();
  for(const group of groups){
    assert.deepEqual(group.resources.map(resource=>resource.kind),[...readingKinds]);
    const html=renderToStaticMarkup(createElement(ReadingYearPage,{items,year:group.year}));
    for(const {entry,kind} of group.resources){
      const source=manifest.files.find((file:any)=>file.year===group.year&&file.kind===kind);
      assert.ok(source);assert.equal(entry.attachmentPath,source.path);
      const data=await readFile(new URL('../content/'+source.path,import.meta.url));
      assert.equal(data.length,source.bytes);
      assert.equal(createHash('sha256').update(data).digest('hex'),source.sha256);
      assert.equal(data.subarray(0,5).toString(),'%PDF-');
      const url='/files/'+source.path.split('/').map(encodeURIComponent).join('/');
      assert.ok(html.includes(`href="${url}"`));
      assert.ok(html.includes(`download="${entry.file_name}"`));
      assert.ok(html.includes(`href="${entryUrl(entry)}/"`));
      for(const [text,page] of Object.entries(source.textPages)){
        assert.ok(entry.body.includes(`Text ${text} · 第 ${page} 页`));
        assert.ok(entry.body.includes(`#page=${page}`));
      }
      assert.ok(renderToStaticMarkup(createElement(Article,{entry})).includes(`href="${readingYearUrl(group.year)}"`));
      reached.add(entry.id);
    }
  }
  assert.equal(reached.size,30);
});

test('static directory reaches every year; ambiguous or unrelated material is never silently classified',()=>{
  const html=renderToStaticMarkup(createElement(ReadingIndexPage,{items}));
  assert.ok(!html.includes(' hidden=""'));
  for(const group of groups)assert.ok(html.includes(`href="${readingYearUrl(group.year)}"`));
  const sample=groups[0].resources[0].entry;
  assert.equal(readingSource({...sample,category:'exams'}),null);
  assert.equal(readingSource({...sample,tags:'["2007年","2006年","阅读原文"]'}),null);
  assert.equal(readingSource({...sample,tags:'["2007年","阅读原文","阅读直译"]'}),null);
  const unknown={...sample,id:'unknown-reading',tags:'[]'};
  assert.equal(readingSource(unknown),null);
  assert.ok(renderToStaticMarkup(createElement(ReadingDirectory,{items:[unknown,...items]})).includes(`href="${entryUrl(unknown)}/"`));
  assert.deepEqual(readingGroups([...items].reverse()),groups);
});
