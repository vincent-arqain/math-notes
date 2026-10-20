import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {loadEntries} from '../src/content';
import {Collection} from '../src/components';
import {problemLinks} from '../src/problemLinks';
import Markdown from '../src/Markdown';

const ids = ['2020S14','2020S15','2020S16','2020S17','2020S18','2021A01','2021A02'];
const sourcePath = 'problems/algebra-2020s14-2021a02.md';

test('exercise links ignore fenced examples and do not repeat headings', () => {
  const body = '## 2020S14\n\n```markdown\n## 2020S15\n```\n\n~~~\n## 2020S16\n~~~\n\n## 2020S14\n\n## 2021A02';
  assert.deepEqual(problemLinks(body), ['2020S14','2021A02']);
});

test('seven exercises render with valid search links and one unchanged PDF attachment', async () => {
  const entries = await loadEntries(fileURLToPath(new URL('../content/',import.meta.url)));
  const entry = entries.find(e => e.sourcePath === sourcePath)!;
  assert.ok(entry);
  assert.equal(entry.attachmentPath,'problems/20S14-S18_21A01-A02.pdf');
  assert.equal(entries.filter(e => e.sourcePath === entry.attachmentPath).length,0,'The PDF must not create a second library entry');
  assert.deepEqual(problemLinks(entry.body),ids);
  const pdf = await readFile(new URL('../content/'+entry.attachmentPath,import.meta.url));
  assert.equal(createHash('sha256').update(pdf).digest('hex'),'a2bc2ca5b8508fc222b4ea7482aeeaecafd819938234f4f9a882ca9290924736');
  const article = renderToStaticMarkup(createElement(Markdown,{body:entry.body}));
  assert.doesNotMatch(article,/katex-error/);
  assert.equal([...article.matchAll(/class="katex-display"/g)].length,[...entry.body.matchAll(/^\$\$$/gm)].length/2);
  const targets = new Set([...article.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]));
  for(const [,fragment] of article.matchAll(/href="#([^"]+)"/g)) assert.ok(targets.has(decodeURIComponent(fragment)),fragment);
  for(const section of ['problems',undefined] as const) {
    const html = renderToStaticMarkup(createElement(Collection,{items:[entry],section}));
    for(const id of ids) {
      assert.ok(targets.has(id.toLowerCase()));
      assert.ok(html.includes(`/problems/${entry.id}/#${id.toLowerCase()}`));
    }
  }
  const html = renderToStaticMarkup(createElement(Collection,{items:[entry]}));
  const decode=(s:string)=>s.replaceAll('&quot;','"').replaceAll('&#x27;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
  const search = decode(html.match(/data-search="([^"]+)"/)![1]);
  const script = await readFile(new URL('../public/site.js',import.meta.url),'utf8');
  for(const queryText of [...ids,...ids.map(id=>id.slice(2)), '2020s17', '2021a02', '不存在的题号']) {
    const row={dataset:{category:'',readingTopics:'[]',search},hidden:false};
    const query={value:''},category={value:''},count={textContent:''},empty={hidden:true};
    const form={addEventListener(){}};
    const collection={querySelector:()=>form,querySelectorAll:(s:string)=>s==='[data-entry]'?[row]:[]};
    vm.runInNewContext(script,{
      document:{querySelector:()=>collection,getElementById:(id:string)=>({query,category,'result-count':count,'no-results':empty})[id]},
      location:{search:'?q='+encodeURIComponent(queryText)},URLSearchParams,addEventListener(){},
    });
    assert.equal(row.hidden,queryText==='不存在的题号',queryText);
  }
});
