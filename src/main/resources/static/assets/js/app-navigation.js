/* =============================================================
   Navegación AJAX  –  Tema IPN UPIIZ
   Carga fragmentos parciales en #main-content sin recargar la página.
   Los fragmentos viven en /fragmentos/{nombre} → templates/fragmentos/
   ============================================================= */

let paginaActual = 'pert-cpm';

const titulos = {
    'pert-cpm': 'PERT – CPM',
    'documentacion': 'Documentación'
};

function loadPage(pagina) {
    if (pagina === paginaActual) return;

    fetch('/fragmentos/' + pagina)
        .then(function(res) {
            if (!res.ok) throw new Error('Error HTTP ' + res.status);
            return res.text();
        })
        .then(function(html) {
            document.getElementById('main-content').innerHTML = html;
            paginaActual = pagina;
            setActive(pagina);

            // Compilar las fórmulas matemáticas si existe MathJax
            if (window.MathJax) {
                setTimeout(() => {
                    window.MathJax.typesetPromise().catch(function (err) {
                        console.error("Error al renderizar MathJax: ", err);
                    });
                }, 100);
            }
        })

        .catch(function(err) {
            document.getElementById('main-content').innerHTML =
                '<div class="alert alert-danger m-4">No se pudo cargar la página: ' + pagina + '</div>';
            console.error(err);
        });

}

function setActive(pagina) {
    document.querySelectorAll('.nav-menu a').forEach(function(a) {
        a.classList.remove('active');
    });
    var navItem = document.getElementById('nav-' + pagina);
    if (navItem) navItem.classList.add('active');

    var titleEl = document.getElementById('navbarTitle');
    if (titleEl) titleEl.textContent = titulos[pagina] || pagina;
}
