(() => {
  const CART_KEY = 'ecomerce-cake-cafe-cart';
  const currency = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { cart = []; }

  const safe = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const saveCart = () => {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch { /* storage may be unavailable */ }
    updateCount();
  };
  const updateCount = () => {
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('[data-cart-count]').forEach((el) => { el.textContent = count; });
  };

  const cartLayer = document.createElement('div');
  cartLayer.className = 'cart-layer';
  cartLayer.setAttribute('aria-hidden', 'true');
  cartLayer.innerHTML = `
    <button class="cart-backdrop" type="button" data-cart-close aria-label="Close basket"></button>
    <aside class="cart-drawer" role="dialog" aria-modal="true" aria-label="Your basket">
      <div class="cart-drawer-head"><h2>Your basket</h2><button class="cart-close" type="button" data-cart-close aria-label="Close basket">×</button></div>
      <div class="cart-items" data-cart-items></div>
      <div class="cart-summary" data-cart-summary></div>
    </aside>`;
  document.body.appendChild(cartLayer);

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  let toastTimer;
  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
  }
  function openCart() {
    renderCart();
    cartLayer.classList.add('is-open');
    cartLayer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('cart-open');
    cartLayer.querySelector('.cart-close').focus();
  }
  function closeCart() {
    cartLayer.classList.remove('is-open');
    cartLayer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('cart-open');
  }
  function renderCart() {
    const list = cartLayer.querySelector('[data-cart-items]');
    const summary = cartLayer.querySelector('[data-cart-summary]');
    if (!cart.length) {
      list.innerHTML = '<div class="cart-empty">Your basket is waiting for a treat.<small>Add something delicious from the menu.</small></div>';
      summary.innerHTML = '<p class="cart-fineprint">Freshly baked and packed with care. Checkout is a front-end demo.</p><button class="btn btn-primary" type="button" data-cart-close>Keep browsing <span class="btn-arrow">↗</span></button>';
      return;
    }
    list.innerHTML = cart.map((item, index) => `
      <div class="cart-line">
        <img src="${safe(item.image)}" alt="" />
        <div><h3>${safe(item.name)}</h3><span class="line-price">${currency.format(item.price)}</span>
          <div class="cart-qty"><button type="button" data-qty="-1" data-index="${index}" aria-label="Remove one ${safe(item.name)}">−</button><span>${item.qty}</span><button type="button" data-qty="1" data-index="${index}" aria-label="Add one ${safe(item.name)}">+</button></div>
        </div>
        <button class="cart-remove" type="button" data-remove="${index}">Remove</button>
      </div>`).join('');
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    summary.innerHTML = `<div class="cart-subtotal"><span>Subtotal</span><span>${currency.format(total)}</span></div><p class="cart-fineprint">Delivery or pickup details can be arranged at checkout. This is a demo storefront.</p><button class="btn btn-primary" type="button" data-demo-checkout>Continue to checkout <span class="btn-arrow">↗</span></button>`;
  }

  document.addEventListener('click', (event) => {
    const openButton = event.target.closest('[data-cart-open]');
    if (openButton) { openCart(); return; }
    if (event.target.closest('[data-cart-close]')) { closeCart(); return; }
    const addButton = event.target.closest('[data-add-to-cart]');
    if (addButton) {
      const name = addButton.dataset.productName;
      const price = Number(addButton.dataset.productPrice || 0);
      const image = addButton.dataset.productImage || '';
      const existing = cart.find((item) => item.name === name);
      if (existing) existing.qty += 1;
      else cart.push({ name, price, image, qty: 1 });
      saveCart();
      showToast(`${name} added to your basket.`);
      return;
    }
    const quantityButton = event.target.closest('[data-qty]');
    if (quantityButton) {
      const index = Number(quantityButton.dataset.index);
      const amount = Number(quantityButton.dataset.qty);
      if (!cart[index]) return;
      cart[index].qty += amount;
      if (cart[index].qty <= 0) cart.splice(index, 1);
      saveCart();
      renderCart();
      return;
    }
    const removeButton = event.target.closest('[data-remove]');
    if (removeButton) {
      cart.splice(Number(removeButton.dataset.remove), 1);
      saveCart();
      renderCart();
      return;
    }
    if (event.target.closest('[data-demo-checkout]')) {
      showToast('Thanks! Online checkout is not connected in this demo.');
      return;
    }
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeCart(); });

  // Filter and sort the product list on the shop page.
  const productGrid = document.querySelector('[data-product-grid]');
  if (productGrid) {
    const cards = Array.from(productGrid.querySelectorAll('[data-product-card]'));
    const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));
    const searchInput = document.querySelector('[data-product-search]');
    const sortSelect = document.querySelector('[data-product-sort]');
    const noResults = document.querySelector('[data-no-results]');
    let activeFilter = 'all';
    function refreshProducts() {
      const query = (searchInput?.value || '').trim().toLowerCase();
      const sortMode = sortSelect?.value || 'featured';
      cards.sort((a, b) => {
        const priceA = Number(a.dataset.price || 0), priceB = Number(b.dataset.price || 0);
        return sortMode === 'low' ? priceA - priceB : sortMode === 'high' ? priceB - priceA : Number(a.dataset.order) - Number(b.dataset.order);
      });
      cards.forEach((card) => {
        productGrid.appendChild(card);
        const matchesCategory = activeFilter === 'all' || card.dataset.category === activeFilter;
        const matchesSearch = !query || card.textContent.toLowerCase().includes(query);
        card.hidden = !(matchesCategory && matchesSearch);
      });
      if (noResults) noResults.classList.toggle('is-visible', cards.every((card) => card.hidden));
    }
    filterButtons.forEach((button) => button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      filterButtons.forEach((item) => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
      refreshProducts();
    }));
    searchInput?.addEventListener('input', refreshProducts);
    sortSelect?.addEventListener('change', refreshProducts);
    refreshProducts();
  }

  // Front-end demo feedback for contact and newsletter forms.
  document.querySelectorAll('[data-demo-form]').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    showToast(form.dataset.success || 'Thanks for your note! This demo form is not connected yet.');
    form.reset();
  }));

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
  updateCount();
})();