// api-service.js (Ubicado en la raíz de js - Edición con Debugger)

/**
 * Consulta un número de RUC mediante el proxy seguro de nuestro Backend
 * @param {string} ruc
 */
export async function buscarRucRestaurante(ruc) {
    const url = `/api/documentos/ruc/${ruc}`;
    console.log(`🔍 [TRACKER] Iniciando fetch RUC hacia: ${url}`);

    try {
        const response = await fetch(url);

        console.log(`📊 [TRACKER] HTTP Status: ${response.status} (${response.statusText})`);
        console.log(`🏷️ [TRACKER] Content-Type detectado: ${response.headers.get('content-type')}`);

        // Capturamos la respuesta como texto crudo para que no crasheé la consola
        const textoCrudo = await response.text();

        console.log("📄 [TRACKER] Contenido crudo recibido (Primeros 300 caracteres):");
        console.log(textoCrudo.substring(0, 300));

        if (!response.ok) {
            throw new Error(`El servidor respondió con código de error HTTP ${response.status}`);
        }

        // Verificación visual preventiva
        if (textoCrudo.trim().startsWith("<!DOCTYPE") || textoCrudo.trim().startsWith("<html")) {
            console.error("🚨 [CRÍTICO] ¡Confirmado! El backend está enviando un HTML en lugar de JSON.");
            throw new Error("Respuesta inválida del servidor (Se recibió HTML).");
        }

        const data = JSON.parse(textoCrudo);
        console.log("✅ [TRACKER] JSON mapeado correctamente:", data);
        return data;

    } catch (error) {
        console.error("❌ [TRACKER] Error en la validación local de RUC:", error);
        return null;
    }
}

/**
 * Consulta un número de DNI mediante el proxy seguro de nuestro Backend
 * @param {string} dni
 */
export async function buscarDniRestaurante(dni) {
    const url = `/api/documentos/dni/${dni}`;
    console.log(`🔍 [TRACKER] Iniciando fetch DNI hacia: ${url}`);

    try {
        const response = await fetch(url);

        console.log(`📊 [TRACKER] HTTP Status: ${response.status} (${response.statusText})`);
        console.log(`🏷️ [TRACKER] Content-Type detectado: ${response.headers.get('content-type')}`);

        // Capturamos la respuesta como texto crudo
        const textoCrudo = await response.text();

        console.log("📄 [TRACKER] Contenido crudo recibido (Primeros 300 caracteres):");
        console.log(textoCrudo.substring(0, 300));

        if (!response.ok) {
            throw new Error(`El servidor respondió con código de error HTTP ${response.status}`);
        }

        if (textoCrudo.trim().startsWith("<!DOCTYPE") || textoCrudo.trim().startsWith("<html")) {
            console.error("🚨 [CRÍTICO] ¡Confirmado! El backend está enviando un HTML en lugar de JSON.");
            throw new Error("Respuesta inválida del servidor (Se recibió HTML).");
        }

        // Si pasa los filtros, parseamos manualmente el texto a objeto JSON
        const data = JSON.parse(textoCrudo);
        console.log("✅ [TRACKER] JSON mapeado correctamente:", data);
        return data;

    } catch (error) {
        console.error("❌ [TRACKER] Error en la validación local de DNI:", error);
        return null;
    }
}