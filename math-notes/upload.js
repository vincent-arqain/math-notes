import {fetchReleaseInventory,formatBytes,validateUpload,validateCapacity,TOTAL_STORAGE_BYTES,MAX_FILE_BYTES,WARNING_STORAGE_BYTES} from './storage-policy.js';

const manager=document.querySelector('[data-upload-manager]');
if(manager) {
  const byId=id=>document.getElementById(id);
  const form=byId('upload-form'),fileInput=byId('upload-file'),section=byId('upload-section'),category=byId('upload-category');
  const title=byId('upload-title-input'),description=byId('upload-description'),ready=byId('upload-ready'),error=byId('upload-error');
  const prepare=byId('prepare-upload'),refresh=byId('refresh-storage'),status=byId('storage-status');
  const repository=manager.dataset.repository;
  let refreshing=null,generatedTitle='',busy=false;
  function invalidate(){ready.hidden=true;byId('release-upload-link').removeAttribute('href');}
  function showError(message){error.textContent=message;error.hidden=!message;}
  function categoryVisibility(){byId('upload-category-field').hidden=section.value!=='english';}
  function renderUsage(used){
    byId('storage-used').textContent=formatBytes(used);
    byId('storage-meter').value=Math.min(used,TOTAL_STORAGE_BYTES);
    byId('storage-summary').textContent=`剩余 ${formatBytes(Math.max(0,TOTAL_STORAGE_BYTES-used))} · 单文件上限 500 MB${used>=WARNING_STORAGE_BYTES?' · 空间已使用超过 80%':''}`;
  }
  async function capacity() {
    if(refreshing)return refreshing;
    refreshing=(async()=>{
      refresh.disabled=true;status.textContent='正在核对 GitHub 附件容量…';
      try {
        const response=await fetch(new URL('../storage.json',location.href),{cache:'no-store',signal:AbortSignal.timeout(30_000)});
        if(!response.ok)throw new Error('无法读取容量快照，请稍后重试');
        const snapshot=await response.json();
        if(snapshot.totalBytes!==TOTAL_STORAGE_BYTES||snapshot.maxFileBytes!==MAX_FILE_BYTES)throw new Error('容量规则已更新，请刷新页面');
        for(const value of [snapshot.sourceBytes,snapshot.draftBytes])if(!Number.isSafeInteger(value)||value<0)throw new Error('容量快照无效');
        const inventory=await fetchReleaseInventory(repository);
        const used=snapshot.sourceBytes+snapshot.draftBytes+inventory.usedBytes;
        // Public APIs cannot see drafts. Reserve the last authenticated build's draft bytes conservatively.
        renderUsage(used);validateCapacity(used);
        status.textContent=`公开附件已核对（${new Date().toLocaleTimeString('zh-CN')}）。仓库资料与草稿使用最近发布快照，发布时会完整复核。`;
        return used;
      } catch(e) {status.textContent=e.message;throw e;}
      finally {refresh.disabled=false;refreshing=null;}
    })();
    return refreshing;
  }
  refresh.addEventListener('click',async()=>{invalidate();try{await capacity();showError('');}catch(e){showError(e.message);}});
  form.addEventListener('input',()=>{invalidate();showError('');});
  section.addEventListener('change',categoryVisibility);
  fileInput.addEventListener('change',()=>{
    const file=fileInput.files[0];
    if(!file){byId('selected-file').textContent='文件保持原样；这一步只检查大小，不会上传。';return;}
    if(!title.value||title.value===generatedTitle){generatedTitle=file.name.replace(/\.[^.]+$/,'').slice(0,200);title.value=generatedTitle;}
    byId('selected-file').textContent=`${file.name} · ${formatBytes(file.size)}`;
    try{validateUpload(file,0);}catch(e){showError(e.message);}
  });
  for(const link of manager.querySelectorAll('[data-select-section]'))link.addEventListener('click',()=>{
    if(busy)return;
    section.value=link.dataset.selectSection;category.value=link.dataset.selectCategory||'';categoryVisibility();invalidate();showError('');
  });
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;invalidate();showError('');
    const file=fileInput.files[0];if(!file){showError('请先选择一份资料');return;}
    try{validateUpload(file,0);}catch(e){showError(e.message);return;}
    if(!title.value.trim()){showError('请填写资料标题');title.focus();return;}
    busy=true;const controls=[...form.elements];for(const control of controls)control.disabled=true;
    prepare.textContent='正在检查容量…';
    try {
      const used=await capacity();validateUpload(file,used);
      const metadata=['---','library: true',`section: ${JSON.stringify(section.value)}`,`category: ${JSON.stringify(section.value==='english'?category.value:'')}`,`title: ${JSON.stringify(title.value.trim())}`,`description: ${JSON.stringify(description.value.trim())}`,'subject: ""','tags: []','---','',''];
      const body=metadata.join('\n');
      const tag=`library-${new Date().toISOString().replace(/[-:.]/g,'')}-${crypto.randomUUID().slice(0,8)}`;
      const url=new URL(`https://github.com/${repository}/releases/new`);
      url.search=new URLSearchParams({tag,target:'main',title:title.value.trim(),body}).toString();
      byId('release-body').value=body;byId('release-upload-link').href=url.href;ready.hidden=false;
      ready.scrollIntoView({behavior:'smooth',block:'nearest'});
    }catch(e){showError(e.message);}
    finally{busy=false;for(const control of controls)control.disabled=false;prepare.textContent='检查容量并准备上传 →';}
  });
  byId('copy-release-body').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(byId('release-body').value);byId('copy-release-body').textContent='资料说明已复制';}
    catch{const area=byId('release-body');area.closest('details').open=true;area.focus();area.select();showError('请复制已选中的资料说明。');}
  });
  categoryVisibility();
}
