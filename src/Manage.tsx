import React from 'react';
import {sections,descriptions,englishCategories,sentencePatternCategories,formatSize,type Section} from './model';
import type {PublicEntry} from './content';
import type {StorageSummary} from './storage';
import config from '../site.config.json';

const repo=`https://github.com/${config.repository}`;
const encoded=(s:string)=>s.split('/').map(encodeURIComponent).join('/');
export default function Manage({items,storage}:{items:PublicEntry[];storage:StorageSummary}) {
  return <section className="wrap manage-page" data-upload-manager="" data-repository={config.repository}>
    <header className="page-heading"><h1>管理资料</h1><p>每个文件最多 500 MB，书房总容量 50 GB。先检查文件，再到 GitHub 完成上传。</p><div className="actions"><a className="button" href={`${repo}/releases`} target="_blank" rel="noopener">管理附件</a><a className="text-link" href={`${repo}/actions/workflows/pages.yml`} target="_blank" rel="noopener">查看发布进度</a></div></header>
    <p className="notice">这里是公开书房。上传的文件、正文与历史版本均可被访问，请只提交准备公开的资料。</p>
    <section className="storage-panel" aria-labelledby="storage-title"><div className="section-heading"><h2 id="storage-title">书房空间</h2><button className="plain-button" type="button" id="refresh-storage">刷新容量</button></div><p className="storage-amount"><strong id="storage-used">{formatSize(storage.usedBytes)}</strong><span> / 50 GB</span></p><meter id="storage-meter" min={0} max={storage.totalBytes} value={storage.usedBytes} low={40_000_000_000} high={45_000_000_000} optimum={0} aria-label="已用空间"/><p className="field-hint" id="storage-summary">剩余 {formatSize(storage.totalBytes-storage.usedBytes)} · 单文件上限 500 MB</p><p className="field-hint" id="storage-status" role="status" aria-live="polite">统计时间：{new Date(storage.checkedAt).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}。准备上传时会重新核对。</p><p className="field-hint">容量包含当前仓库资料和 Releases 附件；保留的附件版本也计入。上传前显示公开附件的实时用量，草稿容量以最近发布检查为准。</p></section>
    <section className="upload-panel" id="upload" aria-labelledby="upload-title"><h2 id="upload-title">上传资料</h2><form id="upload-form"><div className="form-grid">
      <label className="field">资料栏目<select id="upload-section" name="section">{Object.entries(sections).filter(([key])=>key!=='links').map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
      <label className="field" id="upload-category-field" hidden>英语分类<select id="upload-category" name="category"><option value="">待分类</option>{englishCategories.map(c=><option value={c.id} key={c.id}>{c.label}</option>)}</select></label>
      <label className="field full">资料标题<input id="upload-title-input" name="title" maxLength={200} required placeholder="选择文件后自动填写，可修改"/></label>
      <label className="field full">简介（选填）<textarea id="upload-description" name="description" maxLength={1000} rows={2}/></label>
    </div><div className="upload-box"><label htmlFor="upload-file"><strong>选择一份资料</strong><span>PDF、Markdown、TXT、ZIP、RAR、7Z · 每份不超过 500 MB</span></label><input type="file" id="upload-file" accept=".pdf,.md,.txt,.zip,.rar,.7z" required/><small id="selected-file">文件保持原样；这一步只检查大小，不会上传。</small></div><p className="error-message" id="upload-error" role="alert" hidden/><button className="button primary" id="prepare-upload" type="submit">检查容量并准备上传</button></form>
      <div id="upload-ready" hidden><p className="notice">文件检查通过。接下来在 GitHub 登录并完成上传。</p><ol className="upload-steps"><li>点击“前往 GitHub 上传”，确认标题和资料说明已填写。</li><li>将刚才选中的同一个文件放入页面底部的附件框，等待上传完成。</li><li>点击“Publish release”，等待网站发布检查成功，资料会自动进入所选栏目。</li></ol><div className="actions"><a className="button primary" id="release-upload-link" target="_blank" rel="noopener">前往 GitHub 上传</a><button className="button" id="copy-release-body" type="button">复制资料说明</button></div><details><summary>GitHub 没有自动填写资料说明时</summary><p className="field-hint">将下面的说明粘贴到 GitHub 的“Describe this release”中，保留开头的栏目字段。</p><textarea id="release-body" className="release-body" rows={10} readOnly aria-label="资料说明"/></details><p className="field-hint">发布时会再次校验 500 MB / 50 GB 限额。GitHub 原生页面不受书房入口控制；绕过检查上传的超限附件会阻止网站更新，需在 Releases 删除超限附件后重新发布。</p></div>
    </section>
    <h2 className="manage-subtitle">选择栏目</h2><div className="upload-collections">{Object.entries(sections).map(([key,label])=>{
      const template=`---\ntitle: "填写标题"\ndescription: ""\nsubject: ""\ntags: []\n${key==='links'?'source_url: "https://"\n':''}---\n\n在这里写正文。行内公式使用 $...$，独立公式使用 $$...$$。\n`;
      return <section className="margin-note" key={key}><h2>{label}</h2><p>{descriptions[key as Section]}</p><div className="actions">{key!=='links'&&<a className="button" href="#upload" data-select-section={key}>上传文件</a>}<a className="text-link" href={`${repo}/new/main/content/${key}?filename=新资料.md&value=${encodeURIComponent(template)}`} target="_blank" rel="noopener">新建{key==='links'?'链接':'文章'}</a></div></section>;
    })}</div>
    <h2 className="manage-subtitle">英语分类上传</h2><nav className="upload-categories" aria-label="按英语类别上传">{englishCategories.map(c=><a href="#upload" data-select-section="english" data-select-category={c.id} key={c.id}>{c.label}</a>)}</nav>
    <section id="sentence-patterns" className="pattern-editor" aria-labelledby="pattern-editor-heading"><h2 id="pattern-editor-heading" className="manage-subtitle">整理不同句式</h2><p>选择用途，记录句式结构、例句、适用场景与仿写。</p><div className="pattern-grid">{sentencePatternCategories.map(category=>{
      const template=`---\ntitle: "填写句式名称"\ncategory: ${category.id}\ndescription: ""\ntags: []\n---\n\n## 句式结构\n\n## 例句与翻译\n\n## 使用场景与注意事项\n\n## 我的仿写\n`;
      return <a key={category.id} href={`${repo}/new/main/content/english/${category.id}?filename=新句式.md&value=${encodeURIComponent(template)}`} target="_blank" rel="noopener"><h3>{category.label}</h3><p>{category.description}</p><span>新建句式笔记</span></a>;
    })}</div></section>
    <div className="prose"><h2>资料使用说明</h2><p>附件保留原始文件，可直接下载。</p><p>Markdown 和 TXT 上传后可下载原文件；需要显示网页正文时，使用上方“新建文章”。已有资料继续保留原来的阅读与下载地址。</p><p><a href={`${repo}/blob/main/README.md`} target="_blank" rel="noopener">阅读详细使用说明</a></p></div>
    <h2 className="manage-subtitle">编辑已公开资料</h2>{items.length?<div className="room-index">{items.map(e=><a key={e.id} href={e.editUrl||`${repo}/${/\.(md|txt)$/i.test(e.sourcePath)?'edit':'blob'}/main/content/${encoded(e.sourcePath)}`} target="_blank" rel="noopener"><span>{e.title}</span><span>{sections[e.section]}</span></a>)}</div>:<p className="muted">还没有已公开资料，可以从上方选择栏目开始。</p>}
    <noscript><p className="notice">上传前检查需要 JavaScript。请启用 JavaScript 后选择文件。</p></noscript><script type="module" src="/upload.js"/>
  </section>;
}
