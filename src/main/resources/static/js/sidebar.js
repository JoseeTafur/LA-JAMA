/**
 * LA JAMA - MÓDULO DE CONTROL DE NAVEGACIÓN Y SIDEBAR
 * Responsabilidad: Gestionar la responsividad del menú lateral, persistencia
 * de estados colapsados, limpieza de caché y efectos interactivos kinéticos.
 */

// ─── 1. INTERACTIVIDAD CINÉTICA DE CUADRADITOS (VANILLA JS) ───────────────────
document.addEventListener("DOMContentLoaded", function () {
    const sidebarElement = document.getElementById("sidebar");
    const gridContainer = document.getElementById("sidebar-ripple");
    const glowElement = document.getElementById("sidebar-glow");

    if (gridContainer && sidebarElement) {
        // Inyectamos las 250 celdas interactivas en el contenedor del DOM
        for (let i = 0; i < 250; i++) {
            const cell = document.createElement("div");
            cell.className = "ripple-cell";
            gridContainer.appendChild(cell);
        }

        const cells = gridContainer.querySelectorAll(".ripple-cell");

        // Tracking del cursor sobre las celdas para el brillo de fondo
        sidebarElement.addEventListener("mousemove", (e) => {
            const rect = sidebarElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            if (glowElement) {
                glowElement.style.setProperty("--bg-x", x);
                glowElement.style.setProperty("--bg-y", y);
            }
        });

        // Ola concéntrica expansiva al hacer clic
        gridContainer.addEventListener("click", (e) => {
            const cell = e.target.closest(".ripple-cell");
            if (!cell) return;

            const rect = gridContainer.getBoundingClientRect();
            const cols = Math.floor(rect.width / 40);

            const cellIndex = Array.from(cells).indexOf(cell);
            if (cellIndex === -1) return;

            const clickedRow = Math.floor(cellIndex / cols);
            const clickedCol = cellIndex % cols;

            cells.forEach((c, index) => {
                const row = Math.floor(index / cols);
                const col = index % cols;

                const distance = Math.sqrt(
                    Math.pow(row - clickedRow, 2) + Math.pow(col - clickedCol, 2)
                );

                c.classList.remove("animate-ripple");
                void c.offsetWidth; // Forzar reflow táctil del DOM
                c.style.setProperty("--delay", `${distance * 50}ms`);
                c.classList.add("animate-ripple");
            });
        });
    }
});

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