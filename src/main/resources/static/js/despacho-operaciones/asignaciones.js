let mapa;
let selectedPedidoNode = null;
let asignaciones = [];
let controlesRuta = [];
let marcadoresPendientes = [];
const coloresRepartidores = {};

document.addEventListener('DOMContentLoaded', () => {
    // 🚀 EFECTO PREMUM: Suavizamos la carga inicial mientras se renderiza Leaflet
    DespachoLoader.lanzar("");
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
                        <span class="text-muted"><i class="bi bi-geo-alt-fill" style="font-size: 0.7 macro;"></i> ${direccionCorta}</span>
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

