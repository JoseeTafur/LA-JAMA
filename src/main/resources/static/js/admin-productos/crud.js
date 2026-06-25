function filtrarTabla() {
    const input = document.getElementById("busqueda").value.toUpperCase().trim();
    const rows = document.querySelectorAll("#tablaProductos tbody .producto-fila");
    let contadorResultados = 0;

    rows.forEach(row => {
        const nombre = row.querySelector(".target-busqueda-nombre").textContent.toUpperCase();
        const categoria = row.querySelector(".target-busqueda-cat").textContent.toUpperCase();

        if (nombre.includes(input) || categoria.includes(input)) {
            row.classList.add("busqueda-valida");
            contadorResultados++;
        } else {
            row.classList.remove("busqueda-valida");
            row.style.display = "none";
        }
    });

    // Control de contingencia de resultados nulos
    const filaError = document.getElementById("filaSinResultados");
    if (contadorResultados === 0 && input !== "") {
        filaError.style.display = "";
        document.getElementById("paginadorContenedor").innerHTML = "";
    } else {
        filaError.style.display = "none";
        // Si hay búsqueda activa reinicia a pág 1, si no, respeta la paginación regular
        paginarTablaManual(input !== "" ? 1 : currentPage);
    }
}

// 📊 MOTOR DE PAGINACIÓN MANUAL INTERACTIVA
function paginarTablaManual(pageTarget = 1) {
    currentPage = pageTarget;
    const maxRows = parseInt(document.getElementById("maxRows").value);
    const busquedaActiva = document.getElementById("busqueda").value.toUpperCase().trim();

    const selectorFilas = busquedaActiva !== "" ? "#tablaProductos tbody .busqueda-valida" : "#tablaProductos tbody .producto-fila";
    const rows = document.querySelectorAll(selectorFilas);
    const totalRows = rows.length;
    const totalPages = Math.ceil(totalRows / maxRows) || 1;

    // Ocultar todas primero
    document.querySelectorAll("#tablaProductos tbody .producto-fila").forEach(r => r.style.display = "none");

    // Mostrar solo el bloque correspondiente a la página actual
    const start = (currentPage - 1) * maxRows;
    const end = start + maxRows;

    for (let i = start; i < end && i < totalRows; i++) {
        rows[i].style.display = "";
    }

    renderPaginadorContenedor(totalPages);
}

function renderPaginadorContenedor(totalPages) {
    const contenedor = document.getElementById("paginadorContenedor");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    // Botón Anterior
    const liAnterior = document.createElement("li");
    liAnterior.className = `page-item-jama ${currentPage === 1 ? 'disabled' : ''}`;
    liAnterior.innerHTML = `<button class="page-link-jama" onclick="paginarTablaManual(${currentPage - 1})">Anterior</button>`;
    contenedor.appendChild(liAnterior);

    // Bloques numéricos líquidos
    for (let i = 1; i <= totalPages; i++) {
        const liPag = document.createElement("li");
        liPag.className = `page-item-jama ${currentPage === i ? 'active' : ''}`;
        liPag.innerHTML = `<button class="page-link-jama" onclick="paginarTablaManual(${i})">${i}</button>`;
        contenedor.appendChild(liPag);
    }

    // Botón Siguiente
    const liSiguiente = document.createElement("li");
    liSiguiente.className = `page-item-jama ${currentPage === totalPages ? 'disabled' : ''}`;
    liSiguiente.innerHTML = `<button class="page-link-jama" onclick="paginarTablaManual(${currentPage + 1})">Siguiente</button>`;
    contenedor.appendChild(liSiguiente);
}

function abrirModalNuevo() {
    AppUtils.clearForm('#formProducto');
    document.getElementById('prodId').value = '';
    document.getElementById('modalTitulo').innerText = 'Nuevo Producto';
    document.getElementById('imgPrevia').src = '/img/not-found.png';
    if (modalProductoInstance) modalProductoInstance.show();
}

function editarProducto(id) {
    AppUtils.showLoading(true);

    fetch(`/admin/productos/api/${id}`)
        .then(res => res.json()) // 🌟 DELEGADO: El escudo global ya devuelve un JSON válido con success:false si es 429
        .then(p => {
            AppUtils.showLoading(false);

            // Si la aduana global mutó la respuesta debido al Rate Limit (success: false)
            if (p.hasOwnProperty('success') && !p.success) {
                if (p.message) AppUtils.showNotification(p.message, 'error');
                return;
            }

            AppUtils.clearForm('#formProducto');

            document.getElementById('prodId').value = p.id;
            document.getElementById('prodNombre').value = p.nombre;
            document.getElementById('prodDesc').value = p.descripcion || '';
            document.getElementById('prodPrecio').value = p.precio;

            if (p.categoria) {
                document.getElementById('prodCat').value = p.categoria.id;
            }

            const img = document.getElementById('imgPrevia');
            img.src = p.imagen ? p.imagen : '/img/not-found.png';

            document.getElementById('modalTitulo').innerText = 'Editar Producto';
            if (modalProductoInstance) modalProductoInstance.show();
        })
        .catch(err => {
            AppUtils.showLoading(false);
            console.error(err);
            // Si el error fue provocado por el escudo perimetral, evitamos pisar el mensaje premium
            if (err.message !== "Rate Limit Alcanzado en La Jama") {
                AppUtils.showNotification('No se pudo cargar el plato seleccionado', 'error');
            }
        });
}

function cambiarEstado(id, checkbox) {
    // Control elástico: Guardamos el estado en el DOM antes del cambio por si toca revertir
    const estadoAnterior = !checkbox.checked;
    const nuevoEstado = checkbox.checked ? 1 : 0;

    fetch(`/admin/productos/estado/${id}?estado=${nuevoEstado}`, {
        method: 'POST'
    })
    .then(res => {
        // 🌟 EL TRUCO: Verificamos si la respuesta viene de nuestro escudo-global (que es JSON)
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return res.json();
        }

        // Si no es JSON (es texto plano o respuesta vacía de Spring Boot), devolvemos un objeto simulado de éxito
        return { success: res.ok, esTextoPlano: true };
    })
    .then(data => {
        if (data.hasOwnProperty('isRateLimit') && data.isRateLimit) {
            checkbox.checked = estadoAnterior;
            return;
        }

        if (data.success) {
            AppUtils.showNotification('Disponibilidad en carta modificada', 'success');
        } else {
            checkbox.checked = estadoAnterior;
            AppUtils.showNotification(data.message || 'No se pudo cambiar el estado del plato', 'error');
        }
    })
    .catch((err) => {
        checkbox.checked = estadoAnterior;
        console.error("Error crítico de infraestructura:", err);
        AppUtils.showNotification('Fallo de conexión real con el servidor', 'error');
    });
}

function eliminarProducto(id) {
    AppUtils.showConfirmationDialog({
        title: '¿Remover plato de la carta?',
        text: "Esta acción dará de baja el producto en el inventario y cartas digitales.",
        icon: 'warning',
        confirmButtonColor: '#933D2D',
        confirmButtonText: 'Sí, eliminar'
    }, function() {
        AppUtils.showLoading(true);
        window.location.href = `/admin/productos/eliminar/${id}`;
    });
}