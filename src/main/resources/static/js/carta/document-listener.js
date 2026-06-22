// document-listener.js
import { buscarRucRestaurante, buscarDniRestaurante } from '../api-service.js';

export function inicializarAutocompletadoDocumentos() {
    const inputDoc = document.getElementById('numeroDocumento');
    const inputNombre = document.getElementById('nombreCliente');

    if (!inputDoc || !inputNombre) return;

    inputNombre.addEventListener('input', () => {
        inputNombre.value = inputNombre.value.toUpperCase();
    });

    inputDoc.addEventListener('input', async () => {
        inputDoc.value = inputDoc.value.replace(/[^0-9]/g, ''); // Solo números

        const tipo = document.getElementById('preferenciaComprobante').value;
        const longitud = inputDoc.value.length;

        inputNombre.removeAttribute("readonly");

        if ((tipo === 'BOLETA' && longitud === 8) || (tipo === 'FACTURA' && longitud === 11)) {
            inputNombre.placeholder = "Buscando datos oficiales...";
            inputNombre.value = "";

            let res = null;
            let nombreCompleto = "";

            if (tipo === 'FACTURA') {
                res = await buscarRucRestaurante(inputDoc.value);
                // miapi.cloud suele envolverlo en .datos o mandarlo directo; soportamos ambos por seguridad
                if (res && res.success && res.datos) {
                    nombreCompleto = res.datos.razonSocial || res.datos.razon_social;
                } else if (res) {
                    nombreCompleto = res.razonSocial || res.razon_social;
                }
            } else {
                res = await buscarDniRestaurante(inputDoc.value);
                // Mapeo exacto según tu documentación oficial de miapi.cloud
                if (res && res.success && res.datos) {
                    const d = res.datos;
                    nombreCompleto = `${d.nombres} ${d.ape_paterno} ${d.ape_materno}`;
                }
            }

            if (nombreCompleto && nombreCompleto.trim() !== "") {
                inputNombre.value = nombreCompleto.trim().toUpperCase();
                inputNombre.setAttribute("readonly", "true"); // Bloqueo estricto

                Swal.fire({
                    icon: 'success',
                    title: 'Verificado con Éxito',
                    text: 'Identidad cargada desde registros oficiales.',
                    timer: 1500,
                    showConfirmButton: false
                });
            } else {
                inputNombre.placeholder = "No encontrado. Escriba manualmente.";
                inputNombre.removeAttribute("readonly");
                Swal.fire({
                    icon: 'warning',
                    title: 'No encontrado',
                    text: 'No se pudo autocompletar el documento. Ingrese sus datos manualmente.'
                });
            }
        }
    });
}