from pathlib import Path
import re

path=Path('game-plan-authoritative-20260809.js')
text=path.read_text()

old="let lastCoachSignature='';"
new="let lastCoachSignature='';\nconst lastHydratedRemoteByMatch=new Map();"
if 'lastHydratedRemoteByMatch' not in text:
    if old not in text:
        raise SystemExit('hydration state insertion point not found')
    text=text.replace(old,new,1)

old_block="""    const plan=plans[0]||null;
    if(!plan)return;
    record=await hydratePublishedRecord(mid,plan);
    if(!record||record.status!=='published')return;
"""
new_block="""    const plan=plans[0]||null;
    if(!plan)return;

    // No rehidratar la misma publicación en cada polling de 2 s.
    // También evita que una publicación remota anterior pise el estado local
    // mientras se está publicando una nueva.
    const remoteKey=`${plan.id}|${plan.updated_at||plan.published_at||''}`;
    const alreadyHydrated=lastHydratedRemoteByMatch.get(String(mid))===remoteKey;
    if(!alreadyHydrated||!record?.publishedPlan||record.status!=='published'){
      record=await hydratePublishedRecord(mid,plan);
      lastHydratedRemoteByMatch.set(String(mid),remoteKey);
    }else{
      record=currentRecord();
    }
    if(!record||record.status!=='published')return;
"""
if 'const remoteKey=`${plan.id}|' not in text:
    if old_block not in text:
        raise SystemExit('tick hydration block not found')
    text=text.replace(old_block,new_block,1)
path.write_text(text)

cfg=Path('supabase-config.js')
c=cfg.read_text()
c=re.sub(r"game-plan-authoritative-20260809\.js\?v=[^']+","game-plan-authoritative-20260809.js?v=20260816i",c,count=1)
c=re.sub(r"window\.VOLLEY_ASSET_VERSION = '[^']+';","window.VOLLEY_ASSET_VERSION = '20260816i';",c,count=1)
cfg.write_text(c)

idx=Path('index.html')
html=idx.read_text()
for name in ['supabase-config.js','supabase-client.js','data.js','app.js']:
    html=re.sub(rf'{re.escape(name)}\?v=[^\"\']+',f'{name}?v=20260816i',html)
idx.write_text(html)
