import React from 'react';
import type {PublicEntry} from './content';
import {entryUrl,tagsOf} from './model';

export function examYear(entry:PublicEntry):number|null {
  // Use the exam's identity, never its upload or update date.
  for(const value of [entry.title,entry.file_name||'',tagsOf(entry).join(' ')]){
    const years=[...new Set([...value.matchAll(/(?<!\d)(?:19|20)\d{2}(?!\d)/g)].map(match=>Number(match[0])))];
    if(years.length===1)return years[0];
    if(years.length>1)return null;
  }
  return null;
}

export function ExamDirectory({items}:{items:PublicEntry[]}) {
  const exams=items.filter(entry=>entry.section==='english'&&entry.category==='exams')
    .map(entry=>({entry,year:examYear(entry)}))
    .sort((a,b)=>(b.year??0)-(a.year??0)||a.entry.title.localeCompare(b.entry.title,'zh-CN')||a.entry.id.localeCompare(b.entry.id));
  return <section className="exam-directory" data-exam-directory="" aria-labelledby="exam-years-heading" hidden>
    <h2 id="exam-years-heading">按年份查看真题</h2>
    <div className="exam-years">{exams.map(({entry,year})=>{
      const attachment=entry.attachmentUrl||(entry.attachmentPath?'/files/'+entry.attachmentPath.split('/').map(encodeURIComponent).join('/'):null);
      const pdf=!!attachment&&!entry.attachmentUrl&&/\.pdf$/i.test(entry.file_name||'');
      const download=!!attachment&&!pdf;
      const action=download?'下载试题':pdf?'阅读 PDF':'阅读试题';
      return <div className="exam-year" data-exam-id={entry.id} key={entry.id}>
        <h3><a className="exam-year-link" href={attachment||entryUrl(entry)+'/'} download={download?(entry.file_name||true):undefined} aria-label={`${year?year+' 年 · ':''}${entry.title} · ${action}`}>
          <span>{year?`${year} 年`:entry.title}</span><span className="exam-action">{action}</span>
</a></h3>
        <p>{year?entry.title:'年份未标注'}</p>
        {attachment&&<a className="exam-download" href={attachment} download={entry.file_name||true} aria-label={`下载附件 · ${entry.title}`}>下载附件</a>}
      </div>;
    })}</div>
  </section>;
}
