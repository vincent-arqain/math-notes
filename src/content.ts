import {readdir,readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import {sections,validCategory,type Entry,type Section} from './model';
import {MAX_FILE_BYTES} from '../public/storage-policy.js';

export type PublicEntry = Entry & {sourcePath:string; attachmentPath:string|null; attachmentUrl?:string; editUrl?:string; readingTopics?:string[]};
const allowed = new Set(['.md','.txt','.pdf','.zip','.rar','.7z']);
export function safeRelative(value:string) {
  if(!value || value.includes('\\') || value.includes('\0') || path.posix.isAbsolute(value) || value.split('/').some(p=>p==='..'||p==='.'||p.startsWith('.')) || /^[a-z]:/i.test(value)) throw new Error(`不安全的资料路径：${value}`);
  return value;
}
export function parseDocument(text:string) {
  const match=text.replace(/^\uFEFF/,'').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if(!match)return {meta:{} as Record<string,unknown>,body:text};
  const meta=parse(match[1],{uniqueKeys:true,maxAliasCount:0});
  if(!meta || typeof meta!=='object' || Array.isArray(meta))throw new Error('文章开头必须是 YAML 字段');
  if(meta.draft===true || (meta.status && meta.status!=='published') || meta.deleted_at)throw new Error('公开仓库不保存草稿或回收站内容，请将它保留在本机。');
  return {meta:meta as Record<string,unknown>,body:match[2]};
}
function date(value:unknown,fallback:string) {
  if(value===undefined)return fallback;
  if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw new Error('日期必须使用 YYYY-MM-DD 或 ISO 格式');
  return new Date(value).toISOString();
}
export async function loadEntries(root:string):Promise<PublicEntry[]> {
  const files:string[]=[];
  async function walk(dir:string,relative='') {
    for(const item of await readdir(dir,{withFileTypes:true})) {
      if(item.name.startsWith('.'))continue;
      const rel=relative?`${relative}/${item.name}`:item.name;
      if(item.isSymbolicLink())throw new Error(`不接受符号链接：${rel}`);
      if(item.isDirectory())await walk(path.join(dir,item.name),rel);
      else if(item.name!=='README.md') {
        if(!allowed.has(path.extname(item.name).toLowerCase()))throw new Error(`不支持的资料文件：${rel}`);
        files.push(safeRelative(rel));
      }
    }
  }
  await walk(root);
  const documents=new Map<string,ReturnType<typeof parseDocument>>();
  const attached=new Set<string>();
  for(const file of files.filter(f=>f.toLowerCase().endsWith('.md'))) {
    const doc=parseDocument(await readFile(path.join(root,file),'utf8'));
    if(doc.meta.attachment) {
      if(typeof doc.meta.attachment!=='string')throw new Error('attachment 必须是相对于 content 的路径');
      const target=safeRelative(doc.meta.attachment);
      if(!files.includes(target)||target===file||target.toLowerCase().endsWith('.md'))throw new Error(`附件不存在或类型错误：${target}`);
      attached.add(target);
    }
    documents.set(file,doc);
  }
  const entries:PublicEntry[]=[];
  for(const sourcePath of files.filter(f=>!attached.has(f))) {
    const [section,...parts]=sourcePath.split('/');
    if(!Object.hasOwn(sections,section))throw new Error(`资料必须放入一个栏目目录：${sourcePath}`);
    const ext=path.extname(sourcePath).toLowerCase();
    const info=await stat(path.join(root,sourcePath));
    const {meta,body}=documents.get(sourcePath)||{meta:{},body:ext==='.txt'?await readFile(path.join(root,sourcePath),'utf8'):''};
    const str=(key:string,fallback='')=>{const value=meta[key];if(value===undefined)return fallback;if(typeof value!=='string')throw new Error(`${sourcePath} 的 ${key} 必须是文字`);return value;};
    const category=str('category',section==='english'?parts.slice(0,-1).join('/'):'');
    if(section==='english'&&!validCategory(category))throw new Error(`未知英语分类：${category}`);
    const readingTopics=meta.reading_topics??[];
    if(!Array.isArray(readingTopics)||readingTopics.some(t=>typeof t!=='string'||!t.startsWith('reading-types/')||!validCategory(t))||new Set(readingTopics).size!==readingTopics.length)throw new Error('reading_topics 必须是不重复的阅读题型子分类数组');
    if(readingTopics.length&&(section!=='english'||category!=='reading-types'))throw new Error('reading_topics 仅用于英语 reading-types 总专题');
    const source_url=str('source_url');
    if(source_url && !/^https?:\/\//i.test(source_url))throw new Error('来源链接必须以 https:// 或 http:// 开头');
    if(source_url)new URL(source_url);
    if(section==='links'&&!source_url)throw new Error(`链接栏目需要 source_url：${sourcePath}`);
    const tags=meta.tags??[];
    if(!Array.isArray(tags)||tags.some(t=>typeof t!=='string'))throw new Error('tags 必须是文字数组');
    const gitDate=spawnSync('git',['log','-1','--format=%cI','--',`content/${sourcePath}`],{cwd:path.dirname(root),encoding:'utf8',windowsHide:true}).stdout?.trim();
    const updated_at=date(meta.updated_at,gitDate||info.mtime.toISOString());
    const attachmentPath=str('attachment')||(!['.md','.txt'].includes(ext)?sourcePath:null);
    const attachmentInfo=attachmentPath?await stat(path.join(root,attachmentPath)):null;
    if(attachmentInfo&&attachmentInfo.size>MAX_FILE_BYTES)throw new Error(`单个文件不能超过 500 MB：${attachmentPath}`);
    entries.push({id:createHash('sha256').update(sourcePath).digest('hex').slice(0,24),owner_id:'',section:section as Section,category,readingTopics,title:str('title',path.basename(sourcePath,path.extname(sourcePath))),description:str('description'),subject:str('subject'),tags:JSON.stringify(tags),body,source_url,status:'published',file_key:attachmentPath,file_name:attachmentPath?path.basename(attachmentPath):null,file_type:null,file_size:attachmentInfo?.size??null,version:1,created_at:date(meta.created_at,updated_at),updated_at,deleted_at:null,sourcePath,attachmentPath});
  }
  return entries.sort((a,b)=>b.updated_at.localeCompare(a.updated_at)||a.sourcePath.localeCompare(b.sourcePath));
}
