from pathlib import Path


def replace_once(path, old, new, label):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match in {path}, found {count}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')
    print(f'updated {label}: {path}')

# 1) Event/session edit: remember whether the edited session is the one currently open.
replace_once(
    'app.js',
    '''      const wasEditing = Boolean(currentEditingEventId);\n      currentEditingEventId = null;''',
    '''      const editedEventId = currentEditingEventId;\n      const wasEditing = Boolean(editedEventId);\n      const keepEditedSessionOpen = Boolean(\n        editedEventId &&\n        typeof activeSessionId !== "undefined" &&\n        activeSessionId &&\n        String(activeSessionId) === String(editedEventId)\n      );\n      currentEditingEventId = null;''',
    'capture active edited session'
)

replace_once(
    'app.js',
    '''      requestAnimationFrame(() => {\n        try { renderGoogleCalendar(); } catch (error) { console.error("Error al refrescar calendario:", error); }\n        try { renderTraining(); } catch (error) { console.error("Error al refrescar entrenamientos:", error); }\n        try { renderStats(); } catch (error) { console.error("Error al refrescar estadísticas:", error); }\n        try { renderHomeDashboard(); } catch (error) { console.error("Error al refrescar dashboard:", error); }\n      });''',
    '''      requestAnimationFrame(() => {\n        // Si se editó la sesión que está abierta, solo repintamos su ficha.\n        // El resto de vistas ya quedaron invalidadas y se renderizarán al abrirse.\n        if (keepEditedSessionOpen) {\n          try { renderSessionCenterDetail(); } catch (error) { console.error("Error al refrescar la sesión:", error); }\n          return;\n        }\n        const activeViewId = document.querySelector(".app-portal-wrapper > .page-view.active")?.id || "";\n        try {\n          if (activeViewId === "view-calendar") renderGoogleCalendar();\n          else if (activeViewId === "view-training") renderTraining();\n          else if (activeViewId === "view-stats") renderStats();\n          else if (activeViewId === "view-competition") renderCompetition();\n          else if (activeViewId === "view-home-portal") renderHomeDashboard();\n        } catch (error) {\n          console.error("Error al refrescar la vista activa tras guardar:", error);\n        }\n      });''',
    'target event save refresh'
)

# 2) Core Supabase event sync: refresh only the open session/current view.
replace_once(
    'app.js',
    '''        requestAnimationFrame(() => {\n          try { renderGoogleCalendar(); } catch (e) {}\n          try { renderTraining(); } catch (e) {}\n          try { renderHomeDashboard(); } catch (e) {}\n          try { renderStats(); } catch (e) {}\n          try { renderCompetition(); } catch (e) {}\n        });''',
    '''        requestAnimationFrame(() => {\n          try {\n            if (typeof activeSessionId !== "undefined" && activeSessionId) {\n              renderSessionCenterDetail();\n              return;\n            }\n          } catch (_) {}\n          const activeViewId = document.querySelector(".app-portal-wrapper > .page-view.active")?.id || "";\n          try {\n            if (activeViewId === "view-calendar") renderGoogleCalendar();\n            else if (activeViewId === "view-training") renderTraining();\n            else if (activeViewId === "view-home-portal") { renderHomeDashboard(); renderHomePortalRSVP(); }\n            else if (activeViewId === "view-stats") renderStats();\n            else if (activeViewId === "view-competition") renderCompetition();\n          } catch (_) {}\n        });''',
    'target core event realtime refresh'
)

# 3) Core Supabase attendance sync: keep an open roll-call current, otherwise only current view/session.
replace_once(
    'app.js',
    '''        requestAnimationFrame(() => {\n          try { renderHomeDashboard(); } catch (e) {}\n          try { renderTraining(); } catch (e) {}\n          try { renderHomePortalRSVP(); } catch (e) {}\n          try { renderCoachAttendanceList(); } catch (e) {}\n          try {\n            const modal = document.getElementById('modal-verify-attendance');\n            const openEvtId = document.getElementById('verify-attendance-event-id')?.value;\n            if (modal && modal.classList.contains('active') && openEvtId) {\n              openVerifyAttendanceModal(openEvtId);\n            }\n          } catch(e) {}\n        });''',
    '''        requestAnimationFrame(() => {\n          try {\n            const modal = document.getElementById('modal-verify-attendance');\n            const openEvtId = document.getElementById('verify-attendance-event-id')?.value;\n            if (modal && modal.classList.contains('active') && openEvtId) {\n              openVerifyAttendanceModal(openEvtId);\n              return;\n            }\n          } catch(e) {}\n          try {\n            if (typeof activeSessionId !== "undefined" && activeSessionId) {\n              renderSessionCenterDetail();\n              return;\n            }\n          } catch (_) {}\n          const activeViewId = document.querySelector(".app-portal-wrapper > .page-view.active")?.id || "";\n          try {\n            if (activeViewId === "view-training") renderTraining();\n            else if (activeViewId === "view-home-portal") { renderHomePortalRSVP(); renderHomeDashboard(); }\n            else if (activeViewId === "view-coach-attendance") renderCoachAttendanceList();\n          } catch (_) {}\n        });''',
    'target core attendance realtime refresh'
)

# 4) Authoritative event recovery must follow the same targeted rendering rule.
replace_once(
    'supabase-event-recovery.js',
    '''    requestAnimationFrame(()=>{\n      try{renderGoogleCalendar()}catch(_){}\n      try{renderTraining()}catch(_){}\n      try{renderHomeDashboard()}catch(_){}\n      try{renderHomePortalRSVP()}catch(_){}\n      try{renderCoachAttendanceList()}catch(_){}\n    });''',
    '''    requestAnimationFrame(()=>{\n      try{\n        if(typeof activeSessionId!=='undefined'&&activeSessionId){\n          renderSessionCenterDetail();\n          return;\n        }\n      }catch(_){}\n      const activeViewId=document.querySelector('.app-portal-wrapper > .page-view.active')?.id||'';\n      try{\n        if(activeViewId==='view-calendar')renderGoogleCalendar();\n        else if(activeViewId==='view-training')renderTraining();\n        else if(activeViewId==='view-home-portal'){renderHomeDashboard();renderHomePortalRSVP();}\n        else if(activeViewId==='view-coach-attendance')renderCoachAttendanceList();\n      }catch(_){}\n    });''',
    'target authoritative event recovery refresh'
)

# 5) Authoritative attendance: central targeted UI refresh helper.
replace_once(
    'attendance-authoritative-20260809.js',
    '''function snapshot(s){return JSON.stringify({c:(s.trainingConfirmations||[]).map(x=>[x.eventId,x.playerId,x.status]).sort(),a:(s.attendanceData||[]).map(x=>[x.eventId,x.playerId,x.status]).sort()});}\n''',
    '''function snapshot(s){return JSON.stringify({c:(s.trainingConfirmations||[]).map(x=>[x.eventId,x.playerId,x.status]).sort(),a:(s.attendanceData||[]).map(x=>[x.eventId,x.playerId,x.status]).sort()});}\nfunction activeSessionMatches(eventId){try{if(typeof activeSessionId==='undefined'||!activeSessionId)return false;if(!eventId)return true;const activeEv=localEventByAny(activeSessionId),targetEv=localEventByAny(eventId);const activeIds=[activeSessionId,activeEv?.id,activeEv?.supabaseId,activeEv?.supabase_id,activeEv?.legacy_id,activeEv?.legacyId].filter(Boolean).map(String);const targetIds=[eventId,targetEv?.id,targetEv?.supabaseId,targetEv?.supabase_id,targetEv?.legacy_id,targetEv?.legacyId].filter(Boolean).map(String);return activeIds.some(id=>targetIds.includes(id));}catch(_){return false;}}\nfunction refreshAttendanceViews(eventId,includeCoachList=false){if(activeSessionMatches(eventId)){call('renderSessionCenterDetail');return;}const activeViewId=document.querySelector('.app-portal-wrapper > .page-view.active')?.id||'';if(activeViewId==='view-training')call('renderTraining');else if(activeViewId==='view-home-portal'){call('renderHomePortalRSVP');call('renderHomeDashboard');}if(includeCoachList||activeViewId==='view-coach-attendance')call('renderCoachAttendanceList');}\n''',
    'add authoritative attendance targeted helper'
)

replace_once(
    'attendance-authoritative-20260809.js',
    '''if(before!==snapshot(s)&&!opts.silent){call('renderHomeDashboard');call('renderHomePortalRSVP');call('renderTraining');call('renderCoachAttendanceList');try{if(typeof activeSessionId!=='undefined'&&activeSessionId)call('renderSessionCenterDetail');}catch(_){}}''',
    '''if(before!==snapshot(s)&&!opts.silent){refreshAttendanceViews(null,true)}''',
    'target authoritative attendance polling refresh'
)

replace_once(
    'attendance-authoritative-20260809.js',
    '''await loadAttendance({silent:true});call('renderHomeDashboard');call('renderHomePortalRSVP');call('renderTraining');if(typeof showToast==='function')showToast(status==='yes'?'Asistencia confirmada.':'Ausencia comunicada.');''',
    '''await loadAttendance({silent:true});refreshAttendanceViews(eventId);if(typeof showToast==='function')showToast(status==='yes'?'Asistencia confirmada.':'Ausencia comunicada.');''',
    'target player RSVP refresh'
)

replace_once(
    'attendance-authoritative-20260809.js',
    '''await loadAttendance({silent:true});closeRollCall();call('renderTraining');call('renderCoachAttendanceList');call('renderHomeDashboard');if(typeof showToast==='function')showToast(`Lista guardada · ${counts.present} presentes · ${counts.late} tarde · ${counts.justified} justificadas · ${counts.unjustified} no justificadas.`);''',
    '''await loadAttendance({silent:true});closeRollCall();refreshAttendanceViews(eid,true);if(typeof showToast==='function')showToast(`Lista guardada · ${counts.present} presentes · ${counts.late} tarde · ${counts.justified} justificadas · ${counts.unjustified} no justificadas.`);''',
    'target coach roll-call refresh'
)

# 6) Cache bust only changed assets.
config = Path('supabase-config.js')
text = config.read_text(encoding='utf-8')
text = text.replace("window.VOLLEY_ASSET_VERSION = '20260812c';", "window.VOLLEY_ASSET_VERSION = '20260812d';")
text = text.replace("attendance-authoritative-20260809.js?v=20260810n", "attendance-authoritative-20260809.js?v=20260812d")
text = text.replace("supabase-event-recovery.js?v=20260810n", "supabase-event-recovery.js?v=20260812d")
config.write_text(text, encoding='utf-8')

index = Path('index.html')
text = index.read_text(encoding='utf-8').replace('20260812c', '20260812d')
index.write_text(text, encoding='utf-8')

print('cache -> 20260812d')
