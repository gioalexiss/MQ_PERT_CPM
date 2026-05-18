/* =============================================================
   Navegación AJAX
   Carga fragmentos parciales en #main-content sin recargar la página.
   Los fragmentos viven en /fragmentos/{nombre} → templates/fragmentos/
   ============================================================= */

/**
 * Página actualmente cargada.
 * Se inicializa en 'dashboard' porque ese fragmento ya viene
 * incrustado en index.html — no se necesita un fetch inicial.
 */
let paginaActual = 'dashboard';

/**
 * Carga el fragmento indicado y lo inyecta en #main-content.
 * @param {string} pagina  Nombre del fragmento, coincide con el archivo
 *                         templates/fragmentos/{pagina}.html
 */
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
        })
        .catch(function(err) {
            document.getElementById('main-content').innerHTML =
                '<div class="alert alert-danger m-4">No se pudo cargar la página: ' + pagina + '</div>';
            console.error(err);
        });
}

/**
 * Marca como "active" el item del sidebar que corresponde
 * a la página cargada, quitando el estado anterior.
 * Solo gestiona los items con id "nav-{pagina}".
 * @param {string} pagina
 */
function setActive(pagina) {
    /* quitar active previo */
    document.querySelectorAll('.sidebar-item').forEach(function(el) {
        el.classList.remove('active');
    });

    /* activar el item correspondiente si existe */
    var navItem = document.getElementById('nav-' + pagina);
    if (navItem) navItem.classList.add('active');
}

/* El dashboard ya viene incluido por Thymeleaf en el HTML inicial —
   no se requiere fetch al cargar. */
