(() => {
  'use strict';

  const FLAG = '__volleyMobileMenuGreeting20260813';
  if (window[FLAG]) return;
  window[FLAG] = true;

  function greetingByLocalTime() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  }

  function applyGreeting() {
    // getGreetingByTime is a classic-script global in app.js. Replacing the
    // window property keeps future dashboard renders on the same rule.
    try { window.getGreetingByTime = greetingByLocalTime; } catch (_) {}
    const greeting = document.getElementById('dashboard-greeting');
    if (greeting) greeting.textContent = greetingByLocalTime();
  }

  function injectStyles() {
    if (document.getElementById('volley-mobile-menu-only-style')) return;
    const style = document.createElement('style');
    style.id = 'volley-mobile-menu-only-style';
    style.textContent = `
      @media (max-width:960px){
        .volley-mobile-bar{
          left:calc(env(safe-area-inset-left,0px) + 12px)!important;
          right:auto!important;
          top:calc(env(safe-area-inset-top,0px) + 10px)!important;
          width:48px!important;
          height:48px!important;
          padding:0!important;
          display:block!important;
          border:0!important;
          border-radius:0!important;
          background:transparent!important;
          box-shadow:none!important;
          backdrop-filter:none!important;
          -webkit-backdrop-filter:none!important;
          overflow:visible!important;
        }
        .volley-mobile-bar>strong,
        .volley-mobile-bar>.volley-mobile-profile{
          display:none!important;
        }
        .volley-mobile-bar>.volley-mobile-menu{
          width:48px!important;
          height:48px!important;
          border:1px solid rgba(226,232,240,.96)!important;
          border-radius:15px!important;
          background:rgba(255,255,255,.97)!important;
          color:#0f172a!important;
          box-shadow:0 8px 22px rgba(15,23,42,.14)!important;
          display:grid!important;
          place-items:center!important;
          padding:0!important;
        }
        .volley-mobile-bar>.volley-mobile-menu:active{
          transform:scale(.96);
        }
        body.volley-shell-ready .app-portal-wrapper{
          padding-top:calc(env(safe-area-inset-top,0px) + 70px)!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function install() {
    injectStyles();
    applyGreeting();

    // app.js can finish after this dynamic patch. Reapply once its globals and
    // dashboard are available, then keep the text correct after returning home.
    let attempts = 0;
    const timer = window.setInterval(() => {
      applyGreeting();
      attempts += 1;
      if ((typeof window.renderHomeDashboard === 'function' && document.getElementById('dashboard-greeting')) || attempts > 40) {
        window.clearInterval(timer);
      }
    }, 150);

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) applyGreeting();
    });
    window.addEventListener('focus', applyGreeting);
  }

  install();
})();
