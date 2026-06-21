/* ================================================================
   pert-cpm.js  –  Lógica del módulo PERT-CPM
   Compatible con Mazer + Bootstrap 5 (archivos estáticos)
   ================================================================ */

/* ── Estado global ───────────────────────────────────────────── */
var pertActividades = [];
var pertEditandoId  = null;
var pertTags        = [];
var pertModalInst   = null;
var pertFilaEdicion = null;   // 'new' | activity id being edited inline
var pertPredInline  = [];     // predecessors selected in inline row

/* ── Obtener instancia del modal de forma segura ─────────────── */
function pertGetModal() {
    var el = document.getElementById('modalActividad');
    if (!el) return null;
    // Bootstrap 5 con bundle ya cargado
    if (window.bootstrap && window.bootstrap.Modal) {
        if (!pertModalInst) {
            pertModalInst = new window.bootstrap.Modal(el, { keyboard: true, backdrop: true });
        }
        return pertModalInst;
    }
    return null;
}

/* ── Utilidades ──────────────────────────────────────────────── */
function pertEsc(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function pertNotificar(msg, tipo) {
    tipo = tipo || 'success';
    var cfg = {
        success: { bg: '#2d6a4f', icon: 'bi bi-check-circle-fill' },
        danger:  { bg: '#a93226', icon: 'bi bi-trash3-fill' },
        warning: { bg: '#b7770d', icon: 'bi bi-exclamation-triangle-fill' }
    };
    var c = cfg[tipo] || cfg.success;

    var prev = document.getElementById('pert-notif-el');
    if (prev) prev.remove();

    var el = document.createElement('div');
    el.id = 'pert-notif-el';
    el.className = 'pert-notif';
    el.style.background = c.bg;
    el.innerHTML = '<div class="pert-notif-inner">' +
        '<i class="' + c.icon + '"></i>' +
        '<span>' + pertEsc(msg) + '</span>' +
        '</div>';

    document.body.appendChild(el);
    setTimeout(function() { if (el.parentNode) el.remove(); }, 4100);
}

/* ── Render de tabla ─────────────────────────────────────────── */
function pertRenderTabla() {
    var tbody = document.getElementById('cuerpo-actividades');
    var vacio = document.getElementById('estado-vacio');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (pertActividades.length === 0) {
        if (vacio) vacio.style.display = 'block';
        return;
    }
    if (vacio) vacio.style.display = 'none';

    pertActividades.forEach(function(act) {
        var predsHTML = act.predecesoras.length
            ? act.predecesoras.map(function(p) {
                return '<span class="badge bg-secondary me-1">' + pertEsc(p) + '</span>';
            }).join('')
            : '<span class="text-muted">—</span>';

        var tr = document.createElement('tr');
        tr.dataset.id = act.id;
        tr.innerHTML =
            '<td><span class="badge bg-primary">'  + pertEsc(act.id)     + '</span></td>' +
            '<td>' + pertEsc(act.nombre)   + '</td>' +
            '<td>' + act.duracion          + '</td>' +
            '<td>' + predsHTML             + '</td>' +
            '<td class="text-muted small">' + (pertEsc(act.notas) || '—') + '</td>' +
            '<td>' +
            '<div class="d-flex gap-1">' +
            '<button class="btn btn-sm btn-warning text-white" onclick="editarActividad(\'' + pertEsc(act.id) + '\')">' +
            '<i class="bi bi-pencil-fill"></i>' +
            '</button>' +
            '<button class="btn btn-sm btn-danger" onclick="eliminarActividad(\'' + pertEsc(act.id) + '\')">' +
            '<i class="bi bi-trash-fill"></i>' +
            '</button>' +
            '</div>' +
            '</td>';
        tbody.appendChild(tr);
    });
}

/* ── Modal ───────────────────────────────────────────────────── */
function abrirModal(id) {
    // Resetear instancia previa (el fragmento pudo recargarse)
    pertModalInst = null;
    pertEditandoId = id || null;
    pertLimpiarFormulario();

    var titulo = document.getElementById('modalActividadLabel');

    if (pertEditandoId) {
        var act = pertActividades.find(function(a) { return a.id === pertEditandoId; });
        if (titulo) titulo.innerHTML = '<i class="bi bi-pencil-fill me-2 text-warning"></i>Editar actividad';
        document.getElementById('act-id').value       = act.id;
        document.getElementById('act-id').disabled    = true;
        document.getElementById('act-nombre').value   = act.nombre;
        document.getElementById('act-duracion').value = act.duracion;
        document.getElementById('act-notas').value    = act.notas;
        pertTags = act.predecesoras.slice();
        pertRenderTags();
    } else {
        if (titulo) titulo.innerHTML = '<i class="bi bi-plus-circle-fill me-2 text-primary"></i>Nueva actividad';
        document.getElementById('act-id').disabled = false;
    }

    var modal = pertGetModal();
    if (modal) {
        modal.show();
    } else {
        // Fallback: disparar atributo data-bs-toggle manualmente
        var trigger = document.getElementById('btn-modal-trigger');
        if (trigger) trigger.click();
    }
}

function pertCerrarModal() {
    var modal = pertGetModal();
    if (modal) {
        modal.hide();
    } else {
        var el = document.getElementById('modalActividad');
        if (el) el.classList.remove('show');
    }
}

function pertLimpiarFormulario() {
    ['act-id','act-nombre','act-duracion','act-notas','pred-input'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.value = '';
    });
    pertTags = [];
    pertRenderTags();
}

/* ── Tag input ───────────────────────────────────────────────── */
function pertRenderTags() {
    var wrap  = document.getElementById('pred-tag-wrap');
    var input = document.getElementById('pred-input');
    if (!wrap || !input) return;

    wrap.querySelectorAll('.pert-tag').forEach(function(el) { el.remove(); });

    pertTags.forEach(function(t) {
        var span = document.createElement('span');
        span.className = 'pert-tag badge bg-primary bg-opacity-25 text-primary d-inline-flex align-items-center gap-1 me-1';
        span.style.cssText = 'font-size:.82rem; padding:4px 8px;';
        span.innerHTML = pertEsc(t) +
            ' <button type="button" onclick="quitarTag(\'' + pertEsc(t) + '\')" ' +
            'style="background:none;border:none;cursor:pointer;color:inherit;font-size:1rem;line-height:1;padding:0 2px;">×</button>';
        wrap.insertBefore(span, input);
    });
}

function manejarTagTecla(e) {
    var input = e.target;
    if (['Enter','Tab',',',' '].indexOf(e.key) !== -1) {
        e.preventDefault();
        var val = input.value.trim().toUpperCase();
        if (val && pertTags.indexOf(val) === -1) pertTags.push(val);
        input.value = '';
        pertRenderTags();
    }
    if (e.key === 'Backspace' && input.value === '' && pertTags.length) {
        pertTags.pop();
        pertRenderTags();
    }
}

function manejarTagInput(e) {
    var v = e.target.value;
    if (v.endsWith(',')) {
        var val = v.slice(0,-1).trim().toUpperCase();
        if (val && pertTags.indexOf(val) === -1) pertTags.push(val);
        e.target.value = '';
        pertRenderTags();
    }
}

function quitarTag(val) {
    pertTags = pertTags.filter(function(t) { return t !== val; });
    pertRenderTags();
}

/* ── CRUD ────────────────────────────────────────────────────── */
function guardarActividad() {
    var id       = document.getElementById('act-id').value.trim().toUpperCase();
    var nombre   = document.getElementById('act-nombre').value.trim();
    var duracion = parseFloat(document.getElementById('act-duracion').value);
    var notas    = document.getElementById('act-notas').value.trim();

    if (!id)                             return pertNotificar('El ID / Clave es obligatorio.', 'danger');
    if (!nombre)                         return pertNotificar('El nombre de actividad es obligatorio.', 'danger');
    if (isNaN(duracion) || duracion < 0) return pertNotificar('La duración debe ser un número ≥ 0.', 'danger');

    if (pertEditandoId) {
        var act = pertActividades.find(function(a) { return a.id === pertEditandoId; });
        act.nombre = nombre; act.duracion = duracion;
        act.predecesoras = pertTags.slice(); act.notas = notas;
        pertCerrarModal();
        pertRenderTabla();
        pertNotificar('Actividad "' + id + '" actualizada correctamente.');
    } else {
        if (pertActividades.find(function(a) { return a.id === id; }))
            return pertNotificar('Ya existe una actividad con ID "' + id + '".', 'warning');
        pertActividades.push({ id:id, nombre:nombre, duracion:duracion, predecesoras:pertTags.slice(), notas:notas });
        pertCerrarModal();
        pertRenderTabla();
        pertNotificar('Actividad "' + id + '" agregada correctamente.');
    }
}

function editarActividad(id) {
    if (pertFilaEdicion) pertCancelarFila();

    var act = pertActividades.find(function(a) { return a.id === id; });
    if (!act) return;

    pertFilaEdicion = id;
    pertPredInline  = act.predecesoras.slice();

    var tr = document.querySelector('#cuerpo-actividades tr[data-id="' + id + '"]');
    if (!tr) return;

    tr.id        = 'fila-edicion-row';
    tr.className = 'fila-edicion';
    tr.innerHTML = pertBuildInlineRowHTML('edit', act);

    var available = pertActividades.filter(function(a) { return a.id !== id; });
    pertRenderPredDropdown(available);
    pertUpdatePredDisplay();

    var n = document.getElementById('inline-nombre');
    if (n) { n.focus(); n.select(); }

    document.addEventListener('click', pertCloseDropdownOutside);
    window.addEventListener('scroll', pertClosePredOnScroll, true);
}

/* ── Inline row ──────────────────────────────────────────────── */

function pertSugerirId() {
    var letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (var i = 0; i < letras.length; i++) {
        if (!pertActividades.find(function(a) { return a.id === letras[i]; })) return letras[i];
    }
    return '';
}

function pertBuildInlineRowHTML(mode, act) {
    var idVal     = act ? act.id       : pertSugerirId();
    var nombreVal = act ? act.nombre   : '';
    var durVal    = act ? act.duracion : '';
    var notasVal  = act ? (act.notas || '') : '';

    var idCell = (mode === 'new')
        ? '<input type="text" id="inline-id" class="form-control form-control-sm" placeholder="ID" maxlength="5" value="' + pertEsc(idVal) + '" onkeydown="pertInlineKeydown(event)" style="max-width:70px;">'
        : '<span class="badge bg-primary px-2 py-1" style="font-size:.85rem;">' + pertEsc(idVal) + '</span>';

    return '<td>' + idCell + '</td>' +
        '<td><input type="text" id="inline-nombre" class="form-control form-control-sm" placeholder="Nombre de actividad" value="' + pertEsc(nombreVal) + '" onkeydown="pertInlineKeydown(event)"></td>' +
        '<td><input type="number" id="inline-duracion" class="form-control form-control-sm" placeholder="1" min="0" step="0.5" value="' + pertEsc(String(durVal)) + '" onkeydown="pertInlineKeydown(event)" style="max-width:100px;"></td>' +
        '<td>' +
            '<div class="inline-pred-wrap">' +
                '<div class="inline-pred-display" id="inline-pred-display" onclick="pertTogglePredDropdown(event)">' +
                    '<span id="inline-pred-text"><span class="text-muted">—</span></span>' +
                    '<i class="bi bi-chevron-down chevron"></i>' +
                '</div>' +
                '<div class="inline-pred-dropdown" id="inline-pred-dropdown"></div>' +
            '</div>' +
        '</td>' +
        '<td><input type="text" id="inline-notas" class="form-control form-control-sm" placeholder="Descripción / Notas" value="' + pertEsc(notasVal) + '" onkeydown="pertInlineKeydown(event)"></td>' +
        '<td>' +
            '<div class="d-flex gap-2 align-items-center flex-nowrap">' +
                '<button class="btn btn-sm btn-primary" onclick="pertConfirmarFila()" style="white-space:nowrap;">Confirmar</button>' +
                '<button class="btn btn-sm btn-link text-muted p-0" onclick="pertCancelarFila()" style="white-space:nowrap;">Cancelar</button>' +
            '</div>' +
        '</td>';
}

function pertAgregarFilaInline() {
    if (document.getElementById('fila-edicion-row')) {
        var f = document.getElementById('inline-id') || document.getElementById('inline-nombre');
        if (f) f.focus();
        return;
    }

    pertFilaEdicion = 'new';
    pertPredInline  = [];

    var tbody = document.getElementById('cuerpo-actividades');
    var vacio = document.getElementById('estado-vacio');
    if (!tbody) return;
    if (vacio) vacio.style.display = 'none';

    var tr = document.createElement('tr');
    tr.id        = 'fila-edicion-row';
    tr.className = 'fila-edicion';
    tr.innerHTML = pertBuildInlineRowHTML('new', null);
    tbody.appendChild(tr);

    pertRenderPredDropdown(pertActividades);
    pertUpdatePredDisplay();

    var first = document.getElementById('inline-id');
    if (first) { first.focus(); first.select(); }

    document.addEventListener('click', pertCloseDropdownOutside);
    window.addEventListener('scroll', pertClosePredOnScroll, true);
}

function pertConfirmarFila() {
    var nombreEl   = document.getElementById('inline-nombre');
    var duracionEl = document.getElementById('inline-duracion');
    var notasEl    = document.getElementById('inline-notas');

    var nombre   = nombreEl   ? nombreEl.value.trim()         : '';
    var duracion = duracionEl ? parseFloat(duracionEl.value)  : NaN;
    var notas    = notasEl    ? notasEl.value.trim()          : '';

    if (!nombre)                         return pertNotificar('El nombre de actividad es obligatorio.', 'danger');
    if (isNaN(duracion) || duracion < 0) return pertNotificar('La duración debe ser un número ≥ 0.', 'danger');

    if (pertFilaEdicion === 'new') {
        var idEl = document.getElementById('inline-id');
        var id   = idEl ? idEl.value.trim().toUpperCase() : '';
        if (!id) return pertNotificar('El ID / Clave es obligatorio.', 'danger');
        if (pertActividades.find(function(a) { return a.id === id; }))
            return pertNotificar('Ya existe una actividad con ID "' + id + '".', 'warning');

        pertActividades.push({ id: id, nombre: nombre, duracion: duracion, predecesoras: pertPredInline.slice(), notas: notas });
        pertCancelarFila();
        pertRenderTabla();
        pertNotificar('Actividad "' + id + '" agregada correctamente.');
    } else {
        var id = pertFilaEdicion;
        var act = pertActividades.find(function(a) { return a.id === id; });
        if (act) {
            act.nombre      = nombre;
            act.duracion    = duracion;
            act.predecesoras = pertPredInline.slice();
            act.notas       = notas;
        }
        pertFilaEdicion = null;
        pertPredInline  = [];
        document.removeEventListener('click', pertCloseDropdownOutside);
        window.removeEventListener('scroll', pertClosePredOnScroll, true);
        var row = document.getElementById('fila-edicion-row');
        if (row) { row.id = ''; row.className = ''; }
        pertRenderTabla();
        pertNotificar('Actividad "' + id + '" actualizada correctamente.');
    }
}

function pertCancelarFila() {
    pertFilaEdicion = null;
    pertPredInline  = [];
    document.removeEventListener('click', pertCloseDropdownOutside);
    window.removeEventListener('scroll', pertClosePredOnScroll, true);
    var row = document.getElementById('fila-edicion-row');
    if (row) row.remove();
    pertRenderTabla();
}

function pertInlineKeydown(e) {
    if (e.key === 'Enter')  { e.preventDefault(); pertConfirmarFila(); }
    if (e.key === 'Escape') { e.preventDefault(); pertCancelarFila(); }
}

/* ── Dropdown de predecesoras inline ─────────────────────────── */

function pertRenderPredDropdown(available) {
    var dropdown = document.getElementById('inline-pred-dropdown');
    if (!dropdown) return;

    if (!available || available.length === 0) {
        dropdown.innerHTML = '<div class="inline-pred-empty">Sin actividades disponibles</div>';
        return;
    }

    dropdown.innerHTML = available.map(function(act) {
        var checked = pertPredInline.indexOf(act.id) !== -1 ? 'checked' : '';
        return '<label class="inline-pred-option">' +
            '<input type="checkbox" value="' + pertEsc(act.id) + '" ' + checked + ' onchange="pertTogglePred(this)" onclick="event.stopPropagation()">' +
            '<span class="badge bg-secondary me-1" style="font-size:.75rem;">' + pertEsc(act.id) + '</span>' +
            '<span>' + pertEsc(act.nombre) + '</span>' +
        '</label>';
    }).join('');
}

function pertTogglePred(checkbox) {
    var val = checkbox.value;
    if (checkbox.checked) {
        if (pertPredInline.indexOf(val) === -1) pertPredInline.push(val);
    } else {
        pertPredInline = pertPredInline.filter(function(p) { return p !== val; });
    }
    pertUpdatePredDisplay();
}

function pertUpdatePredDisplay() {
    var span = document.getElementById('inline-pred-text');
    if (!span) return;
    if (pertPredInline.length === 0) {
        span.innerHTML = '<span class="text-muted">—</span>';
    } else {
        span.innerHTML = pertPredInline.map(function(p) {
            return '<span class="badge bg-primary me-1" style="font-size:.75rem;">' + pertEsc(p) + '</span>';
        }).join('');
    }
}

function pertTogglePredDropdown(e) {
    e.stopPropagation();
    var dropdown = document.getElementById('inline-pred-dropdown');
    var display  = document.getElementById('inline-pred-display');
    if (!dropdown || !display) return;

    var isOpen = dropdown.classList.contains('open');
    if (isOpen) {
        dropdown.classList.remove('open');
    } else {
        var rect = display.getBoundingClientRect();
        dropdown.style.top   = (rect.bottom + 2) + 'px';
        dropdown.style.left  = rect.left + 'px';
        dropdown.style.width = Math.max(rect.width, 200) + 'px';
        dropdown.classList.add('open');
    }
}

function pertCloseDropdownOutside(e) {
    var wrap = document.getElementById('inline-pred-display');
    var drop = document.getElementById('inline-pred-dropdown');
    if (!wrap || !drop) return;
    if (!wrap.contains(e.target) && !drop.contains(e.target)) {
        drop.classList.remove('open');
    }
}

function pertClosePredOnScroll(e) {
    var drop = document.getElementById('inline-pred-dropdown');
    if (!drop) return;
    if (drop.contains(e.target)) return;
    drop.classList.remove('open');
}

var pertIdAEliminar = null;

function eliminarActividad(id) {
    var act = pertActividades.find(function(a) { return a.id === id; });
    if (!act) return;

    pertIdAEliminar = id;

    var badgeEl  = document.getElementById('modal-eliminar-id');
    var nombreEl = document.getElementById('modal-eliminar-nombre');
    if (badgeEl)  badgeEl.textContent  = id;
    if (nombreEl) nombreEl.textContent = act.nombre || '';

    var el = document.getElementById('modalEliminar');
    if (el && window.bootstrap && window.bootstrap.Modal) {
        new window.bootstrap.Modal(el).show();
    }
}

function pertEjecutarEliminar() {
    var id = pertIdAEliminar;
    if (!id) return;
    pertIdAEliminar = null;

    var el = document.getElementById('modalEliminar');
    if (el && window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getInstance(el).hide();
    }

    pertActividades = pertActividades.filter(function(a) { return a.id !== id; });
    pertActividades.forEach(function(a) {
        a.predecesoras = a.predecesoras.filter(function(p) { return p !== id; });
    });
    pertRenderTabla();
    pertNotificar('Actividad "' + id + '" eliminada.', 'danger');
}

/* ── Progress bar helpers ──────────────────────────────────── */
function pertMostrarProgreso(pct, label) {
    var wrap  = document.getElementById('calc-progress-wrap');
    var bar   = document.getElementById('calc-progress-bar');
    var lbl   = document.getElementById('calc-progress-label');
    var pctEl = document.getElementById('calc-progress-pct');
    if (!wrap) return;
    wrap.style.display = 'block';
    if (bar)   { bar.style.width = pct + '%'; bar.setAttribute('aria-valuenow', pct); }
    if (lbl)   lbl.textContent = label;
    if (pctEl) pctEl.textContent = pct + '%';
}

function pertOcultarProgreso(cb) {
    var wrap = document.getElementById('calc-progress-wrap');
    if (!wrap) { cb && cb(); return; }
    setTimeout(function() { wrap.style.display = 'none'; cb && cb(); }, 350);
}

function calcular() {
    if (pertActividades.length === 0)
        return pertNotificar('No hay actividades para calcular.', 'warning');

    var pasos = [
        { pct:  8, label: 'Iniciando cálculo PERT-CPM…',      fn: null },
        { pct: 25, label: 'Ordenamiento topológico…',          fn: null },
        { pct: 50, label: 'Forward pass (tiempos tempranos)…', fn: null },
        { pct: 72, label: 'Backward pass (tiempos tardíos)…',  fn: null },
        { pct: 84, label: 'Generando diagrama de red…',        fn: pertDibujarDiagrama },
        { pct: 92, label: 'Calculando ruta crítica…',          fn: pertRenderRutaCritica },
        { pct: 97, label: 'Generando diagrama Gantt…',         fn: pertDibujarGantt },
        { pct: 100, label: '¡Cálculo completado!',             fn: null }
    ];

    var i = 0;
    function paso() {
        if (i >= pasos.length) {
            pertOcultarProgreso(function() {
                var tabEl = document.getElementById('tab-diagrama');
                if (tabEl) {
                    if (window.bootstrap && window.bootstrap.Tab)
                        new window.bootstrap.Tab(tabEl).show();
                    else
                        tabEl.click();
                }
                pertNotificar('Cálculo PERT-CPM completado.');
            });
            return;
        }
        var p = pasos[i++];
        pertMostrarProgreso(p.pct, p.label);
        if (p.fn) p.fn();
        setTimeout(paso, p.fn ? 60 : 40);
    }
    paso();
}

/* ── Ejemplo precargado ──────────────────────────────────────── */
function pertCargarEjemplo() {
    if (pertActividades.length > 0 && !confirm('¿Reemplazar las actividades actuales con el ejemplo?')) return;
    if (pertFilaEdicion) pertCancelarFila();
    pertActividades = [
        { id:'A', nombre:'Excavación',        duracion:2,  predecesoras:[],        notas:'' },
        { id:'B', nombre:'Cimentación',       duracion:4,  predecesoras:['A'],     notas:'' },
        { id:'C', nombre:'Paredes',           duracion:10, predecesoras:['B'],     notas:'' },
        { id:'D', nombre:'Techo',             duracion:6,  predecesoras:['C'],     notas:'' },
        { id:'E', nombre:'Revestimiento Ext.',duracion:4,  predecesoras:['C'],     notas:'' },
        { id:'F', nombre:'Revestimiento Int.',duracion:5,  predecesoras:['E'],     notas:'' },
        { id:'G', nombre:'Muros',             duracion:7,  predecesoras:['D'],     notas:'' },
        { id:'H', nombre:'Pintura Ext.',      duracion:9,  predecesoras:['E','G'], notas:'' },
        { id:'I', nombre:'Inst. Eléctrica',   duracion:7,  predecesoras:['C'],     notas:'' },
        { id:'J', nombre:'Divisiones',        duracion:8,  predecesoras:['F','I'], notas:'' },
        { id:'K', nombre:'Piso',              duracion:4,  predecesoras:['J'],     notas:'' },
        { id:'L', nombre:'Pintura Int.',      duracion:5,  predecesoras:['J'],     notas:'' },
        { id:'M', nombre:'Acabado Ext.',      duracion:2,  predecesoras:['H'],     notas:'' },
        { id:'N', nombre:'Acabado Int.',      duracion:6,  predecesoras:['K','L'], notas:'' }
    ];
    pertRenderTabla();
    pertNotificar('Ejemplo cargado — 14 actividades de construcción.');
}

/* ── Init ────────────────────────────────────────────────────── */
function pertInit() {
    pertModalInst = null;
    pertFilaEdicion = null;
    pertPredInline  = [];
    document.removeEventListener('click', pertCloseDropdownOutside);
    window.removeEventListener('scroll', pertClosePredOnScroll, true);
    pertPlayStopTimer();
    _pbSteps = []; _pbCurrent = null; _cpmData = null;
    _pdVP = { x: 0, y: 0, s: 1 }; _pdDrag = false;
    pertRenderTabla();
}

/* ================================================================
    Cálculo CPM: Topo Sort + Forward/Backward Pass
================================================================ */

function pertCalcularCPM() {
    if (pertActividades.length === 0) return null;

    var orden = [], vis = {};
    function topo(id) {
        if (vis[id]) return; vis[id] = true;
        var a = pertActividades.find(function(x){ return x.id===id; });
        if (a) a.predecesoras.forEach(function(p){ topo(p); });
        orden.push(id);
    }
    pertActividades.forEach(function(a){ topo(a.id); });

    var ES={}, EF={};
    orden.forEach(function(id){
        var a = pertActividades.find(function(x){ return x.id===id; });
        var e=0; a.predecesoras.forEach(function(p){ if(EF[p]>e) e=EF[p]; });
        ES[id]=e; EF[id]=e+a.duracion;
    });
    var T = Math.max.apply(null, orden.map(function(id){ return EF[id]; }));

    var LS={}, LF={};
    orden.slice().reverse().forEach(function(id){
        var a = pertActividades.find(function(x){ return x.id===id; });
        var sucs = pertActividades.filter(function(b){ return b.predecesoras.indexOf(id)!==-1; });
        LF[id] = sucs.length===0 ? T : Math.min.apply(null, sucs.map(function(b){ return LS[b.id]; }));
        LS[id] = LF[id] - a.duracion;
    });

    return { orden:orden, ES:ES, EF:EF, LS:LS, LF:LF, T:T };
}

/* ================================================================
    Diagrama PERT-CPM  –  Viewport pan/zoom + Playback
================================================================ */

var _pdVP   = { x: 0, y: 0, s: 1 };
var _pdNW   = 0, _pdNH = 0;
var _pdDrag = false, _pdDX = 0, _pdDY = 0, _pdTX = 0, _pdTY = 0;
var _pbSteps   = [];
var _pbCurrent = null;
var _pbTimer   = null;
var _cpmData   = null;

function _pSafe(id) { return String(id).replace(/[^a-zA-Z0-9]/g, '_'); }

function pertDibujarDiagrama() {
    var cont = document.getElementById('area-diagrama-pert');
    if (!cont) return;

    if (pertActividades.length === 0) {
        cont.className = 'diagrama-placeholder';
        cont.style.cssText = '';
        cont.innerHTML = '<i class="bi bi-diagram-3"></i>' +
            '<p class="mb-0 text-center">El diagrama se generará al calcular</p>';
        var pb0 = document.getElementById('diag-pb-bar');
        if (pb0) pb0.classList.add('d-none');
        return;
    }

    var cpm = pertCalcularCPM();
    if (!cpm) return;
    var ES = cpm.ES, EF = cpm.EF, LS = cpm.LS, LF = cpm.LF;

    /* ── 1. Columnas topológicas ── */
    var col = {};
    pertActividades.forEach(function(a) { if (a.predecesoras.length === 0) col[a.id] = 0; });
    var guard = pertActividades.length * 2;
    while (guard-- > 0) {
        pertActividades.forEach(function(a) {
            if (col[a.id] !== undefined) return;
            var ready = a.predecesoras.every(function(p) { return col[p] !== undefined; });
            if (ready) col[a.id] = a.predecesoras.length === 0 ? 0 :
                1 + Math.max.apply(null, a.predecesoras.map(function(p) { return col[p] | 0; }));
        });
    }
    pertActividades.forEach(function(a) { if (col[a.id] === undefined) col[a.id] = 0; });

    /* ── 2. Grupos por columna ── */
    var maxCol = 0;
    pertActividades.forEach(function(a) { if (col[a.id] > maxCol) maxCol = col[a.id]; });
    var byCol = [];
    for (var ci = 0; ci <= maxCol; ci++) byCol[ci] = [];
    pertActividades.forEach(function(a) { byCol[col[a.id]].push(a); });
    byCol.forEach(function(g) { g.sort(function(a, b) { return ES[a.id] - ES[b.id]; }); });

    /* ── 3. Dimensiones ── */
    var NW = 96, NH = 68, S1 = 20, S2 = 28;
    var COL_W = NW + 80, ROW_H = NH + 48, PAD = 28;
    var maxRows = 0;
    byCol.forEach(function(g) { if (g.length > maxRows) maxRows = g.length; });
    var SVG_W = PAD * 2 + (maxCol + 1) * COL_W - (COL_W - NW);
    var SVG_H = PAD * 2 + maxRows * ROW_H - (ROW_H - NH) + 20;

    /* ── 4. Posiciones ── */
    var pos = {};
    byCol.forEach(function(group, ci) {
        var occupied = (group.length - 1) * ROW_H + NH;
        var startY = (SVG_H - occupied) / 2 + NH / 2;
        group.forEach(function(a, ri) {
            pos[a.id] = { cx: PAD + NW / 2 + ci * COL_W, cy: startY + ri * ROW_H };
        });
    });

    /* ── 5. Críticas ── */
    var criticas = {};
    pertActividades.forEach(function(a) {
        if (+(LS[a.id] - ES[a.id]).toFixed(2) === 0) criticas[a.id] = true;
    });

    /* ── 6. Orden topológico para playback ── */
    var topoOrder = [];
    for (var tc = 0; tc <= maxCol; tc++) byCol[tc].forEach(function(a) { topoOrder.push(a.id); });
    var revOrder = topoOrder.slice().reverse();
    _cpmData = { ES: ES, EF: EF, LS: LS, LF: LF, T: cpm.T, topoOrder: topoOrder, revOrder: revOrder, criticas: criticas };
    _pbSteps = [];
    /* Pase directo: 2 sub-pasos por nodo (ES luego EF) */
    topoOrder.forEach(function(id) {
        _pbSteps.push({ type: 'fwd-es', id: id });
        _pbSteps.push({ type: 'fwd-ef', id: id });
    });
    /* Pase inverso: 2 sub-pasos por nodo (LF luego LS) */
    revOrder.forEach(function(id) {
        _pbSteps.push({ type: 'bwd-lf', id: id });
        _pbSteps.push({ type: 'bwd-ls', id: id });
    });
    /* Pase de holgura: 1 sub-paso por nodo → revela ruta crítica */
    topoOrder.forEach(function(id) {
        _pbSteps.push({ type: 'slack', id: id });
    });
    /* Total: 5N pasos (70 para N=14) */

    /* ── 7. Construir SVG ── */
    var defs = '<defs>';
    var edgesSVG = '', nodesSVG = '';

    pertActividades.forEach(function(a) {
        a.predecesoras.forEach(function(predId) {
            var src = pos[predId], dst = pos[a.id];
            if (!src || !dst) return;
            /* Siempre gris al inicio – se colorea rojo dinámicamente en el pase de holgura */
            var mid   = 'm' + _pSafe(predId) + '_' + _pSafe(a.id);
            var eid   = 'pep-' + _pSafe(predId) + '_' + _pSafe(a.id);
            var amid  = 'pea-' + _pSafe(predId) + '_' + _pSafe(a.id);
            var x1 = src.cx + NW / 2, y1 = src.cy;
            var x2 = dst.cx - NW / 2 - 1, y2 = dst.cy;
            var dx = (x2 - x1) * 0.42;
            var path = 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) +
                ' C' + (x1+dx).toFixed(1) + ',' + y1.toFixed(1) +
                ' '  + (x2-dx).toFixed(1) + ',' + y2.toFixed(1) +
                ' '  + x2.toFixed(1) + ',' + y2.toFixed(1);
            defs += '<marker id="' + mid + '" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">' +
                '<polygon id="' + amid + '" points="0 0,8 3,0 6" fill="#aaa"/></marker>';
            edgesSVG += '<g class="pert-e" data-from="' + pertEsc(predId) + '" data-to="' + pertEsc(a.id) + '"' +
                ' style="transition:opacity .25s;">' +
                '<path id="' + eid + '" d="' + path + '" fill="none" stroke="#aaa"' +
                ' stroke-width="1.6" marker-end="url(#' + mid + ')"/></g>';
        });
    });
    defs += '</defs>';

    pertActividades.forEach(function(a) {
        var p = pos[a.id]; if (!p) return;
        /* Todos los nodos comienzan NEUTRALES (guinda) – el rojo se aplica dinámicamente */
        var x = p.cx - NW / 2, y = p.cy - NH / 2;
        var safe   = _pSafe(a.id);
        var idFont = a.id.length <= 2 ? 22 : a.id.length <= 4 ? 15 : 11;
        var yd1 = y + S1, yd2 = y + S1 + S2;
        var tyTop = y + S1/2 + 4, tyBot = yd2 + S1/2 + 4;
        var n = '';
        n += '<rect x="'+(x+3)+'" y="'+(y+3)+'" width="'+NW+'" height="'+NH+'" rx="5" fill="rgba(0,0,0,0.09)"/>';
        n += '<rect x="'+x+'" y="'+y+'" width="'+NW+'" height="'+S1+'" rx="5" fill="#dbeeff"/>';
        n += '<rect x="'+x+'" y="'+(y+S1-6)+'" width="'+NW+'" height="6" fill="#dbeeff"/>';
        n += '<rect id="pnm-'+safe+'" x="'+x+'" y="'+yd1+'" width="'+NW+'" height="'+S2+'" fill="#fff"/>';
        n += '<rect x="'+x+'" y="'+yd2+'" width="'+NW+'" height="'+S1+'" rx="5" fill="#fef9e7"/>';
        n += '<rect x="'+x+'" y="'+yd2+'" width="'+NW+'" height="6" fill="#fef9e7"/>';
        n += '<rect id="pnr-'+safe+'" x="'+x+'" y="'+y+'" width="'+NW+'" height="'+NH+'" rx="5" fill="none" stroke="#7B1034" stroke-width="2"/>';
        n += '<line x1="'+x+'" y1="'+yd1+'" x2="'+(x+NW)+'" y2="'+yd1+'" stroke="#7B1034" stroke-width="0.8" opacity="0.5"/>';
        n += '<line x1="'+x+'" y1="'+yd2+'" x2="'+(x+NW)+'" y2="'+yd2+'" stroke="#7B1034" stroke-width="0.8" opacity="0.5"/>';
        n += '<line x1="'+p.cx+'" y1="'+y+'" x2="'+p.cx+'" y2="'+yd1+'" stroke="#7B1034" stroke-width="0.8" opacity="0.35"/>';
        n += '<line x1="'+p.cx+'" y1="'+yd2+'" x2="'+p.cx+'" y2="'+(y+NH)+'" stroke="#7B1034" stroke-width="0.8" opacity="0.35"/>';
        n += '<text id="pnt-'+safe+'-es" x="'+(x+NW/4)+'" y="'+tyTop+'" text-anchor="middle" font-size="10" font-weight="bold" fill="#1565c0" font-family="sans-serif">'+ES[a.id]+'</text>';
        n += '<text id="pnt-'+safe+'-ef" x="'+(x+3*NW/4)+'" y="'+tyTop+'" text-anchor="middle" font-size="10" font-weight="bold" fill="#1565c0" font-family="sans-serif">'+EF[a.id]+'</text>';
        n += '<text id="pni-'+safe+'" x="'+p.cx+'" y="'+p.cy+'" text-anchor="middle" dominant-baseline="middle" font-size="'+idFont+'" font-weight="bold" fill="#7B1034" font-family="sans-serif">'+pertEsc(a.id)+'</text>';
        n += '<text id="pnt-'+safe+'-ls" x="'+(x+NW/4)+'" y="'+tyBot+'" text-anchor="middle" font-size="10" font-weight="bold" fill="#b71c1c" font-family="sans-serif">'+LS[a.id]+'</text>';
        n += '<text id="pnt-'+safe+'-lf" x="'+(x+3*NW/4)+'" y="'+tyBot+'" text-anchor="middle" font-size="10" font-weight="bold" fill="#b71c1c" font-family="sans-serif">'+LF[a.id]+'</text>';
        n += '<text x="'+p.cx+'" y="'+(y+NH+13)+'" text-anchor="middle" font-size="9" fill="#888" font-family="sans-serif">'+a.duracion+' días</text>';
        nodesSVG += '<g id="pn-'+safe+'" class="pert-n" style="transition:opacity .25s,filter .25s;">'+n+'</g>';
    });

    /* ── 8. Inyectar estructura ── */
    _pdNW = SVG_W; _pdNH = SVG_H + 10;
    _pdVP = { x: 0, y: 0, s: 1 };
    _pbCurrent = null;
    pertPlayStopTimer();

    cont.className = '';
    cont.style.cssText = 'position:relative;height:480px;overflow:hidden;background:#f8f9fc;border-radius:8px 8px 0 0;';
    cont.innerHTML =
        '<div id="diag-zoom-panel" class="diag-zoom-panel">' +
            '<button class="diag-zoom-btn" onclick="pertZoomIn()" title="Acercar"><i class="bi bi-plus-lg"></i></button>' +
            '<button class="diag-zoom-btn" onclick="pertZoomOut()" title="Alejar"><i class="bi bi-dash-lg"></i></button>' +
            '<div class="diag-zoom-sep"></div>' +
            '<button class="diag-zoom-btn" onclick="pertFitView()" title="Ajustar vista"><i class="bi bi-fullscreen"></i></button>' +
            '<button class="diag-zoom-btn" onclick="pertDownloadDiag()" title="Descargar SVG"><i class="bi bi-download"></i></button>' +
        '</div>' +
        '<svg id="pert-svg-c" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style="display:block;cursor:grab;">' +
        defs + '<g id="pert-vp">' + edgesSVG + nodesSVG + '</g></svg>';

    pertInitDiagEvents();
    setTimeout(pertFitView, 60);

    /* ── 9. Playback bar ── */
    var pb = document.getElementById('diag-pb-bar');
    if (pb) {
        pb.classList.remove('d-none');
        var slider = document.getElementById('diag-pb-slider');
        if (slider) { slider.max = _pbSteps.length - 1; slider.value = _pbSteps.length - 1; }
        var label = document.getElementById('diag-pb-label');
        if (label) label.textContent = _pbSteps.length + ' / ' + _pbSteps.length + ' · Completo';
    }
}

/* ── Helpers de viewport ── */
function _pertApplyVP() {
    var vp = document.getElementById('pert-vp');
    if (vp) vp.setAttribute('transform',
        'translate('+_pdVP.x.toFixed(1)+','+_pdVP.y.toFixed(1)+') scale('+_pdVP.s.toFixed(3)+')');
}

function pertInitDiagEvents() {
    var svg = document.getElementById('pert-svg-c');
    if (!svg || svg._dInit) return;
    svg._dInit = true;

    svg.addEventListener('wheel', function(e) {
        e.preventDefault();
        var r = svg.getBoundingClientRect();
        var mx = e.clientX - r.left, my = e.clientY - r.top;
        var f = e.deltaY < 0 ? 1.12 : 0.893;
        _pdVP.x = mx + f * (_pdVP.x - mx);
        _pdVP.y = my + f * (_pdVP.y - my);
        _pdVP.s = Math.min(4, Math.max(0.1, _pdVP.s * f));
        _pertApplyVP();
    }, { passive: false });

    svg.addEventListener('mousedown', function(e) {
        if (e.button !== 0) return;
        _pdDrag = true; _pdDX = e.clientX; _pdDY = e.clientY;
        _pdTX = _pdVP.x; _pdTY = _pdVP.y;
        svg.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', function(e) {
        if (!_pdDrag) return;
        _pdVP.x = _pdTX + (e.clientX - _pdDX);
        _pdVP.y = _pdTY + (e.clientY - _pdDY);
        _pertApplyVP();
    });
    document.addEventListener('mouseup', function() {
        if (!_pdDrag) return;
        _pdDrag = false;
        var s = document.getElementById('pert-svg-c');
        if (s) s.style.cursor = 'grab';
    });
}

function pertZoomIn()  { _pertZoomBy(1.2);  }
function pertZoomOut() { _pertZoomBy(0.833); }
function _pertZoomBy(f) {
    var c = document.getElementById('pert-svg-c');
    if (!c) return;
    var r = c.getBoundingClientRect();
    var mx = r.width / 2, my = r.height / 2;
    _pdVP.x = mx + f * (_pdVP.x - mx);
    _pdVP.y = my + f * (_pdVP.y - my);
    _pdVP.s = Math.min(4, Math.max(0.1, _pdVP.s * f));
    _pertApplyVP();
}

function pertFitView() {
    var c = document.getElementById('pert-svg-c');
    if (!c || !_pdNW) return;
    var cw = c.clientWidth, ch = c.clientHeight, pad = 32;
    var s = Math.min((cw - pad*2) / _pdNW, (ch - pad*2) / _pdNH);
    _pdVP.s = s; _pdVP.x = (cw - _pdNW*s)/2; _pdVP.y = (ch - _pdNH*s)/2;
    _pertApplyVP();
}

function pertDownloadDiag() {
    var svg = document.getElementById('pert-svg-c');
    if (!svg) return;
    var clone = svg.cloneNode(true);
    clone.setAttribute('width', _pdNW);
    clone.setAttribute('height', _pdNH);
    var vp = clone.querySelector('#pert-vp');
    if (vp) vp.setAttribute('transform', 'translate(0,0) scale(1)');
    clone.querySelectorAll('.pert-n,.pert-e').forEach(function(el) {
        el.style.opacity = '1'; el.style.filter = '';
    });
    /* Restaurar valores y colores críticos en el clon */
    if (_cpmData) {
        _cpmData.topoOrder.forEach(function(id) {
            var safe = _pSafe(id);
            var fields = { es: _cpmData.ES[id], ef: _cpmData.EF[id], ls: _cpmData.LS[id], lf: _cpmData.LF[id] };
            Object.keys(fields).forEach(function(f) {
                var t = clone.querySelector('#pnt-' + safe + '-' + f);
                if (t) t.textContent = String(fields[f]);
            });
            var isCrit = !!_cpmData.criticas[id];
            var rBorder = clone.querySelector('#pnr-' + safe);
            var rFill   = clone.querySelector('#pnm-' + safe);
            var tId     = clone.querySelector('#pni-' + safe);
            if (rBorder) { rBorder.setAttribute('stroke', isCrit ? '#1565c0' : '#7B1034'); rBorder.setAttribute('stroke-width', isCrit ? '3.5' : '2'); }
            if (rFill)   rFill.setAttribute('fill', isCrit ? '#e3f2fd' : '#fff');
            if (tId)     tId.setAttribute('fill', isCrit ? '#0d47a1' : '#7B1034');
        });
        pertActividades.forEach(function(a) {
            a.predecesoras.forEach(function(p) {
                var isCrit = !!(  _cpmData.criticas[p] && _cpmData.criticas[a.id]);
                var key = _pSafe(p) + '_' + _pSafe(a.id);
                var path = clone.querySelector('#pep-' + key);
                var arr  = clone.querySelector('#pea-' + key);
                if (path) { path.setAttribute('stroke', isCrit ? '#1565c0' : '#aaa'); path.setAttribute('stroke-width', isCrit ? '3' : '1.6'); }
                if (arr)  arr.setAttribute('fill', isCrit ? '#1565c0' : '#aaa');
            });
        });
    }
    var str = new XMLSerializer().serializeToString(clone);
    var blob = new Blob([str], { type: 'image/svg+xml' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'pert-diagrama.svg'; a.click();
    setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
}

/* ── Playback ── */
function _pertSetNodeVal(id, field, val) {
    var el = document.getElementById('pnt-' + _pSafe(id) + '-' + field);
    if (el) el.textContent = String(val);
}

/* Aplica o quita el color de ruta crítica en un nodo */
function _pertNodeMark(id, isCrit) {
    var safe = _pSafe(id);
    var rBorder = document.getElementById('pnr-' + safe);
    var rFill   = document.getElementById('pnm-' + safe);
    var tId     = document.getElementById('pni-' + safe);
    if (rBorder) { rBorder.setAttribute('stroke', isCrit ? '#1565c0' : '#7B1034'); rBorder.setAttribute('stroke-width', isCrit ? '3.5' : '2'); }
    if (rFill)   rFill.setAttribute('fill', isCrit ? '#e3f2fd' : '#fff');
    if (tId)     tId.setAttribute('fill', isCrit ? '#0d47a1' : '#7B1034');
}

/* Aplica o quita el color de ruta crítica en una arista */
function _pertEdgeMark(from, to, isCrit) {
    var key  = _pSafe(from) + '_' + _pSafe(to);
    var path = document.getElementById('pep-' + key);
    var arr  = document.getElementById('pea-' + key);
    var col  = isCrit ? '#1565c0' : '#aaa';
    var sw   = isCrit ? '3' : '1.6';
    if (path) { path.setAttribute('stroke', col); path.setAttribute('stroke-width', sw); }
    if (arr)  arr.setAttribute('fill', col);
}

/* Resetea todos los nodos y aristas a colores neutros */
function _pertResetAllMarks(cpm) {
    if (!cpm) return;
    cpm.topoOrder.forEach(function(id) { _pertNodeMark(id, false); });
    pertActividades.forEach(function(a) {
        a.predecesoras.forEach(function(p) { _pertEdgeMark(p, a.id, false); });
    });
}

function pertPlaySetStep(n) {
    _pbCurrent = n;
    var total = _pbSteps.length;
    var atEnd = (n === null || n >= total - 1);
    var slider = document.getElementById('diag-pb-slider');
    var label  = document.getElementById('diag-pb-label');
    if (slider) slider.value = atEnd ? total - 1 : n;

    var cpm = _cpmData;
    if (!cpm) return;

    if (atEnd) {
        /* Restaurar valores y aplicar colores de ruta crítica */
        cpm.topoOrder.forEach(function(id) {
            _pertSetNodeVal(id, 'es', cpm.ES[id]);
            _pertSetNodeVal(id, 'ef', cpm.EF[id]);
            _pertSetNodeVal(id, 'ls', cpm.LS[id]);
            _pertSetNodeVal(id, 'lf', cpm.LF[id]);
            _pertNodeMark(id, !!cpm.criticas[id]);
        });
        pertActividades.forEach(function(a) {
            a.predecesoras.forEach(function(p) {
                _pertEdgeMark(p, a.id, !!(cpm.criticas[p] && cpm.criticas[a.id]));
            });
        });
        cpm.topoOrder.forEach(function(id) {
            var el = document.getElementById('pn-' + _pSafe(id));
            if (!el) return;
            el.style.opacity = '1';
            el.style.filter  = cpm.criticas[id] ? 'drop-shadow(0 0 10px rgba(21,101,192,.75))' : '';
        });
        document.querySelectorAll('.pert-e').forEach(function(el) { el.style.opacity='1'; });
        if (label) label.textContent = total + ' / ' + total + ' · Completo';
        return;
    }

    /* Al inicio de cualquier paso no-final: quitar marcas críticas residuales */
    _pertResetAllMarks(cpm);

    var step     = _pbSteps[n];
    var activeId = step.id;
    var act      = activeId ? pertActividades.find(function(a) { return a.id === activeId; }) : null;
    var actName  = act ? act.nombre : '';

    /* ── Label con fase y campo ── */
    if (label) {
        var fieldTag = step.type === 'fwd-es' ? 'ES' :
                       step.type === 'fwd-ef' ? 'EF' :
                       step.type === 'bwd-lf' ? 'LF' :
                       step.type === 'bwd-ls' ? 'LS' : 'Holgura';
        var arrow = step.type.startsWith('fwd') ? '→' :
                    step.type.startsWith('bwd') ? '←' : '◆';
        label.textContent = (n + 1) + ' / ' + total + '  ' + arrow + '  ' + fieldTag + ' · ' + actName;
    }

    /* ════════════════════════════════════════
       PASE DIRECTO: calcular ES y EF
       ════════════════════════════════════════ */
    if (step.type === 'fwd-es' || step.type === 'fwd-ef') {
        var curFwdIdx = cpm.topoOrder.indexOf(activeId);
        var showEF    = (step.type === 'fwd-ef');

        cpm.topoOrder.forEach(function(id, i) {
            if (i < curFwdIdx) {
                _pertSetNodeVal(id, 'es', cpm.ES[id]);
                _pertSetNodeVal(id, 'ef', cpm.EF[id]);
            } else if (i === curFwdIdx) {
                _pertSetNodeVal(id, 'es', cpm.ES[id]);          /* ES ya calculado */
                _pertSetNodeVal(id, 'ef', showEF ? cpm.EF[id] : '?');
            } else {
                _pertSetNodeVal(id, 'es', '?');
                _pertSetNodeVal(id, 'ef', '?');
            }
            _pertSetNodeVal(id, 'ls', '?');
            _pertSetNodeVal(id, 'lf', '?');

            var el = document.getElementById('pn-' + _pSafe(id));
            if (!el) return;
            if (i < curFwdIdx)        { el.style.opacity='1';    el.style.filter=''; }
            else if (i === curFwdIdx)  { el.style.opacity='1';    el.style.filter='drop-shadow(0 0 9px rgba(123,16,52,.85))'; }
            else                       { el.style.opacity='0.18'; el.style.filter=''; }
        });

        document.querySelectorAll('.pert-e').forEach(function(eg) {
            var fi = cpm.topoOrder.indexOf(eg.getAttribute('data-from'));
            var ti = cpm.topoOrder.indexOf(eg.getAttribute('data-to'));
            eg.style.opacity = (fi <= curFwdIdx && ti <= curFwdIdx) ? '1' : '0.06';
        });

    /* ════════════════════════════════════════
       PASE INVERSO: calcular LF y LS
       ════════════════════════════════════════ */
    } else if (step.type === 'bwd-lf' || step.type === 'bwd-ls') {
        var curBwdIdx = cpm.revOrder.indexOf(activeId);
        var showLS    = (step.type === 'bwd-ls');

        /* Nodos ya completados en pase inverso */
        var bwdFullDone = {};
        for (var bi = 0; bi < curBwdIdx; bi++) bwdFullDone[cpm.revOrder[bi]] = true;
        if (showLS) bwdFullDone[activeId] = true; /* Al llegar a LS, el nodo activo queda completo */

        cpm.topoOrder.forEach(function(id) {
            /* ES/EF siempre visibles en pase inverso */
            _pertSetNodeVal(id, 'es', cpm.ES[id]);
            _pertSetNodeVal(id, 'ef', cpm.EF[id]);

            if (bwdFullDone[id]) {
                _pertSetNodeVal(id, 'lf', cpm.LF[id]);
                _pertSetNodeVal(id, 'ls', cpm.LS[id]);
            } else if (id === activeId) {
                /* bwd-lf: solo se revela LF; LS aún pendiente */
                _pertSetNodeVal(id, 'lf', cpm.LF[id]);
                _pertSetNodeVal(id, 'ls', '?');
            } else {
                _pertSetNodeVal(id, 'lf', '?');
                _pertSetNodeVal(id, 'ls', '?');
            }

            var el = document.getElementById('pn-' + _pSafe(id));
            if (!el) return;
            if (id === activeId)        { el.style.opacity='1';    el.style.filter='drop-shadow(0 0 9px rgba(21,101,192,.9))'; }
            else if (bwdFullDone[id])   { el.style.opacity='1';    el.style.filter=''; }
            else                        { el.style.opacity='0.55'; el.style.filter=''; }
        });

        document.querySelectorAll('.pert-e').forEach(function(eg) { eg.style.opacity='1'; });

    /* ════════════════════════════════════════
       PASE DE HOLGURA: revelar ruta crítica
       ════════════════════════════════════════ */
    } else if (step.type === 'slack') {
        var slackIdx = cpm.topoOrder.indexOf(activeId);

        /* Todos los valores ya están completos en este pase */
        cpm.topoOrder.forEach(function(id) {
            _pertSetNodeVal(id, 'es', cpm.ES[id]);
            _pertSetNodeVal(id, 'ef', cpm.EF[id]);
            _pertSetNodeVal(id, 'ls', cpm.LS[id]);
            _pertSetNodeVal(id, 'lf', cpm.LF[id]);
        });

        /* Marcado progresivo: solo los ya analizados reciben color crítico */
        var analyzedSet = {};
        for (var si = 0; si < slackIdx; si++) analyzedSet[cpm.topoOrder[si]] = true;

        cpm.topoOrder.forEach(function(id, i) {
            var isCrit = !!cpm.criticas[id];
            var el = document.getElementById('pn-' + _pSafe(id));
            if (!el) return;
            if (i < slackIdx) {
                _pertNodeMark(id, isCrit);
                el.style.opacity = '1';
                el.style.filter  = isCrit ? 'drop-shadow(0 0 6px rgba(21,101,192,.65))' : '';
            } else if (i === slackIdx) {
                /* Siendo analizado ahora: halo ámbar, aún sin color crítico */
                el.style.opacity = '1';
                el.style.filter  = 'drop-shadow(0 0 9px rgba(183,119,13,.95))';
            } else {
                el.style.opacity = '0.5';
                el.style.filter  = '';
            }
        });

        /* Colorear aristas críticas solo entre nodos ya analizados */
        pertActividades.forEach(function(a) {
            a.predecesoras.forEach(function(p) {
                if (analyzedSet[p] && analyzedSet[a.id]) {
                    _pertEdgeMark(p, a.id, !!(cpm.criticas[p] && cpm.criticas[a.id]));
                }
            });
        });

        document.querySelectorAll('.pert-e').forEach(function(eg) {
            var fi = cpm.topoOrder.indexOf(eg.getAttribute('data-from'));
            var ti = cpm.topoOrder.indexOf(eg.getAttribute('data-to'));
            eg.style.opacity = (fi <= slackIdx && ti <= slackIdx) ? '1' : '0.3';
        });
    }
}

function pertPlayGo(n) {
    pertPlayStopTimer();
    pertPlaySetStep(n < 0 ? _pbSteps.length - 1 : n);
}
function pertPlayStep(dir) {
    pertPlayStopTimer();
    var cur = (_pbCurrent === null) ? _pbSteps.length - 1 : _pbCurrent;
    pertPlaySetStep(Math.max(0, Math.min(_pbSteps.length - 1, cur + dir)));
}
function pertPlaySeek(n) {
    pertPlayStopTimer();
    pertPlaySetStep(n >= _pbSteps.length - 1 ? null : +n);
}
function pertPlayToggle() {
    if (_pbTimer) { pertPlayStopTimer(); return; }
    var btn = document.getElementById('diag-pb-play');
    if (btn) btn.innerHTML = '<i class="bi bi-pause-fill"></i>';
    var start = (_pbCurrent === null || _pbCurrent >= _pbSteps.length - 1) ? 0 : _pbCurrent + 1;
    pertPlaySetStep(start);
    _pbTimer = setInterval(function() {
        var next = ((_pbCurrent === null ? _pbSteps.length - 1 : _pbCurrent) + 1);
        if (next >= _pbSteps.length) { pertPlayStopTimer(); pertPlaySetStep(null); }
        else pertPlaySetStep(next);
    }, 900);
}
function pertPlayStopTimer() {
    if (_pbTimer) { clearInterval(_pbTimer); _pbTimer = null; }
    var btn = document.getElementById('diag-pb-play');
    if (btn) btn.innerHTML = '<i class="bi bi-play-fill"></i>';
}

/* ================================================================
    Módulo Ruta Crítica
================================================================ */

function pertRenderRutaCritica() {
    var tbody  = document.getElementById('cuerpo-ruta');
    var resumen = document.getElementById('rc-resumen');
    if (!tbody) return;

    if (pertActividades.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="7" class="text-center text-muted py-4">' +
            '<i class="bi bi-info-circle me-2"></i>' +
            'Agrega actividades y presiona <strong>Calcular</strong>' +
            '</td></tr>';
        if (resumen) resumen.innerHTML = '';
        return;
    }

    var cpm = pertCalcularCPM();
    if (!cpm) return;
    var ES=cpm.ES, EF=cpm.EF, LS=cpm.LS, LF=cpm.LF, T=cpm.T, orden=cpm.orden;

    tbody.innerHTML = '';
    var criticas = [];

    orden.forEach(function(id){
        var a = pertActividades.find(function(x){ return x.id===id; });
        var holgura = +(LS[id] - ES[id]).toFixed(2);
        var critica  = holgura === 0;
        if (critica) criticas.push(id);

        var tr = document.createElement('tr');
        if (critica) tr.className = 'ruta-critica';
        tr.innerHTML =
            '<td>' +
                '<span class="badge ' + (critica ? 'bg-danger' : 'bg-secondary') + ' me-1">' + pertEsc(id) + '</span>' +
                '<span class="text-muted small">' + pertEsc(a ? a.nombre : '') + '</span>' +
                (critica ? ' <i class="bi bi-fire text-danger small ms-1" title="Ruta crítica"></i>' : '') +
            '</td>' +
            '<td class="fw-semibold text-center">' + ES[id] + '</td>' +
            '<td class="fw-semibold text-center">' + EF[id] + '</td>' +
            '<td class="fw-semibold text-center">' + LS[id] + '</td>' +
            '<td class="fw-semibold text-center">' + LF[id] + '</td>' +
            '<td class="fw-semibold text-center">' + a.duracion + '</td>' +
            '<td class="text-center">' +
                '<span class="badge rounded-pill ' + (critica ? 'bg-danger' : 'bg-success') + '">' + holgura + '</span>' +
            '</td>';
        tbody.appendChild(tr);
    });

    if (resumen) {
        var flechas = criticas.map(function(id){
            return '<span class="badge bg-danger px-2 py-1">' + pertEsc(id) + '</span>';
        }).join('<i class="bi bi-arrow-right-short text-danger mx-1 fs-5 align-middle"></i>');

        resumen.innerHTML =
            '<div class="rc-banner mb-3">' +
                '<div class="rc-banner-header">' +
                    '<i class="bi bi-exclamation-diamond-fill me-2"></i>' +
                    'Ruta Crítica &nbsp;·&nbsp; Duración total: <strong>' + T + ' días</strong>' +
                '</div>' +
                '<div class="rc-banner-path">' + flechas + '</div>' +
                '<div class="rc-banner-note">' +
                    '<i class="bi bi-info-circle me-1"></i>' +
                    'Las actividades con holgura = 0 determinan la duración mínima del proyecto. ' +
                    'Cualquier retraso en ellas alarga el proyecto.' +
                '</div>' +
            '</div>';
    }
}

/* ================================================================
    Diagrama de Gantt
================================================================ */

function pertDibujarGantt() {
    var cont     = document.getElementById('area-gantt');
    var leyenda  = document.getElementById('gantt-leyenda');
    var durBadge = document.getElementById('gantt-duracion-total');
    if (!cont) return;

    if (pertActividades.length === 0) {
        cont.className = 'diagrama-placeholder';
        cont.style     = '';
        cont.innerHTML = '<i class="bi bi-bar-chart-steps"></i><p class="mb-0 text-center">El diagrama se generará al calcular</p>';
        if (leyenda)  leyenda.classList.add('d-none');
        if (durBadge) durBadge.innerHTML = '';
        return;
    }

    var cpm = pertCalcularCPM();
    if (!cpm) return;
    var ES = cpm.ES, EF = cpm.EF, LS = cpm.LS, LF = cpm.LF, T = cpm.T, orden = cpm.orden;

    /* ── Layout ── */
    var LABEL_W  = 240;
    var HEADER_H = 40;
    var ROW_H    = 40;
    var BAR_H    = 22;
    var N        = pertActividades.length;
    var DAY_W    = Math.max(14, Math.min(44, Math.floor(760 / Math.max(T, 1))));
    var step     = T <= 20 ? 1 : T <= 40 ? 2 : T <= 80 ? 5 : 10;
    var SVG_W    = LABEL_W + (T + 1) * DAY_W + 12;
    var SVG_H    = HEADER_H + N * ROW_H + 4;

    /* ── Critical set ── */
    var criticas = {};
    pertActividades.forEach(function(a) {
        if (+(LS[a.id] - ES[a.id]).toFixed(2) === 0) criticas[a.id] = true;
    });

    /* ── SVG parts ── */
    var defs =
        '<defs></defs>';

    var bg = '', grid = '', rows = '';

    /* Background & header */
    bg += '<rect x="0" y="0" width="' + SVG_W + '" height="' + SVG_H + '" fill="#fafafa"/>';
    bg += '<rect x="0" y="0" width="' + SVG_W + '" height="' + HEADER_H + '" fill="#ede9ed"/>';
    bg += '<rect x="0" y="0" width="' + LABEL_W + '" height="' + HEADER_H + '" fill="#e0dce0"/>';
    bg += '<text x="' + (LABEL_W/2) + '" y="' + (HEADER_H/2 + 5) + '" text-anchor="middle" font-size="12" font-weight="bold" fill="#444" font-family="sans-serif">Actividad</text>';
    bg += '<line x1="' + LABEL_W + '" y1="0" x2="' + LABEL_W + '" y2="' + SVG_H + '" stroke="#9a8490" stroke-width="2"/>';

    /* Day grid & labels */
    for (var d = 0; d <= T; d++) {
        var gx = LABEL_W + d * DAY_W;
        var major = (d % step === 0);
        grid += '<line x1="' + gx + '" y1="' + HEADER_H + '" x2="' + gx + '" y2="' + SVG_H + '"' +
                ' stroke="' + (major ? '#d0c8d0' : '#eae6ea') + '" stroke-width="' + (major ? 1 : 0.5) + '"/>';
        if (major) {
            var lx = gx + (step * DAY_W / 2);
            if (lx < SVG_W - 4) {
                grid += '<text x="' + lx + '" y="' + (HEADER_H/2 + 5) + '" text-anchor="middle" font-size="11" fill="#555" font-family="sans-serif">' + d + '</text>';
            }
        }
    }
    grid += '<line x1="0" y1="' + HEADER_H + '" x2="' + SVG_W + '" y2="' + HEADER_H + '" stroke="#c0b8c0" stroke-width="1.5"/>';

    /* Activity rows */
    orden.forEach(function(id, i) {
        var a = pertActividades.find(function(x) { return x.id === id; });
        if (!a) return;

        var rowY    = HEADER_H + i * ROW_H;
        var midY    = rowY + ROW_H / 2;
        var critica = !!criticas[id];
        var holgura = +(LS[id] - ES[id]).toFixed(2);

        /* Alternating row stripe */
        if (i % 2 === 1) {
            rows += '<rect x="0" y="' + rowY + '" width="' + SVG_W + '" height="' + ROW_H + '" fill="#f5f3f5" opacity="0.5"/>';
        }
        rows += '<line x1="0" y1="' + (rowY + ROW_H) + '" x2="' + SVG_W + '" y2="' + (rowY + ROW_H) + '" stroke="#e8e4e8" stroke-width="0.8"/>';

        /* Label column */
        if (critica) {
            rows += '<rect x="0" y="' + rowY + '" width="' + LABEL_W + '" height="' + ROW_H + '" fill="#fff0f0" opacity="0.8"/>';
        }

        var badgeColor = critica ? '#e53935' : '#1e88e5';
        rows += '<rect x="8" y="' + (midY - 11) + '" width="32" height="22" rx="4" fill="' + badgeColor + '"/>';
        rows += '<text x="24" y="' + (midY + 5) + '" text-anchor="middle" font-size="10" font-weight="bold" fill="#fff" font-family="sans-serif">' + pertEsc(id) + '</text>';

        var nombre  = a.nombre || id;
        var maxLen  = Math.floor((LABEL_W - 50) / 6.8);
        if (nombre.length > maxLen) nombre = nombre.substring(0, maxLen - 1) + '…';
        rows += '<text x="46" y="' + (midY + 5) + '" font-size="11"' +
                ' fill="' + (critica ? '#e53935' : '#333') + '"' +
                ' font-family="sans-serif" font-weight="' + (critica ? '600' : 'normal') + '">' +
                pertEsc(nombre) + '</text>';

        /* Slack bar (LS → LF window, dashed) */
        if (holgura > 0) {
            var sx = LABEL_W + LS[id] * DAY_W;
            var sw = a.duracion * DAY_W;
            rows += '<rect x="' + sx + '" y="' + (midY - BAR_H/2) + '" width="' + sw + '" height="' + BAR_H + '"' +
                    ' rx="4" fill="#ddd" fill-opacity="0.45" stroke="#bbb" stroke-width="1.2" stroke-dasharray="4,3"/>';
        }

        /* Main bar (ES → EF) */
        var bx = LABEL_W + ES[id] * DAY_W;
        var bw = a.duracion * DAY_W;
        var by = midY - BAR_H / 2;
        rows += '<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + BAR_H + '"' +
                ' rx="4" fill="' + (critica ? '#e53935' : '#1e88e5') + '"' +
                ' stroke="' + (critica ? '#c62828' : '#1565c0') + '" stroke-width="1.5"/>';

        /* Duration label inside bar */
        if (bw >= 28) {
            rows += '<text x="' + (bx + bw/2) + '" y="' + (by + BAR_H/2 + 4) + '"' +
                    ' text-anchor="middle" font-size="10" font-weight="bold" fill="#fff" font-family="sans-serif">' +
                    a.duracion + 'd</text>';
        }

        /* Slack magnitude label (right of bar) */
        if (holgura > 0 && DAY_W >= 18) {
            rows += '<text x="' + (LABEL_W + EF[id] * DAY_W + 4) + '" y="' + (midY + 4) + '"' +
                    ' font-size="9" fill="#aaa" font-family="sans-serif">+' + holgura + '</text>';
        }
    });

    /* ── Render ── */
    cont.className = '';
    cont.style.cssText = 'overflow-x:auto;border-radius:8px;border:1px solid #e0dce0;background:#fff;';
    cont.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="' + SVG_W + '" height="' + SVG_H + '"' +
        ' style="display:block;min-width:' + SVG_W + 'px;">' +
        defs + bg + grid + rows +
        '</svg>';

    if (leyenda)  leyenda.classList.remove('d-none');
    if (durBadge) durBadge.innerHTML =
        '<span class="badge bg-secondary">Duración total: <strong>' + T + '</strong> días</span>';
}

/* ── Hooks de tabs ── */
document.addEventListener('shown.bs.tab', function(e) {
    if (e.target && e.target.id === 'tab-diagrama') pertDibujarDiagrama();
    if (e.target && e.target.id === 'tab-ruta')     pertRenderRutaCritica();
    if (e.target && e.target.id === 'tab-gantt')    pertDibujarGantt();
});