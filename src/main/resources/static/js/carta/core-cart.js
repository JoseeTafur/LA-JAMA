// core-cart.js
export let carrito = JSON.parse(localStorage.getItem("carrito") || "[]");

export function actualizarUI() {
    const badge = document.getElementById('badgeCount');
    if (badge) badge.textContent = carrito.length;
    const btn = document.getElementById('btnCarrito');
    if (btn) btn.style.display = carrito.length > 0 ? 'flex' : 'none';
}

export function agregarDesdeCard(el) {
    carrito.push({
        idTemporal: Date.now() + Math.random(),
        id: el.getAttribute('data-id'),
        nombre: el.getAttribute('data-nombre'),
        precio: parseFloat(el.getAttribute('data-precio'))
    });
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarUI();
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 400);
}

export function removerItem(index) {
    carrito.splice(index, 1);
    localStorage.setItem("carrito", JSON.stringify(carrito));
    actualizarUI();
    renderCarrito();
    if (carrito.length === 0) document.getElementById('modalCarrito').classList.remove('show');
}

export function renderCarrito() {
    const lista = document.getElementById('listaCarrito');
    if (!lista) return;
    if (carrito.length === 0) {
        lista.innerHTML = '<p class="text-muted text-center py-3">Tu carrito está vacío</p>';
        document.getElementById('totalCarrito').textContent = '0.00';
        return;
    }
    let total = 0;
    lista.innerHTML = carrito.map((item, idx) => {
        total += item.precio;
        return `<div class="item-carrito">
            <div style="flex:1;">
                <div class="item-nombre">${item.nombre}</div>
                <div class="item-precio">S/ ${item.precio.toFixed(2)}</div>
            </div>
            <button onclick="window.removerItemCarta(${idx})" style="background:transparent; border:none; color:#933D2D; cursor:pointer;">
                <i class="bi bi-trash3-fill"></i>
            </button>
        </div>`;
    }).join('');
    document.getElementById('totalCarrito').textContent = total.toFixed(2);
}