export const sections = { notes: '讲义', problems: '题库与作答', essays: '文章', books: '书架', papers: '论文', links: '链接', english: '英语' } as const;
export type Section = keyof typeof sections;
export const descriptions: Record<Section, string> = { notes: '概念、定理与推导。', problems: '按专题阅读，按题号查找题目与解答。', essays: '数学文章与学习札记。', books: '参考书与阅读资料。', papers: '论文与研究资料。', links: '常用网站与参考来源。', english: '真题、阅读、写作与词句。' };
export const mathSections = ['notes','problems','papers','essays'] as const;
export const englishStudyCategories = [
  {id:'exams',label:'往年考研真题'}, {id:'reading-answers',label:'真题阅读解答'},
  {id:'writing',label:'作文'}, {id:'translation',label:'文章与直译'},
  {id:'sentences',label:'长难句'}, {id:'core-vocabulary',label:'核心单词'},
  {id:'vocabulary',label:'熟词僻义'}, {id:'reading-types',label:'阅读技巧'},
] as const;
export const englishCategories = [
  ...englishStudyCategories, {id:'reading-logic',label:'阅读逻辑'},
  {id:'reading-types/detail',label:'细节题'}, {id:'reading-types/main-idea',label:'主旨题'},
  {id:'reading-types/inference',label:'推理题'}, {id:'reading-types/meaning',label:'词义句意题'},
  {id:'reading-types/attitude',label:'作者态度题'}, {id:'reading-types/example',label:'例证题'},
  {id:'reading-types/structure',label:'篇章结构题'},
] as const;
export const categoryLabel = (id:string) => englishCategories.find(c=>c.id===id)?.label || '待分类';
export const validCategory = (id:string) => !id || englishCategories.some(c=>c.id===id);
export const matchesCategory = (value:string,filter:string) => !filter || (filter==='uncategorized'?!value:value===filter||value.startsWith(filter+'/'));
export interface Entry {
  id: string; owner_id: string; section: Section; category: string; title: string; description: string;
  subject: string; tags: string; body: string; source_url: string; status: 'draft' | 'published';
  file_key: string | null; file_name: string | null; file_type: string | null; file_size: number | null;
  version: number; created_at: string; updated_at: string; deleted_at: string | null;
}
export const entryUrl = (e: Pick<Entry, 'section' | 'id'>) => `/${e.section}/${e.id}`;
export const compareRecentEntries = (a:Pick<Entry,'updated_at'|'id'>,b:Pick<Entry,'updated_at'|'id'>) => b.updated_at.localeCompare(a.updated_at)||a.id.localeCompare(b.id);
export const tagsOf = (e: Pick<Entry, 'tags'>): string[] => { try { return JSON.parse(e.tags); } catch { return []; } };
export const formatDate = (date: string) => new Intl.DateTimeFormat('zh-CN', {year:'numeric',month:'2-digit',day:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(date));
export {formatBytes as formatSize} from '../public/storage-policy.js';
