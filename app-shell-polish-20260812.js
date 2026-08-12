(function(){
'use strict';

const FLAG='__volleyAppShellPolish20260812';
const CLUB_ID=window.VOLLEY_SUPABASE_CONFIG?.clubId||'b0000000-0000-4000-8000-000000000001';
const BUCKET='club-files';
const BOTTOM_ID='volley-mobile-quick-nav';
let settingsCache={};
let activeBackground={mode:'default',path:null};
let realtimeChannel=null;
let loadBusy=false;
let settingsTransaction=null;
let settingsTransactionBusy=false;

const QUICK_ITEMS=[
  {target:'home-portal',label:'Inicio',icon:'house',view:'view-home-portal'},
  {target:'training',label:'Entrenos',icon:'activity',view:'view-training'},
  {target:'calendar',label:'Calendario',icon:'calendar-days',view:'view-calendar'},
  {target:'wellness',label:'Bienestar',icon:'heart-pulse',view:'view-wellness'}
];

function client(){return window.VolleySupabase?.getClient?.()||null;}
function currentUser(){try{return typeof window.getCurrentUser==='function'?window.getCurrentUser():null;}catch(_){return null;}}
function canManageBackground(){try{return (typeof window.isAdministratorUser==='function'&&window.isAdministratorUser())||(typeof window.isCoachUser==='function'&&window.isCoachUser());}catch(_){return false;}}
function toast(message,type){try{window.showToast?.(message,type);}catch(_){} }

function injectStyles(){
  if(document.getElementById('volley-app-shell-polish-css')) return;
  const style=document.createElement('style');
  style.id='volley-app-shell-polish-css';
  style.textContent=`
    html{background:#f1f5f9;overscroll-behavior-y:none}
    body{position:relative;isolation:isolate;background:none!important;background-image:none!important;background-attachment:scroll!important;min-height:100vh}
    body::before{content:"";position:fixed;z-index:-2;left:0;right:0;top:0;bottom:auto;width:100%;height:100vh;height:100lvh;pointer-events:none;background:
      radial-gradient(circle at 12% -2%,rgba(251,191,36,.20),transparent 34%),
      radial-gradient(circle at 92% 16%,rgba(59,130,246,.10),transparent 30%),
      linear-gradient(155deg,#f8fafc 0%,#f1f5f9 54%,#fff7ed 100%);
      background-size:cover;background-position:center top;background-repeat:no-repeat;transform:none!important;will-change:auto}
    body::after{content:"";position:fixed;z-index:-1;left:0;right:0;top:0;bottom:auto;width:100%;height:100vh;height:100lvh;pointer-events:none;background:linear-gradient(180deg,rgba(255,255,255,.08),rgba(248,250,252,.18));transform:none!important}
    body.volley-shared-bg-photo::before{background-image:linear-gradient(180deg,rgba(248,250,252,.50),rgba(248,250,252,.76)),var(--volley-shared-bg-photo);background-size:cover;background-position:center top;background-repeat:no-repeat}

    #${BOTTOM_ID}{display:none}
    .volley-background-actions{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap;margin-top:.65rem}
    .volley-background-reset{min-height:38px!important}
    .volley-background-state{display:inline-flex;align-items:center;gap:.35rem;font-size:.74rem;font-weight:750;color:#64748b}
    .volley-background-state svg{width:15px;height:15px}
    .volley-background-admin-note{margin-top:.45rem;font-size:.72rem;color:#64748b;line-height:1.4}
    #dashboard-hero{transform:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;will-change:auto!important;contain:none!important;isolation:isolate}
    #dashboard-hero .dashboard-hero-overlay{z-index:0!important;pointer-events:none!important}
    #dashboard-hero .dashboard-hero-content{position:relative!important;z-index:2!important;display:flex!important}
    #dashboard-hero,#dashboard-hero .dashboard-hero-content,#dashboard-hero .dashboard-team-identity,#dashboard-hero .dashboard-welcome-block,#dashboard-hero img,#dashboard-hero h1,#dashboard-hero h2,#dashboard-hero p,#dashboard-hero span{opacity:1!important;visibility:visible!important;transform:none!important}
    #dashboard-hero.dashboard-motion-ready,#dashboard-hero.dashboard-motion-visible{opacity:1!important;transform:none!important}


    @media(max-width:960px){
      .volley-mobile-bar{left:0!important;right:0!important;top:0!important;height:calc(62px + env(safe-area-inset-top,0px))!important;padding:env(safe-area-inset-top,0px) .65rem 0!important;border-radius:0 0 18px 18px!important;border-top:0!important;border-left:0!important;border-right:0!important;background:rgba(255,255,255,.96)!important;box-shadow:0 8px 24px rgba(15,23,42,.10)!important}
      .volley-mobile-menu,.volley-mobile-profile{background:transparent!important}
      body.volley-nav-ready .app-portal-wrapper{padding-top:calc(76px + env(safe-area-inset-top,0px))!important;padding-bottom:calc(94px + env(safe-area-inset-bottom,0px))!important}
      #${BOTTOM_ID}{position:fixed;z-index:8290;left:0;right:0;bottom:0;min-height:calc(68px + env(safe-area-inset-bottom,0px));padding:.42rem .55rem env(safe-area-inset-bottom,0px);background:rgba(255,255,255,.97);border-top:1px solid rgba(226,232,240,.95);box-shadow:0 -8px 28px rgba(15,23,42,.10);display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
      #${BOTTOM_ID} button{border:0;background:transparent;min-width:0;min-height:52px;border-radius:13px;color:#64748b;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.22rem;font-size:.64rem;font-weight:800;cursor:pointer}
      #${BOTTOM_ID} button svg{width:20px;height:20px}
      #${BOTTOM_ID} button.active{color:#9a3412;background:#fff7ed}
      #${BOTTOM_ID} button:active{transform:scale(.97)}
    }
  `;
  document.head.appendChild(style);
}

function buildBottomNav(){
  if(document.getElementById(BOTTOM_ID)) return;
  const shell=document.getElementById('volley-navigation-shell')||document.body;
  const nav=document.createElement('nav');
  nav.id=BOTTOM_ID;
  nav.setAttribute('aria-label','Accesos rápidos');
  nav.innerHTML=QUICK_ITEMS.map(item=>`<button type="button" data-quick-target="${item.target}" aria-label="${item.label}"><i data-lucide="${item.icon}"></i><span>${item.label}</span></button>`).join('');
  nav.addEventListener('click',event=>{
    const button=event.target.closest('[data-quick-target]');
    if(!button) return;
    event.preventDefault();
    document.body.classList.remove('volley-drawer-open');
    if(typeof window.openModule==='function') window.openModule(button.dataset.quickTarget);
    requestAnimationFrame(syncBottomActive);
  });
  shell.appendChild(nav);
  try{window.lucide?.createIcons?.();}catch(_){}
}

function syncBottomActive(){
  const activeView=document.querySelector('.app-portal-wrapper > .page-view.active')?.id||'';
  document.querySelectorAll(`#${BOTTOM_ID} [data-quick-target]`).forEach(button=>{
    const item=QUICK_ITEMS.find(x=>x.target===button.dataset.quickTarget);
    button.classList.toggle('active',Boolean(item&&item.view===activeView));
  });
}

function observeNavigation(){
  const wrapper=document.querySelector('.app-portal-wrapper');
  if(!wrapper||wrapper.dataset.quickNavObserved==='1') return;
  wrapper.dataset.quickNavObserved='1';
  new MutationObserver(records=>{
    if(records.some(r=>r.target?.classList?.contains('page-view'))) requestAnimationFrame(syncBottomActive);
  }).observe(wrapper,{subtree:true,attributes:true,attributeFilter:['class']});
  syncBottomActive();
}

function applyDefaultBackground(){
  activeBackground={mode:'default',path:null};
  document.body.classList.remove('volley-shared-bg-photo');
  document.documentElement.style.removeProperty('--volley-shared-bg-photo');
  syncSettingsUi();
}

function applyPhotoBackground(url,path){
  if(!url){applyDefaultBackground();return;}
  activeBackground={mode:'photo',path:path||null};
  document.documentElement.style.setProperty('--volley-shared-bg-photo',`url("${String(url).replace(/"/g,'%22')}")`);
  document.body.classList.add('volley-shared-bg-photo');
  syncSettingsUi();
}

async function signedUrlFor(path){
  const c=client();
  if(!c||!path) return null;
  const {data,error}=await c.storage.from(BUCKET).createSignedUrl(path,21600);
  if(error){console.warn('[SharedBackground] signed URL',error);return null;}
  return data?.signedUrl||null;
}

async function loadSharedBackground(){
  if(loadBusy) return;
  const c=client();
  if(!c||!currentUser()) return;
  loadBusy=true;
  try{
    const {data,error}=await c.from('app_settings').select('settings').eq('club_id',CLUB_ID).maybeSingle();
    if(error) throw error;
    settingsCache=data?.settings||{};
    const bg=settingsCache.appBackground||{mode:'default',path:null};
    if(bg.mode==='photo'&&bg.path){
      const url=await signedUrlFor(bg.path);
      if(url) applyPhotoBackground(url,bg.path); else applyDefaultBackground();
    }else applyDefaultBackground();
  }catch(error){
    console.warn('[SharedBackground] load',error);
    applyDefaultBackground();
  }finally{loadBusy=false;}
}

async function saveBackgroundSetting(background){
  const c=client();
  if(!c) throw new Error('Supabase no está disponible.');
  const nextSettings={...(settingsCache||{}),appBackground:background};
  const {error}=await c.from('app_settings').update({settings:nextSettings,updated_at:new Date().toISOString()}).eq('club_id',CLUB_ID);
  if(error) throw error;
  settingsCache=nextSettings;
}

function loadImage(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file);
    const img=new Image();
    img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('No se ha podido leer la imagen.'));};
    img.src=url;
  });
}

async function compressBackground(file){
  if(!file?.type?.startsWith('image/')) throw new Error('Selecciona una imagen válida.');
  if(file.size>12*1024*1024) throw new Error('La imagen no puede superar 12 MB.');
  const img=await loadImage(file);
  const maxSide=1920;
  const scale=Math.min(1,maxSide/Math.max(img.naturalWidth||img.width,img.naturalHeight||img.height));
  const width=Math.max(1,Math.round((img.naturalWidth||img.width)*scale));
  const height=Math.max(1,Math.round((img.naturalHeight||img.height)*scale));
  const canvas=document.createElement('canvas');
  canvas.width=width;canvas.height=height;
  canvas.getContext('2d',{alpha:false}).drawImage(img,0,0,width,height);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.82));
  if(blob) return {blob,extension:'webp',contentType:'image/webp'};
  const jpg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.84));
  if(!jpg) throw new Error('No se ha podido preparar la imagen.');
  return {blob:jpg,extension:'jpg',contentType:'image/jpeg'};
}

function setStatus(text,error=false){
  const status=document.getElementById('bg-upload-status');
  if(status){status.textContent=text||'';status.style.color=error?'#b91c1c':'var(--text-muted)';}
}

async function uploadSharedBackground(file){
  if(!canManageBackground()) return toast('Solo el cuerpo técnico puede cambiar el fondo global.','error');
  const c=client();
  if(!c) return toast('Supabase no está disponible.','error');
  const input=document.getElementById('bg-file-upload');
  try{
    if(input) input.disabled=true;
    setStatus('Preparando y sincronizando la imagen…');
    const prepared=await compressBackground(file);
    const newPath=`backgrounds/${CLUB_ID}/portal-${Date.now()}.${prepared.extension}`;
    const oldPath=activeBackground?.mode==='photo'?activeBackground.path:null;
    const {error:uploadError}=await c.storage.from(BUCKET).upload(newPath,prepared.blob,{contentType:prepared.contentType,cacheControl:'3600',upsert:false});
    if(uploadError) throw uploadError;
    try{
      await saveBackgroundSetting({mode:'photo',path:newPath});
    }catch(error){
      try{await c.storage.from(BUCKET).remove([newPath]);}catch(_){}
      throw error;
    }
    const signed=await signedUrlFor(newPath);
    if(signed) applyPhotoBackground(signed,newPath);
    if(settingsTransaction){settingsTransaction.tempPaths.add(newPath);}
    setStatus('Fondo compartido actualizado para todo el equipo.');
    toast('Fondo actualizado para todas las cuentas');
  }catch(error){
    console.error('[SharedBackground] upload',error);
    setStatus(error.message||'No se pudo actualizar el fondo.',true);
    toast(error.message||'No se pudo actualizar el fondo.','error');
  }finally{
    if(input){input.disabled=!canManageBackground();input.value='';}
  }
}

async function resetSharedBackground(){
  if(!canManageBackground()) return toast('Solo el cuerpo técnico puede cambiar el fondo global.','error');
  const button=document.getElementById('btn-reset-shared-background');
  const oldPath=activeBackground?.mode==='photo'?activeBackground.path:null;
  try{
    if(button) button.disabled=true;
    setStatus('Restaurando el fondo original…');
    await saveBackgroundSetting({mode:'default',path:null});
    applyDefaultBackground();
    // La foto anterior se conserva hasta Guardar Ajustes para permitir Cancelar.
    setStatus('Fondo original restaurado para todo el equipo.');
    toast('Fondo original restaurado para todas las cuentas');
  }catch(error){
    console.error('[SharedBackground] reset',error);
    setStatus(error.message||'No se pudo restaurar el fondo.',true);
    toast(error.message||'No se pudo restaurar el fondo.','error');
  }finally{if(button) button.disabled=!canManageBackground();}
}

function syncSettingsUi(){
  const input=document.getElementById('bg-file-upload');
  const reset=document.getElementById('btn-reset-shared-background');
  const state=document.getElementById('shared-bg-state');
  const admin=canManageBackground();
  if(input) input.disabled=!admin;
  if(reset) reset.disabled=!admin||activeBackground.mode!=='photo';
  if(state) state.innerHTML=`<i data-lucide="${activeBackground.mode==='photo'?'image':'palette'}"></i>${activeBackground.mode==='photo'?'Foto compartida activa':'Fondo original activo'}`;
  try{window.lucide?.createIcons?.();}catch(_){}
}


function cloneBackground(value){
  return {mode:value?.mode==='photo'?'photo':'default',path:value?.path||null};
}
async function applyBackgroundDescriptor(background){
  const bg=cloneBackground(background);
  if(bg.mode==='photo'&&bg.path){
    const url=await signedUrlFor(bg.path);
    if(url){applyPhotoBackground(url,bg.path);return;}
  }
  applyDefaultBackground();
}
function beginSettingsTransaction(){
  if(settingsTransactionBusy) return;
  settingsTransaction={original:cloneBackground(activeBackground),tempPaths:new Set(),committed:false};
  setStatus('');
}
async function cleanupTransactionFiles(transaction,keepPath=null){
  const c=client();
  if(!c||!transaction) return;
  const paths=[...transaction.tempPaths].filter(path=>path&&path!==keepPath);
  if(paths.length){try{await c.storage.from(BUCKET).remove(paths);}catch(error){console.warn('[SharedBackground] cleanup temp',error);}}
}
async function commitSettingsTransaction(){
  const transaction=settingsTransaction;
  if(!transaction||settingsTransactionBusy) return;
  settingsTransactionBusy=true;
  try{
    const current=cloneBackground(activeBackground);
    const keepPath=current.mode==='photo'?current.path:null;
    await cleanupTransactionFiles(transaction,keepPath);
    const oldPath=transaction.original.mode==='photo'?transaction.original.path:null;
    if(oldPath&&oldPath!==keepPath){try{await client()?.storage.from(BUCKET).remove([oldPath]);}catch(error){console.warn('[SharedBackground] cleanup previous',error);}}
    transaction.committed=true;
    settingsTransaction=null;
  }finally{settingsTransactionBusy=false;}
}
async function rollbackSettingsTransaction(){
  const transaction=settingsTransaction;
  if(!transaction||transaction.committed||settingsTransactionBusy) return;
  settingsTransactionBusy=true;
  try{
    const original=cloneBackground(transaction.original);
    await saveBackgroundSetting(original);
    await applyBackgroundDescriptor(original);
    await cleanupTransactionFiles(transaction,original.mode==='photo'?original.path:null);
    settingsTransaction=null;
  }catch(error){
    console.error('[SharedBackground] rollback',error);
    toast('No se pudo restaurar el fondo anterior.','error');
  }finally{settingsTransactionBusy=false;}
}
function installSettingsTransaction(){
  const openButton=document.getElementById('btn-club-settings');
  const modal=document.getElementById('modal-club-settings');
  const form=document.getElementById('form-club-settings');
  if(openButton&&openButton.dataset.bgTransactionBound!=='1'){
    openButton.dataset.bgTransactionBound='1';
    openButton.addEventListener('click',()=>beginSettingsTransaction(),true);
  }
  if(form&&form.dataset.bgTransactionBound!=='1'){
    form.dataset.bgTransactionBound='1';
    form.addEventListener('submit',()=>{void commitSettingsTransaction();},false);
  }
  if(modal&&modal.dataset.bgTransactionBound!=='1'){
    modal.dataset.bgTransactionBound='1';
    modal.addEventListener('click',event=>{
      const cancel=event.target.closest('.modal-close-btn,.modal-close');
      const backdrop=event.target===modal;
      if((!cancel&&!backdrop)||!settingsTransaction) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      void rollbackSettingsTransaction().finally(()=>{
        modal.classList.remove('active');
        document.body.classList.remove('modal-open');
      });
    },true);
  }
}

function installBackgroundControls(){
  const existing=document.getElementById('bg-file-upload');
  if(!existing||existing.dataset.sharedBackground==='1') return;
  const input=existing.cloneNode(true);
  input.dataset.sharedBackground='1';
  existing.replaceWith(input);
  const group=input.closest('.form-group');
  const label=group?.querySelector('label');
  if(label) label.innerHTML='<i data-lucide="palette"></i> Fondo de la aplicación';
  input.addEventListener('change',()=>{const file=input.files?.[0];if(file)void uploadSharedBackground(file);});
  let actions=document.getElementById('shared-bg-actions');
  if(!actions){
    actions=document.createElement('div');
    actions.id='shared-bg-actions';
    actions.className='volley-background-actions';
    actions.innerHTML=`<button id="btn-reset-shared-background" type="button" class="btn btn-outline btn-sm volley-background-reset"><i data-lucide="rotate-ccw"></i> Restaurar fondo original</button><span id="shared-bg-state" class="volley-background-state"></span>`;
    const note=document.createElement('p');
    note.className='volley-background-admin-note';
    note.textContent=canManageBackground()?'Este fondo se aplica automáticamente a todas las cuentas del equipo.':'El fondo es común para todo el equipo y lo gestiona el administrador.';
    input.insertAdjacentElement('afterend',actions);
    actions.insertAdjacentElement('afterend',note);
    actions.querySelector('#btn-reset-shared-background')?.addEventListener('click',()=>void resetSharedBackground());
  }
  syncSettingsUi();
}

function subscribeSettings(){
  const c=client();
  if(!c||realtimeChannel) return;
  realtimeChannel=c.channel('shared-app-background').on('postgres_changes',{event:'*',schema:'public',table:'app_settings',filter:`club_id=eq.${CLUB_ID}`},()=>void loadSharedBackground()).subscribe();
}

function waitForAuthenticatedClient(attempt=0){
  if(client()&&currentUser()){
    void loadSharedBackground();
    subscribeSettings();
    syncSettingsUi();
    return;
  }
  if(attempt<30) setTimeout(()=>waitForAuthenticatedClient(attempt+1),250);
}

function init(){
  if(window[FLAG]) return;
  window[FLAG]=true;
  injectStyles();
  applyDefaultBackground();
  buildBottomNav();
  observeNavigation();
  installBackgroundControls();
  installSettingsTransaction();
  const hero=document.getElementById('dashboard-hero');
  if(hero){hero.classList.remove('dashboard-motion-ready','dashboard-motion-visible');hero.style.removeProperty('--motion-order');}
  waitForAuthenticatedClient();
  setTimeout(()=>{installBackgroundControls();installSettingsTransaction();},700);
  setTimeout(()=>{syncBottomActive();syncSettingsUi();installSettingsTransaction();},1200);
  console.info('[VolleyCoach Shell] Fondo compartido y navegación rápida móvil activos.');
}

if(document.readyState==='complete') setTimeout(init,0);
else window.addEventListener('load',()=>setTimeout(init,0),{once:true});
})();