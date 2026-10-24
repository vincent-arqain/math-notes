import React from 'react';
import type {PublicEntry} from './content';
import {entryUrl} from './model';

// Cohorts belong to a separate namespace from A/S problem years.
export const finalExamEntries=(items:PublicEntry[])=>items.filter(e=>e.section==='problems'&&/^final-exams\/20\d{2}$/.test(e.category)&&/\.pdf$/i.test(e.file_name||'')).sort((a,b)=>b.category.localeCompare(a.category)||a.id.localeCompare(b.id));

export function FinalExamDirectory({items}:{items:PublicEntry[]}){
  const entries=finalExamEntries(items);
  if(!entries.length)return null;
  return <section className="problem-years" id="final-exams" aria-labelledby="final-exams-heading">
    <h2 id="final-exams-heading">期末考试大题解答</h2>
    <p className="exam-hint">按入学年级选择，进入合辑后阅读或下载 PDF。</p>
    <nav className="problem-year-grid" aria-label="期末考试解答年级">{entries.map(entry=><a key={entry.id} href={entryUrl(entry)+'/'}><span>{entry.category.slice(-2)}级</span><span>{entry.title} <span aria-hidden="true">→</span></span></a>)}</nav>
  </section>;
}
