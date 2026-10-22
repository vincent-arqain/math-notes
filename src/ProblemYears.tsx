import React from 'react';
import type {PublicEntry} from './content';
import {entryUrl} from './model';
import {problemLinks} from './problemLinks';

export const problemIds=(entry:PublicEntry):string[]=>entry.section==='problems'?[...new Set([...(entry.problemIds||[]),...problemLinks(entry.body)])]:[];
export const problemYears=(entry:PublicEntry):number[]=>[...new Set(problemIds(entry).map(id=>Number(id.slice(0,4))))].sort((a,b)=>a-b);
export const availableProblemYears=(items:PublicEntry[]):number[]=>[...new Set(items.flatMap(problemYears))].sort((a,b)=>b-a);
export const yearRoute=(year:number)=>`/problems/years/${year}/`;
const pdfUrl=(entry:PublicEntry)=>entry.attachmentPath?'/files/'+entry.attachmentPath.split('/').map(encodeURIComponent).join('/'):entry.attachmentUrl;
export const yearPDFs=(items:PublicEntry[],year:number)=>items.filter(entry=>/\.pdf$/i.test(entry.file_name||'')&&problemYears(entry).includes(year)).sort((a,b)=>{
  const first=(entry:PublicEntry)=>problemIds(entry).filter(id=>Number(id.slice(0,4))===year).map(id=>id[4]==='S'?'0'+id:'1'+id).sort()[0]||'';
  return first(a).localeCompare(first(b))||a.id.localeCompare(b.id);
});

export function ProblemYears({items,current}:{items:PublicEntry[];current?:number}){
  const years=availableProblemYears(items);
  if(!years.length)return null;
  if(current)return <nav className="problem-year-switcher" aria-label="切换解答年份">{years.map(year=><a key={year} href={yearRoute(year)} aria-current={year===current?'page':undefined}>{year} 年</a>)}</nav>;
  return <section className="problem-years" id="problem-years" aria-labelledby="problem-years-heading"><h2 id="problem-years-heading">按年份阅读 PDF</h2>
    <p className="exam-hint">选择题目年份，再选择对应解答。跨年合辑在所含年份下均可阅读和下载。</p>
    <nav className="problem-year-grid" aria-label="高等代数解答年份">{years.map(year=><a href={yearRoute(year)} key={year} aria-current={year===current?'page':undefined}><span>{year} 年</span><span>{yearPDFs(items,year).length} 份 PDF <span aria-hidden="true">→</span></span></a>)}</nav>
  </section>;
}

export function ProblemYearPage({items,year}:{items:PublicEntry[];year:number}){
  const entries=yearPDFs(items,year);
  return <section className="collection-page wrap" data-problem-year={year}>
    <header className="page-heading"><div className="breadcrumb"><a href="/">首页</a><span>/</span><a href="/problems/">题库与作答</a><span>/</span><span>{year} 年</span></div><h1>{year} 年 · 高等代数解答</h1><p>{entries.length} 份 PDF · 选择合辑后阅读或下载</p></header>
    <ProblemYears items={items} current={year}/>
    <div className="year-pdf-list">{entries.map(entry=>{
      const url=pdfUrl(entry);const years=problemYears(entry);
      return <article className="year-pdf-card" key={entry.id} data-pdf-id={entry.id}>
        <h2><a href={entryUrl(entry)+'/'}>{entry.title}</a></h2>
        <p className="year-problem-ids">{problemIds(entry).join('、')}</p>
        {years.length>1&&<p className="cross-year-note">跨年合辑：{years.map((value,index)=><React.Fragment key={value}>{index>0?'、':''}<a href={yearRoute(value)}>{value} 年</a></React.Fragment>)}</p>}
        <div className="actions">{url&&<><a className="button" href={url} target="_blank" rel="noopener">阅读 PDF ↗</a><a className="exam-download" href={url} download={entry.file_name||true}>下载附件 ↓</a></>}<a className="text-link" href={entryUrl(entry)+'/'}>查看题号与说明 →</a></div>
      </article>;
    })}</div><p className="year-return"><a href="/problems/">返回全部题目与解答 →</a></p>
  </section>;
}
