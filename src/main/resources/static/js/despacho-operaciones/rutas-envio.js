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

function abrirConfirmacion() {
    // 🚀 ADUANA INMEDIATA: Trancamos primero si el panel de rutas está vacío, sin disparar efectos visuales en vano
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
        // 🎯 UBICACIÓN CORRECTA: El difuminado se gatilla exactamente al confirmar la salida en el modal
        DespachoLoader.lanzar("");
        ejecutarEnvioFinal();
    });
}

function ejecutarEnvioFinal() {
    // Levantamos el segundo anillo de seguridad por si la API de red demora más de 1 segundo
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
