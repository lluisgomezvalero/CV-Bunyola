(function(){
'use strict';

const FLAG='__playerAvatarAuthoritative20260812';
const BUCKET='avatars';
const CLUB_ID=window.VOLLEY_SUPABASE_CONFIG?.clubId||'b0000000-0000-4000-8000-000000000001';
let installed=false;
let refreshing=false;
let realtimeChannel=null;

function state(){return typeof appState!=='undefined'?appState:null;}
function client(){return window.VolleySupabase?.getClient?.()||null;}
function currentUser(){try{return typeof getCurrentUser==='function'?getCurrentUser():null;}catch(_){return null;}}
function isStaff(){
  try{if(typeof window.isCoachUser==='function'&&window.isCoachUser())return true;}catch(_){}
  try{if(typeof window.isAdministratorUser==='function'&&window.isAdministratorUser())return true;}catch(_){}
  const role=String(currentUser()?.role||'').toLowerCase();
  return ['coach','administrator','admin'].includes(role);
}
function values(obj,keys){return keys.map(k=>obj?.[k]).filter(v=>v!==undefined&&v!==null&&String(v)!=='').map(String);}
function intersects(a,b){const s=new Set(a);return b.some(v=>s.has(v));}
function localPlayerForRemote(row){
  const s=state();if(!s)return null;
  const remoteIds=values(row,['id','legacy_id','profile_id']);
  return (s.players||[]).find(p=>intersects(values(p,['id','supabaseId','supabase_id','legacy_id','legacyId','profile_id','authId']),remoteIds))||null;
}
function localPlayerForActiveId(id){
  const s=state();if(!s||id===null||id===undefined)return null;
  const sid=String(id);
  return (s.players||[]).find(p=>values(p,['id','supabaseId','supabase_id','legacy_id','legacyId','profile_id','authId']).includes(sid))||null;
}
function remoteUuidForPlayer(player){
  const ids=values(player,['supabaseId','supabase_id','id']);
  return ids.find(id=>/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))||null;
}
function dataUrlToBlob(dataUrl){
  const parts=String(dataUrl||'').split(',');
  if(parts.length<2)return null;
  const mime=(parts[0].match(/data:([^;]+)/)||[])[1]||'image/jpeg';
  const binary=atob(parts[1]);
  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return new Blob([bytes],{type:mime});
}
function blobToDataUrl(blob){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result||''));
    reader.onerror=()=>reject(reader.error||new Error('No se pudo leer la imagen.'));
    reader.readAsDataURL(blob);
  });
}
function updateLocalAvatar(player,dataUrl,path){
  if(!player||!dataUrl)return;
  const s=state();
  player.avatar=dataUrl;
  player.avatarPath=path||player.avatarPath||null;
  const playerIds=values(player,['id','legacy_id','legacyId','supabaseId','supabase_id','profile_id']);
  const linked=(s?.users||[]).find(u=>playerIds.includes(String(u.playerId||''))||playerIds.includes(String(u.authId||'')));
  if(linked)linked.avatar=dataUrl;
}
function refreshVisibleUi(playerId){
  try{if(document.getElementById('view-roster')?.classList.contains('active')&&typeof renderRoster==='function')renderRoster();}catch(_){}
  try{if(typeof renderNavUserProfile==='function')renderNavUserProfile();}catch(_){}
  try{
    const modal=document.getElementById('modal-player-detail');
    if(modal?.classList.contains('active')&&playerId&&typeof openPlayerDetail==='function')openPlayerDetail(playerId);
  }catch(_){}
}
async function downloadAvatar(path){
  const c=client();if(!c||!path)return null;
  const {data,error}=await c.storage.from(BUCKET).download(path);
  if(error)throw error;
  return blobToDataUrl(data);
}
async function refreshRemoteAvatars(options={}){
  if(refreshing)return;
  const c=client(),s=state();if(!c||!s)return;
  refreshing=true;
  try{
    const {data,error}=await c.from('players').select('id,legacy_id,profile_id,avatar_path').eq('club_id',CLUB_ID).eq('active',true);
    if(error)throw error;
    let changed=false;
    let changedPlayerId=null;
    for(const row of data||[]){
      if(!row.avatar_path)continue;
      const player=localPlayerForRemote(row);if(!player)continue;
      if(!options.force&&String(player.avatarPath||'')===String(row.avatar_path||'')&&String(player.avatar||'').startsWith('data:image/'))continue;
      try{
        const dataUrl=await downloadAvatar(row.avatar_path);
        if(!dataUrl)continue;
        updateLocalAvatar(player,dataUrl,row.avatar_path);
        changed=true;
        changedPlayerId=player.id||changedPlayerId;
      }catch(error){console.warn('[PlayerAvatar] No se pudo descargar',row.avatar_path,error);}
    }
    if(changed){
      try{if(typeof saveAppData==='function')saveAppData(s);}catch(_){}
      refreshVisibleUi(changedPlayerId);
    }
  }catch(error){console.error('[PlayerAvatar] refresh',error);}finally{refreshing=false;}
}
async function resolveRemotePlayer(player){
  const c=client();if(!c||!player)return null;
  const direct=remoteUuidForPlayer(player);
  if(direct){
    const {data,error}=await c.from('players').select('id,legacy_id,profile_id,avatar_path').eq('id',direct).maybeSingle();
    if(error)throw error;
    if(data)return data;
  }
  const legacy=player.legacy_id||player.legacyId||player.id;
  if(!legacy)return null;
  const {data,error}=await c.from('players').select('id,legacy_id,profile_id,avatar_path').eq('club_id',CLUB_ID).eq('legacy_id',String(legacy)).maybeSingle();
  if(error)throw error;
  return data||null;
}
async function waitForLegacyCompressedAvatar(player,before,file){
  for(let i=0;i<60;i++){
    const current=String(player?.avatar||'');
    if(current.startsWith('data:image/')&&current!==before)return {blob:dataUrlToBlob(current),dataUrl:current};
    await new Promise(r=>setTimeout(r,50));
  }
  return {blob:file,dataUrl:null};
}
async function uploadPlayerAvatar(player,file,beforeAvatar,options={}){
  if(!isStaff()){
    console.warn('[PlayerAvatar] Se ignoró una subida porque la sesión no es de staff.');
    return;
  }
  const c=client();if(!c||!player||!file)return;
  try{
    const remote=await resolveRemotePlayer(player);
    if(!remote?.id)throw new Error('No se ha encontrado la jugadora en Supabase.');
    const prepared=options.preparedDataUrl?{blob:dataUrlToBlob(options.preparedDataUrl),dataUrl:options.preparedDataUrl}:await waitForLegacyCompressedAvatar(player,beforeAvatar,file);
    const blob=prepared.blob;
    if(!blob)throw new Error('No se ha podido preparar la imagen.');
    const path=`${CLUB_ID}/${remote.id}/avatar-${Date.now()}.jpg`;
    const {error:uploadError}=await c.storage.from(BUCKET).upload(path,blob,{contentType:blob.type||'image/jpeg',cacheControl:'3600',upsert:false});
    if(uploadError)throw uploadError;
    const {data:updated,error:updateError}=await c.from('players').update({avatar_path:path,updated_at:new Date().toISOString()}).eq('id',remote.id).select('id,avatar_path').single();
    if(updateError){
      try{await c.storage.from(BUCKET).remove([path]);}catch(_){}
      throw updateError;
    }
    let dataUrl=prepared.dataUrl;
    if(!dataUrl)dataUrl=await blobToDataUrl(blob);
    updateLocalAvatar(player,dataUrl,updated.avatar_path);
    try{if(typeof saveAppData==='function')saveAppData(state());}catch(_){}
    refreshVisibleUi(player.id);
    if(remote.avatar_path&&remote.avatar_path!==path){
      c.storage.from(BUCKET).remove([remote.avatar_path]).then(({error})=>{if(error)console.warn('[PlayerAvatar] No se pudo retirar la foto anterior',error);});
    }
    if(!options.silent){try{if(typeof showToast==='function')showToast(`Foto de ${player.name||'la jugadora'} sincronizada en todos los dispositivos.`);}catch(_){}}
    return true;
  }catch(error){
    console.error('[PlayerAvatar] upload',error);
    if(!options.silent){try{if(typeof showToast==='function')showToast('La foto se ha cambiado en este dispositivo, pero no se pudo sincronizar: '+(error.message||error),'error');}catch(_){}}
    return false;
  }
}

let backfillRunning=false;
let backfillCompleted=false;
async function backfillLocalAvatars(){
  if(backfillRunning||backfillCompleted||!isStaff())return;
  if(window.matchMedia&&!window.matchMedia('(max-width:600px)').matches)return;
  const c=client(),s=state();if(!c||!s)return;
  backfillRunning=true;
  try{
    const {data,error}=await c.from('players').select('id,legacy_id,profile_id,avatar_path').eq('club_id',CLUB_ID).eq('active',true);
    if(error)throw error;
    let synced=0;
    for(const row of data||[]){
      if(row.avatar_path)continue;
      const player=localPlayerForRemote(row);
      const localData=String(player?.avatar||'');
      if(!player||!localData.startsWith('data:image/'))continue;
      const blob=dataUrlToBlob(localData);
      if(!blob)continue;
      const ok=await uploadPlayerAvatar(player,blob,localData,{silent:true,preparedDataUrl:localData});
      if(ok)synced++;
    }
    backfillCompleted=true;
    if(synced){
      try{if(typeof showToast==='function')showToast(synced===1?'Foto de Plantilla sincronizada con Supabase.':`${synced} fotos de Plantilla sincronizadas con Supabase.`);}catch(_){}
      await refreshRemoteAvatars({force:true});
    }
  }catch(error){
    console.error('[PlayerAvatar] backfill',error);
  }finally{backfillRunning=false;}
}
function bindDelegatedRosterCapture(){
  if(document.documentElement.dataset.supabaseAvatarCaptureBound==='1')return;
  document.documentElement.dataset.supabaseAvatarCaptureBound='1';
  document.addEventListener('change',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||input.id!=='player-avatar-file-input')return;
    const file=input.files?.[0];
    if(!file||!String(file.type||'').startsWith('image/'))return;
    let id=null;
    try{id=typeof activePlayerIdForAvatar!=='undefined'?activePlayerIdForAvatar:null;}catch(_){}
    const player=localPlayerForActiveId(id);
    if(!player){
      console.warn('[PlayerAvatar] No se pudo resolver la jugadora activa para sincronizar la foto.',id);
      return;
    }
    const before=String(player.avatar||'');
    setTimeout(()=>void uploadPlayerAvatar(player,file,before),0);
  },true);
}
function subscribeRealtime(){
  const c=client();if(!c||realtimeChannel)return;
  realtimeChannel=c.channel('player-avatar-authoritative-live')
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'players'},payload=>{
      const nextPath=payload?.new?.avatar_path;
      const prevPath=payload?.old?.avatar_path;
      if(nextPath&&nextPath!==prevPath)void refreshRemoteAvatars({force:true});
    })
    .subscribe();
}
function install(){
  if(installed||window[FLAG])return;
  if(!window.VolleySupabase||!state()){
    setTimeout(install,120);return;
  }
  installed=true;window[FLAG]=true;
  // La subida se invoca directamente desde initPlayerAvatarUploadListener.
  subscribeRealtime();
  setTimeout(()=>void refreshRemoteAvatars(),700);
  setTimeout(()=>void backfillLocalAvatars(),1800);
  setTimeout(()=>void backfillLocalAvatars(),6000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){void refreshRemoteAvatars();void backfillLocalAvatars();}});
  console.info('[PlayerAvatar] Supabase authoritative roster avatars active (delegated capture).');
}

window.refreshPlayerAvatarsFromSupabase=refreshRemoteAvatars;
window.syncPlayerAvatarToSupabase=uploadPlayerAvatar;
setTimeout(install,0);
})();
