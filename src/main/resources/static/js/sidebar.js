(function() {
    function construirCuadradosSiderbar() {
        const gridContainer = document.getElementById("sidebar-ripple");
        const sidebarElement = document.getElementById("sidebar");
        const glowElement = document.getElementById("sidebar-glow");

        if (!gridContainer || !sidebarElement) return;

        gridContainer.innerHTML = '';

        for (let i = 0; i < 250; i++) {
            const cell = document.createElement("div");
            cell.className = "ripple-cell";
            gridContainer.appendChild(cell);
        }

        const cells = gridContainer.querySelectorAll(".ripple-cell");

        sidebarElement.addEventListener("mousemove", (e) => {
            const rect = sidebarElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            if (glowElement) {
                glowElement.style.setProperty("--bg-x", x + "px");
                glowElement.style.setProperty("--bg-y", y + "px");
            }
        });

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
                void c.offsetWidth;
                c.style.setProperty("--delay", `${distance * 50}ms`);
                c.classList.add("animate-ripple");
            });
        });
    }

    setTimeout(construirCuadradosSiderbar, 50);
})();

// ─── 2. MOTOR DE EVENTOS Y PERSISTENCIA (JQUERY Y COMPUTADORES) ───────────────────────────
$(document).ready(function () {
    const $sidebar              = $('#sidebar');
    const $openSidebarBtn       = $('#open-sidebar');
    const $closeSidebarBtn      = $('#close-sidebar');
    const $sidebarOverlay       = $('#sidebar-overlay');
    const $toggleSidebarDesktop = $('#toggle-sidebar-desktop');
    const $body                 = $('body');

    // 🌟 COMPORTAMIENTO LOCALSTORAGE: Carga el estado guardado del menú en PC
    if (localStorage.getItem('jama_sidebar_collapsed') === 'true') {
        $body.addClass('sidebar-collapsed');
        console.log("💼 [SIDEBAR] Cargando estado contraído desde persistencia.");
    }

    // ========================================================
    // GATILLO DE COLAPSO PARA COMPUTADORAS (DESKTOP)
    // ========================================================
    if ($toggleSidebarDesktop.length) {
        $toggleSidebarDesktop.on('click', function () {
            // Alternamos la clase en el body para que afecte tanto al nav como al layout del main-content
            $body.toggleClass('sidebar-collapsed');

            const isCollapsed = $body.hasClass('sidebar-collapsed');
            localStorage.setItem('jama_sidebar_collapsed', isCollapsed);

            // Re-calculamos los cuadraditos por el cambio de ancho
            setTimeout(() => {
                const trigger = document.getElementById("sidebar-ripple");
                if(trigger) trigger.click();
            }, 350);
        });
    }

    // ========================================================
    // CONTROLADOR DE EVENTOS EN PANTALLAS MÓVILES
    // ========================================================
    if ($openSidebarBtn.length && $sidebar.length) {
        $openSidebarBtn.on('click', function () {
            $sidebar.addClass('active');
            if ($sidebarOverlay.length) $sidebarOverlay.addClass('active');
            console.log("📱 [SIDEBAR] Menú móvil desplegado.");
        });

        function cerrarMenuMovil() {
            $sidebar.removeClass('active');
            if ($sidebarOverlay.length) $sidebarOverlay.removeClass('active');
            console.log("🧼 [SIDEBAR] Menú móvil ocultado.");
        }

        if ($closeSidebarBtn.length) $closeSidebarBtn.on('click', cerrarMenuMovil);
        if ($sidebarOverlay.length) $sidebarOverlay.on('click', cerrarMenuMovil);
    }

    // Persistencia de submenús desplegables
    $('.sidebar .collapse').on('shown.bs.collapse', function () {
        localStorage.setItem('menu_abierto_' + this.id, 'true');
    }).on('hidden.bs.collapse', function () {
        localStorage.removeItem('menu_abierto_' + this.id);
    });
});

// ========================================================
    // 🌓 PERSISTENCIA INTEGRADA AL HEADER (ID: INPUT)
    // ========================================================
    const $darkModeInput = $('#input');

    if (localStorage.getItem('jama_dark_mode') === 'true') {
        $('body').addClass('dark-mode');
        $darkModeInput.prop('checked', true);
    } else {
        $('body').removeClass('dark-mode');
        $darkModeInput.prop('checked', false);
    }

    $('body').on('change', '#input', function () {
        const esOscuro = this.checked;
        if (esOscuro) {
            $('body').addClass('dark-mode');
            localStorage.setItem('jama_dark_mode', 'true');
        } else {
            $('body').removeClass('dark-mode');
            localStorage.setItem('jama_dark_mode', 'false');
        }
    });