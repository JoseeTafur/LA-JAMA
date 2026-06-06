let modalProductoInstance = null;

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
});

function abrirModalNuevo() {
    AppUtils.clearForm('#formProducto');
    document.getElementById('prodId').value = '';
    document.getElementById('modalTitulo').innerText = 'Nuevo Producto';
    document.getElementById('imgPrevia').src = '/img/no-photo.png';
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
            img.src = p.imagen ? `/imagenes/${p.imagen}` : '/img/no-photo.png';

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