/**
 * LA JAMA - MÓDULO DE CONTROL DE NAVEGACIÓN Y SIDEBAR
 * Responsabilidad: Gestionar la responsividad del menú lateral, persistencia
 * de estados colapsados y limpieza de caché del historial de navegación.
 */

$(document).ready(function () {
    // ========================================================
    // 1. DECLARACIÓN DE SELECTORES COMPARTIDOS
    // ========================================================
    const $sidebar        = $('#sidebar');
    const $openSidebarBtn = $('#open-sidebar');
    const $closeSidebarBtn= $('#close-sidebar');
    const $sidebarOverlay = $('#sidebar-overlay');

    // ========================================================
    // 2. CONTROLADOR DE EVENTOS EN PANTALLAS MÓVILES
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
    // 3. PERSISTENCIA DE SUBMENÚS DESPLEGABLES (BOOTSTRAP)
    // ========================================================
    // Este bloque previene que los colapsables dinámicos de Thymeleaf
    // pierdan su estado de foco al cambiar de sección interna.
    $('.sidebar .collapse').on('shown.bs.collapse', function () {
        localStorage.setItem('menu_abierto_' + this.id, 'true');
    }).on('hidden.bs.collapse', function () {
        localStorage.removeItem('menu_abierto_' + this.id);
    });
});