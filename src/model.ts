export const sections = { notes: '讲义', problems: '题库', essays: '随笔', books: '书架', papers: '论文', links: '链接', english: '英语' } as const;
export type Section = keyof typeof sections;
export const descriptions: Record<Section, string> = { notes: '把概念写清楚，让证明有迹可循。', problems: '留一道问题，给思考一点时间。', essays: '记录理解发生的瞬间。', books: '沿着书页，走向更远的数学。', papers: '收藏值得细读的论文，留下研究与阅读的线索。', links: '把有价值的网址，连同发现它的理由一起收好。', english: '从真题、词句到阅读与写作，慢慢积累考研英语。' };
export const englishCategories = [
  {id:'exams',label:'考研真题'}, {id:'vocabulary',label:'熟词生义'},
  {id:'sentences',label:'长难句'}, {id:'writing',label:'作文模板'},
  {id:'translation',label:'翻译技巧'}, {id:'reading-logic',label:'阅读逻辑'},
  {id:'reading-types',label:'阅读题型分类'},
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
