/* =====================================================
   sidebar.js  –  PERT-CPM IPN · UPIIZ
   Toggle de la sidebar. Incluido en index.html.
   ===================================================== */

(function () {
    'use strict';

    const sidebar     = document.getElementById('sidebar');
    const mainWrapper = document.getElementById('mainWrapper');
    const toggleBtn   = document.getElementById('sidebarToggle');

    if (!sidebar || !mainWrapper || !toggleBtn) return;

    toggleBtn.addEventListener('click', () => {
        const isNowCollapsed = sidebar.classList.toggle('collapsed');
        mainWrapper.classList.toggle('expanded', isNowCollapsed);
        toggleBtn.classList.toggle('collapsed', isNowCollapsed);
    });
})();
