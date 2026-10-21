import type {PublicEntry} from './content';
import {compareRecentEntries} from './model';

export function selectHomeEntries(items:readonly PublicEntry[]) {
  const sorted=[...items].sort(compareRecentEntries);
  const englishCategories=new Set<string>();
  // One recent entry per top-level English category keeps a batch publication
  // from crowding out reading, vocabulary and other learning materials.
  const english=sorted.filter(entry=>{
    if(entry.section!=='english')return false;
    const category=entry.category.split('/')[0];
    if(englishCategories.has(category))return false;
    englishCategories.add(category);
    return true;
  }).slice(0,3);
  return {
    notes:sorted.filter(entry=>entry.section==='notes').slice(0,2),
    problems:sorted.filter(entry=>entry.section==='problems').slice(0,2),
    english,
    recent:sorted.slice(0,6),
  };
}
