// Decimal units: the displayed MB and GB match the limits exactly.
export const MAX_FILE_BYTES = 500_000_000;
export const TOTAL_STORAGE_BYTES = 50_000_000_000;
export const WARNING_STORAGE_BYTES = 40_000_000_000;
export const ALLOWED_EXTENSIONS = ['pdf', 'md', 'txt', 'zip', 'rar', '7z'];

/** @param {number} bytes */
export function formatBytes(bytes) {
  if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('文件大小无效');
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(2)} MB`;
  if (bytes >= 1000) return `${(bytes / 1000).toFixed(1)} KB`;
  return `${bytes} B`;
}

/** @param {number} used @param {number} incoming */
export function validateCapacity(used, incoming = 0) {
  if (![used, incoming].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('容量数据无效，请重新检查');
  if (incoming > MAX_FILE_BYTES) throw new Error('单个文件不能超过 500 MB');
  if (used + incoming > TOTAL_STORAGE_BYTES) throw new Error(`总容量不能超过 50 GB，当前剩余 ${formatBytes(Math.max(0, TOTAL_STORAGE_BYTES - used))}`);
}

/** @param {{name: string, size: number}} file @param {number} used */
export function validateUpload(file, used) {
  if (!ALLOWED_EXTENSIONS.includes(file.name.split('.').pop()?.toLowerCase() || '')) throw new Error('请选择 PDF、Markdown、TXT、ZIP、RAR 或 7Z 文件');
  if (file.size === 0) throw new Error('不能上传空文件');
  validateCapacity(used, file.size);
}

/** Fetch every page; failures must never be mistaken for empty storage.
 * @param {string} repository
 * @param {{token?: string, fetcher?: typeof fetch}} options
 */
export async function fetchReleaseInventory(repository, {token, fetcher = fetch} = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw new Error('仓库名称无效');
  const headers = {Accept: 'application/vnd.github+json', ...(token ? {Authorization: `Bearer ${token}`} : {})};
  /** @param {string} resource */
  async function all(resource) {
    const items = [];
    for (let page = 1; ; page++) {
      const response = await fetcher(`https://api.github.com/repos/${repository}/${resource}?per_page=100&page=${page}`, {headers, cache: 'no-store', signal: AbortSignal.timeout(30_000)});
      if (!response.ok) throw new Error(`无法核对 GitHub 容量（HTTP ${response.status}），请稍后重试`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error('GitHub 容量数据格式不正确');
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  }
  const releases = await all('releases');
  const seen = new Set();
  let usedBytes = 0, draftBytes = 0;
  for (const release of releases) {
    if (!Number.isSafeInteger(release.id) || release.id <= 0) throw new Error('Release 编号无效');
    // The release response includes assets. Reuse small complete arrays so hundreds
    // of ordinary one-file releases don't consume hundreds of anonymous API calls.
    // For large arrays (or absent payloads), explicitly enumerate every asset page.
    if (!Array.isArray(release.assets) || release.assets.length >= 100) release.assets = await all(`releases/${release.id}/assets`);
    for (const asset of release.assets) {
      if (!Number.isSafeInteger(asset.id) || asset.id <= 0 || seen.has(asset.id)) throw new Error('附件编号无效或重复');
      if (!Number.isSafeInteger(asset.size) || asset.size < 0) throw new Error('附件大小无效');
      seen.add(asset.id);
      usedBytes += asset.size;
      if (release.draft) draftBytes += asset.size;
    }
  }
  return {releases, usedBytes, draftBytes, assetCount: seen.size};
}
