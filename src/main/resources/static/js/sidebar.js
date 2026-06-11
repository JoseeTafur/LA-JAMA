(function() {
            function construirCuadradosSiderbar() {
                const gridContainer = document.getElementById("sidebar-ripple");
                const sidebarElement = document.getElementById("sidebar");
                const glowElement = document.getElementById("sidebar-glow");

                if (!gridContainer || !sidebarElement) return;

                // Evitamos duplicados si pasa por múltiples renders
                gridContainer.innerHTML = '';

                // Inyectamos exactamente los 250 cuadraditos interactivos
                for (let i = 0; i < 250; i++) {
                    const cell = document.createElement("div");
                    cell.className = "ripple-cell";
                    gridContainer.appendChild(cell);
                }

                const cells = gridContainer.querySelectorAll(".ripple-cell");

                // Tracking del mouse para el glow
                sidebarElement.addEventListener("mousemove", (e) => {
                    const rect = sidebarElement.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    if (glowElement) {
                        glowElement.style.setProperty("--bg-x", x + "px");
                        glowElement.style.setProperty("--bg-y", y + "px");
                    }
                });

                // Ola expansiva al hacer click
                gridContainer.addEventListener("click", (e) => {
                    const cell = e.target.closest(".ripple-cell");
                    if (!cell) return;

                    const rect = gridContainer.getBoundingClientRect();
                    const cols = Math.floor(rect.width / 40) || 1;
                    const cellIndex = Array.from(cells).indexOf(cell);
                    if (cellIndex === -1) return;

                    const clickedRow = Math.floor(cellIndex / cols);
                    const clickedCol = cellIndex % cols;

                    cells.forEach((c, index) => {
                        const row = Math.floor(index / cols);
                        const col = index % cols;
                        const distance = Math.sqrt(Math.pow(row - clickedRow, 2) + Math.pow(col - clickedCol, 2));

                        c.classList.remove("animate-ripple");
                        void c.offsetWidth; // Forzar reflow
                        c.style.setProperty("--delay", `${distance * 50}ms`);
                        c.classList.add("animate-ripple");
                    });
                });
            }

            // Ejecución garantizada sin importar retardos de Thymeleaf
            setTimeout(construirCuadradosSiderbar, 50);
        })();

// ─── 2. SELECTORES Y EVENTOS COMPARTIDOS (JQUERY) ───────────────────────────
$(document).ready(function () {
    // ========================================================
    // DECLARACIÓN DE SELECTORES COMPARTIDOS
    // ========================================================
    const $sidebar        = $('#sidebar');
    const $openSidebarBtn = $('#open-sidebar');
    const $closeSidebarBtn= $('#close-sidebar');
    const $sidebarOverlay = $('#sidebar-overlay');

    // ========================================================
    // CONTROLADOR DE EVENTOS EN PANTALLAS MÓVILES
    // ========================================================
    if ($openSidebarBtn.length && $sidebar.length) {

        // Abre el lienzo lateral inyectando las clases CSS unificadas (.active)
        $openSidebarBtn.on('click', function () {
            $sidebar.addClass('active');
            if ($sidebarOverlay.length) $sidebarOverlay.addClass('active');
            console.log("📱 [SIDEBAR] Menú móvil desplegado.");
        });

        // Cierra el lienzo de forma segura removiendo los estados activos
        function cerrarMenuMovil() {
            $sidebar.removeClass('active');
            if ($sidebarOverlay.length) $sidebarOverlay.removeClass('active');
            console.log("🧼 [SIDEBAR] Menú móvil ocultado.");
        }

        // Asignación de gatillos de cierre (Botón X y clic fuera en el velo)
        if ($closeSidebarBtn.length) $closeSidebarBtn.on('click', cerrarMenuMovil);
        if ($sidebarOverlay.length) $sidebarOverlay.on('click', cerrarMenuMovil);
    }

    // ========================================================
    // PERSISTENCIA DE SUBMENÚS DESPLEGABLES (BOOTSTRAP)
    // ========================================================
    $('.sidebar .collapse').on('shown.bs.collapse', function () {
        localStorage.setItem('menu_abierto_' + this.id, 'true');
    }).on('hidden.bs.collapse', function () {
        localStorage.removeItem('menu_abierto_' + this.id);
    });
});