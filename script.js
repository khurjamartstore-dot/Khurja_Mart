(function(){
  "use strict";

  var CATEGORIES = [
    {id:"vases", name:"Vases", icon:"🏺", img:""},
    {id:"dinner", name:"Dinner Sets", icon:"🍽️", img:""},
    {id:"cups", name:"Cups & Mugs", icon:"☕", img:""},
    {id:"decor", name:"Decor", icon:"🕯️", img:""},
    {id:"bowls", name:"Bowls", icon:"🥣", img:""}
  ];

  var PRODUCTS = [
    {id:1, name:"Khurja Ceramic Blue Pottery Flower Vase, Handpainted", cat:"vases", icon:"🏺", price:399, oldPrice:999, mall:true, desc:"Traditional Khurja blue pottery vase, handpainted by local artisans. Perfect for fresh or dried flowers, adds an elegant touch to any room."},
    {id:2, name:"Khurja Pottery Dinner Set, 24 Pieces, Hand Glazed", cat:"dinner", icon:"🍽️", price:1499, oldPrice:3499, mall:true, desc:"Complete 24-piece dinner set, hand glazed in classic Khurja style. Includes plates, bowls, and serving dishes. Microwave safe."},
    {id:3, name:"Blue Pottery Ceramic Tea Cup & Saucer Set of 6", cat:"cups", icon:"☕", price:549, oldPrice:1199, mall:true, desc:"Set of 6 tea cups with matching saucers, finished in the iconic Khurja blue glaze. Ideal for daily use or gifting."},
    {id:4, name:"Khurja Ceramic Serving Bowl, Handcrafted, Set of 4", cat:"bowls", icon:"🥣", price:699, oldPrice:1399, mall:true, desc:"Set of 4 handcrafted serving bowls, each piece slightly unique due to the handmade process. Dishwasher safe."},
    {id:5, name:"Blue Pottery Decorative Candle Holder, Set of 2", cat:"decor", icon:"🕯️", price:329, oldPrice:699, mall:true, desc:"Pair of decorative candle holders in traditional blue pottery style, great for festive decor or gifting."},
    {id:6, name:"Handpainted Ceramic Water Jug with Lid, Khurja Pottery", cat:"vases", icon:"🏺", price:599, oldPrice:1299, mall:true, desc:"Handpainted ceramic water jug with lid, keeps water naturally cool. A functional piece of Khurja craftsmanship."},
    {id:7, name:"Khurja Pottery Soup Bowls with Handle, Set of 4", cat:"bowls", icon:"🥣", price:549, oldPrice:1099, mall:false, desc:"Set of 4 soup bowls with side handles for easy serving, glazed in soft pastel tones."},
    {id:8, name:"Ceramic Coffee Mug Set, Blue Pottery Design, 4 Pcs", cat:"cups", icon:"☕", price:449, oldPrice:899, mall:true, desc:"Set of 4 coffee mugs featuring hand-painted blue pottery motifs, sturdy and microwave safe."},
    {id:9, name:"Khurja Ceramic Dinner Plates, Set of 6, Floral Design", cat:"dinner", icon:"🍽️", price:899, oldPrice:1799, mall:false, desc:"Set of 6 dinner plates with traditional floral hand-painted designs, glazed for durability."},
    {id:10, name:"Blue Pottery Wall Hanging Plates, Set of 3", cat:"decor", icon:"🕯️", price:749, oldPrice:1499, mall:true, desc:"Set of 3 decorative wall hanging plates, a beautiful way to showcase Khurja pottery art at home."},
    {id:11, name:"Khurja Ceramic Fruit Bowl, Large, Handpainted", cat:"bowls", icon:"🥣", price:499, oldPrice:999, mall:false, desc:"Large handpainted fruit bowl, perfect centerpiece for dining tables, made using traditional techniques."},
    {id:12, name:"Blue Pottery Flower Vase, Tall Neck, Handcrafted", cat:"vases", icon:"🏺", price:749, oldPrice:1599, mall:true, desc:"Tall neck flower vase in classic blue pottery style, handcrafted for a graceful, elegant look."}
  ];

  var state = {
    cart: {},
    wishlist: {},
    orders: [],
    activeCategory: null,
    sortMode: "none",
    onlyMall: false,
    onlyDiscount: false,
    currentDetailId: null,
    detailQty: 1,
    appliedCoupon: null
  };

  var OFFERS = { flashSale: {active:false, text:"", items:[]}, coupons: [] };

  function saveData() {
    localStorage.setItem("khurjaMartData", JSON.stringify(state));
  }

  function loadData() {
    const data = localStorage.getItem("khurjaMartData");
    if (data) {
      Object.assign(state, JSON.parse(data));
    }
  }

  // ================= Firebase catalog sync =================
  function waitForFirebase(){
    return new Promise(function(resolve){
      if (typeof window.loadCatalogFromFirestore === "function"){
        resolve();
        return;
      }
      var done = false;
      window.addEventListener("firebaseReady", function(){
        if (!done){ done = true; resolve(); }
      }, {once:true});
      setTimeout(function(){ if (!done){ done = true; resolve(); } }, 3000);
    });
  }

  function refreshAfterCatalogUpdate(){
    renderCategoryRow();
    renderAllCategoriesList();
    var activeViewEl = document.querySelector(".view.active");
    if (!activeViewEl) return;
    if (activeViewEl.id === "view-home") renderGrid();
    if (activeViewEl.id === "view-wishlist") renderWishlist();
    if (activeViewEl.id === "view-cart") renderCart();
  }

  async function setupCatalogSync(){
    await waitForFirebase();
    if (typeof window.subscribeToCatalog !== "function") return;
    window.subscribeToCatalog(function(fsProducts){
      if (fsProducts && fsProducts.length > 0){
        PRODUCTS = fsProducts;
        refreshAfterCatalogUpdate();
      }
    });
  }

  async function setupCategorySync(){
    await waitForFirebase();
    if (typeof window.subscribeToCategories !== "function") return;
    window.subscribeToCategories(function(fsCategories){
      if (fsCategories && fsCategories.length > 0){
        CATEGORIES = fsCategories;
        refreshAfterCatalogUpdate();
      }
    });
  }

  // ================= Hero Banner Slider (Firebase real-time) =================
  var heroBannerTimer = null;
  var heroBannerIndex = 0;

  function renderHeroBanner(banners){
    if (!banners || banners.length === 0) return;
    var slidesWrap = document.getElementById("heroBannerSlides");
    var dotsWrap = document.getElementById("heroBannerDots");
    if (!slidesWrap || !dotsWrap) return;

    slidesWrap.innerHTML = banners.map(function(b, i){
      return '<div class="hero-slide" style="display:' + (i===0 ? "block" : "none") + ';width:100%;position:relative;border-radius:12px;overflow:hidden;">' +
        '<img src="' + b.img + '" style="width:100%;height:auto;display:block;">' +
        ((b.title || b.sub || b.btnText) ?
          '<div style="position:absolute;left:0;right:0;bottom:0;padding:16px;background:linear-gradient(transparent, rgba(0,0,0,0.6));color:#fff;">' +
            (b.title ? '<div class="hero-title" style="color:#fff;">' + b.title + '</div>' : '') +
            (b.sub ? '<div class="hero-sub" style="color:#eee;">' + b.sub + '</div>' : '') +
            (b.btnText ? '<span class="hero-btn" onclick="document.getElementById(\'productGrid\').scrollIntoView({behavior:\'smooth\'})">' + b.btnText + ' →</span>' : '') +
          '</div>' : '') +
      '</div>';
    }).join("");

    dotsWrap.innerHTML = banners.map(function(_, i){
      return '<span class="' + (i===0 ? "on" : "") + '" onclick="goToHeroSlide(' + i + ')"></span>';
    }).join("");

    heroBannerIndex = 0;
    clearInterval(heroBannerTimer);
    if (banners.length > 1){
      heroBannerTimer = setInterval(function(){
        goToHeroSlide((heroBannerIndex + 1) % banners.length);
      }, 4000);
    }
  }

  function goToHeroSlide(i){
    var slides = document.querySelectorAll("#heroBannerSlides .hero-slide");
    var dots = document.querySelectorAll("#heroBannerDots span");
    slides.forEach(function(s, idx){ s.style.display = idx === i ? "flex" : "none"; });
    dots.forEach(function(d, idx){ d.classList.toggle("on", idx === i); });
    heroBannerIndex = i;
  }
  window.goToHeroSlide = goToHeroSlide;

  async function setupBannerSync(){
    await waitForFirebase();
    if (typeof window.subscribeToBanners !== "function") return;
    window.subscribeToBanners(function(banners){
      renderHeroBanner(banners);
    });
  }

  // ================= Offers: Flash Sale + Coupons (Firebase real-time) =================
  function renderFlashSale(){
    var section = document.getElementById("flashSaleSection");
    var box = document.getElementById("flashProductsBox");
    if (!section || !box) return;
    var fs = OFFERS.flashSale || {};
    var items = fs.items || [];
    if (!fs.active || items.length === 0){
      section.style.display = "none";
      return;
    }
    section.style.display = "block";
    var subtextEl = document.getElementById("flashSaleSubtext");
    if (subtextEl) subtextEl.textContent = fs.text || "Limited Time Offers";

    box.innerHTML = items.map(function(it){
      var pct = (it.oldPrice && it.oldPrice > it.price) ? Math.round(((it.oldPrice - it.price) / it.oldPrice) * 100) : 0;
      return '<div class="flash-card">' +
        (pct > 0 ? '<span class="flash-badge">' + pct + '% OFF</span>' : '') +
        (it.img ? '<img src="' + it.img + '" alt="' + it.name + '">' : '') +
        '<h4>' + it.name + '</h4>' +
        '<p>' + (it.oldPrice && it.oldPrice > it.price ? '<del>₹' + it.oldPrice + '</del> ' : '') + '₹' + it.price + '</p>' +
      '</div>';
    }).join("");
  }

  async function setupOffersSync(){
    await waitForFirebase();
    if (typeof window.subscribeToOffers !== "function") return;
    window.subscribeToOffers(function(offers){
      OFFERS.flashSale = (offers && offers.flashSale) || {active:false, text:"", items:[]};
      OFFERS.coupons = (offers && offers.coupons) || [];
      renderFlashSale();
    });
  }

  var ALL_REVIEWS = [];
  function getReviewsForProduct(productName){
    if (!productName) return [];
    var key = productName.trim().toLowerCase();
    return ALL_REVIEWS.filter(function(r){ return (r.product||"").trim().toLowerCase() === key; });
  }
  function reviewsSummary(productName){
    var list = getReviewsForProduct(productName);
    if (!list.length) return { count:0, avg:0 };
    var sum = list.reduce(function(s,r){ return s + (r.rating||0); }, 0);
    return { count:list.length, avg: Math.round((sum/list.length)*10)/10 };
  }
  function starsHtml(avg){
    var rounded = Math.round(avg);
    var filled = Array(rounded).fill("★").join("");
    var empty = Array(5-rounded).fill("☆").join("");
    return filled + empty;
  }
  function ratingRowHtml(productName){
    var s = reviewsSummary(productName);
    if (s.count === 0) return '<span class="stars">☆☆☆☆☆</span><span class="rcount">No reviews yet</span>';
    return '<span class="stars">' + starsHtml(s.avg) + '</span><span class="rcount">' + s.avg + ' (' + s.count + ' review' + (s.count>1?"s":"") + ')</span>';
  }
  function renderDetailReviews(id){
    var p = getProduct(id);
    var box = document.getElementById("detailReviewsBox");
    if (!p || !box) return;
    var list = getReviewsForProduct(p.name);
    if (!list.length){
      box.innerHTML = '<div class="no-reviews-msg">Is product par abhi tak koi review nahi hai.</div>';
      return;
    }
    box.innerHTML = list.map(function(r){
      return '<div class="review-item">' +
        '<div class="review-item-top"><span class="review-stars">' + starsHtml(r.rating||0) + '</span><span class="review-name">' + r.name + '</span></div>' +
        '<div class="review-comment">' + r.comment + '</div>' +
        '<div class="review-date">' + (r.date||"") + '</div>' +
      '</div>';
    }).join("");
  }
  async function setupReviewsSync(){
    await waitForFirebase();
    if (typeof window.subscribeToReviews !== "function") return;
    window.subscribeToReviews(function(reviews){
      ALL_REVIEWS = reviews || [];
      refreshAfterCatalogUpdate();
      if (state.currentDetailId) renderDetailReviews(state.currentDetailId);
    });
  }

  // ---- Coupon apply (checkout) ----
  function applyCouponCode(){
    var input = document.getElementById("couponCodeInput");
    var msg = document.getElementById("couponMsg");
    if (!input || !msg) return;
    var code = input.value.trim().toUpperCase();
    if (!code){
      msg.textContent = "Coupon code daalein";
      msg.style.color = "var(--pink)";
      return;
    }
    var match = (OFFERS.coupons || []).filter(function(c){ return c.code === code; })[0];
    if (!match){
      state.appliedCoupon = null;
      msg.textContent = "Invalid coupon code";
      msg.style.color = "var(--pink)";
      renderCheckout();
      return;
    }
    state.appliedCoupon = match;
    msg.textContent = "✅ " + match.code + " applied — " + match.percent + "% off";
    msg.style.color = "green";
    saveData();
    renderCheckout();
  }
  window.applyCouponCode = applyCouponCode;

  function couponDiscountAmount(subtotal){
    if (!state.appliedCoupon) return 0;
    return Math.round(subtotal * state.appliedCoupon.percent / 100);
  }

  function getProduct(id){
    for (var i=0;i<PRODUCTS.length;i++){ if (PRODUCTS[i].id === id) return PRODUCTS[i]; }
    return null;
  }

  function discountPct(p){
    return Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100);
  }

  function productImageHtml(p){
    return p.img ? '<img src="' + p.img + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">' : p.icon;
  }

  function showToast(msg){
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(function(){ t.classList.remove("show"); }, 1600);
  }
  window.showToast = showToast;

  function openSidebar(){
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("sidebarOverlay").classList.add("open");
  }
  function closeSidebar(){
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebarOverlay").classList.remove("open");
  }
  window.openSidebar = openSidebar;
  window.closeSidebar = closeSidebar;

  function showView(name){
    var views = document.querySelectorAll(".view");
    for (var i=0;i<views.length;i++){ views[i].classList.remove("active"); }
    var target = document.getElementById("view-" + name);
    if (target) target.classList.add("active");
    window.scrollTo(0,0);

    var navItems = document.querySelectorAll(".nav-item");
    for (var j=0;j<navItems.length;j++){ navItems[j].classList.remove("active"); }
    var navMap = {home:"home", categoriesView:"categoriesView", cart:"cart", orders:"orders", account:"account"};
    var navKey = navMap[name];
    if (navKey){
      var el = document.querySelector('.nav-item[data-nav="' + navKey + '"]');
      if (el) el.classList.add("active");
    }

    var sideBtns = document.querySelectorAll(".sidebar-btn");
    for (var k=0;k<sideBtns.length;k++){ sideBtns[k].classList.remove("active"); }
    var sideBtn = document.querySelector('.sidebar-btn[data-view="' + name + '"]');
    if (sideBtn) sideBtn.classList.add("active");

    if (name === "wishlist") renderWishlist();
    if (name === "cart") renderCart();
    if (name === "checkout") renderCheckout();
    if (name === "orders") renderOrders();
    if (name === "home") renderGrid();
    if (name === "account") loadMyAccountData();
    if (name === "addresses") renderAddressesList();
    if (name === "coupons") renderMyCoupons();
    if (name === "recentlyViewed") renderRecentlyViewed();
    if (name === "notifications") renderMyNotifications();
    if (name === "settings"){
      var chk = document.getElementById("notifSettingChk");
      if (chk) chk.checked = loadNotificationSetting();
    }
  }
  window.showView = showView;

  function categoryImageHtml(c){
    return c.img ? '<img src="' + c.img + '" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">' : c.icon;
  }

  function renderCategoryRow(){
    var row = document.getElementById("categoriesRow");
    var html = '<div class="cat-item ' + (state.activeCategory === null ? "active" : "") + '" onclick="onCatClick(null)"><div class="cat-circle">▦</div><div class="cat-name">All</div></div>';
    CATEGORIES.forEach(function(c){
      html += '<div class="cat-item ' + (state.activeCategory === c.id ? "active" : "") + '" onclick="onCatClick(\'' + c.id + '\')"><div class="cat-circle">' + categoryImageHtml(c) + '</div><div class="cat-name">' + c.name + '</div></div>';
    });
    row.innerHTML = html;

    var sel = document.getElementById("catSelect");
    var optHtml = '<option value="">All</option>';
    CATEGORIES.forEach(function(c){ optHtml += '<option value="' + c.id + '">' + c.name + '</option>'; });
    sel.innerHTML = optHtml;
    sel.value = state.activeCategory || "";
  }

  function onCatClick(catId){
    state.activeCategory = catId;
    document.getElementById("catSelect").value = catId || "";
    renderCategoryRow();
    renderGrid();
  }
  window.onCatClick = onCatClick;

  function onCatSelect(val){
    state.activeCategory = val || null;
    renderCategoryRow();
    renderGrid();
  }
  window.onCatSelect = onCatSelect;

  function cycleSort(){
    if (state.sortMode === "none") state.sortMode = "lowhigh";
    else if (state.sortMode === "lowhigh") state.sortMode = "highlow";
    else state.sortMode = "none";
    var label = document.getElementById("sortLabel");
    label.textContent = state.sortMode === "lowhigh" ? "↑ Price: Low-High" : state.sortMode === "highlow" ? "↓ Price: High-Low" : "↕️ Sort";
    label.classList.toggle("on", state.sortMode !== "none");
    renderGrid();
  }
  window.cycleSort = cycleSort;

  function toggleDiscountFilter(){
    state.onlyDiscount = !state.onlyDiscount;
    document.getElementById("discFilter").classList.toggle("on", state.onlyDiscount);
    renderGrid();
  }
  window.toggleDiscountFilter = toggleDiscountFilter;

  function clearFilters(){
    state.activeCategory = null;
    state.sortMode = "none";
    state.onlyDiscount = false;
    document.getElementById("searchInput").value = "";
    document.getElementById("mallSelect").value = "all";
    document.getElementById("sortLabel").textContent = "↕️ Sort";
    document.getElementById("sortLabel").classList.remove("on");
    document.getElementById("discFilter").classList.remove("on");
    renderCategoryRow();
    renderGrid();
  }
  window.clearFilters = clearFilters;

  function getFilteredProducts(){
    var query = document.getElementById("searchInput").value.trim().toLowerCase();
    var mallFilter = document.getElementById("mallSelect").value;
    var list = PRODUCTS.filter(function(p){
      if (state.activeCategory && p.cat !== state.activeCategory) return false;
      if (query){
        var hay = (p.name + " " + (p.desc || "") + " " + (p.cat || "")).toLowerCase();
        if (hay.indexOf(query) === -1) return false;
      }
      if (mallFilter === "mall" && !p.mall) return false;
      if (state.onlyDiscount && discountPct(p) < 50) return false;
      return true;
    });
    if (state.sortMode === "lowhigh") list.sort(function(a,b){ return a.price - b.price; });
    if (state.sortMode === "highlow") list.sort(function(a,b){ return b.price - a.price; });
    return list;
  }

  function availableStock(p){
    return (p && typeof p.stock === "number") ? p.stock : Infinity;
  }

  function productCardHtml(p){
    var inCart = !!state.cart[p.id];
    var wished = !!state.wishlist[p.id];
    var stock = availableStock(p);
    var outOfStock = stock <= 0;
    var atMaxStock = !outOfStock && inCart && state.cart[p.id] >= stock;
    var btnLabel = outOfStock ? "Out of Stock" : (inCart ? "✓ In Cart (" + state.cart[p.id] + ")" : "🛒 Add to Cart");
    var btnDisabledAttr = outOfStock ? "disabled" : "";
    return '' +
    '<div class="product-card">' +
      '<span class="heart-btn ' + (wished ? "active" : "") + '" onclick="toggleWishlist(' + p.id + ', event)">' + (wished ? "♥️" : "♡") + '</span>' +
      '<div class="product-img-wrap" onclick="openDetail(' + p.id + ')">' + productImageHtml(p) + '</div>' +
      (p.mall ? '<span class="badge-mall">✓ Mall</span>' : '') +
      (outOfStock ? '<span class="badge-mall" style="background:#EF4444;">Out of Stock</span>' : (stock <= 5 ? '<span class="badge-mall" style="background:#F59E0B;">Only ' + stock + ' left</span>' : '')) +
      '<div class="product-name" onclick="openDetail(' + p.id + ')">' + p.name + '</div>' +
      '<div class="rating-row">' + ratingRowHtml(p.name) + '</div>' +
      '<div class="price-row">' +
        '<span class="price-now">₹' + p.price + '</span>' +
        '<span class="price-old">₹' + p.oldPrice + '</span>' +
        '<span class="price-off">' + discountPct(p) + '% off</span>' +
      '</div>' +
      '<button class="add-cart-btn ' + (inCart ? "in-cart" : "") + '" ' + btnDisabledAttr + ' onclick="quickAddToCart(' + p.id + ', event)">' + btnLabel + '</button>' +
    '</div>';
  }

  function renderGrid(){
    renderCategoryRow();
    var grid = document.getElementById("productGrid");
    var list = getFilteredProducts();
    var clearBtn = document.getElementById("clearFilterBtn");
    var filtersActive = state.activeCategory || state.sortMode !== "none" || state.onlyDiscount || document.getElementById("searchInput").value.trim() !== "" || document.getElementById("mallSelect").value !== "all";
    clearBtn.style.display = filtersActive ? "inline" : "none";

    if (list.length === 0){
      grid.innerHTML = "";
      document.getElementById("emptyMsg").style.display = "block";
      return;
    }
    document.getElementById("emptyMsg").style.display = "none";
    grid.innerHTML = list.map(productCardHtml).join("");
  }
  window.renderGrid = renderGrid;

  function renderAllCategoriesList(){
    var wrap = document.getElementById("allCategoriesList");
    var html = "";
    CATEGORIES.forEach(function(c){
      var count = PRODUCTS.filter(function(p){ return p.cat === c.id; }).length;
      html += '<div class="cart-row" onclick="onCatClick(\'' + c.id + '\');showView(\'home\')" style="cursor:pointer;">' +
        '<div class="cart-img" style="font-size:30px;">' + categoryImageHtml(c) + '</div>' +
        '<div class="cart-info"><div class="cart-name" style="font-size:15px;font-weight:600;">' + c.name + '</div><div style="color:var(--grey-text);font-size:12.5px;">' + count + ' products</div></div>' +
        '<span style="color:#aaa;">›</span>' +
      '</div>';
    });
    wrap.innerHTML = html;
  }

  // ================= Auth gate for Cart / Wishlist / Buy =================
  // Guest users products dekh sakte hain bina rok-tok, lekin cart/wishlist/buy
  // par login popup dikhta hai. Login/signup successful hote hi (firebase.js
  // ke onAuthStateChanged se) yehi action apne aap complete ho jaata hai.
  var pendingAuthAction = null;

  function isLoggedIn(){
    return !!window.currentUser;
  }

  function requireLogin(retryFn){
    pendingAuthAction = retryFn || null;
    showToast("Continue karne ke liye login karein 🔒");
    if (typeof window.showLogin === "function") window.showLogin();
  }

  window.runPendingAuthAction = function(){
    if (typeof pendingAuthAction === "function"){
      var fn = pendingAuthAction;
      pendingAuthAction = null;
      setTimeout(fn, 200);
    }
  };

  function toggleWishlist(id, ev){
    if (ev) ev.stopPropagation();
    if (!isLoggedIn()){ requireLogin(function(){ toggleWishlist(id); }); return; }
    if (state.wishlist[id]) delete state.wishlist[id];
    else state.wishlist[id] = true;
    updateHeaderBadges();
    saveData();
    var activeViewEl = document.querySelector(".view.active");
    if (activeViewEl && activeViewEl.id === "view-home") renderGrid();
    if (activeViewEl && activeViewEl.id === "view-wishlist") renderWishlist();
    showToast(state.wishlist[id] ? "Wishlist mein add ho gaya ♥️" : "Wishlist se hata diya");
  }
  window.toggleWishlist = toggleWishlist;

  function renderWishlist(){
    var ids = Object.keys(state.wishlist);
    var grid = document.getElementById("wishlistGrid");
    if (ids.length === 0){
      grid.innerHTML = "";
      document.getElementById("wishlistEmpty").style.display = "block";
      return;
    }
    document.getElementById("wishlistEmpty").style.display = "none";
    grid.innerHTML = ids.map(function(idStr){ return productCardHtml(getProduct(parseInt(idStr,10))); }).join("");
  }

  function quickAddToCart(id, ev){
    if (ev) ev.stopPropagation();
    if (!isLoggedIn()){ requireLogin(function(){ quickAddToCart(id); }); return; }
    var p = getProduct(id);
    var stock = availableStock(p);
    if (stock <= 0){ showToast("Ye product abhi stock mein nahi hai"); return; }
    var current = state.cart[id] || 0;
    if (current + 1 > stock){ showToast("Sirf " + stock + " item available hai"); return; }
    state.cart[id] = current + 1;
    saveData();
    updateHeaderBadges();
    var activeViewEl = document.querySelector(".view.active");
    if (activeViewEl && activeViewEl.id === "view-home") renderGrid();
    if (activeViewEl && activeViewEl.id === "view-wishlist") renderWishlist();
    showToast("Cart mein add ho gaya 🛒");
  }
  window.quickAddToCart = quickAddToCart;

  function updateHeaderBadges(){
    var cartCount = Object.values(state.cart).reduce(function(a,b){ return a+b; }, 0);
    var wishCount = Object.keys(state.wishlist).length;
    var cartBadge = document.getElementById("cartCount");
    var wishBadge = document.getElementById("wishCount");
    cartBadge.textContent = cartCount;
    cartBadge.style.display = cartCount > 0 ? "flex" : "none";
    wishBadge.textContent = wishCount;
    wishBadge.style.display = wishCount > 0 ? "flex" : "none";
    var navCartBadge = document.getElementById("navCartCount");
    if (navCartBadge){
      navCartBadge.textContent = cartCount;
      navCartBadge.style.display = cartCount > 0 ? "flex" : "none";
    }
    var sideCartBadge = document.getElementById("sidebarCartCount");
    if (sideCartBadge){
      sideCartBadge.textContent = cartCount;
      sideCartBadge.style.display = cartCount > 0 ? "flex" : "none";
    }
  }

  function openDetail(id){
    var p = getProduct(id);
    if (!p) return;
    state.currentDetailId = id;
    state.detailQty = 1;
    trackRecentlyViewed(id);
    document.getElementById("detailImg").innerHTML = productImageHtml(p);
    document.getElementById("detailMallBadge").style.display = p.mall ? "inline-flex" : "none";
    document.getElementById("detailName").textContent = p.name;
    document.getElementById("detailRatingRow").innerHTML = ratingRowHtml(p.name);
    document.getElementById("detailPrice").textContent = "₹" + p.price;
    document.getElementById("detailOldPrice").textContent = "₹" + p.oldPrice;
    document.getElementById("detailOff").textContent = discountPct(p) + "% off";
    document.getElementById("detailDesc").textContent = p.desc;
    document.getElementById("detailQty").textContent = "1";
    renderDetailReviews(id);
    var stock = availableStock(p);
    var btn = document.getElementById("detailAddBtn");
    var buyBtn = document.querySelector(".detail-actions .btn-secondary");
    if (stock <= 0){
      btn.textContent = "Out of Stock";
      btn.disabled = true;
      if (buyBtn) buyBtn.disabled = true;
    } else {
      btn.disabled = false;
      if (buyBtn) buyBtn.disabled = false;
      btn.textContent = state.cart[id] ? "✓ In Cart (" + state.cart[id] + ")" : "Add to Cart";
    }
    showView("detail");
  }
  window.openDetail = openDetail;

  function changeDetailQty(delta){
    var p = getProduct(state.currentDetailId);
    var stock = availableStock(p);
    var next = state.detailQty + delta;
    if (next < 1) next = 1;
    if (next > 20) next = 20;
    if (next > stock){ next = stock; showToast("Sirf " + stock + " item available hai"); }
    state.detailQty = next;
    document.getElementById("detailQty").textContent = next;
  }
  window.changeDetailQty = changeDetailQty;

  function addDetailToCart(){
    var id = state.currentDetailId;
    if (!isLoggedIn()){ requireLogin(function(){ addDetailToCart(); }); return; }
    var p = getProduct(id);
    var stock = availableStock(p);
    if (stock <= 0){ showToast("Ye product abhi stock mein nahi hai"); return; }
    var current = state.cart[id] || 0;
    if (current + state.detailQty > stock){ showToast("Sirf " + stock + " item available hai"); return; }
    state.cart[id] = current + state.detailQty;
    updateHeaderBadges();
    saveData();
    document.getElementById("detailAddBtn").textContent = "✓ In Cart (" + state.cart[id] + ")";
    showToast("Cart mein add ho gaya 🛒");
  }
  window.addDetailToCart = addDetailToCart;

  function buyNowDetail(){
    var id = state.currentDetailId;
    if (!isLoggedIn()){ requireLogin(function(){ buyNowDetail(); }); return; }
    var p = getProduct(id);
    var stock = availableStock(p);
    if (stock <= 0){ showToast("Ye product abhi stock mein nahi hai"); return; }
    var current = state.cart[id] || 0;
    if (current + state.detailQty > stock){ showToast("Sirf " + stock + " item available hai"); return; }
    state.cart[id] = current + state.detailQty;
    updateHeaderBadges();
    saveData();
    showView("checkout");
  }
  window.buyNowDetail = buyNowDetail;

  function cartRowHtml(id, qty){
    var p = getProduct(parseInt(id,10));
    if (!p) return "";
    return '' +
    '<div class="cart-row">' +
      '<div class="cart-img">' + productImageHtml(p) + '</div>' +
      '<div class="cart-info">' +
        '<div class="cart-name">' + p.name + '</div>' +
        '<div class="price-now">₹' + p.price + '</div>' +
        '<div class="cart-qty-row">' +
          '<button class="cart-qty-btn" onclick="updateCartQty(' + p.id + ',-1)">−</button>' +
          '<span>' + qty + '</span>' +
          '<button class="cart-qty-btn" onclick="updateCartQty(' + p.id + ',1)">+</button>' +
          '<span class="remove-link" onclick="removeFromCart(' + p.id + ')">Remove</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderCart(){
    var ids = Object.keys(state.cart);
    var listWrap = document.getElementById("cartList");
    if (ids.length === 0){
      listWrap.innerHTML = "";
      document.getElementById("cartEmpty").style.display = "block";
      document.getElementById("cartSummary").style.display = "none";
      return;
    }
    document.getElementById("cartEmpty").style.display = "none";
    document.getElementById("cartSummary").style.display = "flex";
    listWrap.innerHTML = ids.map(function(id){ return cartRowHtml(id, state.cart[id]); }).join("");
    var total = 0;
    ids.forEach(function(id){
      var p = getProduct(parseInt(id,10));
      total += p.price * state.cart[id];
    });
    document.getElementById("cartTotalAmt").textContent = total;
  }
  window.renderCart = renderCart;

  function updateCartQty(id, delta){
    var p = getProduct(parseInt(id,10));
    var stock = availableStock(p);
    var next = (state.cart[id] || 0) + delta;
    if (delta > 0 && next > stock){
      showToast("Sirf " + stock + " item available hai");
      return;
    }
    if (next <= 0) delete state.cart[id];
    else state.cart[id] = next;
    updateHeaderBadges();
    saveData();
    renderCart();
  }
  window.updateCartQty = updateCartQty;

  function removeFromCart(id){
    delete state.cart[id];
    updateHeaderBadges();
    saveData();
    renderCart();
    showToast("Cart se hata diya");
  }
  window.removeFromCart = removeFromCart;

  function cartTotalAmount(){
    var total = 0;
    Object.keys(state.cart).forEach(function(id){
      var p = getProduct(parseInt(id,10));
      total += p.price * state.cart[id];
    });
    return total;
  }

  function renderCheckout(){
    var ids = Object.keys(state.cart);
    var box = document.getElementById("checkoutSummary");
    if (ids.length === 0){
      box.innerHTML = '<div>Cart khali hai. Pehle products add karein.</div>';
      return;
    }
    var html = "";
    ids.forEach(function(id){
      var p = getProduct(parseInt(id,10));
      html += '<div class="row"><span>' + p.name + ' x' + state.cart[id] + '</span><span>₹' + (p.price*state.cart[id]) + '</span></div>';
    });
    var subtotal = cartTotalAmount();
    var discount = couponDiscountAmount(subtotal);
    if (state.appliedCoupon && discount > 0){
      html += '<div class="row" style="border-top:1px solid #e0cfe8;margin-top:8px;padding-top:8px;"><span>Subtotal</span><span>₹' + subtotal + '</span></div>';
      html += '<div class="row" style="color:green;"><span>Coupon (' + state.appliedCoupon.code + ')</span><span>−₹' + discount + '</span></div>';
      html += '<div class="row" style="font-weight:800;"><span>Total</span><span>₹' + (subtotal - discount) + '</span></div>';
    } else {
      html += '<div class="row" style="border-top:1px solid #e0cfe8;margin-top:8px;padding-top:8px;font-weight:800;"><span>Total</span><span>₹' + subtotal + '</span></div>';
    }
    box.innerHTML = html;

    var couponMsg = document.getElementById("couponMsg");
    var couponInput = document.getElementById("couponCodeInput");
    if (couponMsg && couponInput){
      if (state.appliedCoupon){
        couponInput.value = state.appliedCoupon.code;
        couponMsg.textContent = "✅ " + state.appliedCoupon.code + " applied — " + state.appliedCoupon.percent + "% off";
        couponMsg.style.color = "green";
      } else {
        couponMsg.textContent = "";
      }
    }
  }
  window.renderCheckout = renderCheckout;

  function finalCheckoutTotal(){
    var subtotal = cartTotalAmount();
    return subtotal - couponDiscountAmount(subtotal);
  }

  function placeOrder(){
    var ids = Object.keys(state.cart);
    if (ids.length === 0){
      showToast("Cart khali hai!");
      return;
    }

    // Final stock check — catches cases where stock changed (sold out / reduced)
    // after the item was added to cart, so we never confirm an order we can't fulfil.
    var stockIssue = null;
    for (var i=0; i<ids.length; i++){
      var pChk = getProduct(parseInt(ids[i],10));
      var stockChk = availableStock(pChk);
      if (stockChk <= 0){
        delete state.cart[ids[i]];
        stockIssue = (pChk ? pChk.name : "Ek product") + " ab stock mein nahi hai, cart se hata diya gaya";
      } else if (state.cart[ids[i]] > stockChk){
        state.cart[ids[i]] = stockChk;
        stockIssue = (pChk ? pChk.name : "Ek product") + " ka sirf " + stockChk + " stock bacha hai, quantity adjust ho gayi";
      }
    }
    if (stockIssue){
      saveData();
      updateHeaderBadges();
      renderCart();
      renderCheckout();
      showToast(stockIssue + " — dobara Place Order dabayein");
      return;
    }

    var name = document.getElementById("chkName").value.trim();
    var phone = document.getElementById("chkPhone").value.trim();
    var address = document.getElementById("chkAddress").value.trim();
    if (!name || !phone || !address){
      showToast("Kripya sabhi fields bharein");
      return;
    }
    if (!/^[0-9]{10}$/.test(phone)){
      showToast("Sahi 10-digit phone number daalein");
      return;
    }

    var items = ids.map(function(id){
      var p = getProduct(parseInt(id,10));
      return {id: p.id, name: p.name, qty: state.cart[id], price: p.price};
    });
    var subtotal = cartTotalAmount();
    var discount = couponDiscountAmount(subtotal);
    var order = {
      orderId: "KM" + Date.now().toString().slice(-8),
      date: new Date().toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}),
      items: items,
      subtotal: subtotal,
      coupon: state.appliedCoupon ? state.appliedCoupon.code : null,
      discount: discount,
      total: subtotal - discount,
      name: name, phone: phone, address: address,
      payment: document.getElementById("chkPayment").value
    };
    state.orders.unshift(order);
    state.cart = {};
    state.appliedCoupon = null;
    updateHeaderBadges();

    document.getElementById("chkName").value = "";
    document.getElementById("chkPhone").value = "";
    document.getElementById("chkAddress").value = "";
    if (document.getElementById("couponCodeInput")) document.getElementById("couponCodeInput").value = "";
    if (document.getElementById("couponMsg")) document.getElementById("couponMsg").textContent = "";

    showToast("Order place ho gaya! 🎉");
    showView("orders");
    saveData();

    // Order ko Firestore me bhi save karo taaki admin panel me dikhe.
    // Local order already confirm ho chuka hai (localStorage me), isliye
    // agar Firestore save fail ho (offline etc.) to bhi user experience
    // affect nahi hota — sirf admin panel ko sync hone me thodi der lagegi.
    if (typeof window.saveOrderToFirestore === "function") {
      window.saveOrderToFirestore(order);
    }
  }
  window.placeOrder = placeOrder;

  var liveOrdersByOrderId = {};
  var ORDER_STATUS_COLORS = { Pending:"#F59E0B", Shipped:"#3B82F6", Delivered:"#22C55E", Cancelled:"#EF4444" };

  function renderOrders(){
    var wrap = document.getElementById("ordersList");
    if (state.orders.length === 0){
      wrap.innerHTML = "";
      document.getElementById("ordersEmpty").style.display = "block";
      return;
    }
    document.getElementById("ordersEmpty").style.display = "none";
    wrap.innerHTML = state.orders.map(function(o){
      var itemsHtml = o.items.map(function(it){ return it.name + ' x' + it.qty; }).join(", ");
      var liveStatus = liveOrdersByOrderId[o.orderId] || "Pending";
      var color = ORDER_STATUS_COLORS[liveStatus] || "#F59E0B";
      return '' +
      '<div class="order-card">' +
        '<div class="order-id">Order ID: ' + o.orderId + ' &middot; ' + o.date + '</div>' +
        '<div style="margin:8px 0;font-size:14px;">' + itemsHtml + '</div>' +
        (o.coupon ? '<div style="font-size:12.5px;color:green;">Coupon applied: ' + o.coupon + ' (−₹' + (o.discount||0) + ')</div>' : '') +
        '<div style="font-weight:700;">Total: ₹' + o.total + ' &middot; ' + o.payment + '</div>' +
        '<span class="order-status" style="background:' + color + '22;color:' + color + ';">' + liveStatus + '</span>' +
      '</div>';
    }).join("");
  }
  window.renderOrders = renderOrders;

  function resetAllData(){
    if (!confirm("Sabhi cart, wishlist aur orders data reset ho jayega. Continue?")) return;
    state.cart = {};
    state.wishlist = {};
    state.orders = [];
    updateHeaderBadges();
    showView("home");
    showToast("Demo data reset ho gaya");
  }
  window.resetAllData = resetAllData;

  // ================= My Account (profile, addresses, live order stats, coupons, recently viewed, settings, notifications) =================
  var myProfile = { name:"", phone:"", addresses:[] };
  var myOrdersUnsub = null;

  function renderProfileHeader(){
    var user = window.currentUser;
    document.getElementById("profileNameDisplay").textContent = myProfile.name || (user ? user.email.split("@")[0] : "Khurja Mart Customer");
    var phoneLine = document.getElementById("profilePhoneLine");
    if (myProfile.phone){
      phoneLine.style.display = "block";
      document.getElementById("profilePhoneDisplay").textContent = myProfile.phone;
    } else {
      phoneLine.style.display = "none";
    }
  }

  function renderAccountStats(){
    document.getElementById("statAddresses").textContent = (myProfile.addresses||[]).length + " Saved";
    document.getElementById("statWishlist").textContent = Object.keys(state.wishlist).length + " Items";
    document.getElementById("statCoupons").textContent = (OFFERS.coupons||[]).length + " Available";
  }

  function renderOrderStats(orders){
    var counts = { Pending:0, Shipped:0, Delivered:0, Cancelled:0 };
    orders.forEach(function(o){
      var st = o.status || "Pending";
      if (counts[st] !== undefined) counts[st]++;
    });
    document.getElementById("ordAll").textContent = orders.length;
    document.getElementById("ordPending").textContent = counts.Pending;
    document.getElementById("ordShipped").textContent = counts.Shipped;
    document.getElementById("ordDelivered").textContent = counts.Delivered;
    document.getElementById("ordCancelled").textContent = counts.Cancelled;
  }

  function loadMyAccountData(){
    if (!window.currentUser){
      myProfile = { name:"", phone:"", addresses:[] };
      renderAccountStats();
      return;
    }
    if (typeof window.getUserProfile !== "function") { setTimeout(loadMyAccountData, 200); return; }
    window.getUserProfile().then(function(data){
      myProfile = Object.assign({ name:"", phone:"", addresses:[] }, data || {});
      renderProfileHeader();
      renderAccountStats();
      renderAddressesList();
      if (myProfile.phone && typeof window.subscribeToMyOrders === "function"){
        if (myOrdersUnsub) myOrdersUnsub();
        myOrdersUnsub = window.subscribeToMyOrders(myProfile.phone, function(orders){
          liveOrdersByOrderId = {};
          orders.forEach(function(o){ liveOrdersByOrderId[o.orderId] = o.status; });
          renderOrderStats(orders);
          renderOrders();
          checkForNewOrderNotifications(orders);
        });
      } else {
        renderOrderStats([]);
      }
    });
  }
  window.loadMyAccountData = loadMyAccountData;

  // ---- Edit Profile ----
  function openEditProfile(){
    document.getElementById("editProfileName").value = myProfile.name || "";
    document.getElementById("editProfilePhone").value = myProfile.phone || "";
    document.getElementById("editProfileModal").style.display = "flex";
  }
  window.openEditProfile = openEditProfile;
  function closeEditProfile(){
    document.getElementById("editProfileModal").style.display = "none";
  }
  window.closeEditProfile = closeEditProfile;
  function saveEditProfile(){
    var name = document.getElementById("editProfileName").value.trim();
    var phone = document.getElementById("editProfilePhone").value.trim();
    if (!name){ showToast("Naam daalein"); return; }
    myProfile.name = name;
    myProfile.phone = phone;
    window.saveUserProfile({ name:name, phone:phone }).then(function(ok){
      if (ok){
        showToast("Profile update ho gaya ✅");
        renderProfileHeader();
        closeEditProfile();
        loadMyAccountData();
      } else {
        showToast("Save nahi hua, dobara try karein");
      }
    });
  }
  window.saveEditProfile = saveEditProfile;

  // ---- My Addresses ----
  function renderAddressesList(){
    var wrap = document.getElementById("addressesList");
    if (!wrap) return;
    var list = myProfile.addresses || [];
    var emptyEl = document.getElementById("addressesEmpty");
    if (emptyEl) emptyEl.style.display = list.length === 0 ? "block" : "none";
    wrap.innerHTML = list.map(function(a){
      return '<div class="panel-card"><div class="account-row">' +
        '<span><b>' + a.label + '</b><br><small>' + a.line + ' &middot; ' + a.phone + '</small></span>' +
        '<span style="display:flex;gap:14px;">' +
          '<span onclick="editAddress(\'' + a.id + '\')" style="color:var(--navy);">✏️</span>' +
          '<span onclick="deleteAddress(\'' + a.id + '\')" style="color:var(--pink,#E74C3C);">🗑️</span>' +
        '</span>' +
      '</div></div>';
    }).join("");
  }
  window.renderAddressesList = renderAddressesList;

  function openAddAddress(){
    if (!window.currentUser){ closeAddressModal(); requireLogin(function(){ openAddAddress(); }); return; }
    document.getElementById("addressModalTitle").textContent = "Add Address";
    document.getElementById("addressEditId").value = "";
    document.getElementById("addressLabel").value = "";
    document.getElementById("addressLine").value = "";
    document.getElementById("addressPhone").value = "";
    document.getElementById("addressModal").style.display = "flex";
  }
  window.openAddAddress = openAddAddress;

  function editAddress(id){
    var a = (myProfile.addresses||[]).filter(function(x){ return x.id === id; })[0];
    if (!a) return;
    document.getElementById("addressModalTitle").textContent = "Edit Address";
    document.getElementById("addressEditId").value = id;
    document.getElementById("addressLabel").value = a.label;
    document.getElementById("addressLine").value = a.line;
    document.getElementById("addressPhone").value = a.phone;
    document.getElementById("addressModal").style.display = "flex";
  }
  window.editAddress = editAddress;

  function closeAddressModal(){
    document.getElementById("addressModal").style.display = "none";
  }
  window.closeAddressModal = closeAddressModal;

  function saveAddress(){
    var label = document.getElementById("addressLabel").value.trim();
    var line = document.getElementById("addressLine").value.trim();
    var phone = document.getElementById("addressPhone").value.trim();
    var editId = document.getElementById("addressEditId").value;
    if (!label || !line || !phone){ showToast("Sabhi fields bharein"); return; }
    if (!myProfile.addresses) myProfile.addresses = [];
    if (editId){
      var idx = myProfile.addresses.findIndex(function(a){ return a.id === editId; });
      if (idx !== -1) myProfile.addresses[idx] = { id:editId, label:label, line:line, phone:phone };
    } else {
      myProfile.addresses.push({ id: "addr" + Date.now(), label:label, line:line, phone:phone });
    }
    window.saveUserProfile({ addresses: myProfile.addresses }).then(function(ok){
      if (ok){
        showToast("Address save ho gaya ✅");
        closeAddressModal();
        renderAddressesList();
        renderAccountStats();
      } else {
        showToast("Save nahi hua, dobara try karein");
      }
    });
  }
  window.saveAddress = saveAddress;

  function deleteAddress(id){
    if (!confirm("Ye address delete karna hai?")) return;
    myProfile.addresses = (myProfile.addresses||[]).filter(function(a){ return a.id !== id; });
    window.saveUserProfile({ addresses: myProfile.addresses }).then(function(ok){
      if (ok){
        showToast("Address delete ho gaya");
        renderAddressesList();
        renderAccountStats();
      }
    });
  }
  window.deleteAddress = deleteAddress;

  // ---- My Coupons ----
  function renderMyCoupons(){
    var wrap = document.getElementById("myCouponsList");
    if (!wrap) return;
    var list = OFFERS.coupons || [];
    document.getElementById("myCouponsEmpty").style.display = list.length === 0 ? "block" : "none";
    wrap.innerHTML = list.map(function(c){
      return '<div class="coupon-card">' +
        '<div><div class="coupon-code">' + c.code + '</div><div class="coupon-desc">' + c.percent + '% off on your order</div></div>' +
        '<button class="coupon-copy-btn" onclick="copyCouponCode(\'' + c.code + '\')">Copy</button>' +
      '</div>';
    }).join("");
  }
  window.renderMyCoupons = renderMyCoupons;

  function copyCouponCode(code){
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(code).then(function(){ showToast("Coupon code copy ho gaya: " + code); });
    } else {
      showToast("Coupon code: " + code);
    }
  }
  window.copyCouponCode = copyCouponCode;

  // ---- Recently Viewed ----
  var RECENTLY_VIEWED_KEY = "khurjaMartRecentlyViewed";
  function loadRecentlyViewed(){
    try{ return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || "[]"); }catch(e){ return []; }
  }
  function trackRecentlyViewed(id){
    var list = loadRecentlyViewed();
    list = list.filter(function(x){ return x !== id; });
    list.unshift(id);
    if (list.length > 20) list = list.slice(0, 20);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list));
  }
  function renderRecentlyViewed(){
    var grid = document.getElementById("recentlyViewedGrid");
    if (!grid) return;
    var ids = loadRecentlyViewed();
    var products = ids.map(function(id){ return getProduct(id); }).filter(Boolean);
    document.getElementById("recentlyViewedEmpty").style.display = products.length === 0 ? "block" : "none";
    grid.innerHTML = products.map(productCardHtml).join("");
  }
  window.renderRecentlyViewed = renderRecentlyViewed;

  // ---- Settings ----
  var NOTIF_SETTING_KEY = "khurjaMartNotifSetting";
  function loadNotificationSetting(){
    var v = localStorage.getItem(NOTIF_SETTING_KEY);
    return v === null ? true : v === "1";
  }
  function saveNotificationSetting(){
    var chk = document.getElementById("notifSettingChk");
    localStorage.setItem(NOTIF_SETTING_KEY, chk.checked ? "1" : "0");
    showToast(chk.checked ? "Order update alerts ON" : "Order update alerts OFF");
  }
  window.saveNotificationSetting = saveNotificationSetting;

  // ---- Notifications (real — generated from actual order status changes) ----
  var SEEN_ORDER_STATUS_KEY = "khurjaMartSeenOrderStatus";
  var NOTIF_LOG_KEY = "khurjaMartMyNotifLog";
  function loadSeenStatus(){
    try{ return JSON.parse(localStorage.getItem(SEEN_ORDER_STATUS_KEY) || "{}"); }catch(e){ return {}; }
  }
  function loadNotifLog(){
    try{ return JSON.parse(localStorage.getItem(NOTIF_LOG_KEY) || "[]"); }catch(e){ return []; }
  }
  function checkForNewOrderNotifications(orders){
    if (!loadNotificationSetting()) return;
    var seen = loadSeenStatus();
    var log = loadNotifLog();
    var changed = false;
    orders.forEach(function(o){
      if (seen[o.orderId] !== o.status){
        seen[o.orderId] = o.status;
        log.unshift({ text: "Order " + o.orderId + " status: " + o.status, time: Date.now() });
        changed = true;
      }
    });
    if (changed){
      if (log.length > 30) log = log.slice(0, 30);
      localStorage.setItem(SEEN_ORDER_STATUS_KEY, JSON.stringify(seen));
      localStorage.setItem(NOTIF_LOG_KEY, JSON.stringify(log));
    }
    renderNotifBadge();
  }
  function renderNotifBadge(){
    var badge = document.getElementById("acctNotifBadge");
    if (!badge) return;
    var log = loadNotifLog();
    var unseenCount = log.length; // simple: shows total recent updates; clears when notifications page opened
    if (unseenCount > 0){ badge.textContent = unseenCount > 9 ? "9+" : unseenCount; badge.style.display = "flex"; }
    else badge.style.display = "none";
  }
  function renderMyNotifications(){
    var wrap = document.getElementById("myNotificationsList");
    if (!wrap) return;
    var log = loadNotifLog();
    document.getElementById("myNotificationsEmpty").style.display = log.length === 0 ? "block" : "none";
    wrap.innerHTML = log.map(function(n){
      var mins = Math.floor((Date.now()-n.time)/60000);
      var timeText = mins < 1 ? "abhi abhi" : mins < 60 ? mins+" min pehle" : Math.floor(mins/60)+" ghante pehle";
      return '<div class="notif-item"><span class="notif-item-icon">🔔</span><div><div class="notif-item-text">' + n.text + '</div><div class="notif-item-time">' + timeText + '</div></div></div>';
    }).join("");
    // mark all as seen (badge clears)
    localStorage.setItem(NOTIF_LOG_KEY, "[]");
    renderNotifBadge();
  }
  window.renderMyNotifications = renderMyNotifications;

  document.addEventListener("DOMContentLoaded", function(){
    loadData();
    renderCategoryRow();
    renderAllCategoriesList();
    renderGrid();
    updateHeaderBadges();
    setupCatalogSync();
    setupCategorySync();
    setupBannerSync();
    setupOffersSync();
    setupReviewsSync();
    renderNotifBadge();
  });

  // ---- PWA: service worker + install prompt ----
  if ("serviceWorker" in navigator){
    window.addEventListener("load", function(){
      navigator.serviceWorker.register("sw.js").catch(function(err){
        console.warn("Service worker registration failed:", err);
      });
    });
  }

  var deferredInstallPrompt = null;
  window.addEventListener("beforeinstallprompt", function(e){
    e.preventDefault();
    deferredInstallPrompt = e;
    var banner = document.getElementById("installBanner");
    if (banner) banner.style.display = "flex";
  });

  document.addEventListener("DOMContentLoaded", function(){
    var installBtn = document.getElementById("installBtn");
    var dismissBtn = document.getElementById("dismissInstallBtn");
    var banner = document.getElementById("installBanner");

    if (installBtn){
      installBtn.addEventListener("click", function(){
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        deferredInstallPrompt.userChoice.then(function(){
          deferredInstallPrompt = null;
          banner.style.display = "none";
        });
      });
    }
    if (dismissBtn){
      dismissBtn.addEventListener("click", function(){
        banner.style.display = "none";
      });
    }
    window.addEventListener("appinstalled", function(){
      banner.style.display = "none";
      showToast("Khurja Mart install ho gaya! 🎉");
    });
  });
})();

var authMode = "login";

window.showLogin = function () {
    switchAuthTab("login");
    var email = document.getElementById("loginEmail");
    var pass = document.getElementById("loginPassword");
    if (email) email.value = "";
    if (pass) { pass.value = ""; pass.type = "password"; }
    document.getElementById("loginModal").style.display = "flex";
};

window.closeLogin = function () {
    document.getElementById("loginModal").style.display = "none";
};

window.switchAuthTab = function (mode) {
    authMode = mode;
    var loginTab = document.getElementById("tabLogin");
    var signupTab = document.getElementById("tabSignup");
    var underline = document.getElementById("authTabUnderline");
    var title = document.getElementById("authTitle");
    var subtitle = document.getElementById("authSubtitle");
    var optionsRow = document.getElementById("authOptionsRow");
    var submitLabel = document.getElementById("authSubmitLabel");
    var bottomSignup = document.getElementById("authBottomSignupLink");
    var bottomLogin = document.getElementById("authBottomLoginLink");
    if (!loginTab) return;
    if (mode === "login") {
        loginTab.classList.add("active");
        signupTab.classList.remove("active");
        underline.style.transform = "translateX(0%)";
        title.textContent = "Welcome Back";
        subtitle.textContent = "Login to your account to continue";
        optionsRow.style.display = "flex";
        submitLabel.textContent = "Login";
        if (bottomSignup) bottomSignup.style.display = "block";
        if (bottomLogin) bottomLogin.style.display = "none";
    } else {
        signupTab.classList.add("active");
        loginTab.classList.remove("active");
        underline.style.transform = "translateX(100%)";
        title.textContent = "Create Account";
        subtitle.textContent = "Sign up to start shopping with us";
        optionsRow.style.display = "none";
        submitLabel.textContent = "Sign Up";
        if (bottomSignup) bottomSignup.style.display = "none";
        if (bottomLogin) bottomLogin.style.display = "block";
    }
};

window.toggleAuthPassword = function () {
    var input = document.getElementById("loginPassword");
    var btn = document.getElementById("authEyeBtn");
    if (!input) return;
    if (input.type === "password") {
        input.type = "text";
        btn.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a2.5 2.5 0 0 0 3.4 3.4M7.4 7.5C4.9 9 3 12 3 12s4 7 11 7c1.8 0 3.4-.4 4.8-1.1M14.5 5.2C13.7 5.1 12.9 5 12 5c-.6 0-1.1 0-1.7.1" stroke="#8A8F98" stroke-width="1.7" stroke-linecap="round"/></svg>';
    } else {
        input.type = "password";
        btn.innerHTML = '<svg width="19" height="19" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" stroke="#8A8F98" stroke-width="1.7"/><circle cx="12" cy="12" r="3" stroke="#8A8F98" stroke-width="1.7"/></svg>';
    }
};

window.submitAuth = function () {
    if (authMode === "login") window.loginUser();
    else window.signUpUser();
};