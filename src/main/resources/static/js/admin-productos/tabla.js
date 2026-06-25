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
