import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {cp,mkdir,writeFile,readFile,rm,readdir,stat,rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEntries} from '../src/content';
import {sections,compareRecentEntries,type Section} from '../src/model';
import {Layout,Home,Collection,Article,Manage,About} from '../src/components';
import config from '../site.config.json';
import {loadStorage} from '../src/storage';
import {releaseEntries} from '../src/releases';
import {copyLatexMathAssets} from '../src/latexMath';

const root=fileURLToPath(new URL('..',import.meta.url));
const output=path.resolve(root,'dist');
if(output!==path.join(path.resolve(root),'dist'))throw new Error('Invalid output directory');
const {summary:storage,releases}=await loadStorage(path.join(root,'content'),config.repository);
const items=[...await loadEntries(path.join(root,'content')),...releaseEntries(releases,config.repository)].sort(compareRecentEntries);
const site=new URL(config.siteUrl);
if(site.protocol!=='https:'||!site.pathname.endsWith('/'))throw new Error('siteUrl 必须是 HTTPS 且以 / 结尾');
const base=site.pathname.replace(/\/$/,'');
// New HTML must never run an older cached search/filter script after deployment.
const siteScript=`site.${createHash('sha256').update(await readFile(path.join(root,'public/site.js'))).digest('hex').slice(0,16)}.js`;
const stylesheets=new Map<string,string>();
const prefix=(html:string)=>{
  for(const [source,target]of stylesheets)html=html.replace(`href="/${source}"`,`href="/${target}"`);
  return html.replace('src="/site.js"',`src="/${siteScript}"`).replace(/((?:href|src|action)=")\/(?!\/)/g,`$1${base}/`);
};
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
await cp(path.join(root,'public'),output,{recursive:true});
await rename(path.join(output,'site.js'),path.join(output,siteScript));
const fonts=await readFile(path.join(output,'fonts.css'),'utf8');
await writeFile(path.join(output,'fonts.css'),fonts.replaceAll('/fonts/',`${base}/fonts/`));
const css=await readFile(path.join(output,'reading.css'),'utf8');
await writeFile(path.join(output,'reading.css'),css+'\n:root{--sans:var(--serif)}[hidden]{display:none!important}.upload-collections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;margin:32px 0}.upload-collections .margin-note h2{margin-top:0}.upload-collections .actions{margin-top:22px}.upload-categories{display:flex;flex-wrap:wrap;gap:12px 22px}.upload-categories a{font-size:17px;color:var(--accent)}.manage-subtitle{font-size:28px;margin:40px 0 20px}@media(max-width:700px){.upload-collections{grid-template-columns:1fr}}\n');
// New pages must not reuse cached typography or a different renderer's CSS.
// Keep each stylesheet in its directory so relative font URLs still resolve.
for(const file of ['fonts.css','reading.css']){
  const digest=createHash('sha256').update(await readFile(path.join(output,file))).digest('hex').slice(0,16);
  const fingerprinted=file.replace(/\.css$/,`.${digest}.css`);
  await rename(path.join(output,file),path.join(output,fingerprinted));
  stylesheets.set(file,fingerprinted);
}
const urls:string[]=[];
async function page(route:string,title:string,body:React.ReactNode,noindex=false,description?:string){
  const filename=route==='404.html'?route:path.posix.join(route,'index.html');
  const target=path.join(output,filename);
  await mkdir(path.dirname(target),{recursive:true});
  const html='<!doctype html>'+renderToStaticMarkup(<Layout path={route==='404.html'?'/404.html':'/'+route} title={title} noindex={noindex} description={description}>{body}</Layout>);
  await writeFile(target,prefix(html));
  if(!noindex)urls.push(new URL(route,site).href);
}
await page('','一间安静的电子书房',<Home items={items}/>);
for(const [section,title]of Object.entries(sections))await page(section+'/',title,<Collection section={section as Section} items={items.filter(e=>e.section===section)}/>);
await page('search/','搜索书房',<Collection items={items}/>,true);
await page('manage/','管理资料',<Manage items={items} storage={storage}/>,true);
await page('about/','关于这间书房',<About/>);
await page('404.html','没有找到这页',<section className="wrap collection-page"><header className="page-heading"><h1>这页暂时不在书架上。</h1><p>它可能已被移动，或还没有公开。</p><a className="button" href="/">返回书房</a></header></section>,true);
for(const e of items){
  await page(`${e.section}/${e.id}/`,e.title,<Article entry={e}/>,false,e.description||e.title);
  if(e.attachmentPath){
    const target=path.join(output,'files',e.attachmentPath);
    await mkdir(path.dirname(target),{recursive:true});
    await cp(path.join(root,'content',e.attachmentPath),target);
  }
}
copyLatexMathAssets(path.join(output,'math'));
const xml=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
await writeFile(path.join(output,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(url=>`<url><loc>${xml(url)}</loc></url>`).join('\n')+'\n</urlset>\n');
await writeFile(path.join(output,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml',site).href}\n`);
await writeFile(path.join(output,'.nojekyll'),'');
await writeFile(path.join(output,'storage.json'),JSON.stringify(storage,null,2)+'\n');
async function outputBytes(dir:string):Promise<number>{let total=0;for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);total+=item.isDirectory()?await outputBytes(file):(await stat(file)).size;}return total;}
const size=await outputBytes(output);
if(size>900_000_000)throw new Error('网站发布包超过 900 MB 安全阈值，请将 content 内的大附件迁至 Releases 后再发布。');
console.log(`Storage: ${storage.usedBytes} / ${storage.totalBytes} bytes; maximum file: ${storage.maxFileBytes} bytes; site output: ${size} bytes.`);
console.log(`Built ${urls.length+3} pages, ${items.length} published entries → ${config.siteUrl}`);
