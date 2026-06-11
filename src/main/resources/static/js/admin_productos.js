// ========================================================
// LA JAMA — MOTOR DE ADMINISTRACIÓN DE PRODUCTOS (SHADCN SYSTEM)
// ========================================================

let modalProductoInstance = null;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    const modalEl = document.getElementById('modalProducto');
    if (modalEl) {
        modalProductoInstance = new bootstrap.Modal(modalEl);
    }

    const form = document.getElementById('formProducto');
    if (form) {
        form.addEventListener('submit', function() {
            AppUtils.showLoading(true);
        });
    }

    // Inicializamos la paginación fluida por bloques
    paginarTablaManual();
});

// 🔍 FILTRADO DINÁMICO + CONTROL DE VISTA VACÍA
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

// 📊 MOTOR DE PAGINACIÓN MANUAL LÍQUIDA INTERACTIVA
function paginarTablaManual(pageTarget = 1) {
    currentPage = pageTarget;
    const maxRows = parseInt(document.getElementById("maxRows").value);
    const busquedaActiva = document.getElementById("busqueda").value.toUpperCase().trim();

    // Si hay búsqueda filtramos sobre las válidas, si no, sobre todas las filas
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

    // Dibujar el bloqueador de botones líquido
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

function previewImage(event) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById('imgPrevia').src = reader.result;
    };
    if (event.target.files[0]) {
        reader.readAsDataURL(event.target.files[0]);
    }
}

function editarProducto(id) {
    AppUtils.showLoading(true);

    fetch(`/admin/productos/api/${id}`)
        .then(res => {
            AppUtils.showLoading(false);
            if (!res.ok) throw new Error("Error de comunicación remota");
            return res.json();
        })
        .then(p => {
            AppUtils.clearForm('#formProducto');

            document.getElementById('prodId').value = p.id;
            document.getElementById('prodNombre').value = p.nombre;
            document.getElementById('prodDesc').value = p.descripcion || '';
            document.getElementById('prodPrecio').value = p.precio;

            if (p.categoria) {
                document.getElementById('prodCat').value = p.categoria.id;
            }

            const img = document.getElementById('imgPrevia');
            img.src = p.imagen ? `/imagenes/${p.imagen}` : '/img/not-found.png';

            document.getElementById('modalTitulo').innerText = 'Editar Producto';
            if (modalProductoInstance) modalProductoInstance.show();
        })
        .catch(err => {
            AppUtils.showLoading(false);
            console.error(err);
            AppUtils.showNotification('No se pudo cargar el plato seleccionado', 'error');
        });
}

function cambiarEstado(id, checkbox) {
    const nuevoEstado = checkbox.checked ? 1 : 0;

    fetch(`/admin/productos/estado/${id}?estado=${nuevoEstado}`, {
        method: 'POST'
    }).then(res => {
        if (res.ok) {
            AppUtils.showNotification('Disponibilidad en carta modificada', 'success');
        } else {
            checkbox.checked = !checkbox.checked;
            AppUtils.showNotification('No se pudo cambiar el estado del plato', 'error');
        }
    }).catch(() => {
        checkbox.checked = !checkbox.checked;
        AppUtils.showNotification('Fallo de conexión', 'error');
    });
}

function filtrarTabla() {
    const input = document.getElementById("busqueda").value.toUpperCase();
    const rows = document.querySelectorAll("#tablaProductos tbody tr");

    rows.forEach(row => {
        const nombre = row.cells[1].textContent.toUpperCase();
        const categoria = row.cells[2].textContent.toUpperCase();
        row.style.display = (nombre.includes(input) || categoria.includes(input)) ? "" : "none";
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