const collection = document.querySelector('[data-collection]');
if (collection) {
  const form = collection.querySelector('form');
  const query = document.getElementById('query');
  const categoryInput = document.getElementById('category');
  const entries = [...collection.querySelectorAll('[data-entry]')];
  const filters = [...collection.querySelectorAll('[data-filter]')];
  const count = document.getElementById('result-count');
  const empty = document.getElementById('no-results');
  function update() {
    const params = new URLSearchParams(location.search);
    query.value = (params.get('q') || '').slice(0, 200);
    const category = params.get('category') || '';
    categoryInput.value = category;
    const words = query.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let visible = 0;
    for (const entry of entries) {
      const values = [entry.dataset.category, ...JSON.parse(entry.dataset.readingTopics || '[]')];
      const matches = !category || (category === 'uncategorized' ? !entry.dataset.category : values.some(value => value === category || value.startsWith(category + '/')));
      entry.hidden = !(matches && words.every(word => entry.dataset.search.includes(word)));
      if (!entry.hidden) visible++;
    }
    for (const link of filters) {
      if (link.dataset.filter === category) link.setAttribute('aria-current', 'page');
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
