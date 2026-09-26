// ===== Перехват 403 (блокировка) =====
const _origFetch = window.fetch;
window.fetch = async function(...args) {
    const res = await _origFetch.apply(this, args);
    if (res.status === 403) {
        try {
            const clone = res.clone();
            const data = await clone.json();
            const detail = (data && data.detail) || '';
            if (detail.toLowerCase().includes('заблокированы')) {
                showBlockedScreen();
            }
        } catch(e) {}
    }
    return res;
};
function showBlockedScreen() {
    if (document.getElementById('blocked-screen')) return;
    const el = document.createElement('div');
    el.id = 'blocked-screen';
    el.className = 'blocked-screen';
    el.innerHTML = '<div class="blocked-box">' +
        '<div class="blocked-emoji">🚫</div>' +
        '<div class="blocked-title">Вы заблокированы</div>' +
        '<div class="blocked-sub">Обратитесь к менеджеру для разблокировки</div>' +
        '<button class="blocked-btn" onclick="openManager()">💬 Написать менеджеру</button>' +
    '</div>';
    document.body.appendChild(el);
}

const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }
const API = '';
const headers = () => ({'Content-Type':'application/json','X-Telegram-Init-Data':tg?.initData||''});
let currentCategory = 'all', currentTab = 'catalog', isAdmin = false, isOwner = false;
const content = document.getElementById('content');
const ADMINS = [5995285721, 1932347151, 8609826210];
const OWNER_ID = 5995285721;
function getRole() {
    const user = tg?.initDataUnsafe?.user || {};
    if (user.id === OWNER_ID) return '👑 Владелец';
    if (ADMINS.includes(user.id)) return '🛡 Администратор';
    return 'Пользователь';
}
function syncNavActive() {
    const mainTabs = ['catalog', 'cart', 'favorites', 'profile'];
    document.querySelectorAll('.nav-btn').forEach(b => {
        b.classList.toggle('active', mainTabs.includes(currentTab) && b.dataset.tab === currentTab);
    });
}
document.querySelector('.bottom-nav')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.nav-btn');
    if (!btn) return;
    currentTab = btn.dataset.tab;
    syncNavActive();
    render();
});
syncNavActive();
async function animateContent() {
    const el = document.getElementById('content');
    if (!el) return;
    el.classList.remove('content-enter');
    void el.offsetWidth; // reflow для рестарта анимации
    el.classList.add('content-enter');
}

function render() {
    document.body.classList.toggle('admin-mode', ['admin','admin_products','orders_admin','promo','broadcast','faq_admin','users','stats','logs_admin','group','add_product'].includes(currentTab));
    updateCartBadge();
    animateContent();
    if (typeof syncNavActive === 'function') syncNavActive();
    if (currentTab === 'catalog') return renderCatalog();
    if (currentTab === 'cart') return renderCart();
    if (currentTab === 'checkout') return renderCheckout();
    if (currentTab === 'favorites') return renderFavorites();
    if (currentTab === 'profile') return renderProfile();
    if (currentTab === 'admin') return renderAdmin();
    if (currentTab === 'promo') return renderPromo();
    if (currentTab === 'broadcast') return renderBroadcast();
    if (currentTab === 'faq_admin') return renderFaqAdmin();
    if (currentTab === 'logs_admin') return renderLogsAdmin();
    if (currentTab === 'users') return renderUsers();
    if (currentTab === 'stats') return renderStats();
    if (currentTab === 'add_product') return renderAddProduct();
    if (currentTab === 'admin_products') return renderAdminProducts();
    if (currentTab === 'orders_admin') return renderOrdersAdmin();
    if (currentTab === 'product') return renderProductScreen();
    if (currentTab === 'my_orders') return renderMyOrders();
    if (currentTab === 'group') return renderGroup();
}
let currentProductId = null;
function categoryLabel(cat) {
    if (cat === 'liquid') return '<div style="display:inline-block;background:#0e0e10;color:#fff;font-size:11px;padding:5px 14px;border-radius:20px;margin-bottom:10px">💧 Жидкость</div>';
    if (cat === 'disposable') return '<div style="display:inline-block;background:#0e0e10;color:#fff;font-size:11px;padding:5px 14px;border-radius:20px;margin-bottom:10px">🚬 Одноразка</div>';
    if (cat === 'accessory') return '<div style="display:inline-block;background:#0e0e10;color:#fff;font-size:11px;padding:5px 14px;border-radius:20px;margin-bottom:10px">🔧 Расходник</div>';
    if (cat === 'snus') return '<div style="display:inline-block;background:#0e0e10;color:#fff;font-size:11px;padding:5px 14px;border-radius:20px;margin-bottom:10px">🍬 Снюс</div>';
    if (cat === 'vape') return '<div style="display:inline-block;background:#0e0e10;color:#fff;font-size:11px;padding:5px 14px;border-radius:20px;margin-bottom:10px">💨 Вейп</div>';
    return '<div style="display:inline-block;background:#0e0e10;color:#fff;font-size:11px;padding:5px 14px;border-radius:20px;margin-bottom:10px">📦 Другое</div>';
}
function stockLabel(q) {
    if (q <= 0) return '<span style="color:#ef4444;font-size:11px">Нет в наличии</span>';
    if (q <= 3) return '<span style="color:#f59e0b;font-size:11px">Осталось ' + q + ' шт.</span>';
    return '';
}
async function renderCatalog() {
    content.innerHTML = getCatalogBanner() + '<div class="search-row"><div class="search-wrap"><span class="search-icon">🔍</span><input class="search-input" id="search-input" placeholder="Поиск товаров..." oninput="doSearch()" onfocus="renderSearchHistory()" onkeydown="if(event.key===String.fromCharCode(69,110,116,101,114))saveSearch(this.value)" value="' + (window._searchQuery || '') + '"><span class="search-clear" onclick="clearSearch()">✕</span></div><button class="sort-btn" onclick="cycleSort()"><span class="sort-btn-icon">⇅</span><span class="sort-btn-label" id="sort-label">По популярности</span></button></div><div class="search-history" id="search-history"></div><div class="categories-icons"><button class="cat-icon ' + (currentCategory === 'all' ? 'active' : '') + '" data-cat="all"><div class="cat-icon-emoji">🛍</div><div class="cat-icon-label">Все</div></button><button class="cat-icon ' + (currentCategory === 'liquid' ? 'active' : '') + '" data-cat="liquid"><div class="cat-icon-emoji">💧</div><div class="cat-icon-label">Жидкости</div></button><button class="cat-icon ' + (currentCategory === 'accessory' ? 'active' : '') + '" data-cat="accessory"><div class="cat-icon-emoji">🔧</div><div class="cat-icon-label">Расходники</div></button><button class="cat-icon ' + (currentCategory === 'snus' ? 'active' : '') + '" data-cat="snus"><div class="cat-icon-emoji">🍬</div><div class="cat-icon-label">Снюс</div></button><button class="cat-icon ' + (currentCategory === 'vape' ? 'active' : '') + '" data-cat="vape"><div class="cat-icon-emoji">💨</div><div class="cat-icon-label">Вейп</div></button><button class="cat-icon ' + (currentCategory === 'other' ? 'active' : '') + '" data-cat="other"><div class="cat-icon-emoji">📦</div><div class="cat-icon-label">Другое</div></button></div><div class="products-grid" id="products-grid">' + skeletonGridInner(6) + '</div>';
    document.querySelectorAll('.cat-icon').forEach(b => b.addEventListener('click', () => { currentCategory = b.dataset.cat; window._searchQuery = ''; renderCatalog(); }));
    const res = await fetch(API + '/api/products?category=' + currentCategory, { headers: headers() });
    const products = await res.json();
    window._catalogProducts = products;
    
    renderProductsGrid(products);
}

function renderNewStrip(products) {
    const box = document.getElementById('new-strip-box');
    if (!box) return;
    const news = (products || []).filter(p => isNewProduct(p) && (p.quantity > 0 || (p.flavor_stocks && p.flavor_stocks.trim()))).slice(0, 8);
    if (news.length === 0) { box.parentElement.style.display = 'none'; return; }
    box.parentElement.style.display = '';
    box.innerHTML = news.map(p => {
        const img = p.photo_id ? '<img src="' + p.photo_id + '" class="new-strip-img">' : '<div class="new-strip-img new-strip-empty">📦</div>';
        return '<div class="new-strip-card" onclick="openProduct(' + p.id + ')">' + img + '<div class="new-strip-name">' + p.name + '</div><div class="new-strip-price">' + p.price + ' BYN</div></div>';
    }).join('');
}

function quickView(pid) {
    haptic('light');
    const all = window._catalogProducts || [];
    const p = all.find(x => x.id === pid);
    if (!p) { openProduct(pid); return; }
    const fsMap = parseFlavorStocks(p.flavor_stocks);
    const flavors = _pfItems(p.flavors).map(function(x){return x.name});
    const strengths = (p.strengths || '').split(',').map(x => x.trim()).filter(Boolean);
    window._qvFlavor = flavors.find(f => getFlavorStock(fsMap, f) > 0) || flavors[0] || '';
    window._qvStrength = strengths[0] || '';
    window._qvPid = pid;
    const op = parseFloat(p.old_price || 0) || 0;
    const hasDisc = op > p.price;
    const discPct = hasDisc ? Math.round((1 - p.price / op) * 100) : 0;
    const fsStock = (window._qvFlavor && (window._qvFlavor in fsMap)) ? fsMap[window._qvFlavor] : Infinity;
    const effQty = (fsStock !== Infinity) ? fsStock : p.quantity;
    const stockCls = effQty <= 0 ? 'qv-stock-out' : (effQty <= 3 ? 'qv-stock-low' : 'qv-stock-ok');
    const stockTxt = effQty <= 0 ? '✕ Нет в наличии' : (effQty <= 3 ? '⏳ Осталось ' + effQty + ' шт.' : '✔ В наличии');
    const img = p.photo_id ? '<img src="' + p.photo_id + '">' : '<div class="qv-photo-empty">📦</div>';
    const catMap = { all:'🛍 Все', liquid:'💧 Жидкости', accessory:'🔧 Расходники', snus:'🍬 Снюс', vape:'💨 Вейп', other:'📦 Другое' };
    const badges = '<span class="qv-badge">' + (catMap[p.category] || '📦') + '</span>'
        + (p.is_hit ? '<span class="qv-badge qv-badge-hit">🔥 Хит</span>' : '')
        + (isNewProduct(p) ? '<span class="qv-badge qv-badge-new">🆕 Новинка</span>' : '')
        + (p.tag ? '<span class="qv-badge">' + p.tag + '</span>' : '')
        + (hasDisc ? '<span class="qv-badge qv-badge-disc">-' + discPct + '%</span>' : '');
    let chipsHtml = '';
    if (flavors.length > 0) {
        chipsHtml += '<div class="qv-section-title">' + (p.category === 'vape' ? 'Цвет' : (p.category === 'accessory' ? 'Сопротивление' : 'Вкус')) + '</div><div class="qv-chips">'
            + flavors.map(f => {
                const st = getFlavorStock(fsMap, f);
                const dis = st <= 0;
                const active = f === window._qvFlavor && !dis;
                const oc = dis ? '' : ' onclick="qvSelectFlavor(this.dataset.f)"';
                const style = dis ? ' style="opacity:0.4;text-decoration:line-through"' : '';
                return '<div class="qv-chip' + (active ? ' active' : '') + '" data-f="' + f + '"' + oc + style + '>' + f + (dis ? '' : (st !== Infinity ? ' · ' + st : '')) + '</div>';
            }).join('') + '</div>';
    }
    if (strengths.length > 0) {
        const _qvIsAcc = p.category === 'accessory';
        chipsHtml += '<div class="qv-section-title">' + (_qvIsAcc ? 'Сопротивление' : 'Крепость') + '</div><div class="qv-chips">'
            + strengths.map(s2 => {
                const active = s2 === window._qvStrength;
                return '<div class="qv-chip' + (active ? ' active' : '') + '" data-s="' + s2 + '" onclick="qvSelectStrength(this.dataset.s)">' + s2 + (_qvIsAcc ? ' Ом' : ' мг') + '</div>';
            }).join('') + '</div>';
    }
    const buyDisabled = effQty <= 0 ? ' disabled' : '';
    const buyTxt = effQty <= 0 ? 'Нет в наличии' : '🛒 В корзину · ' + p.price + ' BYN';
    const m = document.createElement('div');
    m.className = 'qv-modal';
    m.id = 'qv-modal';
    m.innerHTML = '<div class="qv-sheet"><div class="qv-handle"></div><button class="qv-close" onclick="closeQuickView()">✕</button>'
        + '<div class="qv-photo">' + img + '</div>'
        + '<div class="qv-badges">' + badges + '</div>'
        + '<div class="qv-name">' + p.name + '</div>'
        + '<div class="qv-price-row"><div class="qv-price">' + p.price + ' <span style="font-size:14px;font-weight:600">BYN</span></div>'
        + (hasDisc ? '<div class="qv-price-old">' + op + ' BYN</div>' : '') + '</div>'
        + '<div class="qv-stock ' + stockCls + '">' + stockTxt + '</div>'
        + chipsHtml
        + '<div class="qv-actions"><button class="qv-buy"' + buyDisabled + ' onclick="qvAddToCart()">' + buyTxt + '</button>'
        + '<button class="qv-details" onclick="qvOpenDetails()">Подробнее</button></div>'
        + '</div>';
    m.onclick = (e) => { if (e.target === m) closeQuickView(); };
    document.body.appendChild(m);
}
function closeQuickView() {
    const m = document.getElementById('qv-modal');
    if (m) m.remove();
}
function qvSelectFlavor(f) {
    window._qvFlavor = f;
    haptic('light');
    const m = document.getElementById('qv-modal');
    if (!m) return;
    m.querySelectorAll('.qv-chip[data-f]').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.f === f);
    });
    const p = (window._catalogProducts || []).find(x => x.id === window._qvPid);
    if (!p) return;
    const fsMap = parseFlavorStocks(p.flavor_stocks);
    const st = (f in fsMap) ? fsMap[f] : p.quantity;
    const stockEl = m.querySelector('.qv-stock');
    if (stockEl) {
        const cls = st <= 0 ? 'qv-stock-out' : (st <= 3 ? 'qv-stock-low' : 'qv-stock-ok');
        const txt = st <= 0 ? '✕ Нет в наличии' : (st <= 3 ? '⏳ Осталось ' + st + ' шт.' : '✔ В наличии');
        stockEl.className = 'qv-stock ' + cls;
        stockEl.textContent = txt;
    }
    const buy = m.querySelector('.qv-buy');
    if (buy) {
        if (st <= 0) { buy.disabled = true; buy.textContent = 'Нет в наличии'; }
        else { buy.disabled = false; buy.textContent = '🛒 В корзину · ' + p.price + ' BYN'; }
    }
}
function qvSelectStrength(s2) {
    window._qvStrength = s2;
    haptic('light');
    closeQuickView();
    quickView(window._qvPid);
}
async function qvAddToCart() {
    haptic('medium');
    const pid = window._qvPid;
    const flavor = window._qvFlavor || '';
    const strength = window._qvStrength || '';
    const res = await fetch(API + '/api/cart/add', {method:'POST', headers:headers(), body:JSON.stringify({product_id:pid, quantity:1, flavor, strength})});
    if (res.ok) {
        showCartAnimation();
        showToast('✅ Добавлено');
        updateCartBadge();
        closeQuickView();
    } else {
        const e = await res.json().catch(()=>({}));
        showToast(e.detail || 'Ошибка');
    }
}
function qvOpenDetails() {
    const pid = window._qvPid;
    closeQuickView();
    openProduct(pid);
}

function renderProductsGrid(products) {
    const q = (window._searchQuery || '').toLowerCase().trim();
    let list = products;
    if (q.length >= 1) {
        list = products.filter(p => (p.name || '').toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
    }
    const sort = window._catalogSort || 'default';
    if (sort === 'popular') list = list.slice().sort((a,b) => (b.sales_count || 0) - (a.sales_count || 0));
    else if (sort === 'price_asc') list = list.slice().sort((a,b) => a.price - b.price);
    else if (sort === 'price_desc') list = list.slice().sort((a,b) => b.price - a.price);
    else if (sort === 'name') list = list.slice().sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    var cntEl = document.getElementById('catalog-counter');
    if (list.length === 0) {
        if (cntEl) cntEl.remove();
        grid.innerHTML = (q ? '<div class="empty-state" style="grid-column:span 2"><div class="empty-state-icon">🔍</div><div class="empty-state-title">Ничего не найдено</div><div class="empty-state-sub">По запросу «' + q + '»</div><button class="empty-state-btn" onclick="clearSearch()">Сбросить поиск</button></div>' : '<div class="empty-state" style="grid-column:span 2"><div class="empty-state-icon">📦</div><div class="empty-state-title">Тут пока пусто</div><div class="empty-state-sub">Загляни позже</div></div>');
        return;
    }
    var cntTxt = (q ? '🔍 Найдено: ' + list.length : '📦 ' + list.length);
    var word = 'товаров';
    var lastDigit = list.length % 10;
    var lastTwo = list.length % 100;
    if (lastTwo < 11 || lastTwo > 14) {
        if (lastDigit === 1) word = 'товар';
        else if (lastDigit >= 2 && lastDigit <= 4) word = 'товара';
    }
    cntTxt += ' ' + word + ' в каталоге';
    if (cntEl === null) {
        cntEl = document.createElement('div');
        cntEl.id = 'catalog-counter';
        cntEl.className = 'catalog-counter';
        grid.parentNode.insertBefore(cntEl, grid);
    }
    cntEl.textContent = cntTxt;
    grid.innerHTML = list.map(p => {
        const img = p.photo_id ? '<img src="' + p.photo_id + '">' : '<div class="product-card-noimg">📦</div>';
        const newBadge = isNewProduct(p) ? '<div class="pc-new-badge">🆕 Новинка</div>' : '';
        const hasFs = p.flavor_stocks && p.flavor_stocks.trim();
        const out = !hasFs && p.quantity <= 0;
        // если есть flavor_stocks — открываем quickView для выбора вкуса, иначе добавляем сразу
        const buyBtn = out
            ? '<button class="btn-buy btn-buy-out" disabled>Нет в наличии</button>'
            : (hasFs
                ? '<button class="btn-buy" onclick="quickView(' + p.id + ')">В корзину</button>'
                : '<button class="btn-buy" onclick="addToCart(' + p.id + ')">В корзину</button>');
        const hitBadge = p.is_hit ? '<div class="badge-hit">🔥 Хит</div>' : '';
        const flavArr1 = _pfItems(p.flavors).map(function(x){return x.name});
        const strArr1 = (p.strengths || '').split(',').map(x => x.trim()).filter(Boolean);
        const flavLine = flavArr1.length > 0 ? '<div class="pc-flavors">' + flavArr1.join(', ') + '</div>' : '';
        const isAcc1 = p.category === 'accessory';
        let strLine = '';
        if (strArr1.length > 0) {
            if (isAcc1) {
                const _fs1 = parseFlavorStocks(p.flavor_stocks);
                strLine = '<div class="pc-strength">' + strArr1.map(f => { const q = (f in _fs1) ? _fs1[f] : null; return f + ' Ом' + (q !== null ? ' · ' + q + ' шт' : ''); }).join(', ') + '</div>';
            } else {
                strLine = '<div class="pc-strength">' + strArr1.join('/') + ' мг</div>';
            }
        }
        return '<div class="product-card"><div onclick="quickView(' + p.id + ')" style="cursor:pointer;position:relative">' + img + hitBadge + newBadge + '<div class="product-info"><div class="product-name">' + p.name + '</div>' + flavLine + strLine + '<div class="product-price">' + p.price + ' BYN</div>' + stockLabel(p.flavor_stocks && p.flavor_stocks.trim() ? totalFlavorStock(p.flavor_stocks) : p.quantity) + '</div></div><div class="product-actions">' + buyBtn + '<button class="btn-fav" onclick="addToFav(' + p.id + ')">❤️</button></div></div>';
    }).join('');
}

function saveSearch(q) {
    q = (q || '').trim();
    if (q.length < 2) return;
    let arr = JSON.parse(localStorage.getItem('_recentSearches') || '[]');
    arr = arr.filter(x => x.toLowerCase() !== q.toLowerCase());
    arr.unshift(q);
    arr = arr.slice(0, 5);
    localStorage.setItem('_recentSearches', JSON.stringify(arr));
    renderSearchHistory();
}
function renderSearchHistory() {
    const box = document.getElementById('search-history');
    if (!box) return;
    const arr = JSON.parse(localStorage.getItem('_recentSearches') || '[]');
    if (arr.length === 0) { box.innerHTML = ''; box.style.display = 'none'; return; }
    box.style.display = 'flex';
    box.innerHTML = arr.map(q => '<div class="sh-chip" data-q="' + q.replace(/"/g, '&quot;') + '" onclick="applySearchHistory(this.dataset.q)">🔍 ' + q + '</div>').join('') + '<div class="sh-clear" onclick="clearSearchHistory()">Очистить</div>';
}
function applySearchHistory(q) {
    haptic('light');
    const el = document.getElementById('search-input');
    if (el) el.value = q;
    window._searchQuery = q;
    renderProductsGrid(window._catalogProducts || []);
}
function clearSearchHistory() {
    localStorage.removeItem('_recentSearches');
    renderSearchHistory();
}
function doSearch() {
    const el = document.getElementById('search-input');
    if (!el) return;
    window._searchQuery = el.value.trim();
    renderProductsGrid(window._catalogProducts || []);
}

async function renderFavorites() {
    const res = await fetch(API+'/api/favorites', {headers:headers()});
    const items = await res.json();
    if (items.length === 0) { content.innerHTML = '<div class="empty"><div class="empty-icon">❤️</div>Нет избранных</div>'; return; }
    content.innerHTML = '<div class="products-grid">' + items.map(p => {
        const img = p.photo_id
            ? '<img src="' + p.photo_id + '" style="width:100%;height:150px;object-fit:cover">'
            : '<div style="height:150px;background:#232328;display:flex;align-items:center;justify-content:center;font-size:40px">📦</div>';
        const hasFs = p.flavor_stocks && p.flavor_stocks.trim();
        const out = !hasFs && p.quantity <= 0;
        const buyBtn = out
            ? '<button class="btn-buy btn-buy-out" disabled>Нет в наличии</button>'
            : '<button class="btn-buy" onclick="quickView(' + p.id + ')">Купить</button>';
        const hitBadgeF = p.is_hit ? '<div class="badge-hit">🔥 Хит</div>' : '';
        const flavArr2 = _pfItems(p.flavors).map(function(x){return x.name});
        const strArr2 = (p.strengths || '').split(',').map(x => x.trim()).filter(Boolean);
        const flavLineF = flavArr2.length > 0 ? '<div class="pc-flavors">' + flavArr2.join(', ') + '</div>' : '';
        const isAcc2 = p.category === 'accessory';
        let strLineF = '';
        if (strArr2.length > 0) {
            if (isAcc2) {
                const _fs2 = parseFlavorStocks(p.flavor_stocks);
                strLineF = '<div class="pc-strength">' + strArr2.map(f => { const q = (f in _fs2) ? _fs2[f] : null; return f + ' Ом' + (q !== null ? ' · ' + q + ' шт' : ''); }).join(', ') + '</div>';
            } else {
                strLineF = '<div class="pc-strength">' + strArr2.join('/') + ' мг</div>';
            }
        }
        return '<div class="product-card"><div onclick="quickView(' + p.id + ')" style="cursor:pointer;position:relative">' + img + hitBadgeF + '<div class="product-info"><div class="product-name">' + p.name + '</div>' + flavLineF + strLineF + '<div class="product-price">' + p.price + ' BYN</div>' + stockLabel(p.flavor_stocks && p.flavor_stocks.trim() ? totalFlavorStock(p.flavor_stocks) : p.quantity) + '</div></div><div class="product-actions">' + buyBtn + '<button class="btn-fav" onclick="removeFav(' + p.id + ')">❤️</button></div></div>';
    }).join('') + '</div>';
}
async function renderProfile() {
    const user = tg?.initDataUnsafe?.user || {};
    const initials = (user.first_name?.[0] || 'M').toUpperCase();
    const av = user.photo_url ? '<div class="profile-avatar-img"><img src="'+user.photo_url+'"></div>' : '<div class="profile-avatar-img">'+initials+'</div>';
    const adm = isAdmin ? '<div class="admin-entry" onclick="goToAdmin()"><div class="admin-entry-icon">🛠</div><div class="admin-entry-text"><div class="admin-entry-title">Админ-панель</div><div class="admin-entry-sub">Управление</div></div><div class="admin-entry-arrow">›</div></div>' : '';
    content.innerHTML = '<div class="profile-header">'+av+'<div class="profile-info"><div class="profile-name">'+(user.first_name||'Гость')+'</div><div class="profile-id">ID: '+(user.id||'-')+'</div><div class="profile-phone">'+getPhone()+'</div><div class="profile-stickers">🎁 8 наклеек = жидкость, снюс</div></div></div><div class="profile-menu" onclick="currentTab=\'my_orders\';render();"><div class="profile-menu-icon">📦</div><div class="profile-menu-text"><div class="profile-menu-title">Заказы</div><div class="profile-menu-sub">История</div></div></div><div class="profile-grid"><div class="profile-tile" onclick="openManager()"><div class="profile-tile-icon">💬</div><div class="profile-tile-label">Менеджер</div></div><div class="profile-tile" onclick="openHelp()"><div class="profile-tile-icon">❓</div><div class="profile-tile-label">Помощь</div></div><div class="profile-tile" onclick="openSettings()"><div class="profile-tile-icon">⚙️</div><div class="profile-tile-label">Настройки</div></div><div class="profile-tile" onclick="addToHomeScreen()"><div class="profile-tile-icon">📱</div><div class="profile-tile-label">На экран</div></div></div><div class="recent-title">Недавно просмотренные</div><div class="recent-scroll" id="recent-scroll"></div>'+adm;
    setTimeout(loadRecent, 100);
}
async function repeatOrder(oid) {
    const res = await fetch(API+'/api/orders/repeat/'+oid, {method:'POST', headers:headers()});
    if (res.ok) { showToast('Добавлено в корзину!'); currentTab='cart'; render(); } else showToast('Ошибка');
}
async function loadRecent() {
    const box = document.getElementById('recent-scroll');
    if (box === null) return;
    const recent = JSON.parse(localStorage.getItem('recent') || '[]');
    if (recent.length === 0) { box.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px">Пока ничего не смотрели</div>'; return; }
    const res = await fetch(API+'/api/products?category=all', {headers:headers()});
    const products = await res.json();
    const map = new Map(products.map(p => [p.id, p]));
    const items = recent.map(id => map.get(id)).filter(Boolean);
    if (items.length === 0) { box.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:10px">Пока ничего не смотрели</div>'; return; }
    box.innerHTML = items.map(p => {
        const img = p.photo_id ? '<img src="' + p.photo_id + '" class="recent-img">' : '<div class="recent-img recent-img-empty">📦</div>';
        const price = (p.price != null) ? '<div class="recent-price">' + p.price + ' BYN</div>' : '';
        return '<div class="recent-card" onclick="openProduct(' + p.id + ')">' + img + '<div class="recent-name">' + (p.name || '?') + '</div>' + price + '</div>';
    }).join('');
}
function goToAdmin() { currentTab = 'admin'; render(); }
function goToAdminRender() { currentTab = 'admin'; render(); }
function goBackToProfile() { currentTab = 'profile'; render(); }
function openBotAdd() { currentTab = 'add_product'; render(); }
function openBotList() { currentTab = 'admin_products'; render(); }
function showOrdersAll() { currentTab = 'orders_admin'; render(); }
function goToPromo() { currentTab = 'promo'; render(); }
function goToBroadcast() { currentTab = 'broadcast'; render(); }
function goToUsers() { currentTab = 'users'; render(); }
function goToStats() { currentTab = 'stats'; render(); }
async function renderAdmin() {
const role=getRole(), owner=role.includes('Владелец');
content.innerHTML=`<div class="adm-shell"><div class="adm-head"><button class="adm-back" onclick="goBackToProfile()">←</button><div class="adm-head-title"><span>MOGVAPE</span><b>Админ-панель</b></div><div class="adm-role ${owner?'owner':'admin'}">${owner?'👑 Владелец':'🛡 Администратор'}</div></div><div class="adm-hero"><div class="adm-hero-copy"><small>${owner?'👑 ВЫ ВЛАДЕЛЕЦ МАГАЗИНА':'🛡 ВЫ АДМИНИСТРАТОР'}</small><h1>Добро пожаловать,<br><strong>${owner?'владелец':'администратор'}!</strong> 👋</h1><p>Управляйте MOGVAPE, заказами<br>и клиентами</p></div><div class="adm-logo"><b>MG</b><i>♛</i></div></div><div class="adm-stats" id="admin-stats"><div class="as blue"><i>📦</i><b>—</b><span>Товаров в каталоге</span></div><div class="as green"><i>🧾</i><b>—</b><span>Всего заказов</span></div><div class="as purple"><i>👥</i><b>—</b><span>Клиентов</span></div><div class="as orange"><i>💰</i><b>—</b><span>Общая выручка</span></div></div><div id="admin-menu"></div></div>`;
const [p,o,u,st]=await Promise.allSettled([fetch(API+'/api/products?category=all',{headers:headers()}),fetch(API+'/api/admin/orders/full',{headers:headers()}),fetch(API+'/api/admin/users',{headers:headers()}),fetch(API+'/api/admin/stats/extended?days=90',{headers:headers()})]);
const j=async x=>x.status==='fulfilled'&&x.value.ok?x.value.json():null;
const products=await j(p),orders=await j(o),users=await j(u),stats=await j(st);
const pc=Array.isArray(products)?products.filter(x=>x.is_active!==false).length:0,oc=Array.isArray(orders)?orders.length:0,uc=Array.isArray(users)?users.length:0,rev=stats?.all_time?.sum??0;
document.getElementById('admin-stats').innerHTML=`<div class="as blue"><i>📦</i><b>${pc}</b><span>Товаров в каталоге</span></div><div class="as green"><i>🧾</i><b>${oc}</b><span>Всего заказов</span></div><div class="as purple"><i>👥</i><b>${uc}</b><span>Клиентов</span></div><div class="as orange"><i>💰</i><b>${rev} BYN</b><span>Общая выручка</span></div>`;
const item=(i,t,s,f,c)=>`<button class="adm-item ${c}" onclick="${f}"><i>${i}</i><span><b>${t}</b><small>${s}</small></span><em>›</em></button>`;
document.getElementById('admin-menu').innerHTML=`<div class="adm-section"><h3>📦 ТОВАРЫ</h3><div class="adm-grid">${item('＋','Добавить товар','Создать новый товар','openBotAdd()','blue')}${item('📦','Каталог','Товары и редактирование','openBotList()','blue')}</div></div><div class="adm-section"><h3>🧾 ЗАКАЗЫ</h3><div class="adm-grid one">${item('▣','Все заказы','Контроль и статусы','showOrdersAll()','purple')}</div></div><div class="adm-section"><h3>👥 УПРАВЛЕНИЕ</h3><div class="adm-grid">${item('％','Промокоды','Скидки и акции','goToPromo()','pink')}${item('📣','Рассылка','Сообщение клиентам','goToBroadcast()','cyan')}${item('?','FAQ','Вопросы и ответы','goToFaq()','orange')}${item('👥','Пользователи','Клиенты магазина','goToUsers()','green')}</div></div><div class="adm-section"><h3>⚙️ СИСТЕМА</h3><div class="adm-grid three">${item('▥','Статистика','Аналитика магазина','goToStats()','blue')}${item('▤','Логи','История действий','goToLogs()','purple')}${item('☁','Группа','Рабочая переписка','goToGroup()','green')}</div></div>`;
}
function openProduct(pid) { haptic('light'); currentProductId = pid; currentTab = 'product'; render(); addToRecent(pid); }
function addToRecent(pid) { let r = JSON.parse(localStorage.getItem('recent') || '[]'); r = r.filter(x => x !== pid); r.unshift(pid); r = r.slice(0, 6); localStorage.setItem('recent', JSON.stringify(r)); }
async function renderOrdersAdmin() {
    if (!window._ordersTab) window._ordersTab = 'active';
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Все заказы</div></div><button class="admin-export-btn" onclick="exportOrdersCSV()">📥 CSV</button></div><div id="orders-tabs"></div><div id="orders-list">' + skeletonList(5) + '</div>';
    const res = await fetch(API+'/api/admin/orders/full', {headers:headers()});
    if (res.ok === false) { document.getElementById('orders-list').innerHTML = '<div class="empty">Ошибка</div>'; return; }
    const allOrders = await res.json();
    window._ordersAll = allOrders;

    // Счётчики по группам
    const cntActive = allOrders.filter(o => ['new','processing','ready'].includes(o.status)).length;
    const cntDelivered = allOrders.filter(o => o.status === 'delivered').length;
    const cntCancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const tabsBox = document.getElementById('orders-tabs');
    if (tabsBox) {
        const tab = window._ordersTab || 'active';
        const mk = (k, label, cnt) => '<button class="ap-tab' + (tab === k ? ' active' : '') + '" onclick="setOrdersTab(\'' + k + '\')">' + label + ' (' + cnt + ')</button>';
        tabsBox.innerHTML = '<div class="ap-tabs" style="margin:8px 0">' + mk('active', '🟢 Активные', cntActive) + mk('delivered', '📦 Доставленные', cntDelivered) + mk('cancelled', '❌ Отменённые', cntCancelled) + mk('all', '📋 Все', allOrders.length) + '</div>';
    }

    // Фильтр
    const tab = window._ordersTab || 'active';
    let orders;
    if (tab === 'active') orders = allOrders.filter(o => ['new','processing','ready'].includes(o.status));
    else if (tab === 'delivered') orders = allOrders.filter(o => o.status === 'delivered');
    else if (tab === 'cancelled') orders = allOrders.filter(o => o.status === 'cancelled');
    else orders = allOrders;

    const box = document.getElementById('orders-list');
    if (orders.length === 0) { box.innerHTML = '<div class="empty">Заказов в этой вкладке нет</div>'; return; }
    const smap = {new:'Новый', processing:'Собираем', ready:'Готов', delivered:'Доставлен', cancelled:'Отменён'};
    box.innerHTML = orders.map(o => {
        const cur = o.status;
        const btn = (key, label) => {
            const isActive = cur === key;
            const cls = isActive ? 'status-btn status-btn-active' : 'status-btn';
            return '<button class="' + cls + '" onclick="setStatus(' + o.id + ',\'' + key + '\')">' + (isActive ? '✓ ' : '') + label + '</button>';
        };
        const cancelled = cur === 'cancelled';
        let itemsHtml = '';
        if (o.items && o.items.length > 0) {
            itemsHtml = o.items.map(it => {
                const _parts = [];
                if (it.flavor) _parts.push(it.flavor);
                if (it.strength) _parts.push(it.strength + ' мг');
                if (it.volume) _parts.push(it.volume);
                const extra = _parts.length > 0
                    ? ' <span style="color:var(--muted)">· ' + _parts.join(' / ') + '</span>'
                    : '';
                return '<div style="font-size:12px;color:var(--text);margin-top:2px">' +
                    '• ' + (it.product_name || '?') + extra + ' × ' + it.quantity + ' = ' + Math.round(it.quantity * it.price) + ' BYN' +
                '</div>';
            }).join('');
        }
        const badge = (function() {
            const cnt = o.user_orders_count || 0;
            const sum = o.user_total_sum || 0;
            if (cnt === 0) return '<div style="margin-top:6px"><span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;background:#dcfce7;color:#16a34a">🆕 Первый заказ</span></div>';
            if (cnt === 1) return '<div style="margin-top:6px"><span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;background:#dbeafe;color:#2563eb">🔁 1 выполнен · ' + sum + ' BYN</span></div>';
            return '<div style="margin-top:6px"><span style="display:inline-block;font-size:11px;font-weight:700;padding:3px 9px;border-radius:10px;background:#dbeafe;color:#2563eb">🔁 ' + cnt + ' выполнено · ' + sum + ' BYN</span></div>';
        })();
        return '<div class="promo-item" style="flex-direction:column;align-items:stretch' + (cancelled ? ';opacity:0.65' : '') + '">' +
            '<div style="display:flex;justify-content:space-between"><b>#' + o.id + (o.total_items > 1 ? ' · ' + o.total_items + ' товара' : '') + '</b><span>' + o.total_price + ' BYN</span></div>' +
            '<div style="font-size:12px;color:var(--muted);margin-top:4px">' + (smap[o.status]||o.status) + ' · ' + o.pickup_point + ' · Клиент: ' + (o.user_name||o.user_id) + '</div>' +
            (o.delivery_time ? '<div style="font-size:13px;color:#4ea1ff;font-weight:700;margin-top:6px;cursor:pointer" onclick="openOrderTimeEditor(' + o.id + ', \'' + (o.delivery_time || '').replace(/'/g, "\\'") + '\')">🕐 Выдача: ' + humanizeDelivery(o.delivery_time, o.created_at) + ' · изменить</div>' : '<div style="font-size:13px;color:#94a3b8;font-weight:700;margin-top:6px;cursor:pointer" onclick="openOrderTimeEditor(' + o.id + ', \'\')">🕐 Время не задано · задать</div>') +
            ((o.remind_at && o.remind_at > new Date().toISOString().slice(0,16).replace('T',' ')) ? '<div style="font-size:12px;color:#f59e0b;font-weight:700;margin-top:4px;cursor:pointer" onclick="openReminder(" + o.id + ",\'' + o.remind_at + '\')">🔔 ' + o.remind_at + ' · изменить</div>' : '') +
            badge +
            '<div style="margin-top:8px;padding:8px 10px;background:var(--bg);border-radius:10px">' + itemsHtml + '</div>' +
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px">' +
                btn('processing', 'Собираем') +
                btn('ready', 'Готов') +
                btn('delivered', 'Доставлен') +
                '<button class="status-btn status-btn-cancel' + (cancelled ? ' status-btn-active' : '') + '" onclick="setStatus(' + o.id + ',\'cancelled\')">' + (cancelled ? '✓ ' : '') + '❌ Не забрал</button>' +
                '<button class="status-btn" onclick="openReminder(' + o.id + ',\'' + (o.remind_at || '') + '\')">🔔 Напомнить</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

function setOrdersTab(t) {
    window._ordersTab = t;
    renderOrdersAdmin();
}

async function setStatus(oid, status) {
    const res = await fetch(API+'/api/admin/order/'+oid+'/status', {method:'POST', headers:headers(), body:JSON.stringify({status})});
    if (res.ok) { showToast('Статус обновлён'); renderOrdersAdmin(); } else showToast('Ошибка');
}
const AP_CATS = [
    { key: 'all', emoji: '🛍', label: 'Все' },
    { key: 'liquid', emoji: '💧', label: 'Жидкости' },
    { key: 'accessory', emoji: '🔧', label: 'Расходники' },
    { key: 'snus', emoji: '🍬', label: 'Снюс' },
    { key: 'vape', emoji: '💨', label: 'Вейп' },
    { key: 'other', emoji: '📦', label: 'Другое' }
];
window._apQuery = '';
window._apCat = 'all';

async function renderAdminProducts() {
    if (!window._adminProductsTab) window._adminProductsTab = 'active';
    const tab = window._adminProductsTab;
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Товары</div></div></div>' +
        '<div class="ap-tabs"><button class="ap-tab ' + (tab === 'active' ? 'active' : '') + '" onclick="setAdminProductsTab(\'active\')">Активные</button><button class="ap-tab ' + (tab === 'archived' ? 'active' : '') + '" onclick="setAdminProductsTab(\'archived\')">Архив</button></div>' +
        '<div class="ap-search-wrap"><span class="ap-search-icon">🔍</span><input class="ap-search" id="ap-search" placeholder="Поиск по названию..." oninput="filterAdminProducts()" value="' + (window._apQuery || '') + '"></div>' +
        '<div class="ap-cat-filters" id="ap-cat-filters"></div>' +
        '<div id="admin-prod-list">' + skeletonList(5) + '</div>';
    renderAdminProductsCatChips();
    const url = tab === 'archived' ? '/api/admin/archived' : '/api/admin/product/list';
    const res = await fetch(API + url, {headers:headers()});
    if (res.ok === false) { document.getElementById('admin-prod-list').innerHTML = 'Ошибка'; return; }
    window._adminProductsAll = await res.json();
    renderAdminProductsList();
}

function renderAdminProductsCatChips() {
    const box = document.getElementById('ap-cat-filters');
    if (!box) return;
    box.innerHTML = AP_CATS.map(c => {
        const active = (window._apCat || 'all') === c.key ? ' active' : '';
        return '<button class="ap-cat-chip' + active + '" data-cat="' + c.key + '" onclick="setAdminProductsCat(this)">' + c.emoji + ' ' + c.label + '</button>';
    }).join('');
}

function setAdminProductsCat(el) {
    window._apCat = el.dataset.cat;
    renderAdminProductsCatChips();
    renderAdminProductsList();
}

function filterAdminProducts() {
    const el = document.getElementById('ap-search');
    window._apQuery = el ? el.value : '';
    renderAdminProductsList();
}

function renderAdminProductsList() {
    const tab = window._adminProductsTab || 'active';
    const box = document.getElementById('admin-prod-list');
    if (!box) return;
    let prods = window._adminProductsAll || [];
    const q = (window._apQuery || '').toLowerCase().trim();
    const cat = window._apCat || 'all';
    if (q) prods = prods.filter(p => (p.name || '').toLowerCase().includes(q));
    if (cat !== 'all') prods = prods.filter(p => (p.category || 'all') === cat);
    if (!prods.length) {
        const msg = (q || cat !== 'all')
            ? '<div class="empty"><div style="font-size:44px;margin-bottom:8px">🔍</div>Ничего не найдено</div>'
            : '<div class="empty">' + (tab === 'archived' ? 'Архив пуст' : 'Товаров нет') + '</div>';
        box.innerHTML = msg;
        return;
    }
    const CAT = { all:'🛍 Все', liquid:'💧 Жидкости', accessory:'🔧 Расходники', snus:'🍬 Снюс', vape:'💨 Вейп', other:'📦 Другое' };
    box.innerHTML = '<div class="admin-prod-grid">' + prods.map(p => {
        const img = p.photo_id
            ? '<img src="' + p.photo_id + '" class="ap-thumb">'
            : '<div class="ap-thumb ap-thumb-empty">📦</div>';
        const _hasFs = p.flavor_stocks && p.flavor_stocks.trim();
        const _effQty = _hasFs ? totalFlavorStock(p.flavor_stocks) : p.quantity;
        const outOfStock = _effQty <= 0;
        const stock = outOfStock
            ? '<span class="ap-stock-out">Нет в наличии</span>'
            : '<span class="ap-stock">' + _effQty + ' шт.</span>';
        const actions = tab === 'archived'
            ? '<button class="ap-btn ap-btn-restore" onclick="event.stopPropagation();restoreProduct(' + p.id + ')">↩</button>'
            : '<button class="ap-btn ap-btn-edit" onclick="event.stopPropagation();editProduct(' + p.id + ')">✏️</button>' +
              '<button class="ap-btn ap-btn-dup" onclick="event.stopPropagation();duplicateProduct(' + p.id + ')">📋</button>' +
              '<button class="ap-btn ap-btn-del" onclick="event.stopPropagation();deleteProduct(' + p.id + ')">🗑</button>';
        const cardClick = tab === 'archived' ? '' : 'onclick="editProduct(' + p.id + ')"';
        return '<div class="ap-card" ' + cardClick + '>' +
            img +
            '<div class="ap-body">' +
                '<div class="ap-name">' + p.name + '</div>' +
                '<div class="ap-meta">' + (CAT[p.category] || '📦') + ' · ' + stock + '</div>' +
                '<div class="ap-price">' + p.price + ' BYN</div>' +
            '</div>' +
            '<div class="ap-actions">' + actions + '</div>' +
        '</div>';
    }).join('') + '</div>';
}

function setAdminProductsTab(t) {
    window._adminProductsTab = t;
    renderAdminProducts();
}

async function restoreProduct(pid) {
    const res = await fetch(API + '/api/admin/product/' + pid + '/restore', {method:'POST', headers:headers()});
    if (res.ok) { showToast('Восстановлено'); renderAdminProducts(); }
    else showToast('Ошибка');
}

async function duplicateProduct(pid) {
    askConfirm('Дублировать товар?', async () => {
        const res = await fetch(API + '/api/admin/product/' + pid + '/duplicate', {method:'POST', headers:headers()});
        if (!res.ok) { showToast('Ошибка дублирования'); return; }
        const data = await res.json();
        showToast('✅ Дубликат создан #' + data.id);
        renderAdminProducts();
    }, 'Дублировать');
}
async function deleteProduct(pid) { await fetch(API+'/api/admin/product/'+pid, {method:'DELETE', headers:headers()}); showToast('В архив'); renderAdminProducts(); }
async function renderAddProduct() {
    window._epCat = 'all';
    window._epStrengths = [];
    window._epVolumes = [];
    window._epVolumesSelected = [];
    content.innerHTML =
        '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Новый товар</div></div></div>' +
        '<div class="prod-form">' +
            '<div class="pf-card"><label class="pf-label">НАЗВАНИЕ</label><input class="pf-input" id="np-name"></div>' +
            '<div class="pf-card"><label class="pf-label">ОПИСАНИЕ</label><textarea class="pf-input" id="np-desc" rows="4"></textarea></div>' +
            '<div class="pf-card"><label class="pf-label">ФОТО</label><input type="file" id="np-photo" accept="image/*" class="pf-input"></div>' +
            '<div class="pf-card"><label class="pf-label">ВКУСЫ И ОСТАТКИ</label><div id="np-flavors-editor" class="fs-editor"></div><button type="button" class="fs-add" onclick="addFlavorRow(\'np-flavors-editor\')">+ Добавить вкус</button><div class="pf-hint">Оставь «шт.» пустым = не учитывать остаток</div></div>' +
            '<div class="pf-card"><label class="pf-label">КАТЕГОРИЯ</label><div class="cat-trigger" onclick="openCatPicker()"><span id="ep-cat-emoji">' + ((window.CAT_META && window.CAT_META[window._epCat]) ? window.CAT_META[window._epCat].emoji : '🛍') + '</span><span id="ep-cat-label">' + ((window.CAT_META && window.CAT_META[window._epCat]) ? window.CAT_META[window._epCat].label : 'Все') + '</span><span class="cat-trigger-arrow">⌄</span></div></div>' +
            '<div class="pf-card"><label class="pf-label">МЕТКА</label><div class="hit-toggle" id="np-hit-toggle" data-hit="0" onclick="toggleHit(this)"><div class="hit-toggle-icon">🔥</div><div class="hit-toggle-body"><div class="hit-toggle-title">Отметить как хит</div><div class="hit-toggle-sub">Показывать метку «🔥 Хит» на карточке</div></div><div class="hit-toggle-switch"><div class="hit-toggle-knob"></div></div></div></div>' +
            '<div class="pf-card" id="ep-volumes-card" style="display:none"><label class="pf-label">ОБЪЁМ</label><div class="strengths-grid" id="ep-volumes-grid"></div><div class="pf-hint">Например: 2 мл, 3 мл. Можно добавить свой.</div><button type="button" class="fs-add" onclick="addCustomVolume()">+ Свой объём</button></div>' +
            '<div class="pf-card" id="ep-strengths-card"><label class="pf-label">КРЕПОСТЬ</label><div class="strengths-grid" id="ep-strengths-grid"></div><div class="pf-hint" id="ep-strengths-hint"></div></div>' +
            '<div class="pf-card"><label class="pf-label">ЦЕНА, BYN</label><input class="pf-input" id="np-price" type="number" step="0.01"></div>' +
            '<button class="pf-submit pf-submit-sticky" id="np-save-btn" onclick="submitNewProduct()">Добавить</button>' +
        '</div>';
    renderStrengthButtons();
    renderFlavorStocksEditor('np-flavors-editor', '', '');
    updateQtyVisibility('np-flavors-editor', 'np-qty-card');
    applyCategoryModeUI(window._epCat);
    initFlavorRowsDnD('np-flavors-editor');
}

async function submitNewProduct() {
    const name = document.getElementById('np-name').value.trim();
    const desc = document.getElementById('np-desc').value.trim();
    const _fs = collectFlavorStocks('np-flavors-editor');
    const flavors = _fs.flavors;
    const flavorStocks = _fs.stocks;
    const strengths = (window._epStrengths || []).join(',');
    const cat = window._epCat || 'all';
    const price = parseFloat(document.getElementById('np-price').value);
    const qtyEl1 = document.getElementById('np-qty');
    const qty = qtyEl1 ? parseInt(qtyEl1.value) : 0;
    const oldPrice = parseFloat(document.getElementById('np-old-price')?.value) || 0;
    const photoFile = document.getElementById('np-photo').files[0];
    const nameEl2 = document.getElementById('np-name');
    const priceEl2 = document.getElementById('np-price');
    const qtyEl2 = document.getElementById('np-qty');
    [nameEl2, priceEl2, qtyEl2].forEach(el => el && el.classList.remove('error'));
    let bad2 = false;
    if (name === '') { nameEl2?.classList.add('error'); bad2 = true; }
    if (!price || isNaN(price)) { priceEl2?.classList.add('error'); bad2 = true; }
    // qty больше не проверяем (блока нет)
    if (bad2) {
        const btn = document.getElementById('np-save-btn');
        if (btn) { btn.classList.add('error'); setTimeout(() => btn.classList.remove('error'), 800); }
        showToast('Заполните поля');
        return;
    }
    let photoUrl = '';
    if (photoFile) {
        const fd = new FormData();
        fd.append('file', photoFile);
        const upRes = await fetch(API+'/api/admin/upload', {method:'POST', body:fd, headers:{'X-Telegram-Init-Data':tg?.initData||''}});
        if (upRes.ok === false) return showToast('Ошибка фото');
        photoUrl = (await upRes.json()).url;
    }
    const res = await fetch(API+'/api/admin/product/add', {
        method:'POST', headers:headers(),
        body:JSON.stringify({name, description:desc, price, quantity:qty, category:cat, photo_id:photoUrl, flavors, strengths, old_price:oldPrice, flavor_stocks:flavorStocks, is_hit: ((document.getElementById('np-hit-toggle')?.dataset.hit === '1') ? 1 : 0), volumes: (window._epVolumesSelected || []).join(',')})
    });
    if (res.ok === false) return showToast('Ошибка');
    showToast('✅ Товар добавлен');
    currentTab='admin'; render();
}
const PROMO_CATS = [
    { key: 'all', emoji: '🛍', label: 'Все товары' },
    { key: 'liquid', emoji: '💧', label: 'Жидкости' },
    { key: 'accessory', emoji: '🔧', label: 'Расходники' },
    { key: 'snus', emoji: '🍬', label: 'Снюс' },
    { key: 'vape', emoji: '💨', label: 'Вейп' },
    { key: 'other', emoji: '📦', label: 'Другое' }
];
window._promoCat = 'all';

async function renderPromo() {
    window._promoCat = 'all';
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Промокоды</div></div></div>' +
        '<div class="promo-form">' +
            '<div class="promo-field"><label class="promo-label">КОД</label><input class="promo-input" id="promo-code"></div>' +
            '<div class="promo-field"><label class="promo-label">СКИДКА %</label><input class="promo-input" id="promo-discount" type="number"></div>' +
            '<div class="promo-field"><label class="promo-label">КОЛ-ВО (0 = безлимит)</label><input class="promo-input" id="promo-uses" type="number"></div>' +
            '<div class="promo-field"><label class="promo-label">ПРИМЕНЯЕТСЯ К</label><div class="promo-cat-grid" id="promo-cat-grid"></div></div>' +
            '<button class="promo-btn" onclick="createPromo()">Создать</button>' +
        '</div>' +
        '<div class="admin-section-title">АКТИВНЫЕ</div>' +
        '<div id="promo-list">' + skeletonList(3) + '</div>';
    renderPromoCatGrid();
    loadPromos();
}
function renderPromoCatGrid() {
    const grid = document.getElementById('promo-cat-grid');
    if (!grid) return;
    grid.innerHTML = PROMO_CATS.map(c => {
        const active = window._promoCat === c.key ? ' active' : '';
        return '<div class="promo-cat-chip' + active + '" onclick="selectPromoCat(\'' + c.key + '\')"><span class="promo-cat-emoji">' + c.emoji + '</span><span>' + c.label + '</span></div>';
    }).join('');
}
function selectPromoCat(k) {
    window._promoCat = k;
    renderPromoCatGrid();
}
async function loadPromos() {
    const res = await fetch(API+'/api/admin/promo/list', {headers:headers()});
    if (res.ok === false) { document.getElementById('promo-list').innerHTML = 'Ошибка'; return; }
    const promos = await res.json();
    const box = document.getElementById('promo-list');
    if (promos.length === 0) { box.innerHTML = 'Нет'; return; }
    box.innerHTML = promos.map(p => {
        const cat = PROMO_CATS.find(c => c.key === (p.applies_to || 'all')) || PROMO_CATS[0];
        return '<div class="promo-item"><div class="promo-item-code"><div class="promo-item-title">'+p.code+'</div><div class="promo-item-sub">-'+p.discount+'% · '+cat.emoji+' '+cat.label+'</div></div><button class="promo-item-del" onclick="delPromo('+p.id+')">X</button></div>';
    }).join('');
}
async function createPromo() {
    const code = document.getElementById('promo-code').value.trim();
    const discount = parseInt(document.getElementById('promo-discount').value);
    const uses = parseInt(document.getElementById('promo-uses').value) || 0;
    const applies_to = window._promoCat || 'all';
    if (code === '' || discount === 0) return showToast('Заполните');
    const res = await fetch(API+'/api/admin/promo/create', {method:'POST', headers:headers(), body:JSON.stringify({code,discount,uses,applies_to})});
    if (res.ok) { showToast('OK'); loadPromos(); } else showToast('Ошибка');
}
async function delPromo(pid) { await fetch(API+'/api/admin/promo/'+pid, {method:'DELETE', headers:headers()}); showToast('Удалено'); loadPromos(); }
function goToFaq() { currentTab = 'faq_admin'; render(); }

async function renderFaqAdmin() {
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">FAQ</div></div></div>' +
        '<div class="promo-form">' +
            '<div class="promo-field"><label class="promo-label">КАТЕГОРИЯ</label><div class="promo-cat-grid" id="faq-cat-grid"></div></div>' +
            '<div class="promo-field"><label class="promo-label">ЭМОДЗИ</label><input class="promo-input" id="faq-emoji" placeholder="❓" maxlength="4"></div>' +
            '<div class="promo-field"><label class="promo-label">ВОПРОС</label><input class="promo-input" id="faq-q" placeholder="Как оформить заказ?"></div>' +
            '<div class="promo-field"><label class="promo-label">ОТВЕТ</label><textarea class="promo-input" id="faq-a" rows="4" placeholder="Добавьте товары..."></textarea></div>' +
            '<button class="promo-btn" onclick="createFaq()">Добавить</button>' +
        '</div>' +
        '<div class="admin-section-title">ВСЕ ВОПРОСЫ</div>' +
        '<div id="faq-list">' + skeletonList(3) + '</div>';
    window._faqCat = 'app';
    renderFaqCatGrid();
    loadFaqAdmin();
}

function renderFaqCatGrid() {
    const grid = document.getElementById('faq-cat-grid');
    if (!grid) return;
    const cats = [
        { key: 'app', emoji: '📱', label: 'Приложение' },
        { key: 'warranty', emoji: '🛡', label: 'Гарантия' },
        { key: 'other', emoji: '📦', label: 'Прочее' }
    ];
    grid.innerHTML = cats.map(c => {
        const active = window._faqCat === c.key ? ' active' : '';
        return '<div class="promo-cat-chip' + active + '" onclick="selectFaqCat(\'' + c.key + '\')"><span class="promo-cat-emoji">' + c.emoji + '</span><span>' + c.label + '</span></div>';
    }).join('');
}

function selectFaqCat(k) { window._faqCat = k; renderFaqCatGrid(); }

async function loadFaqAdmin() {
    const res = await fetch(API + '/api/faq', {headers:headers()});
    const items = await res.json();
    const box = document.getElementById('faq-list');
    if (!box) return;
    if (!items.length) { box.innerHTML = '<div class="empty">Пусто</div>'; return; }
    const catLabel = { app: '📱', warranty: '🛡', other: '📦' };
    box.innerHTML = items.map(it => {
        return '<div class="promo-item" style="flex-direction:column;align-items:stretch;padding:14px">' +
            '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">' +
                '<div style="flex:1"><div style="font-size:15px;font-weight:600">' + (it.emoji || '❓') + ' ' + it.question + '</div>' +
                '<div style="font-size:12px;color:var(--muted);margin-top:6px">' + (catLabel[it.category] || '📦') + ' ' + it.answer + '</div></div>' +
            '</div>' +
            '<div style="display:flex;gap:6px;margin-top:10px">' +
                '<button class="status-btn" onclick="editFaq(' + it.id + ',\'' + (it.question || '').replace(/'/g, "\\'") + '\',\'' + (it.answer || '').replace(/'/g, "\\'") + '\',\'' + (it.category || 'app') + '\',\'' + (it.emoji || '❓') + '\')">✏️ Изменить</button>' +
                '<button class="status-btn" style="background:#fee;color:#c33" onclick="deleteFaq(' + it.id + ')">🗑 Удалить</button>' +
            '</div>' +
        '</div>';
    }).join('');
}

async function createFaq() {
    const q = document.getElementById('faq-q').value.trim();
    const a = document.getElementById('faq-a').value.trim();
    const emoji = document.getElementById('faq-emoji').value.trim() || '❓';
    const category = window._faqCat || 'app';
    if (!q || !a) return showToast('Заполните вопрос и ответ');
    const res = await fetch(API + '/api/admin/faq/add', {method:'POST', headers:headers(), body:JSON.stringify({question:q, answer:a, category, emoji})});
    if (!res.ok) return showToast('Ошибка');
    showToast('✅ Добавлено');
    document.getElementById('faq-q').value = '';
    document.getElementById('faq-a').value = '';
    document.getElementById('faq-emoji').value = '';
    loadFaqAdmin();
}

async function deleteFaq(id) {
    askConfirm('Удалить вопрос?', async () => {
        const res = await fetch(API + '/api/admin/faq/' + id, {method:'DELETE', headers:headers()});
        if (res.ok) { showToast('Удалено'); loadFaqAdmin(); } else showToast('Ошибка');
    }, 'Удалить');
}

async function editFaq(id, q, a, cat, emoji) {
    const newQ = prompt('Вопрос:', q);
    if (newQ === null) return;
    const newA = prompt('Ответ:', a);
    if (newA === null) return;
    const res = await fetch(API + '/api/admin/faq/' + id + '/update', {method:'POST', headers:headers(), body:JSON.stringify({question:newQ.trim(), answer:newA.trim(), category:cat, emoji})});
    if (res.ok) { showToast('Сохранено'); loadFaqAdmin(); } else showToast('Ошибка');
}

function goToLogs() { currentTab = 'logs_admin'; render(); }
async function renderLogsAdmin() {
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Логи</div></div></div><div id="logs-box">' + skeletonList(6) + '</div>';
    const res = await fetch(API + '/api/admin/log', {headers: headers()});
    if (!res.ok) { document.getElementById('logs-box').innerHTML = '<div class="empty">Ошибка загрузки</div>'; return; }
    const items = await res.json();
    const box = document.getElementById('logs-box');
    if (!items.length) { box.innerHTML = '<div class="empty">Пока пусто. Действия появятся тут.</div>'; return; }
    const ACTION_META = {
        add_product:    { emoji: '➕', label: 'Добавил товар',      color: '#10b981' },
        update_product: { emoji: '✏️', label: 'Изменил товар',      color: '#4ea1ff' },
        archive_product:{ emoji: '📦', label: 'В архив',            color: '#f59e0b' },
        order_status:   { emoji: '🔄', label: 'Статус заказа',      color: '#6366f1' },
        block_user:     { emoji: '🚫', label: 'Заблокировал',       color: '#ef4444' },
        unblock_user:   { emoji: '✅', label: 'Разблокировал',      color: '#10b981' },
        add_promo:      { emoji: '🎟', label: 'Создал промокод',    color: '#a855f7' },
        delete_promo:   { emoji: '🗑', label: 'Удалил промокод',    color: '#ef4444' },
        add_faq:        { emoji: '❓', label: 'Добавил FAQ',        color: '#10b981' },
        delete_faq:     { emoji: '🗑', label: 'Удалил FAQ',         color: '#ef4444' }
    };
    box.innerHTML = '<div class="logs-list">' + items.map(it => {
        const m = ACTION_META[it.action] || { emoji: '⚙️', label: it.action, color: '#94a3b8' };
        const date = it.created_at ? it.created_at.split(' ')[0] : '';
        const time = it.created_at ? it.created_at.split(' ')[1]?.slice(0,5) : '';
        return '<div class="log-card">' +
            '<div class="log-emoji" style="background:' + m.color + '20;color:' + m.color + '">' + m.emoji + '</div>' +
            '<div class="log-body">' +
                '<div class="log-title">' + m.label + (it.target ? ': <b>' + it.target + '</b>' : '') + '</div>' +
                (it.details ? '<div class="log-sub">' + it.details + '</div>' : '') +
                '<div class="log-meta">' + (it.admin_name || ('ID ' + it.admin_id)) + ' · ' + date + ' ' + time + '</div>' +
            '</div>' +
        '</div>';
    }).join('') + '</div>';
}

async function renderBroadcast() {
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Рассылка</div></div></div><div class="promo-form"><textarea class="promo-input" id="broadcast-text" rows="6" placeholder="Текст сообщения..."></textarea><button class="promo-btn" onclick="sendBroadcast()">Отправить всем</button></div>';
}
async function sendBroadcast() {
    const text = document.getElementById('broadcast-text').value.trim();
    if (text === '') return showToast('Введите текст');
    if (tg) tg.close();
    setTimeout(() => tg?.openTelegramLink('https://t.me/Barahamogbot?start=broadcast'), 300);
}
async function toggleBlock(uid, blocked) {
    const res = await fetch(API+'/api/admin/user/'+uid+'/block', {method:'POST', headers:headers(), body:JSON.stringify({blocked: !blocked})});
    if (res.ok) { showToast(blocked?'Разблокирован':'Заблокирован'); renderUsers(); } else showToast('Ошибка');
}
async function addToCart(pid) {
    haptic('medium');
    const flavor = window._currentFlavor || '';
    const strength = window._currentStrength || '';
    const volume = window._currentVolume || '';
    const res = await fetch(API+'/api/cart/add', {method:'POST', headers:headers(), body:JSON.stringify({product_id:pid, quantity:1, flavor:flavor, strength:strength, volume:volume})});
    if (res.ok) { showCartAnimation(); showToast('✅ Добавлено в корзину'); updateCartBadge(); } else { const e = await res.json().catch(()=>({})); showToast(e.detail || 'Ошибка'); }
}
async function removeCart(cid) { await fetch(API+'/api/cart/'+cid, {method:'DELETE', headers:headers()}); renderCart(); updateCartBadge(); }
async function addToFav(pid) { await fetch(API+'/api/favorites/add/'+pid, {method:'POST', headers:headers()}); showToast('В избранном'); }
async function removeFav(pid) { await fetch(API+'/api/favorites/'+pid, {method:'DELETE', headers:headers()}); renderFavorites(); }
let cartDiscount = 0;
async function applyCartPromo() {
    const code = document.getElementById('cart-promo').value.trim();
    if (code === '') return showToast('Введите код');
    const res = await fetch(API+'/api/promo/apply', {method:'POST', headers:headers(), body:JSON.stringify({code})});
    if (res.ok === false) return showToast('Промокод не найден');
    const data = await res.json();
    cartDiscount = data.discount;
    showToast('Скидка -' + cartDiscount + '%');
    const res2 = await fetch(API+'/api/cart', {headers:headers()});
    const items = await res2.json();
    const total = items.reduce((s,i)=>s+i.price*i.quantity,0);
    const discounted = Math.round(total * (100 - cartDiscount) / 100);
    const el = document.getElementById('cart-total-amount');
    if (el) el.innerHTML = '<s>'+total+' BYN</s> ' + discounted + ' BYN';
}
const PICKUP_POINTS = [
    { id: 'atrium', emoji: '🏬', name: 'Атриум' },
    { id: 'greenwich', emoji: '🛍', name: 'Гринвич' },
    { id: 'gymnastics', emoji: '🤸', name: 'Дворец гимнастики' },
    { id: 'delivery', emoji: '🚚', name: 'Доставка' }
];
let tempSelectedPoint = null;
function showPickup() {
    tempSelectedPoint = getCity();
    const modal = document.createElement('div');
    modal.className = 'pickup-modal-new';
    modal.id = 'pickup-modal';
    modal.innerHTML = '<div class="pickup-sheet"><div class="pickup-handle"></div><div class="pickup-header"><div class="pickup-header-title">Выберите точку самовывоза</div><div class="pickup-header-sub">3 точки в Могилёве</div></div><div class="pickup-list" id="pickup-list-box"></div><button class="pickup-close pickup-choose-btn" onclick="confirmPickup()">Выбрать</button></div>';
    modal.onclick = (e) => { if (e.target === modal) closePickup(); };
    document.body.appendChild(modal);
    renderPickupList();
}
function renderPickupList() {
    const box = document.getElementById('pickup-list-box');
    if (box === null) return;
    box.innerHTML = PICKUP_POINTS.map(p => {
        const full = p.emoji + ' ' + p.name;
        const isActive = tempSelectedPoint === full;
        return '<div class="pickup-card ' + (isActive ? 'active' : '') + '" onclick="tempSelect(\'' + full + '\')"><div class="pickup-card-emoji">' + p.emoji + '</div><div class="pickup-card-body"><div class="pickup-card-name">' + p.name + '</div></div><div class="pickup-card-check">' + (isActive ? '✓' : '') + '</div></div>';
    }).join('');
}
function tempSelect(point) {
    tempSelectedPoint = point;
    renderPickupList();
}
function confirmPickup() {
    if (tempSelectedPoint) {
        choosePickup(tempSelectedPoint);
    }
    closePickup();
}
function choosePickup(point) { changeCity(point); closePickup(); showToast('Выбрано: ' + point); updateCityLabel(); if (currentTab === 'cart') renderCart(); }
function closePickup() { const m = document.querySelector('.pickup-modal-new'); if (m) m.remove(); }
function changeCity(city) { localStorage.setItem('pickupPoint', city); }
function getCity() { return localStorage.getItem('pickupPoint') || '🏬 Атриум'; }
async function doCheckout(point, deliveryTime, paymentMethod, discount, discountCat) {
    const res = await fetch(API+'/api/checkout', {
        method:'POST', headers:headers(),
        body:JSON.stringify({pickup_point:point, delivery_time:deliveryTime||'', payment_method:paymentMethod||'', discount: discount||0, discount_category: discountCat||'all', promo_id: (window._checkout && window._checkout.promoId) || 0})
    });
    if (res.ok === false) { const e = await res.json().catch(()=>({})); return showToast(e.detail || 'Ошибка'); }
    showToast('✅ Заказ оформлен!');
    currentTab='profile'; render();
}
function openManager() { if (tg) tg.openTelegramLink('https://t.me/MOGBARAHA'); }
async function openHelp() {
    const modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.innerHTML = '<div class="help-sheet">' +
        '<div class="help-handle"></div>' +
        '<div class="help-header"><div class="help-title">Помощь</div><div class="help-sub">Ответы на частые вопросы</div><span class="help-close" onclick="closeHelp()">✕</span></div>' +
        '<div class="help-scroll" id="help-scroll-box"><div class="empty">Загрузка...</div></div>' +
        '<button class="promo-btn help-btn" onclick="openManager(); closeHelp();">💬 Написать в поддержку</button>' +
    '</div>';
    modal.onclick = (e) => { if (e.target === modal) closeHelp(); };
    document.body.appendChild(modal);
    try {
        const res = await fetch(API + '/api/faq', { headers: headers() });
        const items = await res.json();
        const box = document.getElementById('help-scroll-box');
        if (!box) return;
        if (!items.length) { box.innerHTML = '<div class="empty">Пока ничего нет</div>'; return; }
        const labels = { app: 'ПРИЛОЖЕНИЕ', warranty: 'ГАРАНТИЯ И БРАК', other: 'ПРОЧЕЕ' };
        let html = '';
        let lastCat = null;
        items.forEach(it => {
            const cat = it.category || 'app';
            if (cat !== lastCat) {
                if (lastCat !== null) html += '';
                html += '<div class="help-section">' + (labels[cat] || cat.toUpperCase()) + '</div>';
                lastCat = cat;
            }
            html += helpItem(it.emoji || '❓', it.question, it.answer);
        });
        box.innerHTML = html;
    } catch(e) {
        const box = document.getElementById('help-scroll-box');
        if (box) box.innerHTML = '<div class="empty">Не удалось загрузить</div>';
    }
}
function helpItem(emoji, q, a) {
    return '<div class="help-item">' +
        '<div class="help-q-row" onclick="toggleHelp(this)">' +
            '<span class="help-emoji">' + emoji + '</span>' +
            '<span class="help-q">' + q + '</span>' +
            '<span class="help-arrow">⌄</span>' +
        '</div>' +
        '<div class="help-answer">' + a + '</div>' +
    '</div>';
}
function toggleHelp(el) {
    const item = el.closest('.help-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.help-item.open').forEach(i => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
}
function closeHelp() {
    const m = document.querySelector('.help-modal');
    if (m) m.remove();
}
function addToHomeScreen() { if (tg && tg.addToHomeScreen) tg.addToHomeScreen(); else showToast('Через Telegram'); }

function openSettings() {
    document.getElementById('settings-modal').style.display = 'flex';
    // Автозаполнение
    const ph = document.getElementById('phone-input');
    const em = document.getElementById('email-input');
    if (ph) ph.value = localStorage.getItem('userPhone') || '';
    if (em) em.value = localStorage.getItem('userEmail') || '';
    // Язык
    const curLang = localStorage.getItem('lang') || 'ru';
    document.getElementById('lang-ru')?.classList.toggle('active', curLang === 'ru');
    document.getElementById('lang-en')?.classList.toggle('active', curLang === 'en');
    // Тема
    const curTheme = localStorage.getItem('theme') || 'dark';
    document.getElementById('theme-light')?.classList.toggle('active', curTheme === 'light');
    document.getElementById('theme-dark')?.classList.toggle('active', curTheme === 'dark');
}
function closeSettings() { document.getElementById('settings-modal').style.display = 'none'; }
function setTheme(t) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add('theme-' + t);
    localStorage.setItem('theme', t);
    const l = document.getElementById('theme-light');
    const d = document.getElementById('theme-dark');
    if (l) l.classList.toggle('active', t === 'light');
    if (d) d.classList.toggle('active', t === 'dark');
}

function setLang(l) {
    localStorage.setItem('lang', l);
    const r = document.getElementById('lang-ru');
    const e = document.getElementById('lang-en');
    if (r) r.classList.toggle('active', l === 'ru');
    if (e) e.classList.toggle('active', l === 'en');
    haptic('light');
}
async function savePhone() { return saveContacts(); }
async function saveContacts() {
    const inp = document.getElementById('phone-input');
    const em = document.getElementById('email-input');
    const v = (inp.value || '').replace(/[^0-9]/g, '').slice(0, 11);
    const email = (em.value || '').trim();
    if (v === '' && email === '') return showToast('Заполни хотя бы одно поле');
    if (v) localStorage.setItem('userPhone', v);
    if (email) localStorage.setItem('userEmail', email);
    try {
        await fetch(API+'/api/user/phone', {method:'POST', headers:headers(), body:JSON.stringify({phone:v, email:email})});
    } catch(e) {}
    showToast('✅ Сохранено');
    if (currentTab === 'profile') render();
}


function getEmail() { return localStorage.getItem('userEmail') || ''; }
function getPhone() { const p = localStorage.getItem('userPhone'); return p ? '📞 ' + p : '📞 Не указан'; }
setTheme(localStorage.getItem('theme') || 'dark');
const tgUser = tg?.initDataUnsafe?.user;
if (tgUser && ADMINS.includes(tgUser.id)) isAdmin = true;
if (tgUser && tgUser.id === OWNER_ID) isOwner = true;
var _startParam = tg && tg.initDataUnsafe ? (tg.initDataUnsafe.start_param || '') : '';
if (_startParam && _startParam.indexOf('product_') === 0) {
    var _pid = parseInt(_startParam.slice(8));
    if (_pid > 0) {
        currentProductId = _pid;
        currentTab = 'product';
        addToRecent(_pid);
        render();
    } else {
        render();
    }
} else {
    render();
}




function updateCityLabel() {
    const label = document.getElementById('city-label');
    if (label) {
        const city = getCity();
        label.textContent = city;
    }
}


function shareProduct(pid) {
    const url = 'https://t.me/Barahamogbot/app?startapp=product_' + pid;
    if (tg) {
        tg.openTelegramLink('https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent('Смотри что нашёл в MOGVAPE!'));
    } else {
        navigator.clipboard.writeText(url);
        showToast('Ссылка скопирована!');
    }
}


function showCartAnimation() {
    const t = document.createElement('div');
    t.className = 'cart-fly-anim';
    t.textContent = '🛒';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 900);
}

function haptic(style) {
    try { if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred(style || 'light'); } catch(e) {}
}

function askConfirm(title, onOk, okText) {
    const m = document.createElement('div');
    m.className = 'confirm-modal';
    m.innerHTML = '<div class="confirm-box"><div class="confirm-title">' + title + '</div><div class="confirm-actions"><button class="confirm-cancel">Отмена</button><button class="confirm-ok">' + (okText || 'OK') + '</button></div></div>';
    const close = () => m.remove();
    m.querySelector('.confirm-cancel').onclick = close;
    m.querySelector('.confirm-ok').onclick = () => { close(); onOk(); };
    m.onclick = (e) => { if (e.target === m) close(); };
    document.body.appendChild(m);
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2000);
}


function selectVolume(el) {
    window._currentVolume = el.dataset.v;
    document.querySelectorAll('.ps-chip[data-v]').forEach(b => {
        b.classList.toggle('active', b === el);
    });
    haptic('light');
}
function selectStrength(el) {
    document.querySelectorAll('.strength-btn').forEach(b => {
        b.classList.remove('active');
        b.style.border = '1.5px solid #d8d8dd';
        b.style.background = '#fff';
        b.style.color = '#1a1a1e';
    });
    el.classList.add('active');
    el.style.border = '2px solid #4ea1ff';
    el.style.background = 'rgba(78,161,255,0.08)';
    el.style.color = '#4ea1ff';
}

function selectFlavor(flavor) {
    window._currentFlavor = flavor;
    document.querySelectorAll('.ps-flavor').forEach(b => {
        const isThis = b.dataset.f === flavor;
        b.classList.toggle('active', isThis);
        const inner = b.querySelector('.ps-flavor-img');
        if (inner) {
            inner.style.border = isThis ? '2px solid #4ea1ff' : '1.5px solid #e8e8ec';
            inner.style.background = isThis ? 'rgba(78,161,255,0.08)' : '#f5f5f7';
        }
        const check = b.querySelector('.ps-flavor-check');
        if (check) check.remove();
        if (isThis) {
            const c = document.createElement('div');
            c.className = 'ps-flavor-check';
            c.textContent = '✓';
            c.style.top = '6px';
            c.style.right = '6px';
            c.style.width = '22px';
            c.style.height = '22px';
            c.style.background = '#4ea1ff';
            c.style.borderRadius = '50%';
            c.style.display = 'flex';
            c.style.alignItems = 'center';
            c.style.justifyContent = 'center';
            c.style.color = '#fff';
            c.style.fontSize = '12px';
            c.textContent = '✓';
            inner.appendChild(c);
        }
        const label = b.querySelector('div:last-child');
        if (label && !label.style.position) {
            label.style.color = isThis ? '#4ea1ff' : 'var(--muted)';
            label.style.fontWeight = isThis ? '700' : '500';
        }
    });
    updateProductStockDisplay();
}
async function updateProductStockDisplay() {
    const el = document.querySelector('.ps-stock');
    const buy = document.getElementById('ps-buy-btn');
    if (!el) return;
    const res = await fetch(API + '/api/product/' + currentProductId, {headers: headers()});
    if (!res.ok) return;
    const p = await res.json();
    const fsMap = parseFlavorStocks(p.flavor_stocks);
    const fsStock = (window._currentFlavor && (window._currentFlavor in fsMap)) ? fsMap[window._currentFlavor] : Infinity;
    const effQty = (fsStock !== Infinity) ? fsStock : p.quantity;
    el.className = 'ps-stock ' + (effQty <= 0 ? 'ps-stock-out' : (effQty <= 3 ? 'ps-stock-low' : 'ps-stock-ok'));
    el.textContent = effQty <= 0 ? '✕ Нет в наличии' : (effQty <= 3 ? '⏳ Осталось ' + effQty + ' шт.' : '✔ В наличии ' + effQty + ' шт.');
    if (buy) {
        if (effQty <= 0) {
            buy.disabled = true;
            buy.classList.add('ps-buy-disabled');
            buy.textContent = 'Нет в наличии';
        } else {
            buy.disabled = false;
            buy.classList.remove('ps-buy-disabled');
            buy.textContent = '🛒 В корзину · ' + p.price + ' BYN';
        }
    }
}

function selectFlavorAll(flavor) {
    window._currentFlavor = flavor;
    closeFlavors();
    render();
}

function closeFlavors() {
    const m = document.querySelector('.pickup-modal-new');
    if (m) m.remove();
}


async function saveProduct(pid) {
    const name = document.getElementById('ep-name').value.trim();
    const desc = document.getElementById('ep-desc').value.trim();
    const _fs = collectFlavorStocks('ep-flavors-editor');
    const flavors = _fs.flavors;
    const flavorStocks = _fs.stocks;
    const strengths = (window._epStrengths || []).join(',');
    const price = parseFloat(document.getElementById('ep-price').value);
    const qtyEl0 = document.getElementById('ep-qty');
    const qty = qtyEl0 ? parseInt(qtyEl0.value) : 0;
    const oldPrice = parseFloat(document.getElementById('ep-old-price')?.value) || 0;
    const cat = window._epCat || 'all';
    const nameEl = document.getElementById('ep-name');
    const priceEl = document.getElementById('ep-price');
    const qtyEl = document.getElementById('ep-qty');
    [nameEl, priceEl, qtyEl].forEach(el => el && el.classList.remove('error'));
    let bad = false;
    if (name === '') { nameEl?.classList.add('error'); bad = true; }
    if (!price || isNaN(price)) { priceEl?.classList.add('error'); bad = true; }
    // qty больше не проверяем (блока нет)
    if (bad) {
        const btn = document.getElementById('ep-save-btn');
        if (btn) { btn.classList.add('error'); setTimeout(() => btn.classList.remove('error'), 800); }
        showToast('Заполните поля');
        return;
    }
    let photoUrl = null;
    const photoFile = document.getElementById('ep-photo')?.files?.[0];
    if (photoFile) {
        const fd = new FormData();
        fd.append('file', photoFile);
        const upRes = await fetch(API+'/api/admin/upload', {method:'POST', body:fd, headers:{'X-Telegram-Init-Data':tg?.initData||''}});
        if (!upRes.ok) return showToast('Ошибка загрузки фото');
        photoUrl = (await upRes.json()).url;
    }
    const isHit = (document.getElementById('ep-hit-toggle')?.dataset.hit === '1') ? 1 : 0;
    const volumes = (window._epVolumesSelected || []).join(',');
    const payload = {name, description:desc, price, quantity:qty, category:cat, flavors, strengths, old_price:oldPrice, flavor_stocks:flavorStocks, is_hit:isHit, volumes};
    if (photoUrl) payload.photo_id = photoUrl;
    else if ((document.getElementById('ep-photo-cleared')?.value || '0') === '1') payload.photo_id = '';
    const res = await fetch(API+'/api/admin/product/'+pid+'/update', {
        method:'POST', headers:headers(),
        body:JSON.stringify(payload)
    });
    if (res.ok) { showToast('Сохранено'); renderAdminProducts(); }
    else { const e = await res.json().catch(()=>({})); showToast(e.detail || 'Ошибка'); }
}

async function editProduct(pid) {
    const res = await fetch(API+'/api/admin/product/'+pid, {headers:headers()});
    if (res.ok === false) return showToast('Ошибка');
    const p = await res.json();
    window._epCat = p.category || 'all';
    window._epStrengths = (p.strengths || '').split(',').map(s=>s.trim()).filter(Boolean);
    window._epVolumes = (p.volumes || '').split(',').map(s=>s.trim()).filter(Boolean);
    window._epVolumesSelected = window._epVolumes.slice();
    const _cm = window.CAT_META[window._epCat] || window.CAT_META.all;
    const _catEmoji = _cm.emoji;
    const _catLabel = _cm.label;
    content.innerHTML =
        '<div class="admin-topbar"><button class="admin-back" onclick="renderAdminProducts()">←</button><div class="admin-title-wrap"><div class="admin-title">Редактировать</div></div></div>' +
        '<div class="prod-form">' +
            '<div class="pf-card"><label class="pf-label">НАЗВАНИЕ</label><input class="pf-input" id="ep-name" value="' + (p.name||'') + '"></div>' +
            '<div class="pf-card"><label class="pf-label">ОПИСАНИЕ</label><textarea class="pf-input" id="ep-desc" rows="4">' + (p.description||'') + '</textarea></div>' +
            '<div class="pf-card"><label class="pf-label">ФОТО</label>' + (p.photo_id ? '<div class="pf-photo-wrap"><img src="' + p.photo_id + '" class="pf-photo-preview"><button type="button" class="pf-photo-del" onclick="removeProductPhoto(\'ep\', ' + pid + ')">🗑 Удалить</button></div>' : '') + '<input type="file" id="ep-photo" accept="image/*" class="pf-input"><input type="hidden" id="ep-photo-cleared" value="0"></div>' +
            '<div class="pf-card"><label class="pf-label">ВКУСЫ И ОСТАТКИ</label><div id="ep-flavors-editor" class="fs-editor"></div><button type="button" class="fs-add" onclick="addFlavorRow(\'ep-flavors-editor\')">+ Добавить вкус</button><div class="pf-hint">Оставь «шт.» пустым = не учитывать остаток</div></div>' +
            '<div class="pf-card"><label class="pf-label">КАТЕГОРИЯ</label><div class="cat-trigger" onclick="openCatPicker()"><span id="ep-cat-emoji">' + _catEmoji + '</span><span id="ep-cat-label">' + _catLabel + '</span><span class="cat-trigger-arrow">⌄</span></div></div>' +
            '<div class="pf-card"><label class="pf-label">МЕТКА</label><div class="hit-toggle" id="ep-hit-toggle" data-hit="' + (p.is_hit ? '1' : '0') + '" onclick="toggleHit(this)"><div class="hit-toggle-icon">🔥</div><div class="hit-toggle-body"><div class="hit-toggle-title">Отметить как хит</div><div class="hit-toggle-sub">Показывать метку «🔥 Хит» на карточке</div></div><div class="hit-toggle-switch"><div class="hit-toggle-knob"></div></div></div></div>' +
            '<div class="pf-card" id="ep-volumes-card" style="display:none"><label class="pf-label">ОБЪЁМ</label><div class="strengths-grid" id="ep-volumes-grid"></div><div class="pf-hint">Например: 2 мл, 3 мл. Можно добавить свой.</div><button type="button" class="fs-add" onclick="addCustomVolume()">+ Свой объём</button></div>' +
            '<div class="pf-card" id="ep-strengths-card"><label class="pf-label">КРЕПОСТЬ</label><div class="strengths-grid" id="ep-strengths-grid"></div><div class="pf-hint" id="ep-strengths-hint"></div></div>' +
            '<div class="pf-card"><label class="pf-label">ЦЕНА, BYN</label><input class="pf-input" id="ep-price" type="number" step="0.01" value="' + p.price + '"></div>' +
            '<button class="pf-submit pf-submit-sticky" id="ep-save-btn" onclick="saveProduct(' + pid + ')">Сохранить</button>' +
            '<button class="pf-cancel" onclick="renderAdminProducts()">Отменить</button>' +
        '</div>';
    renderStrengthButtons();
    renderFlavorStocksEditor('ep-flavors-editor', p.flavors || '', p.flavor_stocks || '');
    updateQtyVisibility('ep-flavors-editor', 'ep-qty-card');
    applyCategoryModeUI(window._epCat);
    initFlavorRowsDnD('ep-flavors-editor');
}

window._epVolumes = window._epVolumes || [];
window._epVolumesSelected = window._epVolumesSelected || [];
window.CAT_META = {
    all:       { emoji: '🛍', label: 'Все' },
    liquid:    { emoji: '💧', label: 'Жидкости' },
    accessory: { emoji: '🔧', label: 'Расходники' },
    snus:      { emoji: '🍬', label: 'Снюс' },
    vape:      { emoji: '💨', label: 'Вейп' },
    other:     { emoji: '📦', label: 'Другое' }
};
const STRENGTH_PRESETS = {
    liquid:    [50, 60, 70, 80],
    snus:      [75, 100, 120, 130, 150, 200],
    vape:      [],
    accessory: [0.2, 0.4, 0.6, 0.8, 1.0, 1.2],
    other:     [],
    all:       []
};
const VOLUME_PRESETS = {
    accessory: [1, 2, 3, 5, 10]
};

function openCatPicker() {
    const cur = window._epCat || 'all';
    let html = '<div class="pickup-sheet"><div class="pickup-handle"></div><div class="pickup-header"><div class="pickup-header-title">Категория</div><div class="pickup-header-sub">Выберите раздел</div></div><div class="pickup-list">';
    Object.keys(window.CAT_META).forEach(k => {
        const m = window.CAT_META[k];
        const active = k === cur ? ' active' : '';
        html += '<div class="pickup-card' + active + '" onclick="selectCat(\'' + k + '\')"><div class="pickup-card-emoji">' + m.emoji + '</div><div class="pickup-card-body"><div class="pickup-card-name">' + m.label + '</div></div><div class="pickup-card-check">' + (active ? '✓' : '') + '</div></div>';
    });
    html += '</div><button class="pickup-close pickup-choose-btn" onclick="closeCatPicker()">Закрыть</button></div>';
    const modal = document.createElement('div');
    modal.className = 'pickup-modal cat-modal';
    modal.innerHTML = html;
    modal.onclick = (e) => { if (e.target === modal) closeCatPicker(); };
    document.body.appendChild(modal);
}
function closeCatPicker() {
    const m = document.querySelector('.cat-modal');
    if (m) m.remove();
}
function selectCat(key) {
    window._epCat = key;
    const presets = (STRENGTH_PRESETS[key] || []).map(String);
    window._epStrengths = window._epStrengths.filter(v => presets.indexOf(String(v)) !== -1);
    const m = window.CAT_META[key];
    const emojiEl = document.getElementById('ep-cat-emoji');
    const labelEl = document.getElementById('ep-cat-label');
    if (emojiEl) emojiEl.textContent = m.emoji;
    if (labelEl) labelEl.textContent = m.label;
    renderStrengthButtons();
    applyCategoryModeUI(key);
    closeCatPicker();
}
function renderVolumeButtons() {
    const card = document.getElementById('ep-volumes-card');
    const grid = document.getElementById('ep-volumes-grid');
    if (!card || !grid) return;
    const key = window._epCat || 'all';
    if (key !== 'accessory') {
        card.style.display = 'none';
        return;
    }
    card.style.display = '';
    const list = window._epVolumes || [];
    const sel = window._epVolumesSelected || [];
    if (list.length === 0) {
        grid.innerHTML = '<div class="pf-hint" style="padding:4px 0">Пока пусто — добавь кнопкой ниже</div>';
        return;
    }
    grid.innerHTML = list.map(function(v) {
        const active = sel.indexOf(v) !== -1 ? ' active' : '';
        return '<div class="strength-chip' + active + '" onclick="toggleVolume(this.dataset.v)" data-v="' + v + '">' + v + '</div>';
    }).join('');
}
function toggleVolume(v) {
    if (!window._epVolumesSelected) window._epVolumesSelected = [];
    const i = window._epVolumesSelected.indexOf(v);
    if (i === -1) window._epVolumesSelected.push(v);
    else window._epVolumesSelected.splice(i, 1);
    renderVolumeButtons();
    haptic('light');
}
function addCustomVolume() {
    const v = prompt('Введи объём (например 2 мл):');
    if (!v) return;
    const val = v.trim();
    if (!val) return;
    if (!window._epVolumes) window._epVolumes = [];
    if (window._epVolumes.indexOf(val) === -1) window._epVolumes.push(val);
    if (!window._epVolumesSelected) window._epVolumesSelected = [];
    if (window._epVolumesSelected.indexOf(val) === -1) window._epVolumesSelected.push(val);
    renderVolumeButtons();
}
function renderStrengthButtons() {
    const key = window._epCat || 'all';
    const presets = STRENGTH_PRESETS[key] || [];
    const card = document.getElementById('ep-strengths-card');
    const grid = document.getElementById('ep-strengths-grid');
    const hint = document.getElementById('ep-strengths-hint');
    if (!card) return;
    const isAcc = key === 'accessory';
    // Для accessory блок «КРЕПОСТЬ / СОПРОТИВЛЕНИЕ» скрываем полностью
    if (isAcc) {
        card.style.display = 'none';
        return;
    }
    const labelEl = card.querySelector('.pf-label');
    if (labelEl) labelEl.textContent = 'КРЕПОСТЬ';
    if (presets.length === 0) {
        card.style.display = 'none';
        return;
    }
    card.style.display = '';
    hint.textContent = 'Можно выбрать несколько. Для ' + (window.CAT_META[key].label) + '.';
    grid.innerHTML = presets.map(v => {
        const active = window._epStrengths.indexOf(String(v)) !== -1 ? ' active' : '';
        return '<div class="strength-chip' + active + '" onclick="toggleStrength(\'' + v + '\')">' + v + ' мг</div>';
    }).join('');
}

function applyCategoryModeUI(key) {
    const isAcc = key === 'accessory';
    const isVape = key === 'vape';
    // Блок «Вкусы и остатки» — разный текст для vape/accessory/остальных
    const flavorCard = document.querySelector('#ep-flavors-editor')?.closest('.pf-card')
                    || document.querySelector('#np-flavors-editor')?.closest('.pf-card');
    if (flavorCard) {
        const lbl = flavorCard.querySelector('.pf-label');
        if (lbl) lbl.textContent = isAcc ? 'СОПРОТИВЛЕНИЕ И ОСТАТКИ' : (isVape ? 'ЦВЕТА И ОСТАТКИ' : 'ВКУСЫ И ОСТАТКИ');
        const hint = flavorCard.querySelector('.pf-hint');
        if (hint) hint.textContent = isAcc
            ? 'Ом и сколько штук. Например: 0.6 — 5 шт'
            : (isVape
                ? 'Цвет и сколько штук. Например: Plume pink — 3 шт'
                : 'Оставь «шт.» пустым = не учитывать остаток');
        const addBtn = flavorCard.querySelector('.fs-add');
        if (addBtn) addBtn.textContent = isAcc ? '+ Добавить сопротивление' : (isVape ? '+ Добавить цвет' : '+ Добавить вкус');
        const editor = flavorCard.querySelector('.fs-editor');
        if (editor) {
            const inputs = editor.querySelectorAll('.fs-name');
            inputs.forEach(inp => inp.placeholder = isAcc ? 'Ом (например 0.6)' : (isVape ? 'Цвет (Белый)' : 'Название вкуса'));
        }
    }
    // Блок «ОБЩЕЕ КОЛ-ВО» — скрываем для accessory
    ['ep-qty-card', 'np-qty-card'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = isAcc ? 'none' : '';
    });
    renderVolumeButtons();
}

function addCustomStrength() {
    const v = prompt('Введи значение Ом (например 0.5):');
    if (!v) return;
    const val = v.trim().replace(',', '.');
    if (!val) return;
    if (window._epStrengths.indexOf(val) === -1) window._epStrengths.push(val);
    const key = window._epCat || 'all';
    if (STRENGTH_PRESETS[key] && STRENGTH_PRESETS[key].map(String).indexOf(val) === -1) {
        STRENGTH_PRESETS[key].push(val);
    }
    renderStrengthButtons();
}

function toggleHit(el) {
    const v = el.dataset.hit === '1' ? '0' : '1';
    el.dataset.hit = v;
    el.classList.toggle('active', v === '1');
    haptic('light');
}
function toggleStrength(v) {
    const s = String(v);
    const i = window._epStrengths.indexOf(s);
    if (i === -1) window._epStrengths.push(s);
    else window._epStrengths.splice(i, 1);
    renderStrengthButtons();
}


function showAllFlavors() {
    fetch(API + '/api/products?category=all', { headers: headers() }).then(r => r.json()).then(products => {
        const prod = products.find(x => x.id === currentProductId);
        if (!prod) return;
        const flavors = (prod.flavors || '').split(',').map(s => s.trim()).filter(Boolean);
        if (flavors.length === 0) { showToast('Вкусы не указаны'); return; }
        const img = prod.photo_id || null;
        const modal = document.createElement('div');
        modal.className = 'pickup-modal-new';
        let inner = '<div class="pickup-sheet"><div class="pickup-header" style="display:flex;justify-content:space-between;align-items:center"><div class="pickup-header-title" style="font-size:20px;color:var(--text)">Вкус</div><span style="cursor:pointer;font-size:24px;color:var(--muted)" onclick="closeFlavors()">✕</span></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px">';
        const fsMap = parseFlavorStocks(prod.flavor_stocks);
        inner += flavors.map(f => {
            const stock = getFlavorStock(fsMap, f);
            const disabled = stock <= 0;
            const isActive = f === window._currentFlavor && !disabled;
            const bg = isActive ? '#4ea1ff' : 'var(--bg)';
            const col = isActive ? '#fff' : (disabled ? 'var(--muted)' : 'var(--text)');
            const bd = isActive ? '#4ea1ff' : 'var(--border)';
            const op = disabled ? 'opacity:0.45;filter:grayscale(0.7);' : '';
            const oc = disabled ? '' : ' onclick="selectFlavorAll(this.dataset.f)"';
            const imgTag = img ? '<img src="' + img + '" style="width:70px;height:70px;object-fit:contain;display:block;margin:0 auto 8px">' : '<div style="font-size:50px">📦</div>';
            const stockLabel = (stock !== Infinity) ? '<div style="font-size:11px;color:' + (disabled ? '#e74c3c' : (stock <= 3 ? '#f39c12' : 'var(--muted)')) + ';margin-top:4px">' + (disabled ? '✕ нет' : '✔ ' + stock + ' шт.') + '</div>' : '';
            return '<div' + oc + ' class="flavor-all" data-f="' + f + '" style="cursor:' + (disabled ? 'not-allowed' : 'pointer') + ';border-radius:18px;padding:14px 8px;text-align:center;background:' + bg + ';color:' + col + ';border:1.5px solid ' + bd + ';' + op + '">' + imgTag + '<div style="font-size:13px;font-weight:600">' + f + '</div>' + stockLabel + '</div>';
        }).join('');
        inner += '</div></div>';
        modal.innerHTML = inner;
        modal.onclick = (e) => { if (e.target === modal) closeFlavors(); };
        document.body.appendChild(modal);
    });
}

async function renderCart() {
    updateCartBadge();
    const res = await fetch(API+'/api/cart', {headers:headers()});
    const items = await res.json();
    if (items.length === 0) {
        content.innerHTML =
            '<div class="cart-empty">' +
                '<div class="cart-empty-icon">🛒</div>' +
                '<div class="cart-empty-title">Корзина пуста</div>' +
                '<div class="cart-empty-sub">Добавьте товары из ассортимента — и они появятся здесь</div>' +
                '<button class="cart-empty-btn" onclick="currentTab=\'catalog\';render();">Перейти в каталог</button>' +
            '</div>';
        return;
    }
    const total = items.reduce((s,i)=>s+i.price*i.quantity,0);
    let itemsHtml = items.map(i => {
        const img = i.photo_id ? '<img src="' + i.photo_id + '" style="width:72px;height:72px;object-fit:cover;border-radius:14px;background:var(--bg);flex-shrink:0">' : '<div style="width:72px;height:72px;border-radius:14px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0">📦</div>';
        const parts = [];
        if (i.flavor) parts.push(i.flavor);
        if (i.strength) parts.push(i.strength + ' мг');
        if (i.volume) parts.push(i.volume);
        const extra = parts.length > 0
            ? '<div style="font-size:12px;color:var(--muted);margin-top:2px">' + parts.join(' · ') + '</div>'
            : '';
        return '<div class="cart-card">' +
            img +
            '<div style="flex:1;min-width:0">' +
                '<div class="cart-card-name">' + i.name + '</div>' +
                extra +
                '<div class="cart-card-bottom">' +
                    '<div class="cart-qty">' +
                        '<button class="qty-btn" onclick="changeQty(' + i.id + ',-1)">−</button>' +
                        '<span class="qty-val">' + i.quantity + '</span>' +
                        '<button class="qty-btn" onclick="changeQty(' + i.id + ',1)">+</button>' +
                    '</div>' +
                    '<div class="cart-card-price">' + (i.quantity*i.price) + ' BYN</div>' +
                '</div>' +
            '</div>' +
            '<button class="cart-card-del" onclick="removeCart(' + i.id + ')">✕</button>' +
        '</div>';
    }).join('');
    content.innerHTML =
        '<div style="display:flex;flex-direction:column;gap:12px">' + itemsHtml + '</div>' +
        '<div class="cart-total"><div class="cart-total-row"><span>Итого:</span><span id="cart-total-amount">' + total + ' BYN</span></div><button class="btn-checkout" onclick="currentTab=\'checkout\';render();">Оформить</button></div>';
}

async function changeQty(cid, delta) {
    haptic('light');
    const res = await fetch(API+'/api/cart/' + cid + '/qty', {method:'POST', headers:headers(), body:JSON.stringify({delta: delta})});
    if (res.ok) { renderCart(); updateCartBadge(); }
    else {
        const e = await res.json().catch(()=>({}));
        showToast(e.detail || 'Ошибка');
    }
}



function clearSearch() {
    window._searchQuery = '';
    const el = document.getElementById('search-input');
    if (el) el.value = '';
    renderProductsGrid(window._catalogProducts || []);
}

window._catalogSort = 'popular';


window._catalogSort = 'popular';
const SORT_ORDER = [
    { key: 'default', label: 'По умолчанию' },
    { key: 'popular', label: 'По популярности' },
    { key: 'price_asc', label: 'Цена ↑' },
    { key: 'price_desc', label: 'Цена ↓' },
    { key: 'name', label: 'По названию' }
];

function cycleSort() {
    haptic('light');
    const cur = window._catalogSort || 'default';
    const idx = SORT_ORDER.findIndex(o => o.key === cur);
    const next = SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    window._catalogSort = next.key;
    const el = document.getElementById('sort-label');
    if (el) el.textContent = next.label;
    renderProductsGrid(window._catalogProducts || []);
}

window._checkout = { step: 1, point: '', time: '', payment: '' };

async function renderCheckout() {
    const saved = localStorage.getItem('pickupPoint') || '';
    window._checkout = { step: 1, point: saved, time: '', payment: '', dayOffset: 0 };
    content.innerHTML = '<div class="co-wrap"><div class="co-topbar"><button class="co-back" onclick="currentTab=\'cart\';render();">←</button><div class="co-title">Оформление</div></div><div class="co-steps" id="co-steps"></div><div class="co-body" id="co-body"></div><div class="co-footer" id="co-footer"></div></div>';
    renderCheckoutStep();
}

function renderCheckoutStep() {
    const step = window._checkout.step;
    const stepsBar = document.getElementById('co-steps');
    const labels = ['МЕСТО', 'ВРЕМЯ', 'ОПЛАТА'];
    stepsBar.innerHTML = [1,2,3].map(n => {
        const done = n < step;
        const active = n === step;
        const cls = done ? 'co-step-done' : (active ? 'co-step-active' : '');
        const inner = done ? '✓' : n;
        return '<div class="co-step ' + cls + '"><div class="co-step-dot">' + inner + '</div><div class="co-step-label">' + labels[n-1] + '</div></div>' + (n < 3 ? '<div class="co-step-line ' + (done ? 'co-step-line-done' : '') + '"></div>' : '');
    }).join('');
    const body = document.getElementById('co-body');
    const footer = document.getElementById('co-footer');
    if (step === 1) {
        body.innerHTML = PICKUP_POINTS.map(p => {
            const full = p.emoji + ' ' + p.name;
            const active = window._checkout.point === full ? ' active' : '';
            return '<div class="co-card' + active + '" onclick="checkoutPickPoint(\'' + full + '\')"><div class="co-card-emoji">' + p.emoji + '</div><div class="co-card-info"><div class="co-card-name">' + p.name + '</div></div><div class="co-card-check">' + (active ? '✓' : '') + '</div></div>';
        }).join('');
        footer.innerHTML = '<button class="co-btn co-btn-primary" onclick="checkoutNext()">Далее →</button>';
    } else if (step === 2) {
        const cur = window._checkout.time || '15:00';
        const [curH, curM] = (cur.match(/^\d{2}:\d{2}$/) ? cur : '15:00').split(':');
        const hours = []; for (let h = 0; h <= 23; h++) hours.push(('0'+h).slice(-2));
        const mins = []; for (let m = 0; m < 60; m++) mins.push(('0'+m).slice(-2));
        const addrBlock = isDelivery()
            ? '<div class="co-section-title">Адрес доставки</div>' +
              '<input class="co-addr-input" id="co-addr" placeholder="ул. Ленина 5, кв. 12, этаж 3, подъезд 2" value="' + (window._checkout.address || '') + '" oninput="checkoutAddressInput(this)">' +
              '<div class="co-addr-hint">💡 Стоимость доставки и точное время подтвердит менеджер</div>'
            : '';
        body.innerHTML =
            addrBlock +
            '<div class="co-section-title">Выберите день</div>' +
            '<div class="co-days" id="co-days"></div>' +
            '<div class="co-section-title">Выберите время</div>' +
            '<div class="tp-wrap">' +
                '<div class="tp-col" id="tp-hours">' +
                    '<div class="tp-spacer"></div>' +
                    hours.map(h => '<div class="tp-item' + (h === curH ? ' active' : '') + '" data-v="' + h + '">' + h + '</div>').join('') +
                    '<div class="tp-spacer"></div>' +
                '</div>' +
                '<div class="tp-colon">:</div>' +
                '<div class="tp-col" id="tp-mins">' +
                    '<div class="tp-spacer"></div>' +
                    mins.map(m => '<div class="tp-item' + (m === curM ? ' active' : '') + '" data-v="' + m + '">' + m + '</div>').join('') +
                    '<div class="tp-spacer"></div>' +
                '</div>' +
                '<div class="tp-indicator"></div>' +
            '</div>' +
            '<div class="co-timepicker-hint" style="text-align:center;margin-top:10px">Выберите удобное время — мы подтвердим</div>';
        footer.innerHTML =
            '<button class="co-btn co-btn-ghost" onclick="checkoutPrev()">← Назад</button>' +
            '<button class="co-btn co-btn-primary" onclick="checkoutNext()">Далее →</button>';
        setTimeout(initTimePicker, 50);
        setTimeout(renderCoDays, 10);
    } else if (step === 3) {
        const payOpts = [
            { key: 'cash', emoji: '💵', name: 'Наличные', sub: 'При получении' },
            { key: 'card', emoji: '💳', name: 'Картой', sub: 'При получении' }
        ];
        body.innerHTML =
            '<div class="co-section-title">Способ оплаты</div>' +
            payOpts.map(o => {
                const active = window._checkout.payment === o.key ? ' active' : '';
                return '<div class="co-card' + active + '" onclick="checkoutPickPayment(\'' + o.key + '\')"><div class="co-card-emoji">' + o.emoji + '</div><div class="co-card-info"><div class="co-card-name">' + o.name + '</div><div class="co-card-sub">' + o.sub + '</div></div><div class="co-card-check">' + (active ? '✓' : '') + '</div></div>';
            }).join('') +
            '<div class="co-section-title" style="margin-top:20px">Промокод</div>' +
            '<div class="co-promo"><input class="co-promo-input" id="co-promo-input" placeholder="Введите код"><button class="co-promo-btn" onclick="checkoutApplyPromo()">Применить</button></div>' +
            '<div class="co-total" id="co-total">Итого: ...</div>';
        footer.innerHTML =
            '<button class="co-btn co-btn-ghost" onclick="checkoutPrev()">← Назад</button>' +
            '<button class="co-btn co-btn-primary" onclick="checkoutSubmit()">Подтвердить</button>';
        updateCheckoutTotal();
    }
}

function checkoutPickPoint(point) {
    window._checkout.point = point;
    renderCheckoutStep();
}
function isDelivery() {
    return (window._checkout.point || '').indexOf('Доставка') !== -1;
}
function checkoutAddressInput(el) {
    window._checkout.address = el.value;
}

function renderCoDays() {
    const box = document.getElementById('co-days');
    if (!box) return;
    const cur = window._checkout.dayOffset || 0;
    const opts = [
        { off: 0, label: 'Сегодня' },
        { off: 1, label: 'Завтра' },
        { off: 2, label: 'Послезавтра' },
    ];
    box.innerHTML = opts.map(o => {
        const active = o.off === cur ? ' active' : '';
        return '<div class="co-day-chip' + active + '" onclick="selectCoDay(' + o.off + ')">' + o.label + '</div>';
    }).join('');
}
function selectCoDay(off) {
    window._checkout.dayOffset = off;
    renderCoDays();
    // обновить time в _checkout с учётом дня
    syncCheckoutTime();
}
function syncCheckoutTime() {
    const hEl = document.querySelector('#tp-hours .tp-item.active');
    const mEl = document.querySelector('#tp-mins .tp-item.active');
    const h = hEl ? hEl.dataset.v : '15';
    const m = mEl ? mEl.dataset.v : '00';
    const off = window._checkout.dayOffset || 0;
    const d = new Date();
    d.setDate(d.getDate() + off);
    const ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    window._checkout.time = ymd + ' ' + h + ':' + m;
}

function checkoutPickTime(t) {
    window._checkout.time = t;
    renderCheckoutStep();
}
function checkoutPickPayment(key) {
    window._checkout.payment = key;
    renderCheckoutStep();
}
function checkoutNext() {
    const c = window._checkout;
    if (c.step === 1 && !c.point) { showToast('Выберите точку'); return; }
    if (c.step === 2 && isDelivery()) {
        const addr = (document.getElementById('co-addr')?.value || '').trim();
        c.address = addr;
        if (!addr) { showToast('Введите адрес доставки'); return; }
    }
    if (c.step === 2) {
        syncCheckoutTime();
    }
    c.step++;
    renderCheckoutStep();
}
function checkoutPrev() {
    if (window._checkout.step > 1) { window._checkout.step--; renderCheckoutStep(); }
}

async function checkoutApplyPromo() {
    const code = document.getElementById('co-promo-input').value.trim();
    if (!code) return showToast('Введите код');
    const res = await fetch(API+'/api/promo/apply', {method:'POST', headers:headers(), body:JSON.stringify({code})});
    if (!res.ok) return showToast('Промокод не найден');
    const d = await res.json();
    window._checkout.discount = d.discount || 0;
    window._checkout.discountCat = d.applies_to || 'all';
    window._checkout.promoId = d.id || 0;
    const catLabel = (PROMO_CATS.find(c => c.key === window._checkout.discountCat) || PROMO_CATS[0]);
    showToast('Скидка -' + d.discount + '% · ' + catLabel.emoji + ' ' + catLabel.label);
    updateCheckoutTotal();
}

async function updateCheckoutTotal() {
    const el = document.getElementById('co-total');
    if (!el) return;
    const res = await fetch(API+'/api/cart', {headers:headers()});
    const items = await res.json();
    const disc = window._checkout.discount || 0;
    const discCat = window._checkout.discountCat || 'all';
    const total = items.reduce((s,i)=>s+i.price*i.quantity,0);
    // скидка только на товары нужной категории
    const eligible = items.filter(i => discCat === 'all' || i.category === discCat);
    const eligibleSum = eligible.reduce((s,i)=>s+i.price*i.quantity,0);
    const discounted = disc > 0 ? Math.round(eligibleSum * (100 - disc) / 100) : eligibleSum;
    const final = Math.round(total - eligibleSum + discounted);
    const catLabel = (PROMO_CATS.find(c => c.key === discCat) || PROMO_CATS[0]);
    el.innerHTML = (disc > 0
        ? '<div class="co-total-row"><span>Товары</span><span>' + total + ' BYN</span></div><div class="co-total-row co-total-disc"><span>Скидка ' + disc + '% · ' + catLabel.emoji + '</span><span>-' + (eligibleSum - discounted) + ' BYN</span></div>'
        : '') +
        '<div class="co-total-row co-total-final"><span>Итого</span><span>' + final + ' BYN</span></div>';
}

async function checkoutSubmit() {
    const c = window._checkout;
    if (!c.payment) { showToast('Выберите способ оплаты'); return; }
    let point = c.point;
    if (isDelivery()) {
        const addr = (c.address || (document.getElementById('co-addr')?.value || '')).trim();
        if (!addr) { showToast('Введите адрес доставки'); return; }
        point = '🚚 Доставка · ' + addr;
    }
    await doCheckout(point, c.time, c.payment, c.discount || 0, c.discountCat || 'all');
}

function initTimePicker() {
    const colH = document.getElementById('tp-hours');
    const colM = document.getElementById('tp-mins');
    if (!colH || !colM) return;
    const ITEM_H = 44;
    const centerOffset = (col) => col.clientHeight / 2 - ITEM_H / 2;
    const alignActive = (col) => {
        const active = col.querySelector('.tp-item.active');
        if (active) col.scrollTop = active.offsetTop - centerOffset(col);
    };
    const setTime = () => {
        const hEl = document.querySelector('#tp-hours .tp-item.active');
        const mEl = document.querySelector('#tp-mins .tp-item.active');
        const h = hEl ? hEl.dataset.v : '00';
        const m = mEl ? mEl.dataset.v : '00';
        window._checkout._hh = h;
        window._checkout._mm = m;
        syncCheckoutTime();
    };
    const bind = (col) => {
        let t;
        col.addEventListener('scroll', () => {
            clearTimeout(t);
            t = setTimeout(() => {
                const items = col.querySelectorAll('.tp-item');
                const mid = col.scrollTop + centerOffset(col) + ITEM_H / 2;
                let best = items[0], bestDist = Infinity;
                for (let i = 0; i < items.length; i++) {
                    const it = items[i];
                    const center = it.offsetTop + ITEM_H / 2;
                    const d = Math.abs(center - mid);
                    if (d < bestDist) { bestDist = d; best = it; }
                }
                for (let i = 0; i < items.length; i++) items[i].classList.remove('active');
                best.classList.add('active');
                col.scrollTop = best.offsetTop - centerOffset(col);
                setTime();
            }, 60);
        });
    };
    alignActive(colH);
    alignActive(colM);
    setTime();
    bind(colH);
    bind(colM);
}

function initRipple() {
    if (window._rippleBound) return;
    window._rippleBound = true;
    document.addEventListener('pointerdown', function(e) {
        const btn = e.target.closest('button, .btn-buy, .btn-checkout, .co-card, .co-time, .co-btn, .status-btn, .qty-btn, .cart-card-del, .ap-btn, .pickup-card');
        if (!btn) return;
        if (btn.disabled) return;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 1.4;
        const ink = document.createElement('span');
        ink.className = 'ripple-ink';
        ink.style.width = size + 'px';
        ink.style.height = size + 'px';
        ink.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ink.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ink);
        setTimeout(() => { if (ink.parentNode) ink.parentNode.removeChild(ink); }, 650);
    }, { passive: true });
}


setTimeout(initRipple, 200);

// ============ GROUP CHAT (админка) ============
function goToGroup() { currentTab = 'group'; render(); }

async function renderGroup() {
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Группа</div></div><button class="admin-export-btn" onclick="loadGroupMessages()">🔄</button></div><div id="group-chat-list">' + skeletonList(5) + '</div>';
    await loadGroupMessages();
    // Автообновление каждые 15 сек
    if (window._groupTimer) clearInterval(window._groupTimer);
    window._groupTimer = setInterval(() => {
        if (currentTab !== 'group') { clearInterval(window._groupTimer); window._groupTimer = null; return; }
        loadGroupMessages(true);
    }, 30000);
}

async function loadGroupMessages(silent) {
    const box = document.getElementById('group-chat-list');
    if (!box) return;
    if (!silent) box.innerHTML = skeletonList(5);
    // 1) Находим chat_id
    const chatsRes = await fetch(API + '/api/admin/group/chats', {headers: headers()});
    if (!chatsRes.ok) { box.innerHTML = '<div class="empty">Ошибка загрузки чатов</div>'; return; }
    const chats = await chatsRes.json();
    if (!chats || chats.length === 0) {
        box.innerHTML = '<div class="empty" style="padding:40px 20px;text-align:center">' +
            '<div style="font-size:56px;margin-bottom:12px">💬</div>' +
            '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Группа не подключена</div>' +
            '<div style="font-size:13px;color:var(--muted);line-height:1.5">Добавь бота в группу и сделай его админом — сюда начнут приходить сообщения</div>' +
        '</div>';
        return;
    }
    const chatId = chats[0].chat_id;
    window._groupChatId = chatId;

    // 2) Тянем сообщения
    const msgRes = await fetch(API + '/api/admin/group/messages?chat_id=' + chatId + '&limit=50', {headers: headers()});
    if (!msgRes.ok) { box.innerHTML = '<div class="empty">Ошибка загрузки</div>'; return; }
    const msgs = await msgRes.json();
    if (!msgs || msgs.length === 0) {
        box.innerHTML = '<div class="empty">Пока сообщений нет</div>';
        return;
    }
    // msgs приходят DESC — развернём, чтобы новые были снизу
    msgs.reverse();
    // Запоминаем последнего автора для кнопки 🧹
    if (msgs.length > 0) {
        window._groupLastUserId = msgs[msgs.length - 1].user_id;
        window._groupLastName = msgs[msgs.length - 1].user_name || 'юзер';
    } else {
        window._groupLastUserId = 0;
        window._groupLastName = '';
    }
    // Замученные
    let mutedMap = {};
    try {
        const mutRes = await fetch(API + '/api/admin/group/muted?chat_id=' + chatId, {headers: headers()});
        if (mutRes.ok) {
            const md = await mutRes.json();
            mutedMap = md.muted || {};
        }
    } catch(e) {}
    box.innerHTML = '<div class="group-list">' + msgs.map(m => {
        const initial = (m.user_name || 'U')[0].toUpperCase();
        const uname = m.username ? ' <span style="color:var(--muted);font-weight:400">@' + m.username + '</span>' : '';
        const date = (m.created_at || '').split(' ')[1]?.slice(0,5) || '';
        const canDel = m.message_id > 0;
        return '<div class="group-msg">' +
            '<div class="group-msg-avatar">' + initial + '</div>' +
            '<div class="group-msg-body">' +
                '<div class="group-msg-head"><b>' + m.user_name + '</b>' + uname + ' <span class="group-msg-time">' + date + '</span>' + (mutedMap[m.user_id] ? ' <span class="group-badge-muted">🔇 В муте</span>' : '') + '</div>' +
                '<div class="group-msg-text">' + (m.text || '').replace(/</g, '&lt;') + '</div>' +
                '<div class="group-msg-actions">' +
                    (mutedMap[m.user_id] ? '<button class="group-btn group-btn-unmute" onclick="doUnmute(' + m.user_id + ')">✅ Размутить</button>' : '<button class="group-btn group-btn-mute" onclick="openMuteSheet(' + m.user_id + ',\'' + (m.user_name || '').replace(/'/g, "\\'") + '\')">🔇 Мут</button>') +
                    '<button class="group-btn group-btn-purge" onclick="purgeFromUser(' + m.user_id + ',\'' + (m.user_name || '').replace(/'/g, "\\'") + '\')">🧹</button>' +
                    (canDel ? '<button class="group-btn group-btn-del" onclick="deleteGroupMsg(' + m.id + ',' + m.message_id + ')">🗑</button>' : '') +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('') + '</div>';
}

function openMuteSheet(userId, userName) {
    const modal = document.createElement('div');
    modal.className = 'pickup-modal';
    modal.innerHTML = '<div class="pickup-sheet">' +
        '<div class="pickup-handle"></div>' +
        '<div class="pickup-header"><div class="pickup-header-title">🔇 Мут</div><div class="pickup-header-sub">' + userName + '</div></div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:0 4px 12px">' +
            '<button class="status-btn" onclick="doMute(' + userId + ',5)">5 минут</button>' +
            '<button class="status-btn" onclick="doMute(' + userId + ',30)">30 минут</button>' +
            '<button class="status-btn" onclick="doMute(' + userId + ',60)">1 час</button>' +
            '<button class="status-btn" style="background:linear-gradient(135deg,#4ea1ff,#6366f1);color:#fff;border-color:#4ea1ff" onclick="doMute(' + userId + ',1440)">1 день</button>' +
            '<button class="status-btn" onclick="doMute(' + userId + ',10080)">1 неделя</button>' +
            '<button class="status-btn" style="background:#fee;color:#c33;border-color:#fcc" onclick="doMute(' + userId + ',99999999)">🚫 Навсегда</button>' +
        '</div>' +
        '<button class="pickup-close pickup-choose-btn" onclick="this.closest(\'.pickup-modal\').remove()">Отмена</button>' +
    '</div>';
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    document.body.appendChild(modal);
}

async function doUnmute(userId) {
    const chatId = window._groupChatId || 0;
    if (!chatId) return showToast('Нет группы');
    const res = await fetch(API + '/api/admin/group/unmute', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({chat_id: chatId, user_id: userId})
    });
    if (!res.ok) { showToast('Ошибка размута'); return; }
    const d = await res.json();
    showToast(d.ok ? '✅ Размучен' : '❌ Не получилось');
    setTimeout(() => loadGroupMessages(true), 500);
}

async function doMute(userId, minutes) {
    const chatId = window._groupChatId || 0;
    if (!chatId) return showToast('Нет группы');
    const mod = document.querySelector('.pickup-modal');
    if (mod) mod.remove();
    const res = await fetch(API + '/api/admin/group/mute', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({chat_id: chatId, user_id: userId, minutes: minutes})
    });
    if (!res.ok) { showToast('Ошибка мута'); return; }
    const d = await res.json();
    showToast(d.ok ? '✅ Замучен' : '❌ Не получилось (проверь права бота)');
}



async function purgeFromUser(userId, userName) {
    const chatId = window._groupChatId || 0;
    if (!chatId || !userId) { showToast('Нет юзера'); return; }
    askConfirm('Стереть ВСЕ сообщения от ' + userName + ' в группе?', async () => {
        showToast('Удаляю...');
        const res = await fetch(API + '/api/admin/group/purge_user', {
            method: 'POST', headers: headers(),
            body: JSON.stringify({chat_id: chatId, user_id: userId})
        });
        if (!res.ok) { showToast('Ошибка'); return; }
        const d = await res.json();
        showToast('Удалено ' + (d.deleted || 0) + ' из ' + (d.total || 0));
        setTimeout(() => loadGroupMessages(true), 800);
    }, 'Удалить всё');
}

async function deleteGroupMsg(gmId, messageId) {
    askConfirm('Удалить сообщение из группы?', async () => {
        const chatId = window._groupChatId || 0;
        const res = await fetch(API + '/api/admin/group/delete', {
            method: 'POST', headers: headers(),
            body: JSON.stringify({chat_id: chatId, message_id: messageId})
        });
        if (!res.ok) { showToast('Ошибка'); return; }
        const d = await res.json();
        if (!d.ok) { showToast('Не получилось'); return; }
        showToast('Удалено');
        loadGroupMessages();
    }, 'Удалить');
}



async function renderProductScreen() {
    const [prodRes, allRes, favRes] = await Promise.all([
        fetch(API + '/api/product/' + currentProductId, { headers: headers() }),
        fetch(API + '/api/products?category=all', { headers: headers() }),
        fetch(API + '/api/favorites', { headers: headers() })
    ]);
    if (!prodRes.ok) { showToast('Товар не найден'); return; }
    const p = await prodRes.json();
    const all = await allRes.json();
    const favs = await favRes.json();
    const isFav = favs.some(f => f.id === p.id);
    const similar = all.filter(x => x.category === p.category && x.id !== p.id).slice(0, 6);
    const strengths = (p.strengths || '').split(',').map(s => s.trim()).filter(Boolean);
    const flavors = _pfItems(p.flavors).map(function(x){return x.name});
    const flavorStocks = parseFlavorStocks(p.flavor_stocks);
    window._currentFlavor = flavors.find(f => getFlavorStock(flavorStocks, f) > 0) || flavors[0] || '';
    window._currentStrength = strengths[0] || '';
    var _vols = (p.volumes || '').split(',').map(s => s.trim()).filter(Boolean);
    window._currentVolume = (p.category === 'accessory' && _vols.length > 0) ? _vols[0] : '';
    content.innerHTML = productScreenHTML(p, similar, isFav, strengths, flavors);
    const el = document.querySelector('.ps-content');
    if (el) el.classList.add('content-enter');
}



function getCatalogBanner() {
    const hiddenUntil = parseInt(localStorage.getItem('_bannerHiddenUntil') || '0');
    if (Date.now() < hiddenUntil) return '';
    return '<div class="catalog-banner" id="catalog-banner">' +
        '<div class="catalog-banner-icon">⏳</div>' +
        '<div class="catalog-banner-body">' +
            '<div class="catalog-banner-title">Ассортимент ещё заполняется</div>' +
            '<div class="catalog-banner-sub">Скоро будет больше товаров. Спасибо за понимание!</div>' +
        '</div>' +
        '<button class="catalog-banner-close" onclick="hideCatalogBanner(event)">✕</button>' +
    '</div>';
}
function hideCatalogBanner(e) {
    if (e) e.stopPropagation();
    // скрыть на 24 часа
    localStorage.setItem('_bannerHiddenUntil', String(Date.now() + 24*60*60*1000));
    const el = document.getElementById('catalog-banner');
    if (el) el.remove();
}

function humanizeDelivery(dt, createdAt) {
    if (!dt) return '';
    // dt может быть "HH:MM" или "YYYY-MM-DD HH:MM"
    let date, time;
    if (/^\d{4}-\d{2}-\d{2}/.test(dt)) {
        date = dt.slice(0, 10); time = dt.slice(11, 16);
    } else if (/^\d{1,2}:\d{2}$/.test(dt)) {
        time = dt.padStart(5, '0');
        const base = createdAt ? new Date(createdAt.replace(' ', 'T') + 'Z') : new Date();
        date = base.toISOString().slice(0, 10);
    } else {
        return dt;
    }
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(date + 'T00:00:00');
    const diff = Math.round((d - today) / 86400000);
    let dayLabel;
    if (diff === 0) dayLabel = 'Сегодня';
    else if (diff === 1) dayLabel = 'Завтра';
    else if (diff === 2) dayLabel = 'Послезавтра';
    else dayLabel = date.slice(8,10) + '.' + date.slice(5,7) + '.' + date.slice(0,4);
    return dayLabel + ' ' + time;
}

function parseFlavorStocks(str) {
    const map = {};
    (str || '').replace(/;/g, ',').split(',').forEach(pair => {
        const i = pair.lastIndexOf(':');
        if (i > 0) {
            const k = pair.slice(0, i).trim();
            const v = parseInt(pair.slice(i+1).trim());
            if (k && !isNaN(v)) map[k] = v;
        }
    });
    return map;
}
function getFlavorStock(map, flavor) {
    return (flavor in map) ? map[flavor] : Infinity;
}
function isNewProduct(p) {
    if (!p.created_at) return false;
    // формат: "YYYY-MM-DD HH:MM:SS"
    const t = Date.parse((p.created_at || '').replace(' ', 'T') + 'Z');
    if (isNaN(t)) return false;
    const days = (Date.now() - t) / 86400000;
    return days >= 0 && days <= 14;
}
function productScreenHTML_OLD(p, similar, isFav, strengths, flavors) {
    const catMap = { all:'🛍', liquid:'💧', accessory:'🔧', snus:'🍬', vape:'💨', other:'📦' };
    const catLabel = { all:'Все', liquid:'Жидкости', accessory:'Расходники', snus:'Снюс', vape:'Вейп', other:'Другое' };
    const catEmoji = catMap[p.category] || '🛍';
    const op = parseFloat(p.old_price || 0) || 0;
    const hasDisc = op > p.price;
    const discPct = hasDisc ? Math.round((1 - p.price / op) * 100) : 0;
    const fsMap = parseFlavorStocks(p.flavor_stocks);
    const fsStock = (window._currentFlavor && (window._currentFlavor in fsMap)) ? fsMap[window._currentFlavor] : Infinity;
    const effQty = (fsStock !== Infinity) ? fsStock : p.quantity;
    const stockClass = effQty <= 0 ? 'ps-stock-out' : (effQty <= 3 ? 'ps-stock-low' : 'ps-stock-ok');
    const stockText = effQty <= 0 ? '✕ Нет в наличии' : (effQty <= 3 ? '⏳ Осталось ' + effQty + ' шт.' : '✔ В наличии ' + effQty + ' шт.');
    const img = p.photo_id
        ? '<img src="' + p.photo_id + '" class="ps-photo-img" alt="">'
        : '<div class="ps-photo-empty">📦</div>';
    let html =
    '<div class="ps-wrap">' +
        '<div class="ps-topbar">' +
            '<button class="ps-back" onclick="currentTab=\'catalog\';render();">←</button>' +
            '<div class="ps-topbar-actions">' +
                '<button class="ps-icon-btn" onclick="shareProduct(' + p.id + ')">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
                '</button>' +
                '<button class="ps-icon-btn ps-fav' + (isFav ? ' active' : '') + '" id="ps-fav-btn" onclick="toggleProductFav(' + p.id + ')">' +
                    '<svg width="20" height="20" viewBox="0 0 24 24" fill="' + (isFav ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
                '</button>' +
            '</div>' +
        '</div>' +
        '<div class="ps-photo"><div class="ps-photo-inner">' + img + '</div></div>' +
        '<div class="ps-badges">' +
            '<span class="ps-badge ps-badge-cat">' + catEmoji + ' ' + catLabel[p.category] + '</span>' +
            (isNewProduct(p) ? '<span class="ps-badge ps-badge-new">🆕 Новинка</span>' : '') +
            (p.tag ? '<span class="ps-badge ps-badge-hit">🔥 ' + p.tag + '</span>' : '') +
            (hasDisc ? '<span class="ps-badge ps-badge-disc">-' + discPct + '%</span>' : '') +
        '</div>' +
        '<h1 class="ps-name">' + p.name + '</h1>' +
        '<div class="ps-price-row">' +
            '<div class="ps-price">' + p.price + ' <span>BYN</span></div>' +
            (hasDisc ? '<div class="ps-price-old">' + op + ' BYN</div>' : '') +
        '</div>' +
        '<div class="ps-stock ' + stockClass + '">' + stockText + '</div>';
    const _psIsAcc = p.category === 'accessory';
    const _psVolumes = (p.volumes || '').split(',').map(s => s.trim()).filter(Boolean);
    if (_psIsAcc && _psVolumes.length > 0) {
        html += '<div class="ps-section">' +
            '<div class="ps-section-title">Объём</div>' +
            '<div class="ps-chips">' +
                _psVolumes.map((v, i) => '<button class="ps-chip' + (i === 0 ? ' active' : '') + '" data-v="' + v + '" onclick="selectVolume(this)">' + v + '</button>').join('') +
            '</div>' +
        '</div>';
    }
    if (strengths.length > 0) {
        html += '<div class="ps-section">' +
            '<div class="ps-section-title">' + (_psIsAcc ? 'Сопротивление' : 'Крепость') + '</div>' +
            '<div class="ps-chips">' +
                strengths.map((s, i) => '<button class="ps-chip' + (i === 0 ? ' active' : '') + '" data-s="' + s + '" onclick="selectStrength(this)">' + s + (_psIsAcc ? ' Ом' : ' мг') + '</button>').join('') +
            '</div>' +
        '</div>';
    }
    if (flavors.length > 0) {
        html += '<div class="ps-section">' +
            '<div class="ps-section-head"><div class="ps-section-title">Вкусы</div><div class="ps-section-link" onclick="showAllFlavors()">Все →</div></div>' +
            '<div class="ps-flavors">' +
                flavors.slice(0, 6).map((f, i) => {
                    const fsMap = parseFlavorStocks(p.flavor_stocks);
                    const stock = getFlavorStock(fsMap, f);
                    const disabled = stock <= 0;
                    const active = f === window._currentFlavor && !disabled;
                    const cls = 'ps-flavor' + (active ? ' active' : '') + (disabled ? ' disabled' : '');
                    const oc = disabled ? '' : ' onclick="selectFlavor(this.dataset.f)"';
                    const stockLabel = (stock !== Infinity) ? '<div style="font-size:11px;color:' + (disabled ? '#e74c3c' : (stock <= 3 ? '#f39c12' : 'var(--muted)')) + ';margin-top:2px">' + (disabled ? '✕ нет' : '✔ ' + stock + ' шт.') + '</div>' : '';
                    return '<div class="' + cls + '" data-f="' + f + '"' + oc + '>' +
                        '<div class="ps-flavor-img">' + (p.photo_id ? '<img src="' + p.photo_id + '">' : '📦') + '</div>' +
                        (active ? '<div class="ps-flavor-check">✓</div>' : '') +
                        '<div class="ps-flavor-name">' + f + '</div>' +
                        stockLabel +
                    '</div>';
                }).join('') +
            '</div>' +
        '</div>';
    }
    if (p.description) {
        html += '<div class="ps-section">' +
            '<div class="ps-section-title">Описание</div>' +
            '<div class="ps-desc">📝 ' + p.description + '</div>' +
        '</div>';
    }
    const _fsMap2 = parseFlavorStocks(p.flavor_stocks);
    const _fsStock2 = (window._currentFlavor && (window._currentFlavor in _fsMap2)) ? _fsMap2[window._currentFlavor] : Infinity;
    const _effQty2 = (_fsStock2 !== Infinity) ? _fsStock2 : p.quantity;
    html += '<div class="ps-buy-row">' +
        (_effQty2 > 0
            ? '<button class="ps-buy" id="ps-buy-btn" onclick="tryAddToCart(' + p.id + ')">🛒 В корзину · ' + p.price + ' BYN</button>'
            : '<button class="ps-buy ps-buy-disabled" id="ps-buy-btn" disabled>Нет в наличии</button>') +
    '</div>';
    if (similar.length > 0) {
        html += '<div class="ps-section ps-sim-block">' +
            '<div class="ps-section-title">Похожие</div>' +
            '<div class="ps-similar">' +
                similar.map(s => '<div class="ps-sim-card" onclick="openProduct(' + s.id + ')">' +
                    '<div class="ps-sim-img">' + (s.photo_id ? '<img src="' + s.photo_id + '">' : '📦') + '</div>' +
                    '<div class="ps-sim-name">' + s.name + '</div>' +
                    '<div class="ps-sim-price">' + s.price + ' BYN</div>' +
                '</div>').join('') +
            '</div>' +
        '</div>';
    }
    html += '</div>';
    return html;
}

function shareProduct(pid) {
    const url = 'https://mogvape.vip/?product=' + pid;
    if (window.Telegram && window.Telegram.WebApp) {
        const share = 'https://t.me/share/url?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent('Смотри что нашёл в MOGVAPE');
        window.Telegram.WebApp.openTelegramLink(share);
    } else {
        navigator.clipboard?.writeText(url);
        showToast('Ссылка скопирована');
    }
}

async function toggleProductFav(pid) {
    haptic('light');
    const btn = document.getElementById('ps-fav-btn');
    const isFav = btn.classList.contains('active');
    const method = isFav ? 'DELETE' : 'POST';
    const url = isFav ? (API + '/api/favorites/' + pid) : (API + '/api/favorites/add/' + pid);
    await fetch(url, { method, headers: headers() });
    btn.classList.toggle('active', !isFav);
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', !isFav ? 'currentColor' : 'none');
    showToast(!isFav ? 'В избранном' : 'Убрано из избранного');
}

async function renderStats() {
    window._statsDays = window._statsDays || 7;
    const days = window._statsDays;
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Дашборд</div></div></div><div class="empty">Загрузка...</div>';
    const res = await fetch(API + '/api/admin/stats/extended?days=' + days, { headers: headers() });
    if (!res.ok) { content.innerHTML = '<div class="empty">Ошибка загрузки</div>'; return; }
    const s = await res.json();
    const t = s.today || {count:0, sum:0};
    const y = s.yesterday || {count:0, sum:0};
    const p = s.period || {count:0, sum:0, avg:0};
    const a = s.all_time || {count:0, sum:0, avg:0};
    const bd = s.by_day || [];
    const cats = s.by_category || [];
    // дельта к вчера
    const deltaSum = y.sum > 0 ? Math.round((t.sum - y.sum) / y.sum * 100) : (t.sum > 0 ? 100 : 0);
    const deltaCls = deltaSum > 0 ? 'up' : (deltaSum < 0 ? 'down' : 'flat');
    const deltaArrow = deltaSum > 0 ? '↗' : (deltaSum < 0 ? '↘' : '→');
    const deltaText = (deltaSum > 0 ? '+' : '') + deltaSum + '%';
    // график
    const maxDaySum = Math.max(1, ...bd.map(x => x.s));
    const weekdays = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
    const chartBars = bd.length
        ? bd.map(x => {
            const dt = new Date(x.d);
            const day = days <= 7 ? weekdays[dt.getDay()] : dt.getDate() + '.' + (dt.getMonth()+1);
            const h = Math.max(8, Math.round((x.s / maxDaySum) * 100));
            const isMax = x.s === maxDaySum;
            return '<div class="dash-bar-wrap"><div class="dash-bar-val">' + x.s + '</div><div class="dash-bar' + (isMax ? ' dash-bar-max' : '') + '" style="height:' + h + '%"></div><div class="dash-bar-day">' + day + '</div></div>';
        }).join('')
        : '<div class="st-empty">Нет данных</div>';
    // круговая диаграмма по категориям (SVG)
    const CAT_META2 = { all:'📦 Другое', liquid:'💧 Жидкости', accessory:'🔧 Расходники', snus:'🍬 Снюс', vape:'💨 Вейп', other:'📦 Другое' };
    const CAT_COLOR = { liquid:'#4ea1ff', snus:'#f59e0b', vape:'#6366f1', accessory:'#10b981', other:'#a855f7', all:'#94a3b8' };
    const totalCatSum = cats.reduce((acc, x) => acc + x.sum, 0) || 1;
    let pieHtml = '';
    if (cats.length > 0) {
        let acc = 0;
        const R = 60, C = 70, CIRC = 2 * Math.PI * R;
        pieHtml = '<svg width="140" height="140" viewBox="0 0 140 140" class="dash-pie-svg">';
        cats.forEach(c => {
            const frac = c.sum / totalCatSum;
            const dash = frac * CIRC;
            const off = acc * CIRC;
            const color = CAT_COLOR[c.category] || '#94a3b8';
            pieHtml += '<circle cx="' + C + '" cy="' + C + '" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="18" stroke-dasharray="' + dash + ' ' + (CIRC - dash) + '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 ' + C + ' ' + C + ')"/>';
            acc += frac;
        });
        pieHtml += '<text x="70" y="66" text-anchor="middle" font-size="11" fill="var(--muted)" font-weight="600">ИТОГО</text>';
        pieHtml += '<text x="70" y="86" text-anchor="middle" font-size="16" fill="var(--text)" font-weight="700">' + Math.round(totalCatSum) + '</text>';
        pieHtml += '</svg>';
    }
    const pieLegend = cats.map(c => {
        const frac = Math.round(c.sum / totalCatSum * 100);
        const color = CAT_COLOR[c.category] || '#94a3b8';
        return '<div class="dash-leg"><span class="dash-leg-dot" style="background:' + color + '"></span><span class="dash-leg-name">' + (CAT_META2[c.category] || c.category) + '</span><span class="dash-leg-pct">' + frac + '% · ' + Math.round(c.sum) + ' BYN</span></div>';
    }).join('');
    // топ товаров
    const medals = ['🥇','🥈','🥉'];
    const topHtml = (s.top || []).length
        ? s.top.map((p2, i) => {
            const img = p2.photo_id ? '<img src="' + p2.photo_id + '" class="dash-top-photo">' : '<div class="dash-top-photo dash-top-photo-empty">📦</div>';
            const medal = i < 3 ? '<div class="dash-medal">' + medals[i] + '</div>' : '<div class="dash-medal dash-medal-num">' + (i+1) + '</div>';
            return '<div class="dash-top-item">' + medal + img + '<div class="dash-top-info"><div class="dash-top-name">' + p2.name + '</div><div class="dash-top-sub">' + p2.cnt + ' заказов · ' + p2.qty + ' шт · ' + Math.round(p2.sum) + ' BYN</div></div></div>';
        }).join('')
        : '<div class="st-empty">Нет продаж</div>';
    // топ покупателей
    const buyersHtml = (s.top_buyers || []).length
        ? s.top_buyers.map((b, i) => {
            const initial = (b.full_name || b.username || 'U')[0].toUpperCase();
            const name = b.full_name || (b.username ? '@' + b.username : 'ID ' + b.id);
            return '<div class="dash-buyer"><div class="dash-avatar">' + initial + '</div><div class="dash-buyer-info"><div class="dash-buyer-name">' + name + '</div><div class="dash-buyer-sub">' + b.cnt + ' заказов · ' + Math.round(b.sum) + ' BYN</div></div><div class="dash-buyer-rank">#' + (i+1) + '</div></div>';
        }).join('')
        : '<div class="st-empty">Нет покупок</div>';
    // период-переключатель
    const periodBtn = (n) => '<button class="dash-period-btn' + (days === n ? ' active' : '') + '" onclick="window._statsDays=' + n + ';renderStats()">' + n + ' дн</button>';
    content.innerHTML =
    '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Дашборд</div></div></div>' +
    '<div class="dash-period-row">' + periodBtn(7) + periodBtn(30) + periodBtn(90) + '</div>' +
    '<div class="dash-hero">' +
        '<div class="dash-hero-label">Сегодня</div>' +
        '<div class="dash-hero-sum">' + t.sum + ' <span>BYN</span></div>' +
        '<div class="dash-hero-delta dash-' + deltaCls + '">' + deltaArrow + ' ' + deltaText + ' ко вчера</div>' +
        '<div class="dash-hero-cnt">' + t.count + ' заказов сегодня · ' + y.count + ' вчера</div>' +
    '</div>' +
    '<div class="dash-kpi">' +
        '<div class="dash-kpi-card"><div class="dash-kpi-val">' + p.count + '</div><div class="dash-kpi-lbl">заказов</div></div>' +
        '<div class="dash-kpi-card"><div class="dash-kpi-val">' + p.sum + '</div><div class="dash-kpi-lbl">выручка</div></div>' +
        '<div class="dash-kpi-card"><div class="dash-kpi-val">' + p.avg + '</div><div class="dash-kpi-lbl">средний чек</div></div>' +
        '<div class="dash-kpi-card"><div class="dash-kpi-val">' + (s.unique_buyers || 0) + '</div><div class="dash-kpi-lbl">покупателей</div></div>' +
    '</div>' +
    '<div class="dash-new-users">🆕 Новых клиентов за период: <b>' + (s.new_users || 0) + '</b></div>' +
    '<div class="dash-section">' +
        '<div class="dash-section-title">📈 Выручка за ' + days + ' дн</div>' +
        '<div class="dash-chart">' + chartBars + '</div>' +
    '</div>' +
    (cats.length > 0 ? '<div class="dash-section">' +
        '<div class="dash-section-title">🍩 По категориям</div>' +
        '<div class="dash-pie-row"><div class="dash-pie">' + pieHtml + '</div><div class="dash-legs">' + pieLegend + '</div></div>' +
    '</div>' : '') +
    '<div class="dash-section">' +
        '<div class="dash-section-title">🏆 Топ-5 товаров</div>' +
        '<div class="dash-top">' + topHtml + '</div>' +
    '</div>' +
    '<div class="dash-section">' +
        '<div class="dash-section-title">👥 Топ покупателей за ' + days + ' дн</div>' +
        '<div class="dash-buyers">' + buyersHtml + '</div>' +
    '</div>' +
    '<div class="dash-section">' +
        '<div class="dash-alltime">Всего за всё время: <b>' + a.count + '</b> заказов · <b>' + a.sum + ' BYN</b> · средний чек <b>' + a.avg + ' BYN</b></div>' +
    '</div>';
}


async function renderMyOrders() {
    content.innerHTML = '<div class="admin-topbar"><button class="admin-back" onclick="currentTab=\'profile\';render();">←</button><div class="admin-title-wrap"><div class="admin-title">Мои заказы</div></div></div><div id="my-orders">' + skeletonList(4) + '</div>';
    const res = await fetch(API + '/api/my-orders', { headers: headers() });
    const orders = await res.json();
    const box = document.getElementById('my-orders');
    if (!orders.length) { box.innerHTML = '<div class="empty">Заказов нет</div>'; return; }
    const STATUS = {
        new:        { label: 'Новый',     cls: 'mo-new' },
        processing: { label: 'Собираем',  cls: 'mo-processing' },
        ready:      { label: 'Готов',     cls: 'mo-ready' },
        delivered:  { label: 'Доставлен', cls: 'mo-delivered' },
        cancelled:  { label: 'Отменён',   cls: 'mo-cancelled' }
    };
    const PAY = { cash: '💵 Наличные', card: '💳 Картой' };
    box.innerHTML = '<div class="mo-list">' + orders.map(o => {
        const st = STATUS[o.status] || { label: o.status, cls: 'mo-new' };
        const date = o.created_at ? o.created_at.split(' ')[0] : '';
        const time = o.created_at ? o.created_at.split(' ')[1]?.slice(0,5) : '';
        // Все позиции
        let itemsHtml = '';
        if (o.items && o.items.length > 0) {
            itemsHtml = o.items.map(it => {
                const _mparts = [];
                if (it.flavor) _mparts.push(it.flavor);
                if (it.strength) _mparts.push(it.strength + ' мг');
                if (it.volume) _mparts.push(it.volume);
                const extra = _mparts.length > 0
                    ? '<div class="mo-extra">' + _mparts.join(' · ') + '</div>'
                    : '';
                const lineTotal = Math.round(it.quantity * it.price * 100) / 100;
                return '<div class="mo-item">' +
                    '<div class="mo-item-name">' + (it.product_name || '?') + '</div>' +
                    extra +
                    '<div class="mo-item-qty">' + it.quantity + ' × ' + it.price + ' = <b>' + lineTotal + ' BYN</b></div>' +
                '</div>';
            }).join('');
        } else {
            // fallback для старых заказов
            const extra = (o.flavor || o.strength)
                ? '<div class="mo-extra">' + (o.flavor || '') + (o.flavor && o.strength ? ' · ' : '') + (o.strength ? o.strength + ' мг' : '') + '</div>'
                : '';
            itemsHtml = '<div class="mo-item"><div class="mo-item-name">' + (o.product_name || '?') + '</div>' + extra + '<div class="mo-item-qty">' + o.quantity + ' × ' + (o.total_price / o.quantity).toFixed(2) + ' = <b>' + o.total_price + ' BYN</b></div></div>';
        }
        const pointLine = o.pickup_point ? '<div class="mo-meta-item">📍 ' + o.pickup_point + '</div>' : '';
        const timeLine = o.delivery_time ? '<div class="mo-meta-item">🕐 ' + o.delivery_time + '</div>' : '';
        const payLine = o.payment_method ? '<div class="mo-meta-item">' + (PAY[o.payment_method] || o.payment_method) + '</div>' : '';
        const meta = (pointLine || timeLine || payLine)
            ? '<div class="mo-meta">' + pointLine + timeLine + payLine + '</div>'
            : '';
        return '<div class="mo-card">' +
            '<div class="mo-head">' +
                '<div class="mo-num">Заказ #' + o.id + '</div>' +
                '<div class="mo-status ' + st.cls + '">' + st.label + '</div>' +
            '</div>' +
            '<div class="mo-date">' + date + (time ? ', ' + time : '') + '</div>' +
            '<div class="mo-product">' + itemsHtml + '</div>' +
            '<div class="mo-total">Итого: <b>' + o.total_price + ' BYN</b></div>' +
            meta +
            ((o.status === 'new' || o.status === 'processing' || o.status === 'ready')
                ? '<div class="mo-actions">'
                    + '<button class="mo-act mo-act-move" data-oid="' + o.id + '" data-dt="' + (o.delivery_time || '') + '" onclick="openReschedule(this.dataset.oid, this.dataset.dt)">🕐 Перенести</button>'
                    + '<button class="mo-act mo-act-cancel" onclick="cancelOrder(' + o.id + ')">✕ Отменить</button>'
                  + '</div>'
                : '') +
            '<button class="mo-repeat" onclick="repeatOrder(' + o.id + ')">🔄 Заказать снова</button>' +
        '</div>';
    }).join('') + '</div>';
}


async function renderUsers() {
    content.innerHTML =
        '<div class="admin-topbar"><button class="admin-back" onclick="goToAdminRender()">←</button><div class="admin-title-wrap"><div class="admin-title">Пользователи</div></div></div>' +
        '<div class="us-search-wrap"><span class="us-search-icon">🔍</span><input class="us-search" id="us-search" placeholder="Имя, @username или ID" oninput="filterUsers()"></div>' +
        '<div class="us-filters">' +
            '<button class="us-filter active" data-f="all" onclick="setUsersFilter(this)">Все</button>' +
            '<button class="us-filter" data-f="buyers" onclick="setUsersFilter(this)">С заказами</button>' +
            '<button class="us-filter" data-f="blocked" onclick="setUsersFilter(this)">Заблокированные</button>' +
        '</div>' +
        '<div id="users-list">' + skeletonList(5) + '</div>';
    const res = await fetch(API + '/api/admin/users', { headers: headers() });
    if (!res.ok) { document.getElementById('users-list').innerHTML = 'Ошибка'; return; }
    window._usersAll = await res.json();
    window._usersFilter = 'all';
    window._usersQuery = '';
    renderUsersList();
}

function setUsersFilter(el) {
    document.querySelectorAll('.us-filter').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
    window._usersFilter = el.dataset.f;
    renderUsersList();
}

function filterUsers() {
    const el = document.getElementById('us-search');
    window._usersQuery = el ? el.value.toLowerCase().trim() : '';
    renderUsersList();
}

function renderUsersList() {
    const box = document.getElementById('users-list');
    if (!box) return;
    let list = window._usersAll || [];
    const q = window._usersQuery || '';
    const f = window._usersFilter || 'all';
    if (q) {
        list = list.filter(u =>
            ((u.full_name || '').toLowerCase().includes(q)) ||
            ((u.username || '').toLowerCase().includes(q)) ||
            String(u.id).includes(q)
        );
    }
    if (f === 'buyers') list = list.filter(u => u.orders_count > 0);
    if (f === 'blocked') list = list.filter(u => u.is_blocked);
    if (!list.length) { box.innerHTML = '<div class="us-empty">Никого не найдено</div>'; return; }
    box.innerHTML = '<div class="us-list">' + list.map(u => {
        const nameStr = u.full_name || u.username || 'U';
        const initial = (nameStr.match(/[A-Za-zА-Яа-яЁё0-9]/) || ['U'])[0].toUpperCase();
        const name = u.full_name || (u.username ? '@' + u.username : 'Без имени');
        const username = u.username ? ' <span class="us-username">@' + u.username + '</span>' : '';
        const phone = u.phone ? ' · 📱 ' + u.phone : '';
        const created = u.created_at ? u.created_at.split(' ')[0] : '';
        const blocked = u.is_blocked ? '<div class="us-blocked-badge">ЗАБЛОКИРОВАН</div>' : '';
        const ordersLine = (u.orders_count > 0)
            ? '<div class="us-stat">📦 ' + u.orders_count + ' заказ' + (u.orders_count === 1 ? '' : (u.orders_count < 5 ? 'а' : 'ов')) + ' · <b>' + u.total_sum + ' BYN</b></div>'
            : '<div class="us-stat us-stat-empty">Нет заказов</div>';
        const cardCls = u.is_blocked ? 'us-card us-card-blocked' : 'us-card';
        let actions = '';
        if (u.username) {
            actions += "<button class=\"us-btn us-btn-tg\" onclick=\"openUserTg('" + u.username + "')\">💬 Написать</button>";
        }
        if (u.is_blocked) {
            actions += '<button class="us-btn us-btn-unblock" onclick="toggleBlock(' + u.id + ',1)">✅ Разблокировать</button>';
        } else {
            actions += '<button class="us-btn us-btn-block" onclick="toggleBlock(' + u.id + ',0)">🚫 Заблокировать</button>';
        }
        return '<div class="' + cardCls + '">' +
            '<div class="us-head">' +
                '<div class="us-avatar">' + initial + '</div>' +
                '<div class="us-info">' +
                    '<div class="us-name">' + name + username + '</div>' +
                    '<div class="us-meta">ID: ' + u.id + phone + (created ? ' · с ' + created : '') + '</div>' +
                    ordersLine +
                '</div>' +
                blocked +
            '</div>' +
            '<div class="us-actions">' + actions + '</div>' +
        '</div>';
    }).join('') + '</div>';
}

function openUserTg(username) {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.openTelegramLink('https://t.me/' + username);
    }
}

async function cancelOrder(oid) {
    askConfirm('Отменить заказ #' + oid + '?', async () => {
        const res = await fetch(API + '/api/orders/cancel/' + oid, {method:'POST', headers:headers()});
        if (!res.ok) { showToast('Не удалось отменить'); return; }
        showToast('Заказ отменён');
        renderMyOrders();
    }, 'Отменить');
}

function openReschedule(oid, currentTime) {
    const cur = (currentTime || '12:00').trim() || '12:00';
    const parts = cur.split(':');
    const selH = String(parseInt(parts[0] || '12', 10)).padStart(2, '0');
    const selM = String(parseInt(parts[1] || '00', 10)).padStart(2, '0');
    let hOpts = '', mOpts = '';
    for (let h = 0; h < 24; h++) {
        const v = String(h).padStart(2, '0');
        hOpts += '<div class="tp-item' + (v === selH ? ' active' : '') + '" data-v="' + v + '">' + v + '</div>';
    }
    for (let m = 0; m < 60; m += 5) {
        const v = String(m).padStart(2, '0');
        mOpts += '<div class="tp-item' + (v === selM ? ' active' : '') + '" data-v="' + v + '">' + v + '</div>';
    }
    const modal = document.createElement('div');
    modal.className = 'pickup-modal reschedule-modal';
    modal.innerHTML =
        '<div class="pickup-sheet tp-sheet">' +
            '<div class="pickup-handle"></div>' +
            '<div class="pickup-header"><div class="pickup-header-title">Перенести время</div><div class="pickup-header-sub">Заказ #' + oid + '</div></div>' +
            '<div class="tp-wrap">' +
                '<div class="tp-col" id="rs-h-col">' + hOpts + '</div>' +
                '<div class="tp-col" id="rs-m-col">' + mOpts + '</div>' +
            '</div>' +
            '<div class="tp-actions">' +
                '<button class="tp-cancel" onclick="this.closest(\'.reschedule-modal\').remove()">Отмена</button>' +
                '<button class="tp-apply" onclick="submitReschedule(' + oid + ')">Сохранить</button>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    // scroll активного
    setTimeout(() => {
        ['rs-h-col','rs-m-col'].forEach(id => {
            const col = document.getElementById(id);
            if (!col) return;
            const act = col.querySelector('.ot-item.active');
            if (act) col.scrollTop = act.offsetTop - col.clientHeight / 2 + act.clientHeight / 2;
        });
    }, 30);
    // делегирование тапа
    modal.querySelectorAll('.tp-col').forEach(col => {
        col.onclick = (e) => {
            const it = e.target.closest('.ot-item');
            if (!it) return;
            col.querySelectorAll('.ot-item').forEach(x => x.classList.remove('active'));
            it.classList.add('active');
            it.scrollIntoView({block:'center', behavior:'smooth'});
        };
    });
}


// ============ РЕДАКТОР ВРЕМЕНИ ВЫДАЧИ ============
function otTapHour(el) {
    var col = document.getElementById('ot-hours');
    if (!col) return;
    col.querySelectorAll('.ot-item').forEach(function(x){x.classList.remove('active')});
    el.classList.add('active');
    el.scrollIntoView({block:'center', behavior:'smooth'});
    haptic('light');
}
function otTapMin(el) {
    var col = document.getElementById('ot-mins');
    if (!col) return;
    col.querySelectorAll('.ot-item').forEach(function(x){x.classList.remove('active')});
    el.classList.add('active');
    el.scrollIntoView({block:'center', behavior:'smooth'});
    haptic('light');
}
function openOrderTimeEditor(oid, currentTime) {
    const modal = document.createElement('div');
    modal.className = 'pickup-modal';
    modal.id = 'order-time-modal';
    const cur = (currentTime || '').trim();
    let curDate = '', curTime = '15:00';
    if (/^\d{4}-\d{2}-\d{2}/.test(cur)) {
        curDate = cur.slice(0, 10);
        curTime = cur.slice(11, 16) || '15:00';
    } else if (/^\d{1,2}:\d{2}$/.test(cur)) {
        const today = new Date();
        curDate = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
        curTime = cur.padStart(5, '0');
    } else {
        const today = new Date();
        curDate = today.getFullYear() + '-' + String(today.getMonth()+1).padStart(2,'0') + '-' + String(today.getDate()).padStart(2,'0');
    }
    const curH = curTime.slice(0, 2) || '15';
    const curM = curTime.slice(3, 5) || '00';
    const hours = []; for (let h = 0; h <= 23; h++) hours.push(('0'+h).slice(-2));
    const mins = []; for (let m = 0; m < 60; m++) mins.push(('0'+m).slice(-2));
    modal.innerHTML =
        '<div class="pickup-sheet">' +
            '<div class="pickup-handle"></div>' +
            '<div class="pickup-header"><div class="pickup-header-title">🕐 Время выдачи</div><div class="pickup-header-sub">Заказ #' + oid + '</div></div>' +
            '<div style="padding:0 4px 12px">' +
                '<div class="promo-label" style="margin-top:8px">ДЕНЬ</div>' +
                '<div class="co-days" id="ot-days" style="margin-bottom:14px"></div>' +
                '<div class="promo-label">ВРЕМЯ</div>' +
                '<div class="ot-wrap">' +
                    '<div class="ot-spacer" style="position:absolute;top:0"></div>' +
                    '<div class="ot-col" id="ot-hours">' +
                        '<div class="ot-spacer"></div>' +
                        hours.map(h => '<div class="ot-item' + (h === curH ? ' active' : '') + '" data-v="' + h + '" onclick="otTapHour(this)">' + h + '</div>').join('') +
                        '<div class="ot-spacer"></div>' +
                    '</div>' +
                    '<div class="ot-colon">:</div>' +
                    '<div class="ot-col" id="ot-mins">' +
                        '<div class="ot-spacer"></div>' +
                        mins.map(m => '<div class="ot-item' + (m === curM ? ' active' : '') + '" data-v="' + m + '" onclick="otTapMin(this)">' + m + '</div>').join('') +
                        '<div class="ot-spacer"></div>' +
                    '</div>' +
                    '<div class="ot-indicator"></div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;margin-top:14px">' +
                    '<button class="tp-cancel" style="flex:1" onclick="this.closest(\'.pickup-modal\').remove()">Отмена</button>' +
                    '<button class="tp-apply" style="flex:1" onclick="submitOrderTime(' + oid + ')">Сохранить</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    modal.dataset.curDate = curDate;
    modal.dataset.curTime = curTime;
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    // чипы дней
    renderOrderDayChips(curDate);
    // скролл к активному часу/минуте
    setTimeout(() => {
        ['ot-hours','ot-mins'].forEach(id => {
            const col = document.getElementById(id);
            if (!col) return;
            const act = col.querySelector('.ot-item.active');
            if (act) col.scrollTop = act.offsetTop - col.clientHeight/2 + act.clientHeight/2;
        });
    }, 50);
}

function renderOrderDayChips(curDate) {
    const box = document.getElementById('ot-days');
    if (!box) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const cur = new Date(curDate + 'T00:00:00');
    const diff = Math.round((cur - today) / 86400000);
    const mk = (off, label) => {
        const active = off === diff ? ' active' : '';
        const d = new Date(today); d.setDate(d.getDate() + off);
        const ymd = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
        return '<div class="co-day-chip ot-day' + active + '" onclick="selectOrderDay(\'' + ymd + '\')">' + label + '</div>';
    };
    box.innerHTML = mk(0, 'Сегодня') + mk(1, 'Завтра') + mk(2, 'Послезавтра') +
        '<div class="co-day-chip ot-day' + (diff > 2 ? ' active' : '') + '" data-custom="1" onclick="selectOrderDayCustom()">' + (diff > 2 ? curDate.slice(8,10) + '.' + curDate.slice(5,7) : '📅 Ещё') + '</div>';
}

function selectOrderDay(ymd) {
    const m = document.getElementById('order-time-modal');
    if (m) m.dataset.curDate = ymd;
    renderOrderDayChips(ymd);
}

function selectOrderDayCustom() {
    const m = document.getElementById('order-time-modal');
    if (!m) return;
    const cur = m.dataset.curDate || '';
    const v = prompt('Дата в формате ГГГГ-ММ-ДД:', cur);
    if (!v) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) { showToast('Неверный формат'); return; }
    m.dataset.curDate = v;
    renderOrderDayChips(v);
}

async function submitOrderTime(oid) {
    const m = document.getElementById('order-time-modal');
    if (!m) return;
    const date = m.dataset.curDate;
    const hEl = document.querySelector('#ot-hours .ot-item.active');
    const mEl = document.querySelector('#ot-mins .ot-item.active');
    const h = hEl ? hEl.dataset.v : '15';
    const mm = mEl ? mEl.dataset.v : '00';
    if (!date) { showToast('Выберите день'); return; }
    const fullTime = date + ' ' + h + ':' + mm;
    m.remove();
    const res = await fetch(API + '/api/admin/order/' + oid + '/time', {
        method: 'POST', headers: headers(),
        body: JSON.stringify({delivery_time: fullTime})
    });
    if (!res.ok) { showToast('Ошибка'); return; }
    showToast('🕐 Время: ' + fullTime);
    setTimeout(() => renderOrdersAdmin(), 500);
}

function openReminder(oid, currentRemind) {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 10) + 'T' + now.toTimeString().slice(0, 5);
    const modal = document.createElement('div');
    modal.className = 'pickup-modal reschedule-modal';
    let curDate = '', curTime = '';
    if (currentRemind && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(currentRemind)) {
        curDate = currentRemind.slice(0, 10); curTime = currentRemind.slice(11, 16);
    } else {
        curDate = now.toISOString().slice(0, 10);
        curTime = now.toTimeString().slice(0, 5);
    }
    modal.innerHTML =
        '<div class="pickup-sheet">' +
            '<div class="pickup-handle"></div>' +
            '<div class="pickup-header"><div class="pickup-header-title">🔔 Напомнить</div><div class="pickup-header-sub">Заказ #' + oid + '</div></div>' +
            '<div style="padding:0 4px 12px">' +
                '<div class="promo-label" style="margin-top:8px">БЫСТРО</div>' +
                '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">' +
                    '<button class="status-btn" onclick="quickRemind(' + oid + ',15)">Через 15 мин</button>' +
                    '<button class="status-btn" onclick="quickRemind(' + oid + ',60)">Через 1 час</button>' +
                    '<button class="status-btn" onclick="quickRemind(' + oid + ',120)">Через 2 часа</button>' +
                    '<button class="status-btn" onclick="quickRemind(' + oid + ',180)">Через 3 часа</button>' +
                '</div>' +
                '<div class="promo-label">ТОЧНОЕ ВРЕМЯ</div>' +
                '<div style="display:flex;gap:8px;margin-top:8px">' +
                    '<input type="date" id="rm-date" class="promo-input" value="' + curDate + '" style="flex:1">' +
                    '<input type="time" id="rm-time" class="promo-input" value="' + curTime + '" style="flex:1">' +
                '</div>' +
                '<div style="display:flex;gap:8px;margin-top:14px">' +
                    '<button class="tp-cancel" style="flex:1" onclick="this.closest(\'.reschedule-modal\').remove()">Отмена</button>' +
                    (currentRemind ? '<button class="tp-cancel" style="flex:1;background:#fee;color:#c33" onclick="cancelReminder(' + oid + ')">Убрать</button>' : '') +
                    '<button class="tp-apply" style="flex:1" onclick="submitReminder(' + oid + ')">Сохранить</button>' +
                '</div>' +
            '</div>' +
        '</div>';
    document.body.appendChild(modal);
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

function quickRemind(oid, minutes) {
    const d = new Date(Date.now() + minutes * 60000);
    const pad = (n) => String(n).padStart(2, '0');
    const str = d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    const mod = document.querySelector('.reschedule-modal');
    if (mod) mod.remove();
    fetch(API + '/api/admin/order/' + oid + '/remind', {method:'POST', headers:headers(), body:JSON.stringify({remind_at: str})})
        .then(r => { if (r.ok) { showToast('🔔 Напомню в ' + str.slice(11)); renderOrdersAdmin(); } else showToast('Ошибка'); });
}

function submitReminder(oid) {
    const date = (document.getElementById('rm-date')?.value || '').trim();
    const time = (document.getElementById('rm-time')?.value || '').trim();
    if (!date || !time) { showToast('Заполни дату и время'); return; }
    const str = date + ' ' + time;
    const mod = document.querySelector('.reschedule-modal');
    if (mod) mod.remove();
    fetch(API + '/api/admin/order/' + oid + '/remind', {method:'POST', headers:headers(), body:JSON.stringify({remind_at: str})})
        .then(r => { if (r.ok) { showToast('🔔 Напомню ' + str); renderOrdersAdmin(); } else showToast('Ошибка'); });
}

function cancelReminder(oid) {
    const mod = document.querySelector('.reschedule-modal');
    if (mod) mod.remove();
    fetch(API + '/api/admin/order/' + oid + '/remind', {method:'DELETE', headers:headers()})
        .then(r => { if (r.ok) { showToast('Напоминание убрано'); renderOrdersAdmin(); } else showToast('Ошибка'); });
}


async function submitReschedule(oid) {
    const h = document.querySelector('#rs-h-col .tp-item.active')?.dataset.v;
    const mm = document.querySelector('#rs-m-col .tp-item.active')?.dataset.v;
    if (!h || !mm) { showToast('Выберите время'); return; }
    const t = h + ':' + mm;
    const res = await fetch(API + '/api/orders/reschedule/' + oid, {method:'POST', headers:headers(), body:JSON.stringify({delivery_time:t})});
    if (!res.ok) { showToast('Не удалось перенести'); return; }
    const mod = document.querySelector('.reschedule-modal');
    if (mod) mod.remove();
    showToast('Время изменено на ' + t);
    renderMyOrders();
}

async function exportOrdersCSV() {
    showToast('Готовим файл...');
    const res = await fetch(API + '/api/admin/orders/export', {headers: headers()});
    if (!res.ok) { showToast('Ошибка'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mogvape_orders_' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Файл скачан');
}

async function testNotify() {
    showToast('Отправляю...');
    const res = await fetch(API + '/api/admin/test_notify', {method:'POST', headers:headers()});
    if (!res.ok) { showToast('Ошибка'); return; }
    const data = await res.json();
    if (data.ok) showToast('✅ Отправлено, проверь бота');
    else showToast('❌ Не отправилось');
}

async function tryAddToCart(pid) {
    const res = await fetch(API + '/api/product/' + pid, {headers: headers()});
    if (!res.ok) { showToast('Ошибка'); return; }
    const p = await res.json();
    const hasFlavorStocks = p.flavor_stocks && p.flavor_stocks.trim();
    if (hasFlavorStocks && window._currentFlavor) {
        const map = parseFlavorStocks(p.flavor_stocks);
        const stock = getFlavorStock(map, window._currentFlavor);
        if (stock <= 0) { showToast('Этот вкус закончился'); return; }
    } else if (p.quantity <= 0) {
        showToast('Нет в наличии');
        return;
    }
    addToCart(pid);
}

function renderFlavorStocksEditor(containerId, flavorsStr, flavorStocksStr) {
    const box = document.getElementById(containerId);
    if (!box) return;
    box.innerHTML = '';
    const flavors = (flavorsStr || '').split(';').map(s => s.trim()).filter(Boolean);
    const stocksMap = parseFlavorStocks(flavorStocksStr || '');
    if (flavors.length === 0) { addFlavorRow(containerId, '', ''); return; }
    flavors.forEach(f => {
        var _parts = f.split('|');
        var _nm = (_parts[0] || '').trim();
        var _ph = (_parts[1] || '').trim();
        const qty = (_nm in stocksMap) ? stocksMap[_nm] : '';
        addFlavorRow(containerId, _nm, qty, _ph);
    });
}
function initFlavorRowsDnD(editorId) {
    const box = document.getElementById(editorId);
    if (!box) return;
    // Добавляем ручку ⠿ в каждую строку (слева)
    function attachHandles() {
        box.querySelectorAll('.fs-row').forEach(row => {
            if (row.querySelector('.fs-drag-handle')) return;
            const h = document.createElement('div');
            h.className = 'fs-drag-handle';
            h.textContent = '\u2807';
            row.insertBefore(h, row.firstChild);
        });
    }
    attachHandles();

    // Наблюдаем за добавлением новых строк
    if (box._fsObserver) box._fsObserver.disconnect();
    box._fsObserver = new MutationObserver(() => attachHandles());
    box._fsObserver.observe(box, { childList: true });

    // Drag-n-drop — только внутри этого контейнера
    let dragRow = null;
    let placeholder = null;
    let offsetY = 0;

    function getRows() { return Array.from(box.querySelectorAll('.fs-row')); }

    function onStart(e, row) {
        dragRow = row;
        const touch = e.touches ? e.touches[0] : e;
        const rect = row.getBoundingClientRect();
        offsetY = touch.clientY - rect.top;
        row.classList.add('fs-dragging');
        row.style.position = 'fixed';
        row.style.left = rect.left + 'px';
        row.style.width = rect.width + 'px';
        row.style.top = rect.top + 'px';
        row.style.zIndex = '9999';
        row.style.pointerEvents = 'none';
        placeholder = document.createElement('div');
        placeholder.className = 'fs-drop-placeholder';
        placeholder.style.height = rect.height + 'px';
        row.parentNode.insertBefore(placeholder, row.nextSibling);
        if (e.cancelable) e.preventDefault();
    }

    function onMove(e) {
        if (!dragRow) return;
        const touch = e.touches ? e.touches[0] : e;
        const y = touch.clientY - offsetY;
        dragRow.style.top = y + 'px';
        const rows = getRows().filter(r => r !== dragRow);
        let after = null;
        for (const r of rows) {
            const rect = r.getBoundingClientRect();
            if (touch.clientY > rect.top + rect.height / 2) after = r;
        }
        if (after) {
            if (after.nextSibling !== placeholder) box.insertBefore(placeholder, after.nextSibling);
        } else {
            const first = rows[0];
            if (first && first.previousSibling !== placeholder) box.insertBefore(placeholder, first);
        }
        if (e.cancelable) e.preventDefault();
    }

    function onEnd() {
        if (!dragRow) return;
        dragRow.classList.remove('fs-dragging');
        dragRow.style.position = '';
        dragRow.style.left = '';
        dragRow.style.width = '';
        dragRow.style.top = '';
        dragRow.style.zIndex = '';
        dragRow.style.pointerEvents = '';
        if (placeholder && placeholder.parentNode) {
            placeholder.parentNode.insertBefore(dragRow, placeholder);
            placeholder.remove();
        }
        dragRow = null;
        placeholder = null;
        haptic('light');
    }

    // Делегирование на контейнер
    if (box._fsTouchStart) box.removeEventListener('touchstart', box._fsTouchStart);
    if (box._fsTouchMove) box.removeEventListener('touchmove', box._fsTouchMove);
    if (box._fsTouchEnd) box.removeEventListener('touchend', box._fsTouchEnd);

    box._fsTouchStart = (e) => {
        const h = e.target.closest('.fs-drag-handle');
        if (!h) return;
        const row = h.closest('.fs-row');
        if (!row) return;
        onStart(e, row);
    };
    box._fsTouchMove = onMove;
    box._fsTouchEnd = onEnd;

    box.addEventListener('touchstart', box._fsTouchStart, { passive: false });
    box.addEventListener('touchmove', box._fsTouchMove, { passive: false });
    box.addEventListener('touchend', box._fsTouchEnd);
    box.addEventListener('touchcancel', box._fsTouchEnd);
}

function addFlavorRow(containerId, name, qty) {
    const box = document.getElementById(containerId);
    if (!box) return;
    const row = document.createElement('div');
    row.className = 'fs-row';
    row.innerHTML =
        '<input class="fs-name pf-input" placeholder="Название вкуса" value="' + (name || '') + '">' +
        '<input class="fs-qty pf-input" type="number" min="0" placeholder="шт." value="' + (qty === 0 ? 0 : (qty || '')) + '">' +
        '<button type="button" class="fs-del">✕</button>';
    box.appendChild(row);
    // реактивность
    const qtyCardId = containerId === 'ep-flavors-editor' ? 'ep-qty-card' : 'np-qty-card';
    const nameInput = row.querySelector('.fs-name');
    const qtyInput = row.querySelector('.fs-qty');
    const delBtn = row.querySelector('.fs-del');
    const refresh = () => updateQtyVisibility(containerId, qtyCardId);
    nameInput.addEventListener('input', refresh);
    qtyInput.addEventListener('input', refresh);
    delBtn.addEventListener('click', () => { row.remove(); refresh(); });
}
function collectFlavorStocks(containerId) {
    const box = document.getElementById(containerId);
    if (!box) return { flavors: '', stocks: '' };
    const flavors = [];
    const stocks = [];
    box.querySelectorAll('.fs-row').forEach(r => {
        const n = (r.querySelector('.fs-name').value || '').trim();
        const q = (r.querySelector('.fs-qty').value || '').trim();
        if (!n) return;
        var _photos = r.dataset.photos || '';
        if (!_photos) {
            var _img = r.querySelector('.fs-variant-img');
            if (_img) _photos = _img.getAttribute('src') || '';
        }
        if (_photos && _photos.indexOf('/uploads/') !== -1) flavors.push(n + '|' + _photos);
        else flavors.push(n);
        if (q !== '') stocks.push(n + ':' + q);
    });
    return { flavors: flavors.join(';'), stocks: stocks.join(';') };
}

function totalFlavorStock(str) {
    const map = parseFlavorStocks(str || '');
    let sum = 0;
    Object.keys(map).forEach(k => { sum += (map[k] || 0); });
    return sum;
}

async function updateCartBadge() {
    const el = document.getElementById('cart-badge');
    if (!el) return;
    try {
        const res = await fetch(API + '/api/cart', {headers: headers()});
        if (!res.ok) { el.style.display = 'none'; return; }
        const items = await res.json();
        const n = Array.isArray(items) ? items.reduce((s, i) => s + (i.quantity || 0), 0) : 0;
        if (n > 0) { el.textContent = n > 99 ? '99+' : String(n); el.style.display = ''; }
        else { el.style.display = 'none'; }
    } catch (e) { el.style.display = 'none'; }
}

function skeletonGridInner(n) {
    n = n || 6;
    let html = '';
    for (let i = 0; i < n; i++) {
        html += '<div class="skel-card">' +
            '<div class="skel skel-img"></div>' +
            '<div class="skel skel-line"></div>' +
            '<div class="skel skel-line short"></div>' +
            '<div class="skel skel-btn"></div>' +
        '</div>';
    }
    return html;
}
function skeletonGrid(n) {
    return '<div class="products-grid">' + skeletonGridInner(n) + '</div>';
}
function skeletonList(n) {
    n = n || 4;
    let html = '';
    for (let i = 0; i < n; i++) {
        html += '<div class="skel-row">' +
            '<div class="skel skel-thumb"></div>' +
            '<div class="skel-body">' +
                '<div class="skel skel-line" style="margin:0"></div>' +
                '<div class="skel skel-line short" style="margin:0"></div>' +
            '</div>' +
        '</div>';
    }
    return html;
}

let _ptrStartY = 0, _ptrActive = false, _ptrPulled = 0;
const PTR_THRESHOLD = 70;

function initPullToRefresh() {
    const main = document.getElementById('content');
    if (!main) return;
    main.addEventListener('touchstart', (e) => {
        if (currentTab !== 'catalog') return;
        if (window.scrollY > 5) return;
        _ptrStartY = e.touches[0].clientY;
        _ptrActive = true;
        _ptrPulled = 0;
    }, {passive: true});

    main.addEventListener('touchmove', (e) => {
        if (!_ptrActive) return;
        const dy = e.touches[0].clientY - _ptrStartY;
        if (dy <= 0) { _ptrActive = false; resetPtr(main); return; }
        _ptrPulled = Math.min(dy * 0.5, PTR_THRESHOLD * 1.4);
        showPtr(main, _ptrPulled);
        if (_ptrPulled > 10) e.preventDefault();
    }, {passive: false});

    main.addEventListener('touchend', async () => {
        if (!_ptrActive) return;
        _ptrActive = false;
        if (_ptrPulled >= PTR_THRESHOLD) {
            await doRefresh(main);
        } else {
            resetPtr(main);
        }
        _ptrPulled = 0;
    });
}

function showPtr(main, pulled) {
    let wrap = document.getElementById('ptr-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.id = 'ptr-wrap';
        wrap.className = 'ptr-wrap';
        wrap.innerHTML = '<div class="ptr-spinner"></div>';
        main.parentNode.insertBefore(wrap, main);
    }
    wrap.classList.add('visible');
    wrap.classList.toggle('loading', pulled >= PTR_THRESHOLD);
    const sp = wrap.querySelector('.ptr-spinner');
    if (sp) sp.style.transform = 'rotate(' + (pulled * 4) + 'deg)';
    main.style.transform = 'translateY(' + Math.min(pulled, PTR_THRESHOLD) + 'px)';
}

function resetPtr(main) {
    const wrap = document.getElementById('ptr-wrap');
    if (wrap) wrap.classList.remove('visible', 'loading');
    if (main) main.style.transform = '';
}

async function doRefresh(main) {
    if (tg && tg.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
    const wrap = document.getElementById('ptr-wrap');
    if (wrap) { wrap.classList.add('visible', 'loading'); }
    if (main) main.style.transform = 'translateY(' + PTR_THRESHOLD + 'px)';
    await renderCatalog();
    setTimeout(() => { resetPtr(main); }, 350);
}

document.addEventListener('DOMContentLoaded', initPullToRefresh);

function updateQtyVisibility(editorId, qtyCardId) {
    const card = document.getElementById(qtyCardId);
    if (!card) return;
    // «ОБЩЕЕ КОЛ-ВО» больше не показываем нигде
    card.style.display = 'none';
}

function removeProductPhoto(prefix, pid) {
    askConfirm('Удалить фото?', () => {
        const wrap = document.querySelector('.pf-photo-wrap');
        if (wrap) wrap.remove();
        if (prefix === 'ep') {
            const flag = document.getElementById('ep-photo-cleared');
            if (flag) flag.value = '1';
        }
        showToast('Фото удалится при сохранении');
    }, 'Удалить');
}
