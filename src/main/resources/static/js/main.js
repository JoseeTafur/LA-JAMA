document.addEventListener("DOMContentLoaded", function () {

    const loginForm = document.getElementById("loginForm");
    const overlay = document.getElementById("loading-overlay");
    const video = document.getElementById("premium-video");

    // 1. EFECTO DE ONDAS ADAPTADO DE ACETERNITY UI
    const grid = document.getElementById("ripple-grid");
    if (grid) {
        const cellSize = 50;
        let rows = 0, cols = 0;
        function createGrid() {
            grid.innerHTML = "";
            cols = Math.ceil(window.innerWidth / cellSize);
            rows = Math.ceil(window.innerHeight / cellSize);
            grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    const cell = document.createElement("div");
                    cell.classList.add("ripple-cell");
                    cell.dataset.row = r;
                    cell.dataset.col = c;
                    grid.appendChild(cell);
                }
            }
        }
        grid.addEventListener("click", function (e) {
            const targetCell = e.target;
            if (!targetCell.classList.contains("ripple-cell")) return;
            const startRow = parseInt(targetCell.dataset.row);
            const startCol = parseInt(targetCell.dataset.col);
            const allCells = grid.querySelectorAll(".ripple-cell");
            allCells.forEach(cell => {
                if (cell.classList.contains("animate-ripple")) return;
                const r = parseInt(cell.dataset.row);
                const c = parseInt(cell.dataset.col);
                const distance = Math.abs(r - startRow) + Math.abs(c - startCol);
                const delay = distance * 45;
                cell.style.setProperty("--delay", `${delay}ms`);
                cell.classList.add("animate-ripple");
                cell.addEventListener("animationend", function handler() {
                    cell.classList.remove("animate-ripple");
                    cell.removeEventListener("animationend", handler);
                });
            });
        });
        createGrid();
        window.addEventListener("resize", createGrid);
    }

    // 2. INTERRUPTOR DE CONTRASEÑA
    const inputPassword = document.querySelector("#clave");
    const toggleBtn = document.querySelector("#togglePassword");
    if (inputPassword && toggleBtn) {
        toggleBtn.addEventListener("click", function () {
            const type = inputPassword.getAttribute("type") === "password" ? "text" : "password";
            inputPassword.setAttribute("type", type);
            const icon = this.querySelector("i");
            icon.classList.toggle("bi-eye");
            icon.classList.toggle("bi-eye-slash");
        });
    }

    function showPremiumVideoLoader(texto, videoSrc = '/video/loader_lajama.webm') {
        if (overlay && video) {
            const textElement = overlay.querySelector('.premium-loading-text');
            if (textElement) textElement.textContent = texto;

            video.muted = true;
            video.defaultMuted = true;
            video.load();

            overlay.classList.add("active");
            video.play().catch(() => {});
        }
    }

    // ========================================================
    // 🛡️ CONTROL DE LOGIN OPTIMIZADO: ANTI-RÁFAGAS EN PRODUCCIÓN
    // ========================================================
    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            const username = document.getElementById("usuario").value;
            const password = document.getElementById("clave").value;

            if (username && password) {
                e.preventDefault();

                fetch('/login', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({
                        'usuario': username,
                        'clave': password
                    })
                }).then(response => {
                    if (response.status === 429) {
                        if (typeof AppUtils !== 'undefined' && AppUtils.showNotification) {
                            AppUtils.showNotification("🚨 Demasiados intentos. Acceso bloqueado temporalmente.", "error");
                        } else {
                            alert("🚨 Sistema saturado. Has excedido el límite de solicitudes.");
                        }
                        return;
                    }

                    if (response.redirected) {
                        const videoUrl = loginForm.getAttribute("data-video-src") || "/video/loader_lajama.webm";
                        showPremiumVideoLoader("Validando credenciales...", videoUrl);

                        setTimeout(() => {
                            window.location.href = response.url;
                        }, 1000);
                    } else {
                        window.location.reload();
                    }
                }).catch(err => {
                    console.error("Error en la aduana perimetral:", err);
                    loginForm.submit();
                });
            }
        });
    }
});

// ========================================================
// 🛡️ REPARACIÓN DEL HISTORIAL
// ========================================================
window.addEventListener("pageshow", function (event) {
    if (event.persisted) {
        const overlay = document.getElementById("loading-overlay");
        const video = document.getElementById("premium-video");

        if (overlay) overlay.classList.remove("active");
        if (video) video.pause();
        console.log("🧼 [HISTORIAL] Loader desinfectado correctamente.");
    }
});