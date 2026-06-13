// =========================================================================
// LA JAMA — MOTOR DE ADMINISTRACIÓN DE PRODUCTOS (SHADCN SYSTEM)
// =========================================================================

let modalProductoInstance = null;
let currentPage = 1;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicialización de Modales Bootstrap
    const modalEl = document.getElementById('modalProducto');
    if (modalEl) {
        modalProductoInstance = new bootstrap.Modal(modalEl);
    }

    // 2. Interceptación del Submit para cargar el overlay
    const form = document.getElementById('formProducto');
    if (form) {
        form.addEventListener('submit', function() {
            AppUtils.showLoading(true);
        });
    }

    // 3. Captura de Inputs para las validaciones en caliente
    const inputNombre = document.getElementById('prodNombre');
    const inputPrecio = document.getElementById('prodPrecio');
    const inputDesc   = document.getElementById('prodDesc');
    const inputArchivo = document.querySelector('input[name="archivoImagen"]');

    // 🛡️ Filtro de caracteres para el Nombre del plato (Solo letras y espacios)
    if (inputNombre) {
        inputNombre.addEventListener('input', function () {
            this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ ]/g, '');
            const contador = document.getElementById('contadorNombre');
            if (contador) contador.textContent = this.value.length + '/30';
        });
    }

    // 🛡️ Contador de caracteres para la Descripción
    if (inputDesc) {
        inputDesc.addEventListener('input', function () {
            const contador = document.getElementById('contadorDesc');
            if (contador) contador.textContent = this.value.length + '/150';
        });
    }

    // 🛡️ Aduana de precio por rango de rentabilidad (S/ 10.00 - S/ 70.00)
    if (inputPrecio) {
        inputPrecio.addEventListener('blur', function () {
            const val = parseFloat(this.value);
            const errorEl = document.getElementById('prodPrecio-error');
            if (isNaN(val) || val < 10.00 || val > 70.00) {
                if (errorEl) errorEl.textContent = 'El precio debe estar entre S/ 10.00 y S/ 70.00.';
                this.value = ''; // Limpia el valor corrupto
            } else {
                if (errorEl) errorEl.textContent = '';
            }
        });
    }

    // 🛡️ Aduana Ultra-Estricta Unificada para la subida de imágenes (Evita PDFs/silenciosos)
    if (inputArchivo) {
        inputArchivo.addEventListener('change', function(e) {
            const archivo = e.target.files[0];
            const imgPrevia = document.getElementById('imgPrevia');

            if (archivo) {
                // A. Validación de extensión por nombre (Filtro perimetral contra PDFs, ZIPs, etc.)
                const nombreArchivo = archivo.name.toLowerCase();
                const extensionesValidas = ['.jpg', '.jpeg', '.png', '.webp'];
                const tieneExtensionValida = extensionesValidas.some(ext => nombreArchivo.endsWith(ext));

                // B. Validación de tipo MIME real del sistema operativo
                const formatosMimePermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
                const tieneMimeValido = formatosMimePermitidos.includes(archivo.type);

                if (!tieneExtensionValida || !tieneMimeValido) {
                    AppUtils.showNotification('❌ Formato no soportado. Solo se permiten imágenes JPG, PNG o WEBP.', 'error');
                    this.value = ''; // Resetea el input para bloquear el envío del PDF
                    if (imgPrevia) imgPrevia.src = '/img/not-found.png';
                    return;
                }

                // C. Validar peso máximo (2MB)
                const limitePeso = 2 * 1024 * 1024;
                if (archivo.size > limitePeso) {
                    AppUtils.showNotification('⚖️ ¡Archivo muy pesado! La imagen no debe superar los 2MB.', 'error');
                    this.value = '';
                    if (imgPrevia) imgPrevia.src = '/img/not-found.png';
                    return;
                }

                // 🚀 CARGA DE VISTA PREVIA SEGURA: Ocurre únicamente si pasó todos los filtros anteriores
                const reader = new FileReader();
                reader.onload = function() {
                    if (imgPrevia) imgPrevia.src = reader.result;
                };
                reader.readAsDataURL(archivo);
            }
        });
    }

    // 🛡️ Sincronizador de contadores al abrir el modal para editar o registrar
    if (modalEl) {
        modalEl.addEventListener('shown.bs.modal', function () {
            const n = document.getElementById('prodNombre').value || "";
            const d = document.getElementById('prodDesc').value || "";

            const contNombre = document.getElementById('contadorNombre');
            const contDesc = document.getElementById('contadorDesc');
            const errorPrecio = document.getElementById('prodPrecio-error');

            if (contNombre) contNombre.textContent = n.length + '/30';
            if (contDesc) contDesc.textContent = d.length + '/150';
            if (errorPrecio) errorPrecio.textContent = '';
        });
    }

    // Inicializamos la paginación fluida por bloques al arrancar la vista
    paginarTablaManual();
});

// 🔍 FILTRADO DINÁMICO + CONTROL DE VISTA VACÍA (Lógica Líquida)
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
            img.src = p.imagen ? p.imagen : '/img/not-found.png';

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