const collection = document.querySelector('[data-collection]');
if (collection) {
  const form = collection.querySelector('form');
  const query = document.getElementById('query');
  const categoryInput = document.getElementById('category');
  const entries = [...collection.querySelectorAll('[data-entry]')];
  const filters = [...collection.querySelectorAll('[data-filter]')];
  const count = document.getElementById('result-count');
  const empty = document.getElementById('no-results');
  const examDirectory = collection.querySelector('[data-exam-directory]');
  const examCards = [...collection.querySelectorAll('[data-exam-id]')];
  const entryList = collection.querySelector('.entry-list');
  const sentenceDirectory = collection.querySelector('[data-sentence-directory]');
  const sentencePatterns = collection.querySelector('[data-sentence-patterns]');
  function update() {
    const params = new URLSearchParams(location.search);
    query.value = (params.get('q') || '').slice(0, 200);
    const category = params.get('category') || '';
    categoryInput.value = category;
    const words = query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    const visibleIds = new Set();
    for (const entry of entries) {
      const values = [entry.dataset.category, ...JSON.parse(entry.dataset.readingTopics || '[]')];
      const matches = !category || (category === 'uncategorized' ? !entry.dataset.category : values.some(value => value === category || value.startsWith(category + '/')));
      entry.hidden = !(matches && words.every(word => entry.dataset.search.includes(word)));
      if (!entry.hidden) {
        visible++;
        visibleIds.add(entry.dataset.entryId);
      }
    }
    if (examDirectory) {
      const showYears = category === 'exams';
      examDirectory.hidden = !showYears;
      for (const card of examCards) card.hidden = !visibleIds.has(card.dataset.examId);
    }
    const showSentences = category === 'sentences' && words.length === 0;
    if (sentenceDirectory) sentenceDirectory.hidden = !showSentences;
    if (entryList) entryList.hidden = (Boolean(examDirectory) && category === 'exams') || (Boolean(sentenceDirectory) && showSentences);
    const showPatterns = category === 'sentence-patterns' || category.startsWith('sentence-patterns/');
    if (sentencePatterns) sentencePatterns.hidden = !showPatterns;
    for (const link of filters) {
      if (link.dataset.filter === category || (link.dataset.filter === 'sentence-patterns' && showPatterns)) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
      const url = new URL(link.href);
      if (query.value) url.searchParams.set('q', query.value);
      else url.searchParams.delete('q');
      link.href = url.href;
    }
    count.textContent = `${visible} 份公开资料${query.value ? ' · 搜索：' + query.value : ''}`;
    empty.hidden = !entries.length || visible !== 0;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    const params = new URLSearchParams(new FormData(form));
    for (const [key,value] of [...params]) if (!value) params.delete(key);
    history.pushState(null, '', location.pathname + (params.size ? '?' + params : ''));
    update();
  });
  for (const link of filters) link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    history.pushState(null, '', link.href);
    update();
  });
  addEventListener('popstate', update);
  update();
}

// Web-font swaps can move a chapter after the browser's initial fragment jump.
// Realign once when fonts settle, unless the reader has already interacted.
const article = document.querySelector('.article-shell');
const initialFragment = location.hash;
if (article && initialFragment && document.fonts) {
  let interrupted = false;
  const cancel = () => { interrupted = true; };
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'];
  for (const event of events) addEventListener(event, cancel, {once: true, passive: true});
  const align = () => {
    for (const event of events) removeEventListener(event, cancel);
    if (interrupted || location.hash !== initialFragment) return;
    let id;
    try { id = decodeURIComponent(initialFragment.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (target && article.contains(target)) target.scrollIntoView({behavior: 'instant', block: 'start'});
  };
  const settle = () => document.fonts.ready.then(() => requestAnimationFrame(align));
  if (document.readyState === 'complete') settle();
  else addEventListener('load', settle, {once: true});
}
