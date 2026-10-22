import React from 'react';
import type {PublicEntry} from './content';
import {englishStudyCategories,entryUrl,mathSections,sections} from './model';
import {selectHomeEntries} from './home';
import {problemLinks} from './problemLinks';

export function MathNavigation({section}:{section?:string}) {
  return <nav className="section-tabs" aria-label="数学栏目">
    <a href="/math/" aria-current={section?undefined:'page'}>数学总览</a>
    {mathSections.map(key=><a key={key} href={`/${key}/`} aria-current={section===key?'page':undefined}>{key==='problems'?'题库':sections[key]}</a>)}
  </nav>;
}

export function StudyDirectory({items}:{items:PublicEntry[]}) {
  const selected=selectHomeEntries(items);
  return <section className="study-directory wrap" aria-labelledby="directory-heading">
    <header className="directory-heading"><h1 id="directory-heading">学习目录</h1><a href="/search/">查找资料 <span aria-hidden="true">↗</span></a></header>
    <div className="study-grid">
      <section className="study-room" aria-labelledby="math-heading">
        <div className="room-heading"><span className="room-number" aria-hidden="true">01</span><h2 id="math-heading"><a href="/math/">数学</a></h2></div>
        <nav className="directory-links" aria-label="数学入口">{mathSections.map(key=><a key={key} href={`/${key}/`}><span>{key==='problems'?'题库':sections[key]}</span><span aria-hidden="true">↗</span></a>)}</nav>
        <a className="room-more" href="/math/">数学总览 <span aria-hidden="true">→</span></a>
      </section>
      <section className="study-room" aria-labelledby="problems-heading">
        <div className="room-heading"><span className="room-number" aria-hidden="true">02</span><h2 id="problems-heading"><a href="/problems/">题库与作答</a></h2></div>
        <nav className="directory-links" aria-label="题库入口"><a href="/problems/"><span>全部题目与解答</span><span aria-hidden="true">↗</span></a><a href="/problems/#problem-index"><span>按题号查找</span><span aria-hidden="true">↗</span></a></nav>
        {selected.problems.length>0&&<div className="room-topics"><h3>近期专题</h3>{selected.problems.map(entry=><a key={entry.id} href={entryUrl(entry)+'/'}>{entry.title}</a>)}</div>}
        <a className="room-more" href="/problems/">进入题库 <span aria-hidden="true">→</span></a>
      </section>
      <section className="study-room" aria-labelledby="english-heading">
        <div className="room-heading"><span className="room-number" aria-hidden="true">03</span><h2 id="english-heading"><a href="/english/">英语</a></h2></div>
        <nav className="directory-links english-directory" aria-label="英语入口">{englishStudyCategories.map(c=><a key={c.id} href={'/english/?category='+c.id}><span>{c.label}</span><span aria-hidden="true">↗</span></a>)}</nav>
        <a className="room-more" href="/english/">全部英语资料 <span aria-hidden="true">→</span></a>
      </section>
    </div>
  </section>;
}

export function MathOverview({items}:{items:PublicEntry[]}) {
  return <section className="wrap math-page">
    <header className="page-heading"><div className="breadcrumb"><a href="/">首页</a><span>/</span><span>数学</span></div><h1>数学</h1></header>
    <MathNavigation/>
    <div className="math-grid">{mathSections.map(section=>{
      const entries=items.filter(e=>e.section===section);
      return <section className="math-shelf" key={section} aria-labelledby={'shelf-'+section}>
        <div className="section-heading"><h2 id={'shelf-'+section}><a href={`/${section}/`}>{section==='problems'?'题库':sections[section]}</a></h2><span className="muted">{entries.length} 份</span></div>
        {entries.length?<ul>{entries.slice(0,3).map(e=><li key={e.id}><a href={entryUrl(e)+'/'}>{e.title}<span aria-hidden="true">↗</span></a></li>)}</ul>:<p className="shelf-empty">暂无资料</p>}
        <a className="room-more" href={`/${section}/`}>查看全部 <span aria-hidden="true">→</span></a>
      </section>;
    })}</div>
    <nav className="support-links" aria-label="数学参考资料"><a href="/books/">书架 ↗</a><a href="/links/">参考链接 ↗</a></nav>
  </section>;
}

export function ProblemIndex({items}:{items:PublicEntry[]}) {
  const groups=items.map(entry=>({entry,ids:problemLinks(entry.body)})).filter(group=>group.ids.length);
  return <section className="problem-index" id="problem-index" aria-labelledby="problem-index-heading"><h2 id="problem-index-heading">按题号查找</h2>
    {groups.length?groups.map(({entry,ids})=><div className="problem-group" key={entry.id}><h3><a href={entryUrl(entry)+'/'}>{entry.title}</a></h3><nav aria-label={entry.title+'题号'}>{ids.map(id=><a key={id} href={entryUrl(entry)+'/#'+id.toLowerCase()}>{id}</a>)}</nav></div>):<p className="muted">暂无按题号编排的专题，可在下方浏览全部题目。</p>}
  </section>;
}
