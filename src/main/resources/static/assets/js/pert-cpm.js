/* ================================================================
   pert-cpm.js  –  Lógica del módulo PERT-CPM
   Compatible con Mazer + Bootstrap 5 (archivos estáticos)
   ================================================================ */

/* ── Estado global ───────────────────────────────────────────── */
var pertActividades = [];
var pertEditandoId  = null;
var pertTags        = [];
var pertModalInst   = null;  // instancia del modal, se crea lazy

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
    var iconos = { success: '✅', danger: '❌', warning: '⚠️' };
    var colores = { success: 'alert-success', danger: 'alert-danger', warning: 'alert-warning' };

    // Eliminar alertas anteriores
    document.querySelectorAll('.pert-alerta').forEach(function(el) { el.remove(); });

    var div = document.createElement('div');
    div.className = 'alert ' + (colores[tipo] || 'alert-info') + ' alert-dismissible fade show pert-alerta mt-3';
    div.setAttribute('role', 'alert');
    div.innerHTML = (iconos[tipo] || '') + ' ' + pertEsc(msg) +
        '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>';

    // Insertar debajo de la tabla
    var ref = document.getElementById('estado-vacio') || document.getElementById('cuerpo-actividades');
    if (ref && ref.parentNode) {
        ref.parentNode.insertBefore(div, ref.nextSibling);
    }
    setTimeout(function() { div.remove(); }, 3500);
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

function editarActividad(id) { abrirModal(id); }

function eliminarActividad(id) {
    if (!confirm('¿Eliminar la actividad "' + id + '"?')) return;
    pertActividades = pertActividades.filter(function(a) { return a.id !== id; });
    pertActividades.forEach(function(a) {
        a.predecesoras = a.predecesoras.filter(function(p) { return p !== id; });
    });
    pertRenderTabla();
    pertNotificar('Actividad "' + id + '" eliminada.', 'danger');
}

function calcular() {
    if (pertActividades.length === 0)
        return pertNotificar('No hay actividades para calcular.', 'warning');
    pertNotificar('Datos listos para el cálculo PERT-CPM.');
}

/* ── Init ────────────────────────────────────────────────────── */
function pertInit() {
    pertModalInst = null; // resetear al recargar el fragmento
    pertRenderTabla();
}