import React from 'react';
import type {PublicEntry} from './content';
import {entryUrl,tagsOf,formatSize} from './model';

export const readingKinds=['阅读原文','阅读直译','阅读单词'] as const;
export const readingIndexUrl='/english/translation/';
export const readingYearUrl=(year:number)=>`${readingIndexUrl}years/${year}/`;

// Source identity comes from exact tags, never upload dates or related links.
export function readingSource(entry:PublicEntry) {
  if(entry.section!=='english'||entry.category!=='translation')return null;
  const tags=tagsOf(entry);
  const years=[...new Set(tags.filter(tag=>/^(?:19|20)\d{2}年$/.test(tag)).map(tag=>Number(tag.slice(0,4))))];
  const kinds=readingKinds.filter(kind=>tags.includes(kind));
  return years.length===1&&kinds.length===1?{year:years[0],kind:kinds[0]}:null;
}

export function readingGroups(items:readonly PublicEntry[]) {
  const sources=items.flatMap(entry=>{const source=readingSource(entry);return source?[{entry,...source}]:[];});
  return [...new Set(sources.map(source=>source.year))].sort((a,b)=>b-a).map(year=>({
    year,resources:sources.filter(source=>source.year===year).sort((a,b)=>readingKinds.indexOf(a.kind)-readingKinds.indexOf(b.kind)||a.entry.id.localeCompare(b.entry.id)),
  }));
}

export function ReadingDirectory({items,standalone=false}:{items:PublicEntry[];standalone?:boolean}) {
  const groups=readingGroups(items);
  const other=items.filter(entry=>entry.section==='english'&&entry.category==='translation'&&!readingSource(entry));
  return <section className="sentence-directory" data-reading-directory="" aria-labelledby="reading-years-heading" hidden={!standalone}>
    <header className="sentence-directory-heading"><h2 id="reading-years-heading">按年份阅读与直译</h2><span className="muted">{groups.length} 个年份 · {groups.reduce((sum,group)=>sum+group.resources.length,0)} 份资料</span></header>
    <nav className="sentence-year-grid" aria-label="阅读与直译年份">{groups.map(group=><a key={group.year} href={readingYearUrl(group.year)}><strong>{group.year}<small> 年</small></strong><span>{[...new Set(group.resources.map(resource=>resource.kind.replace('阅读','')))].join(' · ')}</span></a>)}</nav>
    {!groups.length&&!other.length&&<p>暂无阅读与直译资料。</p>}
    {other.length>0&&<div className="sentence-other"><h3>其他文章与直译资料</h3>{other.map(entry=><a key={entry.id} href={entryUrl(entry)+'/'}>{entry.title}</a>)}</div>}
  </section>;
}

export function ReadingIndexPage({items}:{items:PublicEntry[]}) {
  return <section className="wrap collection-page"><header className="page-heading"><div className="breadcrumb"><a href="/">首页</a><span>/</span><a href="/english/">英语</a><span>/</span><span>文章与直译</span></div><h1>阅读与直译</h1><p>选择年份，阅读原文、逐段直译和单词资料。</p></header><ReadingDirectory items={items} standalone/></section>;
}

export function ReadingYearPage({items,year}:{items:PublicEntry[];year:number}) {
  const groups=readingGroups(items);
  const group=groups.find(group=>group.year===year);
  if(!group)throw new Error(`没有 ${year} 年阅读资料`);
  return <section className="wrap collection-page">
    <header className="page-heading"><div className="breadcrumb"><a href="/">首页</a><span>/</span><a href="/english/">英语</a><span>/</span><a href={readingIndexUrl}>阅读与直译</a><span>/</span><span>{year} 年</span></div><h1>{year} 年 · 阅读与直译</h1><p>阅读原文，核对逐段直译，再复习文章中的词汇。</p></header>
    <nav className="problem-year-switcher" aria-label="切换阅读年份">{groups.map(group=><a key={group.year} href={readingYearUrl(group.year)} aria-current={group.year===year?'page':undefined}>{group.year} 年</a>)}</nav>
    <div className="reading-resource-grid">{group.resources.map(({entry,kind})=>{
      const attachment=entry.attachmentUrl||(entry.attachmentPath?'/files/'+entry.attachmentPath.split('/').map(encodeURIComponent).join('/'):null);
      return <article className="reading-resource-card" key={entry.id}>
        <h2>{kind}</h2><p>{entry.description}</p>
        {attachment&&<p className="reading-file-meta">PDF · {formatSize(entry.file_size||0)}</p>}
        <div className="actions"><a className="button" href={attachment||entryUrl(entry)+'/'}>{attachment?'阅读 PDF':'查看资料'}</a>{attachment&&<a className="text-link" href={attachment} download={entry.file_name||true} aria-label={`下载 ${year} 年${kind}`}>下载附件</a>}</div>
        <a className="reading-detail-link" href={entryUrl(entry)+'/'}>文章目录与页码</a>
      </article>;
    })}</div>
    <p className="year-return"><a href={readingIndexUrl}>返回全部年份</a></p>
  </section>;
}
