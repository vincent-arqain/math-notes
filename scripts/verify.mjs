import fs from 'node:fs/promises';
import path from 'node:path';
import config from '../site.config.json' with {type:'json'};
const root=path.resolve('dist');
const base=new URL(config.siteUrl);
let pages=0,links=0;
const fragmentTargets=new Map();
async function verifyReference(ref,from){
  if(!ref || /^mailto:/.test(ref))return;
  const url=new URL(ref,new URL(from,base));
  if(url.origin!==base.origin)return;
  if(!url.pathname.startsWith(base.pathname))throw new Error(`资源未使用仓库路径：${ref}`);
  let target=path.join(root,decodeURIComponent(url.pathname.slice(base.pathname.length)));
  let info=await fs.stat(target).catch(()=>null);
  if(info?.isDirectory()){target=path.join(target,'index.html');info=await fs.stat(target).catch(()=>null);}
  if(!info?.isFile())throw new Error(`链接目标不存在：${from} → ${ref}`);
  if(url.hash && target.endsWith('.html')){
    if(!fragmentTargets.has(target)){
      const html=await fs.readFile(target,'utf8');
      fragmentTargets.set(target,new Set([...html.matchAll(/\sid="([^"<>]+)"/g)].map(match=>match[1])));
    }
    const id=decodeURIComponent(url.hash.slice(1));
    if(!fragmentTargets.get(target).has(id))throw new Error(`页内锚点不存在：${from} → ${ref}`);
  }
  links++;
}
async function walk(dir){
  for(const item of await fs.readdir(dir,{withFileTypes:true})){
    const file=path.join(dir,item.name);
    if(item.isDirectory()){await walk(file);continue;}
    const relative=path.relative(root,file).split(path.sep).join('/');
    if(item.name.endsWith('.html')){
      pages++;
      const html=await fs.readFile(file,'utf8');
      if(/chatgpt\.site|cloudflare:workers|OWNER_EMAIL|\/api\/entries|\/api\/files/.test(html))throw new Error(`旧平台依赖：${relative}`);
      if(/<(?:script|link)[^>]+(?:src|href)="https?:\/\//.test(html.replace(/<link rel="canonical"[^>]+>/g,'')))throw new Error('存在外部运行时依赖');
      for(const match of html.matchAll(/(?:href|src|action)="([^"<>]+)"/g))await verifyReference(match[1].replaceAll('&amp;','&'),relative);
    }
    if(item.name.endsWith('.css')){
      for(const match of (await fs.readFile(file,'utf8')).matchAll(/url\(['"]?([^'"()]+)['"]?\)/g))await verifyReference(match[1],relative);
    }
  }
}
await walk(root);
for(const p of ['search','manage'])if(!(await fs.readFile(path.join(root,p,'index.html'),'utf8')).includes('noindex,follow'))throw new Error(`缺少 noindex：${p}`);
console.log(`Verified ${pages} HTML pages and ${links} local links/assets. No old-host or external runtime dependencies.`);
