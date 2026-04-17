/* ============================================
   AEOB — Shop
   Fetches products from Airtable via shop-list
   Netlify function. Falls back to placeholder
   catalog if the table is empty or offline.
   ============================================ */

const FALLBACK_PRODUCTS = [
  { id:'p-1', name:'AEOB Classic Logo Tee', price:990, category:'apparel', badge:'Bestseller', color:'#cc2030',
    desc:'Heavyweight cotton tee with the classic AEOB shield print.', sizes:['S','M','L','XL','2XL'] },
  { id:'p-2', name:'"Never Say Die" Tribute Tee', price:1090, category:'apparel', badge:'Limited', color:'#1a1f5e',
    desc:'Tribute to the Big J. Deep navy with gold foil lettering.', sizes:['S','M','L','XL','2XL'] },
  { id:'p-3', name:'Crispa Redmanizers Throwback Tee', price:1190, category:'throwback', badge:'Classic Era', color:'#e63946',
    desc:'Vintage Crispa colorway. Premium ringspun cotton.', sizes:['S','M','L','XL','2XL'] },
  { id:'p-4', name:'Toyota Tamaraws Throwback Tee', price:1190, category:'throwback', badge:'Classic Era', color:'#e8772b',
    desc:'Honoring the Tamaraws. Burnt orange throwback.', sizes:['S','M','L','XL','2XL'] },
  { id:'p-5', name:'AEOB Snapback Cap', price:790, category:'caps', badge:null, color:'#1a1f5e',
    desc:'Structured 6-panel snapback with embroidered AEOB shield.', sizes:['One Size'] },
  { id:'p-6', name:'Golden Era Dad Hat', price:690, category:'caps', badge:'New', color:'#f4a62a',
    desc:'Unstructured dad hat with subtle "PBA 1975" embroidery.', sizes:['One Size'] },
  { id:'p-7', name:'AEOB Travel Mug', price:550, category:'accessories', badge:null, color:'#2a3a8e',
    desc:'14oz stainless travel mug. Keeps your morning kape hot all episode.', sizes:['One Size'] },
  { id:'p-8', name:'AEOB Classic Hoodie', price:1890, category:'apparel', badge:'New', color:'#111111',
    desc:'Midweight fleece pullover. Kangaroo pocket. Navy or black.', sizes:['S','M','L','XL','2XL'] },
  { id:'p-9', name:'"Triple Crown 1985" Poster', price:450, category:'accessories', badge:null, color:'#cc2030',
    desc:'18×24 art print celebrating Great Taste\'s triple crown season.', sizes:['18x24'] },
  { id:'p-10', name:'PBA Eras Tour Hoodie', price:2090, category:'apparel', badge:'Limited', color:'#1a1f5e',
    desc:'All five PBA eras printed on the back. Heavyweight navy hoodie.', sizes:['S','M','L','XL','2XL'] },
  { id:'p-11', name:'AEOB Enamel Pin Set', price:390, category:'accessories', badge:null, color:'#e8772b',
    desc:'Set of 3: AEOB shield, classic basketball, and "300+" pin.', sizes:['Set of 3'] },
  { id:'p-12', name:'"Kraken Dynasty" Tee', price:1090, category:'apparel', badge:'New', color:'#3b5cc6',
    desc:'Tribute to June Mar Fajardo\'s six MVPs. Ocean blue print.', sizes:['S','M','L','XL','2XL'] }
];

// Live products array (starts as fallback, replaced after fetch)
let PRODUCTS = FALLBACK_PRODUCTS.slice();

// Map Airtable product to local shape
function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    comparePrice: p.comparePrice ? Number(p.comparePrice) : null,
    category: (p.category || 'apparel').toLowerCase(),
    badge: p.badge || null,
    color: p.color || '#1a1f5e',
    desc: p.description || '',
    sizes: Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ['One Size'],
    imageUrl: p.imageUrl || null,
    stock: p.stock,
    status: p.status
  };
}

async function fetchProducts() {
  try {
    const res = await fetch('/.netlify/functions/shop-list');
    if (!res.ok) return null;
    const data = await res.json();
    const list = (data.products || []).map(mapProduct);
    return list.length ? list : null;
  } catch (e) {
    return null;
  }
}

// ---------- State ----------
let currentCategory = 'all';
let currentSort = 'featured';

// ---------- Helpers ----------
const PESO = (n) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 0 });
function getCart() { return JSON.parse(localStorage.getItem('aeob-cart') || '[]'); }
function saveCart(c) { localStorage.setItem('aeob-cart', JSON.stringify(c)); updateCartBadge(); }

function productImage(p) {
  // Use real image if provided, else colored tile with initials
  if (p.imageUrl) {
    return `<div class="product-img" style="background-image:url('${p.imageUrl}');background-size:cover;background-position:center;width:100%;aspect-ratio:1;"></div>`;
  }
  const initials = p.name.split(' ').filter(w => /^[A-Z]/.test(w[0])).slice(0, 3).map(w => w[0]).join('');
  return `<div class="product-img-placeholder" style="background:linear-gradient(135deg, ${p.color} 0%, rgba(0,0,0,0.5) 100%);">
    <div class="product-img-initials">${initials || 'AEOB'}</div>
    <div class="product-img-pattern"></div>
  </div>`;
}

// ---------- Render Grid ----------
function renderGrid() {
  const grid = document.getElementById('shopGrid');
  if (!grid) return;
  let items = [...PRODUCTS];
  if (currentCategory === 'new') items = items.filter(p => p.badge === 'New');
  else if (currentCategory !== 'all') items = items.filter(p => p.category === currentCategory);

  if (currentSort === 'price-asc') items.sort((a, b) => a.price - b.price);
  else if (currentSort === 'price-desc') items.sort((a, b) => b.price - a.price);
  else if (currentSort === 'newest') items.sort((a, b) => (b.badge === 'New') - (a.badge === 'New'));

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><h3>No items in this category yet</h3><p>Check back soon!</p></div>`;
    return;
  }

  grid.innerHTML = items.map(p => `
    <div class="product-card" data-id="${p.id}">
      ${p.badge ? `<span class="product-badge badge-${(p.badge || '').toLowerCase().replace(/\s+/g,'-')}">${p.badge}</span>` : ''}
      <div class="product-media" onclick="window.Shop.quickview('${p.id}')">
        ${productImage(p)}
      </div>
      <div class="product-body">
        <h3 class="product-name">${p.name}</h3>
        <div class="product-price">${PESO(p.price)}</div>
        <div class="product-actions">
          <button class="btn btn-primary btn-sm" onclick="window.Shop.addToCart('${p.id}')">Add to Cart</button>
          <button class="btn btn-outline btn-sm" onclick="window.Shop.quickview('${p.id}')">Quick View</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ---------- Category / Sort ----------
document.querySelectorAll('.shop-cat').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.shop-cat').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    renderGrid();
  });
});
document.getElementById('shopSort')?.addEventListener('change', e => {
  currentSort = e.target.value;
  renderGrid();
});

// ---------- Quickview ----------
function quickview(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const modal = document.getElementById('quickviewModal');
  const inner = document.getElementById('quickviewInner');
  inner.innerHTML = `
    <div class="qv-media">${productImage(p)}</div>
    <div class="qv-info">
      ${p.badge ? `<span class="product-badge badge-${(p.badge || '').toLowerCase().replace(/\s+/g,'-')}">${p.badge}</span>` : ''}
      <h2>${p.name}</h2>
      <div class="qv-price">${PESO(p.price)}</div>
      <p class="qv-desc">${p.desc}</p>
      ${p.sizes.length > 1 ? `
        <div class="qv-sizes">
          <label>Size</label>
          <div class="size-picker">
            ${p.sizes.map((s, i) => `<button class="size-btn ${i === 1 ? 'active' : ''}" data-size="${s}">${s}</button>`).join('')}
          </div>
        </div>
      ` : ''}
      <div class="qv-actions">
        <button class="btn btn-primary btn-block" onclick="window.Shop.addToCart('${p.id}');window.Shop.closeQuickview();">Add to Cart &middot; ${PESO(p.price)}</button>
      </div>
      <div class="qv-meta">
        <span>&#9989; Free PH shipping over ₱2,000</span>
        <span>&#128230; 14-day returns</span>
      </div>
    </div>
  `;
  // Size picker
  inner.querySelectorAll('.size-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      inner.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeQuickview() {
  document.getElementById('quickviewModal')?.classList.remove('active');
  document.body.style.overflow = '';
}
document.getElementById('closeQuickview')?.addEventListener('click', closeQuickview);
document.getElementById('quickviewModal')?.addEventListener('click', e => {
  if (e.target.id === 'quickviewModal') closeQuickview();
});

// ---------- Cart ----------
function addToCart(id) {
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  const cart = getCart();
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty++;
  else cart.push({ id, name: p.name, price: p.price, qty: 1, color: p.color });
  saveCart(cart);
  shopToast(`Added "${p.name}" to cart`);
  renderCartDrawer();
  // Brief drawer peek
  openCart();
  setTimeout(() => { if (!document.body.classList.contains('cart-pinned')) closeCart(); }, 1800);
}
function changeQty(id, delta) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  const filtered = cart.filter(i => i.qty > 0);
  saveCart(filtered);
  renderCartDrawer();
}
function removeFromCart(id) {
  const cart = getCart().filter(i => i.id !== id);
  saveCart(cart);
  renderCartDrawer();
}
function clearCart() {
  saveCart([]);
  renderCartDrawer();
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  if (!badge) return;
  const count = getCart().reduce((sum, i) => sum + i.qty, 0);
  badge.textContent = count;
  badge.style.display = count > 0 ? 'flex' : 'none';
}

function renderCartDrawer() {
  const items = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const subtotal = document.getElementById('cartSubtotal');
  if (!items) return;
  const cart = getCart();
  if (!cart.length) {
    items.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">&#128722;</div><p>Your cart is empty.</p></div>`;
    if (footer) footer.style.display = 'none';
    return;
  }
  items.innerHTML = cart.map(i => `
    <div class="cart-item">
      <div class="cart-item-img" style="background:${i.color};"></div>
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-price">${PESO(i.price)}</div>
        <div class="cart-item-qty">
          <button onclick="window.Shop.changeQty('${i.id}', -1)">−</button>
          <span>${i.qty}</span>
          <button onclick="window.Shop.changeQty('${i.id}', 1)">+</button>
          <button class="cart-item-remove" onclick="window.Shop.removeFromCart('${i.id}')" aria-label="Remove">&times;</button>
        </div>
      </div>
      <div class="cart-item-total">${PESO(i.price * i.qty)}</div>
    </div>
  `).join('');
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (subtotal) subtotal.textContent = PESO(total);
  if (footer) footer.style.display = 'block';
}

function openCart() {
  document.body.classList.add('cart-open');
  document.body.classList.add('cart-pinned');
  renderCartDrawer();
}
function closeCart() {
  document.body.classList.remove('cart-open');
  document.body.classList.remove('cart-pinned');
}
document.getElementById('cartToggle')?.addEventListener('click', () => {
  if (document.body.classList.contains('cart-open')) closeCart();
  else openCart();
});
document.getElementById('closeCart')?.addEventListener('click', closeCart);
document.getElementById('cartOverlay')?.addEventListener('click', closeCart);
document.getElementById('clearCartBtn')?.addEventListener('click', clearCart);
document.getElementById('checkoutBtn')?.addEventListener('click', () => {
  shopToast('Checkout coming soon! Hook up Shopify/Stripe here.');
});

// ---------- Toast ----------
function shopToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ---------- Deep link by hash (for footer category links) ----------
function applyHashCategory() {
  const cat = location.hash.replace('#', '');
  if (!cat) return;
  const btn = document.querySelector(`.shop-cat[data-cat="${cat}"]`);
  if (btn) btn.click();
}
window.addEventListener('hashchange', applyHashCategory);

// ---------- Expose + Init ----------
window.Shop = { addToCart, changeQty, removeFromCart, quickview, closeQuickview };
renderGrid();
updateCartBadge();
renderCartDrawer();
applyHashCategory();

// Try to load live products; fall back silently on failure
fetchProducts().then(live => {
  if (live && live.length) {
    PRODUCTS = live;
    renderGrid();
  }
});
