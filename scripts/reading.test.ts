import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadEntries} from '../src/content';
import {matchesCategory,tagsOf} from '../src/model';
import {Collection} from '../src/components';
import Markdown from '../src/Markdown';

const root=new URL('../content/',import.meta.url);
const sourcePath='english/reading-types/seven-reading-types.md';
const topics=['细节题','主旨题','推理题','词义句意题','作者态度题','例证题','篇章结构题'];

test('Markdown headings provide unique Chinese and formatted fragment targets per document',()=>{
  const body='[导航](#细节题)\n\n## 细节题\n\n## **细节题**\n\n## 细节题-1\n\n## A [linked](https://example.com) `word`\n\n## !!!';
  const render=()=>renderToStaticMarkup(createElement(Markdown,{body}));
  const html=render();
  const ids=[...html.matchAll(/<h\d id="([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(ids,['细节题','细节题-1','细节题-1-1','a-linked-word','section']);
  assert.match(html,/href="#(?:细节题|%E7%BB%86%E8%8A%82%E9%A2%98)"/);
  assert.equal(render(),html,'IDs must reset for each document render');
  assert.doesNotMatch(renderToStaticMarkup(createElement(Markdown,{body:'<h2 id="unsafe">raw</h2>\n\n<script>alert(1)</script>'})),/id="unsafe"|<script/);
});

test('reading guide loads in its parent category and every internal link resolves',async()=>{
  const {fileURLToPath}=await import('node:url');
  const entry=(await loadEntries(fileURLToPath(root))).find(e=>e.sourcePath===sourcePath)!;
  assert.ok(entry);
  assert.equal(entry.section,'english');
  assert.equal(entry.category,'reading-types');
  assert.equal(entry.subject,'考研英语一阅读理解');
  assert.ok(matchesCategory(entry.category,'reading-types'));
  assert.ok(topics.every(topic=>tagsOf(entry).includes(topic)));
  const html=renderToStaticMarkup(createElement(Markdown,{body:entry.body}));
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  const targets=[...html.matchAll(/href="#([^"]+)"/g)].map(m=>decodeURIComponent(m[1]));
  assert.ok(targets.length>=topics.length);
  for(const target of targets)assert.ok(ids.includes(target),`Missing target: ${target}`);
  for(const topic of topics){
    assert.ok(targets.includes(topic),`Missing navigation: ${topic}`);
    assert.match(html,new RegExp(`<h2 id="${topic}">${topic}</h2>`));
  }
  // These terms occur in the body, rather than only the title/tags.
  for(const section of ['english',undefined] as const){
    const collection=renderToStaticMarkup(createElement(Collection,{items:[entry],section}));
    const search=collection.match(/data-search="([^"]+)"/)?.[1]||'';
    for(const query of ['过度推断','qualified success','张冠李戴','必要条件'])assert.ok(search.includes(query));
    assert.match(collection,/data-category="reading-types"/);
  }
});
