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

/* ================================================================
   AGREGAR al final de pert-cpm.js  –  Diagrama PERT-CPM
================================================================ */

function pertDibujarDiagrama() {
    var cont = document.getElementById('area-diagrama-pert');
    if (!cont) return;
    if (pertActividades.length === 0) {
        cont.innerHTML = '<div class="text-center text-muted py-5"><i class="bi bi-diagram-3 fs-1 d-block mb-2"></i><p class="mb-0">Agrega actividades y presiona <strong>Calcular</strong></p></div>';
        return;
    }

    /* ── 1. TOPO SORT ── */
    var orden = [], vis = {};
    function topo(id) {
        if (vis[id]) return; vis[id] = true;
        var a = pertActividades.find(function(x){ return x.id===id; });
        if (a) a.predecesoras.forEach(function(p){ topo(p); });
        orden.push(id);
    }
    pertActividades.forEach(function(a){ topo(a.id); });

    /* ── 2. FORWARD / BACKWARD PASS ── */
    var ES={}, EF={}, LS={}, LF={};
    orden.forEach(function(id){
        var a = pertActividades.find(function(x){ return x.id===id; });
        var e=0; a.predecesoras.forEach(function(p){ if(EF[p]>e) e=EF[p]; });
        ES[id]=e; EF[id]=e+a.duracion;
    });
    var T = Math.max.apply(null, orden.map(function(id){ return EF[id]; }));
    orden.slice().reverse().forEach(function(id){
        var a = pertActividades.find(function(x){ return x.id===id; });
        var sucs = pertActividades.filter(function(b){ return b.predecesoras.indexOf(id)!==-1; });
        LF[id] = sucs.length===0 ? T : Math.min.apply(null, sucs.map(function(b){ return LS[b.id]; }));
        LS[id] = LF[id] - a.duracion;
    });

    /* ── 3. CONSTRUIR NODOS Y ARISTAS ──
       - nFin[id] = 'f_'+id   (nodo propio de cada actividad)
       - nIni[id]:
           sin preds → 'start'
           1 pred    → nFin[pred]
           N preds   → nFin del pred con mayor EF
                       + ficticias de los demás preds → ese nodo
    ── */
    var nFin={}, nIni={}, ficticias=[];

    orden.forEach(function(id){
        var a = pertActividades.find(function(x){ return x.id===id; });
        nFin[id] = 'f_'+id;

        if (a.predecesoras.length === 0) {
            nIni[id] = 'start';
        } else if (a.predecesoras.length === 1) {
            nIni[id] = nFin[a.predecesoras[0]];
        } else {
            var mayor = a.predecesoras.reduce(function(b,p){ return EF[p]>=EF[b]?p:b; });
            nIni[id] = nFin[mayor];
            a.predecesoras.forEach(function(p){
                if (p !== mayor) ficticias.push({ src: nFin[p], dst: nIni[id] });
            });
        }
    });

    /* ── 4. REUNIR NODOS CON SUS VALORES ES/EF/LS/LF ── */
    var nodosMap = {};

    function mkN(clave, esV, efV, lsV, lfV) {
        if (!nodosMap[clave]) nodosMap[clave] = { ES:esV, EF:efV, LS:lsV, LF:lfV };
    }

    // Nodo start
    mkN('start', 0, 0, 0, 0);

    // Cada nodo fin de actividad
    orden.forEach(function(id){
        mkN('f_'+id, EF[id], EF[id], LF[id], LF[id]);
    });

    /* ── 5. NIVEL POR BFS ── */
    var adj = {};
    Object.keys(nodosMap).forEach(function(c){ adj[c]=[]; });
    orden.forEach(function(id){
        if (!adj[nIni[id]]) adj[nIni[id]]=[];
        adj[nIni[id]].push(nFin[id]);
    });
    ficticias.forEach(function(f){
        if (!adj[f.src]) adj[f.src]=[];
        adj[f.src].push(f.dst);
    });

    var nivel = {'start':0}, cola = ['start'];
    while (cola.length > 0) {
        var cur = cola.shift();
        (adj[cur]||[]).forEach(function(dst){
            if (nivel[dst]===undefined || nivel[dst]<nivel[cur]+1) {
                nivel[dst]=nivel[cur]+1; cola.push(dst);
            }
        });
    }
    Object.keys(nodosMap).forEach(function(c){ if(nivel[c]===undefined) nivel[c]=0; });

    /* ── 6. POSICIONES ── */
    var nvsU = [];
    Object.keys(nodosMap).forEach(function(c){ var nv=nivel[c]; if(nvsU.indexOf(nv)===-1) nvsU.push(nv); });
    nvsU.sort(function(a,b){return a-b;});

    var porCol = {};
    nvsU.forEach(function(nv){
        porCol[nv] = Object.keys(nodosMap)
            .filter(function(c){ return nivel[c]===nv; })
            .sort(function(a,b){ return nodosMap[a].LS - nodosMap[b].LS; });
    });

    var R=30, BW=32, BH=28, COL_W=150, ROW_H=110, PAD_L=65;
    var MAX_F = Math.max.apply(null, nvsU.map(function(nv){ return porCol[nv].length; }));
    var SVG_W = nvsU.length*COL_W + PAD_L + 60;
    var SVG_H = Math.max(MAX_F*ROW_H+80, 240);

    var pos = {};
    nvsU.forEach(function(nv, ci){
        var g=porCol[nv];
        var totH=g.length*ROW_H-(ROW_H-R*2);
        var sY=(SVG_H-totH)/2+R;
        g.forEach(function(c,ri){ pos[c]={ cx:PAD_L+ci*COL_W, cy:sY+ri*ROW_H }; });
    });

    /* ── 7. NUMERAR NODOS ── */
    var claves = Object.keys(nodosMap).sort(function(a,b){
        return nivel[a]!==nivel[b] ? nivel[a]-nivel[b] : nodosMap[a].LS-nodosMap[b].LS;
    });
    var numV={};
    claves.forEach(function(c,i){ numV[c]=i+1; });

    /* ── 8. COLORES ── */
    var PAL=['#6f2c91','#1976d2','#00897b','#c62828','#ef6c00',
             '#558b2f','#6d4c41','#00838f','#ad1457','#37474f'];
    var col={};
    pertActividades.forEach(function(a,i){ col[a.id]=PAL[i%PAL.length]; });

    /* ── 9. SVG ── */
    var defs='<defs>', lin='', nod='';

    function xyEntreSalida(srcC, dstC) {
        var s=pos[srcC], d=pos[dstC]; if(!s||!d) return null;
        var dx=d.cx-s.cx, dy=d.cy-s.cy, dist=Math.sqrt(dx*dx+dy*dy)||1;
        return { x1:s.cx+(dx/dist)*(R+2), y1:s.cy+(dy/dist)*(R+2),
                 x2:d.cx-(dx/dist)*(R+10), y2:d.cy-(dy/dist)*(R+10),
                 dx:dx, dy:dy, dist:dist };
    }

    // Ficticias punteadas
    ficticias.forEach(function(f,i){
        var p=xyEntreSalida(f.src,f.dst); if(!p) return;
        var mid='fict_'+i;
        defs+='<marker id="'+mid+'" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto"><polygon points="0 0,7 2.5,0 5" fill="#aaa"/></marker>';
        lin+='<line x1="'+p.x1+'" y1="'+p.y1+'" x2="'+p.x2+'" y2="'+p.y2+'" stroke="#aaa" stroke-width="1.5" stroke-dasharray="6,4" marker-end="url(#'+mid+')"/>';
    });

    // Registrar qué segmentos de línea ya existen para evitar traslapes de etiqueta
    var labelRects = []; // [{cx,cy,w,h}]

    function labelNoChoca(cx, cy, tw) {
        var h=16, w=tw;
        for (var i=0; i<labelRects.length; i++) {
            var r=labelRects[i];
            if (Math.abs(cx-r.cx)<(w+r.w)/2+4 && Math.abs(cy-r.cy)<(h+r.h)/2+4) return false;
        }
        return true;
    }

    // Aristas reales
    pertActividades.forEach(function(act){
        var p=xyEntreSalida(nIni[act.id],nFin[act.id]); if(!p) return;
        var c=col[act.id], mid='arr_'+act.id;
        var lbl=act.id+'  '+act.duracion+' días';
        var tw=lbl.length*6.2+14;

        // Punto medio de la línea
        var mx=(p.x1+p.x2)/2, my=(p.y1+p.y2)/2;
        // Vector perpendicular normalizado (izq del sentido de la flecha)
        var npx=-p.dy/p.dist, npy=p.dx/p.dist;

        // Intentar varios offsets para evitar colisiones
        var offsets=[22,-22,38,-38,14,-14];
        var lx=mx, ly=my-14; // default: arriba
        for (var oi=0; oi<offsets.length; oi++) {
            var off=offsets[oi];
            var cx=mx+npx*off, cy=my+npy*off;
            if (labelNoChoca(cx,cy,tw)) { lx=cx; ly=cy; break; }
        }

        labelRects.push({cx:lx, cy:ly, w:tw, h:16});

        defs+='<marker id="'+mid+'" markerWidth="9" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0 0,9 3,0 6" fill="'+c+'"/></marker>';
        lin+='<line x1="'+p.x1+'" y1="'+p.y1+'" x2="'+p.x2+'" y2="'+p.y2+'" stroke="'+c+'" stroke-width="2.2" marker-end="url(#'+mid+')"/>'+
             '<rect x="'+(lx-tw/2)+'" y="'+(ly-9)+'" width="'+tw+'" height="16" rx="4" fill="white" fill-opacity="0.92" stroke="'+c+'" stroke-width="0.8"/>'+
             '<text x="'+lx+'" y="'+(ly+4)+'" text-anchor="middle" font-size="11" font-weight="700" fill="'+c+'" font-family="sans-serif">'+pertEsc(lbl)+'</text>';
    });

    defs+='</defs>';

    // Nodos
    claves.forEach(function(clave){
        var n=nodosMap[clave], p=pos[clave]; if(!p) return;
        var num=numV[clave], bx=p.cx-BW, by=p.cy-R-BH-6, bR=BH/2;
        nod+=
            '<circle cx="'+(p.cx+2)+'" cy="'+(p.cy+3)+'" r="'+R+'" fill="rgba(0,0,0,0.10)"/>'+
            '<circle cx="'+p.cx+'" cy="'+p.cy+'" r="'+R+'" fill="#fff" stroke="#333" stroke-width="2.2"/>'+
            '<text x="'+p.cx+'" y="'+p.cy+'" text-anchor="middle" dominant-baseline="middle" font-size="17" font-weight="bold" fill="#222" font-family="sans-serif">'+num+'</text>'+
            '<rect x="'+bx+'" y="'+by+'" width="'+(BW*2)+'" height="'+BH+'" fill="none" stroke="#555" stroke-width="1.3" rx="3"/>'+
            '<rect x="'+bx+'" y="'+by+'" width="'+(BW*2)+'" height="'+bR+'" fill="#dbeeff" opacity="0.9" rx="3"/>'+
            '<rect x="'+bx+'" y="'+(by+bR)+'" width="'+(BW*2)+'" height="'+bR+'" fill="#fef9e7" opacity="0.95"/>'+
            '<line x1="'+bx+'" y1="'+(by+bR)+'" x2="'+(bx+BW*2)+'" y2="'+(by+bR)+'" stroke="#555" stroke-width="1"/>'+
            '<line x1="'+p.cx+'" y1="'+by+'" x2="'+p.cx+'" y2="'+(by+BH)+'" stroke="#555" stroke-width="1"/>'+
            '<text x="'+(bx+BW/2)+'" y="'+(by+bR/2)+'" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="#1565c0" font-family="sans-serif">'+n.ES+'</text>'+
            '<text x="'+(p.cx+BW/2)+'" y="'+(by+bR/2)+'" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="#1565c0" font-family="sans-serif">'+n.EF+'</text>'+
            '<text x="'+(bx+BW/2)+'" y="'+(by+bR+bR/2)+'" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="#b71c1c" font-family="sans-serif">'+n.LS+'</text>'+
            '<text x="'+(p.cx+BW/2)+'" y="'+(by+bR+bR/2)+'" text-anchor="middle" dominant-baseline="middle" font-size="10" font-weight="bold" fill="#b71c1c" font-family="sans-serif">'+n.LF+'</text>';
    });

    cont.style.cssText='padding:16px;background:#f8f9fc;border-radius:8px;overflow-x:auto;min-height:220px;';
    cont.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="100%" viewBox="0 0 '+SVG_W+' '+SVG_H+'" style="max-width:100%;display:block;background:transparent;">'+defs+lin+nod+'</svg>';
}

/* ── Hooks ── */
var _pertCalcularOriginal = (typeof _pertCalcularOriginal!=='undefined' && _pertCalcularOriginal) ? _pertCalcularOriginal : calcular;
calcular = function(){ _pertCalcularOriginal(); pertDibujarDiagrama(); };
document.addEventListener('shown.bs.tab', function(e){
    if (e.target && e.target.id==='tab-diagrama') pertDibujarDiagrama();
});