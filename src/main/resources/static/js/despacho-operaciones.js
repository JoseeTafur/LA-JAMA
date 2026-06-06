let mapa;
let selectedPedidoNode = null;
let asignaciones = [];
let controlesRuta = [];
let marcadoresPendientes = [];
const coloresRepartidores = {};

document.addEventListener('DOMContentLoaded', () => {
    initMapa();
    actualizarMapaCompleto();

    document.querySelectorAll('.tarjeta-repartidor').forEach(rep => {
        rep.classList.remove('repartidor-ocupado');
        rep.style.borderLeft = "5px solid transparent";
    });
});

function verificarPedidosVacios() {
    const contenedor = document.getElementById('col-pedidos');
    if (!contenedor) return;

    const pedidosVisibles = Array.from(contenedor.querySelectorAll('.tarjeta-pedido'))
                                 .filter(p => p.style.display !== 'none').length;

    let mensajeVacio = document.getElementById('mensaje-vacio');

    if (pedidosVisibles === 0) {
        if (!mensajeVacio) {
            mensajeVacio = document.createElement('div');
            mensajeVacio.id = 'mensaje-vacio';
            mensajeVacio.className = 'text-center p-5 text-muted animate__animated animate__fadeIn';
            mensajeVacio.innerHTML = `
                <i class="bi bi-clipboard2-check-fill d-block mb-2" style="font-size: 2.5rem; color: #ced4da;"></i>
                <p class="fw-bold">No hay pedidos pendientes</p>
            `;
            contenedor.appendChild(mensajeVacio);
        }
    } else if (mensajeVacio) {
        mensajeVacio.remove();
    }
}

function ordenarAsignacionesPorCercania() {
    let n = asignaciones.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            const pedidoA = PEDIDOS_DATA.find(p => p.id == asignaciones[j].pedidoId);
            const pedidoB = PEDIDOS_DATA.find(p => p.id == asignaciones[j+1].pedidoId);
            if (pedidoA && pedidoB) {
                const distA = (pedidoA && pedidoA.latitud != null) ? Math.sqrt(Math.pow(pedidoA.latitud - ORIGEN_COORDS.lat, 2) + Math.pow(pedidoA.longitud - ORIGEN_COORDS.lng, 2)) : Infinity;
                const distB = (pedidoB && pedidoB.latitud != null) ? Math.sqrt(Math.pow(pedidoB.latitud - ORIGEN_COORDS.lat, 2) + Math.pow(pedidoB.longitud - ORIGEN_COORDS.lng, 2)) : Infinity;
                if (distA > distB) {
                    let temp = asignaciones[j];
                    asignaciones[j] = asignaciones[j + 1];
                    asignaciones[j + 1] = temp;
                }
            }
        }
    }
}

function actualizarMapaCompleto() {
    renderizarPuntosPendientes();
    if (asignaciones.length > 0) {
        trazarRutasReales();
    } else {
        limpiarRutas();
    }
    verificarPedidosVacios();
}

function cambiarColorRepartidor(inputEl) {
    const rId = inputEl.id.replace('color-', '');
    const nuevoColor = inputEl.value;

    coloresRepartidores[rId] = nuevoColor;

    asignaciones.forEach(asig => {
        if (asig.repartidorId == rId) asig.color = nuevoColor;
    });

    const tarjeta = document.querySelector(`.tarjeta-repartidor[data-id="${rId}"]`);
    if (tarjeta) {
        tarjeta.style.borderLeft = `5px solid ${nuevoColor}`;
        tarjeta.querySelectorAll('.mini-pedido-asignado').forEach(mini => mini.style.borderColor = nuevoColor);
    }

    actualizarMapaCompleto();
}

function seleccionarPedido(el) {
    document.querySelectorAll('.tarjeta-pedido').forEach(n => n.classList.remove('selected'));
    selectedPedidoNode = el;
    el.classList.add('selected');
}

function vincularRepartidor(elRepartidor) {
    if (elRepartidor.classList.contains('repartidor-ocupado')) return;
    if (!selectedPedidoNode) {
        AppUtils.showNotification("⚠️ Selecciona un pedido primero", "warning");
        return;
    }

    const rId = elRepartidor.getAttribute('data-id');
    const pId = selectedPedidoNode.getAttribute('data-id');
    const cliente = selectedPedidoNode.getAttribute('data-cliente');
    const tagNombre = elRepartidor.querySelector('.nombre-tag');
    const nombreOriginal = tagNombre.getAttribute('data-nombre-original');

    const direccionFull = selectedPedidoNode.getAttribute('data-direccion') || "";
    const direccionCorta = direccionFull.split(',')[0];

    const colorInput = document.getElementById(`color-${rId}`);
    const colorElegido = colorInput ? colorInput.value : "#933D2D";
    coloresRepartidores[rId] = colorElegido;

    asignaciones.push({
        pedidoId: pId,
        repartidorId: rId,
        cliente: cliente,
        color: colorElegido,
        nombreRep: nombreOriginal
    });

    tagNombre.innerText = `${nombreOriginal} - Ruta Activa`;
    elRepartidor.querySelector('.estado-texto').innerText = "Ocupado";
    elRepartidor.querySelector('.estado-texto').className = "estado-texto text-warning fw-bold";
    elRepartidor.style.borderLeft = `5px solid ${colorElegido}`;

    const contenedor = document.getElementById(`asignados-rep-${rId}`);
    if (contenedor) {
        const miniCard = document.createElement('div');
        miniCard.className = 'mini-pedido-asignado p-2 mb-1 border-start border-4 rounded bg-light d-flex justify-content-between align-items-center animate__animated animate__fadeInLeft';
        miniCard.id = `mini-p-${pId}`;
        miniCard.style.borderColor = colorElegido;
        miniCard.innerHTML = `
                    <div style="font-size: 0.75rem; line-height: 1.2;">
                        <b class="d-block text-dark">${cliente}</b>
                        <span class="text-muted"><i class="bi bi-geo-alt-fill" style="font-size: 0.7rem;"></i> ${direccionCorta}</span>
                    </div>
                    <i class="bi bi-trash3 text-danger cursor-pointer ms-2" onclick="quitarAsignacion(event, '${pId}')"></i>
                `;
        contenedor.appendChild(miniCard);
    }

    selectedPedidoNode.style.display = 'none';
    selectedPedidoNode = null;
    actualizarMapaCompleto();
}

function quitarAsignacion(event, pId) {
    if(event) event.stopPropagation();

    const asigRemovida = asignaciones.find(a => a.pedidoId === pId);
    asignaciones = asignaciones.filter(a => a.pedidoId !== pId);

    const miniCard = document.getElementById(`mini-p-${pId}`);
    if (miniCard) miniCard.remove();

    const pNode = document.getElementById(`pedido-${pId}`);
    if (pNode) {
        pNode.style.display = 'block';
        pNode.classList.remove('selected');
    }

    if (asigRemovida) {
        const rId = asigRemovida.repartidorId;
        const tieneMas = asignaciones.some(a => a.repartidorId === rId);
        if (!tieneMas) {
            const tarjeta = document.querySelector(`.tarjeta-repartidor[data-id="${rId}"]`);
            const tag = tarjeta.querySelector('.nombre-tag');
            tag.innerText = tag.getAttribute('data-nombre-original');
            tarjeta.querySelector('.estado-texto').innerText = "Libre";
            tarjeta.querySelector('.estado-texto').className = "estado-texto text-success fw-bold";
            tarjeta.style.borderLeft = "5px solid transparent";
        }
    }
    actualizarMapaCompleto();
}

function renderizarPuntosPendientes() {
    marcadoresPendientes.forEach(m => mapa.removeLayer(m));
    marcadoresPendientes = [];
    const idsAsignados = asignaciones.map(a => String(a.pedidoId));

    PEDIDOS_DATA.forEach(p => {
        if (!idsAsignados.includes(String(p.id))) {
            if (p.latitud == null || p.longitud == null) return;
            const marker = L.circleMarker([p.latitud, p.longitud], {
                radius: 7, fillColor: "#adb5bd", color: "#fff", weight: 2, opacity: 1, fillOpacity: 0.8
            }).addTo(mapa).bindPopup(`<b>${p.cliente}</b><br>${p.direccion || ''}`);
            marcadoresPendientes.push(marker);
        }
    });
}

function trazarRutasReales() {
    limpiarRutas();
    ordenarAsignacionesPorCercania();

    const rutasPorRepartidor = asignaciones.reduce((acc, asig) => {
        if (!acc[asig.repartidorId]) {
            acc[asig.repartidorId] = {
                color: asig.color,
                puntos: [L.latLng(ORIGEN_COORDS.lat, ORIGEN_COORDS.lng)]
            };
        }
        const p = PEDIDOS_DATA.find(ped => ped.id == asig.pedidoId);
        if (p && p.latitud != null && p.longitud != null) acc[asig.repartidorId].puntos.push(L.latLng(parseFloat(p.latitud), parseFloat(p.longitud)));
        return acc;
    }, {});

    Object.values(rutasPorRepartidor).forEach(ruta => {
        const control = L.Routing.control({
            waypoints: ruta.puntos,
            routerOptions: { radius: 1000 },
            missingRouteTolerance: 100,
            createLine: function() { return null; },
            showAlternatives: false,
            addWaypoints: false,
            routeWhileDragging: false,
            fitSelectedRoutes: false,
            show: false,
            createMarker: (i, wp) => L.marker(wp.latLng).bindPopup(i === 0 ? "La Jama" : `Parada #${i}`)
        }).addTo(mapa);

        control.on('routesfound', function(e) {
            const coordinates = e.routes[0].coordinates;

            const shadowLine = L.polyline(coordinates, {
                color: 'white', weight: 8, opacity: 1, pane: 'capaBordes'
            }).addTo(mapa);

            const mainLine = L.polyline(coordinates, {
                color: ruta.color, weight: 5, opacity: 0.7, lineJoin: 'round', pane: 'capaLineas'
            }).addTo(mapa);

            controlesRuta.push(shadowLine, mainLine, control);
        });
    });
}

function limpiarRutas() {
    controlesRuta.forEach(item => {
        if (item.removeControl) mapa.removeControl(item);
        else if (item.remove) item.remove();
    });
    controlesRuta = [];
}

function initMapa() {
    mapa = L.map('mapa-principal', { zoomControl: false, attributionControl: false })
            .setView([ORIGEN_COORDS.lat, ORIGEN_COORDS.lng], 14);

    mapa.createPane('capaBordes');
    mapa.createPane('capaLineas');
    mapa.getPane('capaBordes').style.zIndex = 400;
    mapa.getPane('capaLineas').style.zIndex = 401;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapa);

    L.circleMarker([ORIGEN_COORDS.lat, ORIGEN_COORDS.lng], {
        radius: 10, fillColor: "#1B3A2C", color: "#fed7aa", weight: 3, fillOpacity: 1
    }).addTo(mapa).bindPopup("<b>La Jama</b><br>Punto de Origen");
}

// --- REFACTORIZACIÓN COMPLETA A APPUTILS CONTROLLER ---
function abrirConfirmacion() {
    if (asignaciones.length === 0) {
        AppUtils.showNotification("⚠️ Debes asignar al menos un pedido antes de despachar.", "warning");
        return;
    }

    // Armamos el resumen en texto HTML estilizado para el cuadro SweetAlert2
    const resumenHtml = asignaciones.map(a => `
        <div style="text-align: left; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; font-size:0.85rem;">
            <i class="bi bi-truck me-2" style="color: ${a.color}"></i>
            <b>#${a.pedidoId}</b> - ${a.cliente} <span class="badge bg-secondary ms-2">${a.nombreRep}</span>
        </div>
    `).join('');

    AppUtils.showConfirmationDialog({
        title: '¿Confirmar Salida de Unidades?',
        html: `<p>¿Deseas despachar los siguientes comensales a ruta?</p><div style="background:#fdf6e3; padding:15px; border-radius:10px; border:1px solid #fed7aa; max-height:200px; overflow-y:auto;">${resumenHtml}</div>`,
        icon: 'question',
        confirmButtonColor: '#1B3A2C',
        confirmButtonText: 'Sí, Despachar'
    }, () => {
        ejecutarEnvioFinal();
    });
}

function ejecutarEnvioFinal() {
    AppUtils.showLoading(true);

    const agrupado = asignaciones.reduce((acc, cur) => {
        if (!acc[cur.repartidorId]) acc[cur.repartidorId] = [];
        acc[cur.repartidorId].push(cur.pedidoId);
        return acc;
    }, {});

    const promesas = Object.keys(agrupado).map(rId => {
        const formData = new URLSearchParams();
        agrupado[rId].forEach(pId => formData.append('pedidos', pId));
        formData.append('repartidorId', rId);

        return fetch('/admin/despacho/asignar', {
            method: 'POST',
            body: formData,
            headers: {'Content-Type': 'application/x-www-form-urlencoded'}
        }).then(res => {
            if (!res.ok) return res.text().then(t => { throw new Error(t); });
        });
    });

    Promise.all(promesas)
        .then(() => {
            AppUtils.showLoading(false);
            AppUtils.showNotification("✅ Despacho confirmado y unidades en ruta", "success");
            setTimeout(() => window.location.reload(), 1500);
        })
        .catch(err => {
            AppUtils.showLoading(false);
            console.error("Error al despachar:", err);
            AppUtils.showNotification("❌ Error: " + err.message, "error");
        });
}