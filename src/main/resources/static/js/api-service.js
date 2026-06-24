// api-service.js (Ubicado en la raíz de js - Reutilizable en todo el proyecto)

/**
 * Consulta un número de RUC mediante el proxy seguro de nuestro Backend
 * @param {string} ruc
 * @returns {Promise<Object|null>} Datos del RUC o null si falla
 */
export async function buscarRucRestaurante(ruc) {
    try {
        const response = await fetch(`/api/documentos/ruc/${ruc}`);
        if (!response.ok) {
            throw new Error("No se pudo validar el RUC");
        }
        return await response.json();
    } catch (error) {
        console.error("Error en la validación local de RUC:", error);
        return null;
    }
}

/**
 * Consulta un número de DNI mediante el proxy seguro de nuestro Backend
 * @param {string} dni
 * @returns {Promise<Object|null>} Datos del DNI o null si falla
 */
export async function buscarDniRestaurante(dni) {
    try {
        const response = await fetch(`/api/documentos/dni/${dni}`);
        if (!response.ok) {
            throw new Error("No se pudo validar el DNI");
        }
        return await response.json();
    } catch (error) {
        console.error("Error en la validación local de DNI:", error);
        return null;
    }
}