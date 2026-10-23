import React from 'react';
import type {PublicEntry} from './content';
import {sentencePatternCategories} from './model';

export function SentencePatterns({items}:{items:PublicEntry[]}) {
  return <section className="sentence-patterns" data-sentence-patterns="" aria-labelledby="sentence-patterns-heading" hidden>
    <h2 id="sentence-patterns-heading">不同句式</h2><p>按用途整理句式，积累结构、例句、使用场景与自己的仿写。</p>
    <nav className="pattern-grid" aria-label="句式分类">{sentencePatternCategories.map(category=><a key={category.id} data-filter={category.id} href={'/english/?category='+category.id}><h3>{category.label}</h3><p>{category.description}</p><span>{items.filter(entry=>entry.section==='english'&&entry.category===category.id).length} 份资料 <span aria-hidden="true">→</span></span></a>)}</nav>
    <a className="text-link pattern-manage" href="/manage/#sentence-patterns">整理句式资料 →</a>
  </section>;
}
