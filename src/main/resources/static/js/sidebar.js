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

$(document).ready(function () {
    const $sidebar              = $('#sidebar');
    const $openSidebarBtn       = $('#open-sidebar');
    const $closeSidebarBtn      = $('#close-sidebar');
    const $sidebarOverlay       = $('#sidebar-overlay');
    const $toggleSidebarDesktop = $('#toggle-sidebar-desktop');
    const $body                 = $('body');

    if (localStorage.getItem('jama_sidebar_collapsed') === 'true') {
        $body.addClass('sidebar-collapsed');
    }

    if ($toggleSidebarDesktop.length) {
        $toggleSidebarDesktop.on('click', function () {
            $body.toggleClass('sidebar-collapsed');
            const isCollapsed = $body.hasClass('sidebar-collapsed');
            localStorage.setItem('jama_sidebar_collapsed', isCollapsed);

            setTimeout(() => {
                const trigger = document.getElementById("sidebar-ripple");
                if(trigger) trigger.click();
            }, 350);
        });
    }

    if ($openSidebarBtn.length && $sidebar.length) {
        $openSidebarBtn.on('click', function () {
            $sidebar.addClass('active');
            if ($sidebarOverlay.length) $sidebarOverlay.addClass('active');
        });

        function cerrarMenuMovil() {
            $sidebar.removeClass('active');
            if ($sidebarOverlay.length) $sidebarOverlay.removeClass('active');
        }

        if ($closeSidebarBtn.length) $closeSidebarBtn.on('click', cerrarMenuMovil);
        if ($sidebarOverlay.length) $sidebarOverlay.on('click', cerrarMenuMovil);
    }

    $('.btn-toggle-grupo-jama').on('click', function (e) {
        e.preventDefault();

        const targetId = $(this).attr('data-target-collapse');
        const $targetCollapse = $(targetId);

        if ($targetCollapse.length) {
            const isOpen = $targetCollapse.is(':visible');

            if (isOpen) {
                $targetCollapse.slideUp(250, function() {
                    $targetCollapse.removeClass('show');
                    localStorage.removeItem('menu_abierto_' + targetId.replace('#', ''));
                });
                $(this).attr('aria-expanded', 'false');
                $(this).removeClass('active-uiverse');
                $(this).find('.jama-radio-hidden').prop('checked', false);
            } else {
                $('.collapse.show').each(function() {
                    $(this).slideUp(200).removeClass('show');
                    localStorage.removeItem('menu_abierto_' + this.id);
                });
                $('.btn-toggle-grupo-jama').attr('aria-expanded', 'false').removeClass('active-uiverse');

                $targetCollapse.slideDown(250, function() {
                    $targetCollapse.addClass('show');
                    localStorage.setItem('menu_abierto_' + targetId.replace('#', ''), 'true');
                });
                $(this).attr('aria-expanded', 'true');
                $(this).addClass('active-uiverse');
                $(this).find('.jama-radio-hidden').prop('checked', true);
            }
        }
    });

    $('.collapse').each(function () {
        if (localStorage.getItem('menu_abierto_' + this.id) === 'true') {
            $(this).show().addClass('show');
            $(`[data-target-collapse="#${this.id}"]`).addClass('active-uiverse').attr('aria-expanded', 'true');
            $(`[data-target-collapse="#${this.id}"]`).find('.jama-radio-hidden').prop('checked', true);
        }
    });
});

$(document).ready(function () {
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
});