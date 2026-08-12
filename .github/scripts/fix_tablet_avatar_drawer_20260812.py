from pathlib import Path

avatar_path = Path('player-avatar-authoritative-20260812.js')
av = avatar_path.read_text()

old_sig = "async function uploadPlayerAvatar(player,file,beforeAvatar){"
new_sig = "async function uploadPlayerAvatar(player,file,beforeAvatar,options={}){"
if old_sig not in av and new_sig not in av:
    raise SystemExit('Avatar upload signature not found')
if old_sig in av:
    av = av.replace(old_sig, new_sig, 1)

old_prepared = "    const prepared=await waitForLegacyCompressedAvatar(player,beforeAvatar,file);\n"
new_prepared = "    const prepared=options.preparedDataUrl?{blob:dataUrlToBlob(options.preparedDataUrl),dataUrl:options.preparedDataUrl}:await waitForLegacyCompressedAvatar(player,beforeAvatar,file);\n"
if old_prepared in av:
    av = av.replace(old_prepared, new_prepared, 1)
elif new_prepared not in av:
    raise SystemExit('Avatar preparation line not found')

old_success = "    try{if(typeof showToast==='function')showToast(`Foto de ${player.name||'la jugadora'} sincronizada en todos los dispositivos.`);}catch(_){}\n"
new_success = "    if(!options.silent){try{if(typeof showToast==='function')showToast(`Foto de ${player.name||'la jugadora'} sincronizada en todos los dispositivos.`);}catch(_){}}\n    return true;\n"
if old_success in av:
    av = av.replace(old_success, new_success, 1)
elif new_success not in av:
    raise SystemExit('Avatar success toast not found')

old_error = "    try{if(typeof showToast==='function')showToast('La foto se ha cambiado en este dispositivo, pero no se pudo sincronizar: '+(error.message||error),'error');}catch(_){}\n  }\n}\nfunction bindDelegatedRosterCapture(){"
new_error = "    if(!options.silent){try{if(typeof showToast==='function')showToast('La foto se ha cambiado en este dispositivo, pero no se pudo sincronizar: '+(error.message||error),'error');}catch(_){}}\n    return false;\n  }\n}\n\nlet backfillRunning=false;\nlet backfillCompleted=false;\nasync function backfillLocalAvatars(){\n  if(backfillRunning||backfillCompleted||!isStaff())return;\n  const c=client(),s=state();if(!c||!s)return;\n  backfillRunning=true;\n  try{\n    const {data,error}=await c.from('players').select('id,legacy_id,profile_id,avatar_path').eq('club_id',CLUB_ID).eq('active',true);\n    if(error)throw error;\n    let synced=0;\n    for(const row of data||[]){\n      if(row.avatar_path)continue;\n      const player=localPlayerForRemote(row);\n      const localData=String(player?.avatar||'');\n      if(!player||!localData.startsWith('data:image/'))continue;\n      const blob=dataUrlToBlob(localData);\n      if(!blob)continue;\n      const ok=await uploadPlayerAvatar(player,blob,localData,{silent:true,preparedDataUrl:localData});\n      if(ok)synced++;\n    }\n    backfillCompleted=true;\n    if(synced){\n      try{if(typeof showToast==='function')showToast(synced===1?'Foto de Plantilla sincronizada con Supabase.':`${synced} fotos de Plantilla sincronizadas con Supabase.`);}catch(_){}\n      await refreshRemoteAvatars({force:true});\n    }\n  }catch(error){\n    console.error('[PlayerAvatar] backfill',error);\n  }finally{backfillRunning=false;}\n}\nfunction bindDelegatedRosterCapture(){"
if old_error in av:
    av = av.replace(old_error, new_error, 1)
elif "async function backfillLocalAvatars()" not in av:
    raise SystemExit('Avatar error block not found')

old_install = "  setTimeout(()=>void refreshRemoteAvatars(),700);\n  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshRemoteAvatars();});\n"
new_install = "  setTimeout(()=>void refreshRemoteAvatars(),700);\n  setTimeout(()=>void backfillLocalAvatars(),1800);\n  setTimeout(()=>void backfillLocalAvatars(),6000);\n  document.addEventListener('visibilitychange',()=>{if(!document.hidden){void refreshRemoteAvatars();void backfillLocalAvatars();}});\n"
if old_install in av:
    av = av.replace(old_install, new_install, 1)
elif new_install not in av:
    raise SystemExit('Avatar install hook not found')

avatar_path.write_text(av)

shell_path = Path('app-shell-polish-20260812.js')
shell = shell_path.read_text()
anchor = "    @media(max-width:960px){\n      .volley-mobile-bar{"
replacement = "    @media(max-width:960px){\n      /* Android/Tablet: evita fallos de repintado en el drawer con blur + scroll interno. */\n      .volley-side-nav{overflow:hidden!important;background:#fff!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}\n      .volley-side-brand{flex:0 0 auto!important;background:#fff!important}\n      .volley-side-scroll{min-height:0!important;overflow-y:auto!important;-webkit-overflow-scrolling:touch!important}\n      .volley-side-footer{position:relative!important;z-index:2!important;flex:0 0 auto!important;background:#f8fafc!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}\n      .volley-nav-overlay{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}\n      .volley-mobile-bar{"
if anchor in shell:
    shell = shell.replace(anchor, replacement, 1)
elif "Android/Tablet: evita fallos de repintado" not in shell:
    raise SystemExit('Mobile shell anchor not found')
shell_path.write_text(shell)

cfg_path = Path('supabase-config.js')
cfg = cfg_path.read_text()
if "window.VOLLEY_ASSET_VERSION = '20260812v';" in cfg:
    cfg = cfg.replace("window.VOLLEY_ASSET_VERSION = '20260812v';", "window.VOLLEY_ASSET_VERSION = '20260812w';", 1)
elif "window.VOLLEY_ASSET_VERSION = '20260812w';" not in cfg:
    raise SystemExit('Expected config cache version v not found')
cfg = cfg.replace('player-avatar-authoritative-20260812.js?v=20260812u', 'player-avatar-authoritative-20260812.js?v=20260812w')
cfg = cfg.replace('app-shell-polish-20260812.js?v=20260812n', 'app-shell-polish-20260812.js?v=20260812w')
cfg_path.write_text(cfg)

idx_path = Path('index.html')
idx = idx_path.read_text()
for asset in ['styles.css','supabase-config.js','supabase-client.js','data.js','app.js']:
    idx = idx.replace(f'{asset}?v=20260812v', f'{asset}?v=20260812w')
idx_path.write_text(idx)
