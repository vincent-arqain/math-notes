import React from 'react';
import type {PublicEntry} from './content';
import {sentencePatternCategories,entryUrl} from './model';

export function SentencePatterns({items}:{items:PublicEntry[]}) {
  const guide=items.find(entry=>entry.sourcePath==='english/sentence-patterns/reading-first-guide.md');
  return <section className="sentence-patterns" data-sentence-patterns="" aria-labelledby="sentence-patterns-heading" hidden>
    <h2 id="sentence-patterns-heading">不同句式</h2>
    {guide&&<nav className="pattern-start" aria-label="句式学习入口"><a href={entryUrl(guide)+'/'}>四步拆句与学习顺序</a><a href={entryUrl(guide)+'/#阅读句式速查表'}>12 类阅读句式速查表</a><a href="/english/?category=sentence-patterns&q=形式宾语">搜索形式宾语</a></nav>}
    <nav className="pattern-grid" aria-label="句式分类">{sentencePatternCategories.map(category=><a key={category.id} data-filter={category.id} href={'/english/?category='+category.id}><h3>{category.label}</h3><p>{category.description}</p><span>{items.filter(entry=>entry.section==='english'&&entry.category===category.id).length} 份资料</span></a>)}</nav>
    <a className="text-link pattern-manage" href="/manage/#sentence-patterns">整理句式资料</a>
  </section>;
}
