function _pfItems(raw) {
    var s2 = String(raw || '').trim();
    if (s2.length === 0) return [];
    return s2.split(';').map(function(x){return x.trim()}).filter(Boolean).map(function(x){
        var i = x.indexOf('|');
        if (i > 0) return { name: x.slice(0, i).trim(), photo: x.slice(i + 1).trim() };
        return { name: x, photo: '' };
    });
}
function selectVariant(name, photo) {
    window._currentFlavor = name;
    var photos = String(photo || '').split(',').map(function(x){return x.trim()}).filter(Boolean);
    window._currentPhotos = photos;
    window._currentPhotoIdx = 0;
    _renderPhotoGallery(photos);
    var all = document.querySelectorAll('.ps-variant');
    for (var i = 0; i < all.length; i++) {
        var el = all[i];
        if (el.dataset.f === name) el.classList.add('active');
        else el.classList.remove('active');
    }
    updateProductStockDisplay();
}

function _renderPhotoGallery(photos) {
    var mi = document.querySelector('.ps-photo-img');
    var container = document.querySelector('.ps-photo-inner');
    if (!container) return;
    // Удаляем старую галерею если была
    var old = container.querySelector('.ps-gallery-dots');
    if (old) old.remove();
    if (photos.length === 0) {
        if (mi) mi.src = '';
        return;
    }
    if (mi) mi.src = photos[0];
    // Одно фото — точек не надо
    if (photos.length === 1) return;
    // Добавляем точки
    var dots = document.createElement('div');
    dots.className = 'ps-gallery-dots';
    var html = '';
    for (var i = 0; i < photos.length; i++) {
        html += '<span class="ps-gallery-dot' + (i === 0 ? ' active' : '') + '" onclick="event.stopPropagation();_showPhoto(' + i + ')"></span>';
    }
    dots.innerHTML = html;
    container.appendChild(dots);
    // Свайп на большом фото
    var photoBox = document.querySelector('.ps-photo');
    if (photoBox && !photoBox._swipeBound) {
        photoBox._swipeBound = true;
        var startX = 0;
        var startY = 0;
        photoBox.addEventListener('touchstart', function(e) {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, {passive: true});
        photoBox.addEventListener('touchend', function(e) {
            var dx = e.changedTouches[0].clientX - startX;
            var dy = e.changedTouches[0].clientY - startY;
            if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
            var arr = window._currentPhotos || [];
            if (arr.length < 2) return;
            var idx = window._currentPhotoIdx || 0;
            if (dx < 0) idx = (idx + 1) % arr.length;
            else idx = (idx - 1 + arr.length) % arr.length;
            _showPhoto(idx);
        }, {passive: true});
    }
}

function _showPhoto(idx) {
    var photos = window._currentPhotos || [];
    if (idx < 0 || idx >= photos.length) return;
    var prevIdx = window._currentPhotoIdx || 0;
    var dir = idx > prevIdx ? 1 : (idx < prevIdx ? -1 : 0);
    window._currentPhotoIdx = idx;
    var mi = document.querySelector('.ps-photo-img');
    if (mi) {
        if (mi._animating) return;
        mi._animating = true;
        // Сначала уводим старое фото в сторону
        mi.style.transition = 'opacity 0.18s ease, transform 0.18s ease';
        mi.style.opacity = '0';
        mi.style.transform = 'translateX(' + (-30 * dir) + 'px) scale(0.95)';
        setTimeout(function() {
            // Меняем src и возвращаем с противоположной стороны
            mi.src = photos[idx];
            mi.style.transition = 'none';
            mi.style.transform = 'translateX(' + (30 * dir) + 'px) scale(0.95)';
            // Форсируем reflow, чтобы браузер применил новое положение
            void mi.offsetWidth;
            // Анимируем на место
            mi.style.transition = 'opacity 0.24s cubic-bezier(0.22, 1, 0.36, 1), transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)';
            mi.style.opacity = '1';
            mi.style.transform = 'translateX(0) scale(1)';
            setTimeout(function() { mi._animating = false; }, 260);
        }, 180);
    }
    document.querySelectorAll('.ps-gallery-dot').forEach(function(d, i) {
        d.classList.toggle('active', i === idx);
    });
    haptic('light');
}
function _mkVariantHTML(fi, dis, act, src, stk) {
    var cls = 'ps-variant';
    if (act) cls += ' active';
    if (dis) cls += ' disabled';
    // src может быть списком через запятую — берём первый
    var firstSrc = src ? String(src).split(',')[0].trim() : '';
    var imgTag = firstSrc ? '<img src="' + firstSrc + '">' : '📦';
    var stkLbl = '';
    if (stk !== Infinity) {
        stkLbl = '<div class="ps-variant-stock">' + (dis ? '✕ нет' : '✔ ' + stk + ' шт.') + '</div>';
    }
    var attrs = ' class="' + cls + '" data-f="' + fi.name + '" data-ph="' + fi.photo + '"';
    if (dis) attrs += ' style="pointer-events:none"';
    else attrs += ' onclick="selectVariant(this.dataset.f, this.dataset.ph)"';
    return '<div' + attrs + '>' +
        '<div class="ps-variant-img">' + imgTag + '</div>' +
        '<div class="ps-variant-name">' + fi.name + '</div>' +
        stkLbl +
    '</div>';
}
function productScreenHTML(p, similar, isFav, strengths, flavors) {
    var _fi = _pfItems(p.flavors);
    var _isVar = (p.category === 'vape' || p.category === 'accessory');
    var _hasPh = false;
    for (var _k = 0; _k < _fi.length; _k++) { if (_fi[_k].photo) { _hasPh = true; break; } }
    if (_fi.length === 0 || !_isVar) {
        return productScreenHTML_OLD(p, similar, isFav, strengths, flavors);
    }
    var baseHtml = productScreenHTML_OLD(p, similar, isFav, [], []);
    var _fMap = parseFlavorStocks(p.flavor_stocks);
    var _ttl = (p.category === 'vape') ? 'Цвет' : 'Сопротивление';
    var _items = '';
    for (var i = 0; i < _fi.length; i++) {
        var fi = _fi[i];
        var stk = getFlavorStock(_fMap, fi.name);
        var dis = stk <= 0;
        var act = (fi.name === window._currentFlavor) && (dis === false);
        var src = fi.photo || '';
        if (!src) src = p.photo_id || '';
        _items += _mkVariantHTML(fi, dis, act, src, stk);
    }
    var _section = '<div class="ps-section"><div class="ps-section-title">' + _ttl + '</div><div class="ps-variants">' + _items + '</div></div>';
    var buyMarker = '<div class="ps-buy-row">';
    var buyPos = baseHtml.indexOf(buyMarker);
    if (buyPos > 0) {
        baseHtml = baseHtml.slice(0, buyPos) + _section + baseHtml.slice(buyPos);
    }
    return baseHtml;
}
window.productScreenHTML = productScreenHTML;

// ============ ФОРМА С ФОТО (Этап 2) ============
async function uploadVariantPhoto(pid, variantName, inputEl) {
    var file = inputEl.files[0];
    if (file === undefined) return;
    var vn = String(variantName || '').trim();
    if (vn.length === 0) {
        showToast('Сначала введите название');
        inputEl.value = '';
        return;
    }
    var fd = new FormData();
    fd.append('file', file);
    var url = '/api/admin/product/' + pid + '/variant_photo?name=' + encodeURIComponent(vn);
    var res = await fetch(url, { method: 'POST', body: fd, headers: { 'X-Telegram-Init-Data': tg.initData || '' } });
    if (res.ok === false) {
        showToast('Ошибка загрузки');
        return;
    }
    var data = await res.json();
    showToast('Фото варианта загружено');
    var row = inputEl.closest('.fs-row');
    if (!row) return;
    // Сохраняем URL в data-атрибут строки
    row.dataset.photo = data.url;
    // Рисуем превью — заменяем 📷 внутри label
    var label = row.querySelector('.fs-photo-btn');
    if (label) {
        label.classList.add('fs-photo-has');
        label.innerHTML = '<img class="fs-variant-img" src="' + data.url + '"><input type="file" class="fs-photo-input" accept="image/*" style="display:none">';
        // пере-навешиваем обработчик change
        var newInput = label.querySelector('.fs-photo-input');
        newInput.addEventListener('change', function() {
            uploadVariantPhoto(pid, vn, this);
        });
    }
}
var _origAddFlavorRow = window.addFlavorRow;
window.addFlavorRow = function(containerId, name, qty, photo) {
    var cat = window._epCat || 'all';
    var showPhoto = (cat === 'vape' || cat === 'accessory');
    if (showPhoto === false) {
        return _origAddFlavorRow(containerId, name, qty);
    }
    var box = document.getElementById(containerId);
    if (box === null) return;
    var row = document.createElement('div');
    row.className = 'fs-row';
    var hasPhoto = (photo && photo.indexOf('/uploads/') !== -1);
    var previewContent = hasPhoto
        ? '<img class="fs-variant-img" src="' + photo + '">'
        : '<span>📷</span>';
    var ph = '<label class="fs-photo-btn' + (hasPhoto ? ' fs-photo-has' : '') + '">' + previewContent + '<input type="file" class="fs-photo-input" accept="image/*" style="display:none"></label>';
    row.innerHTML = ph +
        '<input class="fs-name pf-input" placeholder="Цвет (Белый)" value="' + (name || '') + '">' +
        '<input class="fs-qty pf-input" type="number" min="0" placeholder="шт." value="' + (qty === 0 ? 0 : (qty || '')) + '">' +
        '<button type="button" class="fs-del">✕</button>';
    box.appendChild(row);
    var nameInput = row.querySelector('.fs-name');
    var qtyInput = row.querySelector('.fs-qty');
    var delBtn = row.querySelector('.fs-del');
    var photoInput = row.querySelector('.fs-photo-input');
    if (photoInput) {
        photoInput.addEventListener('change', function() {
            var pid = window._epEditingPid || 0;
            if (pid === 0) {
                showToast('Сначала сохрани товар');
                this.value = '';
                return;
            }
            uploadVariantPhoto(pid, nameInput.value, this);
        });
    }
    delBtn.addEventListener('click', function() { row.remove(); });
};
var _origEditProduct = window.editProduct;
window.editProduct = function(pid) {
    window._epEditingPid = pid;
    return _origEditProduct(pid);
};

async function uploadVariantPhoto(pid, variantName, inputEl) {
    var file = inputEl.files[0];
    if (file === undefined) return;
    var vn = String(variantName || '').trim();
    if (vn.length === 0) {
        showToast('Сначала введите название');
        inputEl.value = '';
        return;
    }
    var row = inputEl.closest('.fs-row');
    if (!row) return;
    var current = row.dataset.photos ? row.dataset.photos.split(',').filter(Boolean) : [];
    if (current.length >= 4) {
        showToast('Максимум 4 фото');
        inputEl.value = '';
        return;
    }
    var fd = new FormData();
    fd.append('file', file);
    var url = '/api/admin/product/' + pid + '/variant_photo?name=' + encodeURIComponent(vn);
    var res = await fetch(url, { method: 'POST', body: fd, headers: { 'X-Telegram-Init-Data': tg.initData || '' } });
    if (res.ok === false) {
        showToast('Ошибка загрузки');
        inputEl.value = '';
        return;
    }
    var data = await res.json();
    current.push(data.url);
    row.dataset.photos = current.join(',');
    showToast('Фото ' + current.length + '/4 загружено');
    renderRowPhotos(row, pid, vn);
}

function renderRowPhotos(row, pid, vn) {
    var box = row.querySelector('.fs-photos-strip');
    if (!box) return;
    var photos = row.dataset.photos ? row.dataset.photos.split(',').filter(Boolean) : [];
    var html = '';
    for (var i = 0; i < 4; i++) {
        if (photos[i]) {
            html += '<div class="fs-photo-slot has-photo"><img src="' + photos[i] + '"><span class="fs-photo-del" onclick="event.stopPropagation();removeRowPhoto(this.parentElement)">x</span></div>';
        } else {
            html += '<label class="fs-photo-slot"><input type="file" accept="image/*" style="display:none"><span>camera</span></label>';
        }
    }
    box.innerHTML = html;
    box.querySelectorAll('.fs-photo-slot').forEach(function(slot) {
        var inp = slot.querySelector('input[type=file]');
        if (inp) {
            inp.addEventListener('change', function() {
                var nameInput = row.querySelector('.fs-name');
                var realName = nameInput ? nameInput.value.trim() : vn;
                uploadVariantPhoto(pid, realName, this);
            });
        }
    });
}

function removeRowPhoto(slot) {
    var row = slot.closest('.fs-row');
    if (!row) return;
    var photos = row.dataset.photos ? row.dataset.photos.split(',').filter(Boolean) : [];
    photos.pop();
    row.dataset.photos = photos.join(',');
    var nameInput = row.querySelector('.fs-name');
    var pid = window._epEditingPid || 0;
    var vn = nameInput ? nameInput.value.trim() : '';
    renderRowPhotos(row, pid, vn);
}

var _origAddFlavorRow2 = window.addFlavorRow;
window.addFlavorRow = function(containerId, name, qty, photo) {
    var cat = window._epCat || 'all';
    var showPhoto = (cat === 'vape' || cat === 'accessory');
    if (showPhoto === false) {
        return _origAddFlavorRow2(containerId, name, qty);
    }
    var box = document.getElementById(containerId);
    if (box === null) return;
    var row = document.createElement('div');
    row.className = 'fs-row';
    row.innerHTML = '<div class="fs-photos-strip"></div>' +
        '<input class="fs-name pf-input" placeholder="Название (Белый)" value="' + (name || '') + '">' +
        '<input class="fs-qty pf-input" type="number" min="0" placeholder="шт." value="' + (qty === 0 ? 0 : (qty || '')) + '">' +
        '<button type="button" class="fs-del">X</button>';
    box.appendChild(row);
    if (photo && photo.length > 0) {
        row.dataset.photos = photo;
    }
    var _pid = window._epEditingPid || 0;
    renderRowPhotos(row, _pid, name || '');
    var nameInput = row.querySelector('.fs-name');
    var delBtn = row.querySelector('.fs-del');
    delBtn.addEventListener('click', function() { row.remove(); });
};
