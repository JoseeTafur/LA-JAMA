document.addEventListener("DOMContentLoaded", function () {
    // Buscamos el overlay de video estático del layout
    const getLayoutOverlay = () => document.getElementById("loading-overlay");
    const getLayoutVideo = () => document.getElementById("premium-video");

    function activarAnimaciónPremium() {
        const overlay = getLayoutOverlay();
        const video = getLayoutVideo();
        if (overlay && video) {
            video.muted = true;
            video.defaultMuted = true;
            video.load();
            overlay.classList.add("active");
            video.play().catch(() => {
                setTimeout(() => { video.play(); }, 50);
            });
        }
    }

    function desactivarAnimaciónPremium() {
        const overlay = getLayoutOverlay();
        if (overlay) {
            setTimeout(() => {
                overlay.classList.remove("active");
            }, 400);
        }
    }

    // Interceptamos clics en barra lateral
    document.body.addEventListener("click", function (e) {
        const link = e.target.closest(".dynamic-link, #sidebar a");
        if (!link) return;

        const url = link.getAttribute("href");
        if (!url || url.startsWith("#") || url.startsWith("javascript:")) return;

        e.preventDefault();
        activarAnimaciónPremium();

        fetch(url)
            .then(response => response.text())
            .then(html => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");

                const nuevoContenido = doc.getElementById("main-content");
                const contenedorActual = document.getElementById("main-content");

                if (nuevoContenido && contenedorActual) {
                    contenedorActual.innerHTML = nuevoContenido.innerHTML;
                    history.pushState(null, "", url);

                    // --- REPARACIÓN DE SCRIPTS DINÁMICOS ---
                    // Buscamos si el nuevo layout o vista traía un script específico al final del body
                    const scriptInyectado = doc.querySelector("body script[src*='/js/']");
                    if (scriptInyectado) {
                        // Eliminamos si existía una instancia previa del script para evitar duplicados
                        const scriptPrevio = document.querySelector(`script[src="${scriptInyectado.getAttribute('src')}"]`);
                        if (scriptPrevio) scriptPrevio.remove();

                        // Creamos un nodo script nuevo de forma nativa para obligar al navegador a ejecutarlo
                        const nuevoScript = document.createElement("script");
                        nuevoScript.src = scriptInyectado.getAttribute("src");
                        nuevoScript.defer = true;
                        document.body.appendChild(nuevoScript);
                    }
                }
                desactivarAnimaciónPremium();
            })
            .catch(err => {
                console.error("Error en el enrutador asíncrono, aplicando fallback nativo:", err);
                window.location.href = url;
            });
    });

    window.addEventListener("popstate", function () {
        window.location.reload();
    });
});