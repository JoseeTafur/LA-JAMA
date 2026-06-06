$(document).ready(function () {
    function setupSidebar() {
        const sidebar = $('#sidebar');
        const openSidebarBtn = $('#open-sidebar');
        const closeSidebarBtn = $('#close-sidebar');
        const sidebarOverlay = $('#sidebar-overlay');

        openSidebarBtn.on('click', function () {
            sidebar.addClass('active');
            sidebarOverlay.addClass('active');
        });

        function closeSidebar() {
            sidebar.removeClass('active');
            sidebarOverlay.removeClass('active');
        }

        closeSidebarBtn.on('click', closeSidebar);
        sidebarOverlay.on('click', closeSidebar);
    }

    setupSidebar();
});