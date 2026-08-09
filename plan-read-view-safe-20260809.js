(function(){
'use strict';

let channel=null;
let timer=null;
let busy=false;

const db=()=>window.VolleySupabase?.getClient?.()||null;
const st=()=>typeof appState!=='undefined'?appState:null;
const coach=()=>{try{return typeof isCoachUser==='function'&&isCoachUser()}catch(_){return false}};
const matchId=()=>{try{return typeof activeScoutingMatchId!=='undefined'?activeScoutingMatchId:null}catch(_){return null}};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=iso=>{if(!iso)return'Todavía no lo ha abierto';const d=new Date(iso);return Number.isNaN(d.getTime())?'Leído':d.toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})};

async function eventUuid(id){
  if(!id)return null;
  const s=String(id);
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s))return s;
  const c=db();if(!c)return null;
  const {data}=await c.from('events').select('id').eq('legacy_id',s).maybeSingle();
  return data?.id||null;
}

async function refresh(){
  if(busy||!coach())return;
  const c=db(),state=st(),mid=matchId();
  if(!c||!state||!mid)return;
  const tracker=document.querySelector('.plan-read-tracker');
  if(!tracker)return;
  busy=true;
  try{
    const eid=await eventUuid(mid);if(!eid)return;
    const {data:plan,error:pe}=await c.from('game_plans')
      .select('id,event_id,published_at,payload')
      .eq('event_id',eid).eq('status','published')
      .order('published_at',{ascending:false}).limit(1).maybeSingle();
    if(pe||!plan)return;

    const {data:reads,error:re}=await c.from('game_plan_reads')
      .select('game_plan_id,event_id,player_id,read_at')
      .or(`game_plan_id.eq.${plan.id},event_id.eq.${eid}`)
      .gte('read_at',plan.published_at)
      .order('read_at',{ascending:false});
    if(re)return;

    const ids=[...new Set((reads||[]).map(r=>r.player_id).filter(Boolean))];
    let remote=[];
    if(ids.length){
      const {data}=await c.from('players').select('id,legacy_id,profile_id,profiles:profile_id(username,full_name)').in('id',ids);
      remote=data||[];
    }
    const remoteById=new Map(remote.map(r=>[String(r.id),r]));
    const latest=new Map();
    for(const r of reads||[]) if(!latest.has(String(r.player_id))) latest.set(String(r.player_id),r);

    const localPlayers=Array.isArray(state.players)?state.players:[];
    const rows=localPlayers.map(p=>{
      const candidates=[p.supabaseId,p.id,p.legacy_id,p.legacyId].filter(Boolean).map(String);
      let hit=null;
      for(const [pid,r] of latest){
        const rem=remoteById.get(pid);
        const uname=String(rem?.profiles?.username||'').toLowerCase();
        if(candidates.includes(pid)|| (uname&&uname===String(p.username||'').toLowerCase())){hit=r;break;}
      }
      return {p,hit};
    });
    const seen=rows.filter(x=>x.hit).length;
    tracker.innerHTML=`<div class="plan-read-tracker-head"><strong>Lectura del plan de juego</strong><span class="plan-read-progress">${seen}/${localPlayers.length} jugadoras</span></div><div class="plan-read-list">${rows.map(({p,hit})=>`<div class="plan-read-item ${hit?'seen':'pending'}"><i data-lucide="${hit?'circle-check':'clock-3'}"></i><span><b>${esc(p.name||p.username||'Jugadora')}</b><small>${hit?fmt(hit.read_at):'Todavía no lo ha abierto'}</small></span></div>`).join('')}</div>`;
    if(window.lucide)try{window.lucide.createIcons()}catch(_){}
  }finally{busy=false}
}

function subscribe(){
  const c=db();if(!c||channel)return;
  channel=c.channel('plan-read-view-safe')
    .on('postgres_changes',{event:'*',schema:'public',table:'game_plan_reads'},()=>setTimeout(refresh,50))
    .subscribe();
}

function start(){
  subscribe();
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-module="tactics"], [onclick*="tactics"], #nav-tactics')) setTimeout(refresh,250);
  },true);
  const observer=new MutationObserver(()=>{
    if(coach()&&document.querySelector('.plan-read-tracker')){
      clearTimeout(timer);timer=setTimeout(refresh,100);
    }
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
  setInterval(()=>{if(coach()&&document.querySelector('.plan-read-tracker'))void refresh()},3000);
  setTimeout(refresh,600);
  console.info('[PlanReadViewSafe] Tracker de lecturas aislado activado.');
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
