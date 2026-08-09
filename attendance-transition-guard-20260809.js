(function(){
'use strict';

// Evita que una jugadora vea brevemente los botones de RSVP mientras se hidrata
// su asistencia desde Supabase tras login/cambio de usuario.
let lastUserKey = null;
let syncToken = 0;

function currentUserKey(){
  try{
    const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    if(!u) return 'guest';
    return [u.authId||u.id||'', u.playerId||'', u.username||'', u.role||''].join('|');
  }catch(_){ return 'guest'; }
}

async function syncAttendanceForUser(targetKey, token, attempt=0){
  if(token !== syncToken || currentUserKey() !== targetKey) return;
  try{
    if(typeof window.loadAttendanceFromSupabase === 'function'){
      await window.loadAttendanceFromSupabase({silent:false, force:true});
    }
  }catch(err){
    console.warn('[AttendanceTransitionGuard] sync', err);
  }
  if(token !== syncToken || currentUserKey() !== targetKey) return;
  if(!document.documentElement.classList.contains('attendance-ready') && attempt < 12){
    setTimeout(()=>syncAttendanceForUser(targetKey, token, attempt+1), 200);
  }
}

function handleUserChange(){
  const key = currentUserKey();
  if(key === lastUserKey) return;
  lastUserKey = key;
  syncToken++;
  const token = syncToken;
  document.documentElement.classList.remove('attendance-ready');
  // Damos un instante para que el estado de usuario termine de asentarse y luego
  // cargamos la asistencia real antes de permitir que aparezcan acciones RSVP.
  setTimeout(()=>syncAttendanceForUser(key, token, 0), 0);
}

// Comprobación muy ligera; detecta también cambios de usuario sin recargar la SPA.
setInterval(handleUserChange, 50);
handleUserChange();
})();