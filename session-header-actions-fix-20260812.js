(function () {
  'use strict';

  function injectStyles() {
    if (document.getElementById('session-header-actions-fix-style')) return;
    const style = document.createElement('style');
    style.id = 'session-header-actions-fix-style';
    style.textContent = `
      @media (max-width:960px) {
        .session-detail-hero > .session-edit-action {
          right: 4.75rem !important;
        }
        .session-detail-hero > .session-delete-btn {
          right: 1rem !important;
          color: #fee2e2 !important;
          border-color: rgba(254,202,202,.42) !important;
          background: rgba(127,29,29,.18) !important;
        }
        .session-detail-hero > .session-delete-btn:hover,
        .session-detail-hero > .session-delete-btn:focus-visible {
          color: #fff !important;
          border-color: rgba(254,202,202,.65) !important;
          background: rgba(185,28,28,.34) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function markHeaderActions() {
    document.querySelectorAll('.session-detail-hero').forEach(hero => {
      const deleteButton = hero.querySelector(':scope > .session-delete-btn');
      if (deleteButton) {
        deleteButton.setAttribute('aria-label', 'Eliminar entrenamiento');
        deleteButton.setAttribute('title', 'Eliminar entrenamiento');
      }

      hero.querySelectorAll(':scope > .btn:not(.session-delete-btn)').forEach(button => {
        const onclick = button.getAttribute('onclick') || '';
        if (!onclick.includes('editEventFromModal')) return;
        button.classList.add('session-edit-action');
        button.setAttribute('aria-label', 'Editar entrenamiento');
        button.setAttribute('title', 'Editar entrenamiento');
      });
    });
  }

  function init() {
    injectStyles();
    markHeaderActions();
    const root = document.getElementById('session-center-detail') || document.body;
    const observer = new MutationObserver(() => markHeaderActions());
    observer.observe(root, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
