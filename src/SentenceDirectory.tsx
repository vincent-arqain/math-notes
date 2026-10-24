import React from 'react';
import type {PublicEntry} from './content';
import {entryUrl,tagsOf} from './model';

// Exact source tags avoid mistaking related-entry links or update dates for
// the sentence's year/Text. Ambiguous or untagged material stays accessible.
export function sentenceSource(entry:PublicEntry):{year:number;text:number}|null {
  if(entry.section!=='english'||entry.category!=='sentences')return null;
  const tags=tagsOf(entry);
  const years=[...new Set(tags.flatMap(tag=>/^(?:19|20)\d{2}年$/.test(tag)?[Number(tag.slice(0,4))]:[]))];
  const texts=[...new Set(tags.flatMap(tag=>/^Text [1-4]$/i.test(tag)?[Number(tag.slice(-1))]:[]))];
  return years.length===1&&texts.length===1?{year:years[0],text:texts[0]}:null;
}

export function sentenceGroups(items:readonly PublicEntry[]) {
  const entries=items.flatMap(entry=>{const source=sentenceSource(entry);return source?[{entry,...source}]:[];})
    .sort((a,b)=>b.year-a.year||a.text-b.text||compareSentences(a.entry,b.entry));
  return [...new Set(entries.map(item=>item.year))].sort((a,b)=>b-a).map(year=>({
    year,entries:entries.filter(item=>item.year===year),
    texts:[1,2,3,4].map(text=>({text,entries:entries.filter(item=>item.year===year&&item.text===text).map(item=>item.entry)
      .sort(compareSentences)})),
  }));
}

const sentenceKind=(entry:PublicEntry)=>tagsOf(entry).includes('经典长难句')?'经典长难句':tagsOf(entry).includes('词熟句难')?'词熟句难':'句子解析';
const compareSentences=(a:PublicEntry,b:PublicEntry)=>['经典长难句','词熟句难','句子解析'].indexOf(sentenceKind(a))-['经典长难句','词熟句难','句子解析'].indexOf(sentenceKind(b))||a.title.localeCompare(b.title,'zh-CN')||a.id.localeCompare(b.id);
export const sentenceYearUrl=(year:number)=>`/english/sentences/years/${year}/`;
export const sentenceTextUrl=(year:number,text:number)=>`${sentenceYearUrl(year)}text-${text}/`;

export function SentenceDirectory({items}:{items:PublicEntry[]}) {
  const groups=sentenceGroups(items);
  const other=items.filter(entry=>entry.section==='english'&&entry.category==='sentences'&&!sentenceSource(entry));
  return <section className="sentence-directory" data-sentence-directory="" aria-labelledby="sentence-years-heading" hidden>
    <header className="sentence-directory-heading"><div><h2 id="sentence-years-heading">按年份读长难句</h2></div><span className="muted">{groups.length} 个年份 · {groups.reduce((sum,group)=>sum+group.entries.length,0)} 条句子</span></header>
    <nav className="sentence-year-grid" aria-label="长难句年份">{groups.map(group=><a key={group.year} href={sentenceYearUrl(group.year)}><strong>{group.year}<small> 年</small></strong><span>{group.texts.filter(text=>text.entries.length).length} 篇阅读 · {group.entries.length} 条句子</span></a>)}</nav>
    {other.length>0&&<div className="sentence-other"><h3>句库总览与其他资料</h3>{other.map(entry=><a key={entry.id} href={entryUrl(entry)+'/'}>{entry.title}</a>)}</div>}
  </section>;
}

export function SentenceYearPage({items,year,text}:{items:PublicEntry[];year:number;text?:number}) {
  const groups=sentenceGroups(items);
  const group=groups.find(group=>group.year===year)!;
  const selected=group.texts.find(item=>item.text===text);
  return <section className="wrap collection-page sentence-page">
    <header className="page-heading"><div className="breadcrumb"><a href="/">首页</a><span>/</span><a href="/english/">英语</a><span>/</span><a href="/english/?category=sentences">长难句</a><span>/</span>{text?<><a href={sentenceYearUrl(year)}>{year} 年</a><span>/</span><span>Text {text}</span></>:<span>{year} 年</span>}</div><h1>{year} 年 · 长难句{text?` · Text ${text}`:''}</h1></header>
    <div className="sentence-browser">
      <aside className="sentence-sidebar"><h2>选择年份</h2><nav aria-label="切换长难句年份">{groups.map(group=><a key={group.year} href={sentenceYearUrl(group.year)} aria-current={group.year===year?'page':undefined}><span>{group.year} 年</span><small>{group.entries.length} 条</small></a>)}</nav></aside>
      <div className="sentence-main"><section aria-labelledby="sentence-text-heading"><h2 id="sentence-text-heading">选择文章</h2><nav className="sentence-text-grid" aria-label={`${year} 年阅读文章`}>{group.texts.map(item=>item.entries.length?<a key={item.text} href={sentenceTextUrl(year,item.text)} aria-current={text===item.text?'page':undefined}><strong>Text {item.text}</strong><span>{item.entries.length} 条句子</span></a>:<span key={item.text} className="sentence-text-empty" aria-disabled="true"><strong>Text {item.text}</strong><span>暂未收录</span></span>)}</nav></section>
        <section className="sentence-results" aria-labelledby="sentence-results-heading"><h2 id="sentence-results-heading">{text?`Text ${text} 的句子`:'选择句子'}</h2>{selected?<ul className="sentence-cards">{selected.entries.map(entry=><li key={entry.id}><span className="sentence-kind">{sentenceKind(entry)}</span><h3><a href={entryUrl(entry)+'/'}>{entry.title}</a></h3><p>{entry.description}</p></li>)}</ul>:<div className="sentence-prompt"><p>请选择一篇文章。</p></div>}</section>
      </div>
    </div>
  </section>;
}
