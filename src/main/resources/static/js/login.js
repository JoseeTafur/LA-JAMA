document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");

    loginForm.addEventListener("submit", function (event) {
        const username = document.getElementById("usuario").value;
        const password = document.getElementById("clave").value;

        if (!username || !password) {
            event.preventDefault();
            Swal.fire({
                icon: "warning",
                title: "Campos incompletos",
                text: "Por favor, ingresa tu usuario y contraseña.",
                confirmButtonColor: "#0d6efd",
            });
        }
    });

    const errorMessage = null;
    if (errorMessage) {
        Swal.fire({
            icon: "error",
            title: "Error de Acceso",
            text: errorMessage,
            confirmButtonColor: "#dc3545",
        });
    }

    const logoutMessage = null;
    if (logoutMessage) {
        Swal.fire({
            icon: "success",
            title: "Sesión Cerrada",
            text: logoutMessage,
            timer: 2000,
            showConfirmButton: false,
        });
    }
});