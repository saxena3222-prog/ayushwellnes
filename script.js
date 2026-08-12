
(function(){
  // ---------- Hero video: reliable mobile autoplay ----------
  const heroVideo = document.getElementById('heroVideo');
  if(heroVideo){
    heroVideo.muted = true;          // some mobile WebViews only honor the JS property, not the HTML attribute
    heroVideo.playsInline = true;
    const tryPlay = () => {
      const p = heroVideo.play();
      if(p && p.catch) p.catch(() => {
        // Autoplay blocked (e.g. data-saver mode) — start on first tap anywhere, poster stays visible till then
        const resume = () => { heroVideo.play().catch(()=>{}); document.removeEventListener('touchstart', resume); document.removeEventListener('click', resume); };
        document.addEventListener('touchstart', resume, {once:true, passive:true});
        document.addEventListener('click', resume, {once:true});
      });
    };
    if(heroVideo.readyState >= 2) tryPlay();
    else heroVideo.addEventListener('loadeddata', tryPlay, {once:true});
    // Pause when tab/app is in the background to save battery & mobile data, resume when visible again
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) heroVideo.pause();
      else tryPlay();
    });
  }

  // ---------- WebP fallback (self-heals if a .webp file is missing/404s) ----------
  document.querySelectorAll('picture img').forEach(img => {
    img.addEventListener('error', function onErr(){
      img.removeEventListener('error', onErr);
      const pic = img.closest('picture');
      if(pic) pic.querySelectorAll('source').forEach(s => s.remove());
      img.src = img.getAttribute('src');
    });
  });

  // ---------- Page loader ----------
  const pageLoader = document.getElementById('pageLoader');
  if(pageLoader){
    setTimeout(() => {
      pageLoader.classList.add('hide');
      setTimeout(() => pageLoader.remove(), 550);
    }, 2000);
  }

  // ---------- Mobile nav ----------
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  menuToggle.addEventListener('click', () => siteNav.classList.toggle('open'));
  document.querySelectorAll('#siteNav a').forEach(a => a.addEventListener('click', () => siteNav.classList.remove('open')));

  // ---------- Account / Login (saved to this browser only — no server) ----------
  const ACCOUNT_USERS_KEY = 'ayushwellnes_users';
  const ACCOUNT_SESSION_KEY = 'ayushwellnes_session';
  function loadUsers(){ try{ return JSON.parse(localStorage.getItem(ACCOUNT_USERS_KEY)) || []; }catch(e){ return []; } }
  function saveUsers(users){ localStorage.setItem(ACCOUNT_USERS_KEY, JSON.stringify(users)); }
  async function hashPassword(pw){
    const enc = new TextEncoder().encode(pw);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function getSession(){ try{ return JSON.parse(localStorage.getItem(ACCOUNT_SESSION_KEY)); }catch(e){ return null; } }
  function setSession(user){ localStorage.setItem(ACCOUNT_SESSION_KEY, JSON.stringify(user)); }
  function clearSession(){ localStorage.removeItem(ACCOUNT_SESSION_KEY); }

  const accountSwitcher = document.getElementById('accountSwitcher');
  const accountBtn = document.getElementById('accountBtn');
  const accountMenu = document.getElementById('accountMenu');
  const accountUserName = document.getElementById('accountUserName');
  const accountLogoutBtn = document.getElementById('accountLogoutBtn');
  const authModal = document.getElementById('authModal');

  function renderAccountState(){
    if(!accountSwitcher) return;
    const session = getSession();
    if(session){
      accountSwitcher.classList.add('logged-in');
      if(accountUserName) accountUserName.textContent = session.name;
      accountBtn.textContent = (session.name || '?').trim().charAt(0).toUpperCase();
    } else {
      accountSwitcher.classList.remove('logged-in');
      accountBtn.innerHTML = '<svg fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
    }
  }

  if(accountBtn){
    accountBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if(getSession()){
        accountSwitcher.classList.toggle('open');
      } else if(authModal){
        authModal.classList.add('show');
      }
    });
    document.addEventListener('click', () => accountSwitcher.classList.remove('open'));
  }
  if(accountLogoutBtn){
    accountLogoutBtn.addEventListener('click', () => {
      clearSession();
      renderAccountState();
      accountSwitcher.classList.remove('open');
    });
  }

  if(authModal){
    const authTabLogin = document.getElementById('authTabLogin');
    const authTabSignup = document.getElementById('authTabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginError = document.getElementById('loginError');
    const signupError = document.getElementById('signupError');
    const authModalCloseBtn = document.getElementById('authModalCloseBtn');
    const goToSignup = document.getElementById('goToSignup');
    const goToLogin = document.getElementById('goToLogin');

    function showAuthTab(tab){
      const isLogin = tab === 'login';
      authTabLogin.classList.toggle('active', isLogin);
      authTabSignup.classList.toggle('active', !isLogin);
      loginForm.style.display = isLogin ? 'block' : 'none';
      signupForm.style.display = isLogin ? 'none' : 'block';
      loginError.style.display = 'none';
      signupError.style.display = 'none';
    }
    authTabLogin.addEventListener('click', () => showAuthTab('login'));
    authTabSignup.addEventListener('click', () => showAuthTab('signup'));
    goToSignup.addEventListener('click', (e) => { e.preventDefault(); showAuthTab('signup'); });
    goToLogin.addEventListener('click', (e) => { e.preventDefault(); showAuthTab('login'); });
    authModalCloseBtn.addEventListener('click', () => authModal.classList.remove('show'));
    authModal.addEventListener('click', (e) => { if(e.target === authModal) authModal.classList.remove('show'); });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = (window.i18n && window.i18n.dict()) || {};
      const phone = document.getElementById('loginPhone').value.trim();
      const password = document.getElementById('loginPassword').value;
      const hashed = await hashPassword(password);
      const user = loadUsers().find(u => u.phone === phone && u.password === hashed);
      if(!user){
        loginError.textContent = d.login_error_creds || 'No account found with that phone number and password.';
        loginError.style.display = 'block';
        return;
      }
      setSession({name:user.name, phone:user.phone, email:user.email});
      renderAccountState();
      authModal.classList.remove('show');
      loginForm.reset();
      showToast(((d.account_greeting || 'Hi') + ' ' + user.name).trim());
    });

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = (window.i18n && window.i18n.dict()) || {};
      const name = document.getElementById('signupName').value.trim();
      const phone = document.getElementById('signupPhone').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      if(!name || !phone || !password){
        signupError.textContent = d.signup_error_fields || 'Please fill in all required fields.';
        signupError.style.display = 'block';
        return;
      }
      const users = loadUsers();
      if(users.find(u => u.phone === phone)){
        signupError.textContent = d.signup_error_exists || 'An account with this phone number already exists — try logging in instead.';
        signupError.style.display = 'block';
        return;
      }
      const hashed = await hashPassword(password);
      users.push({name, phone, email, password: hashed});
      saveUsers(users);
      setSession({name, phone, email});
      renderAccountState();
      authModal.classList.remove('show');
      signupForm.reset();
      showToast(((d.account_greeting || 'Hi') + ' ' + name).trim());
    });
  }
  renderAccountState();

  // ---------- Animated stat counters ----------
  const statEls = document.querySelectorAll('.stat-num[data-count]');
  if(statEls.length){
    const statIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const suffix = el.dataset.suffix || '';
        const duration = 1400;
        const start = performance.now();
        function tick(now){
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target).toLocaleString('en-IN') + suffix;
          if(progress < 1){ requestAnimationFrame(tick); }
        }
        requestAnimationFrame(tick);
        statIO.unobserve(el);
      });
    }, {threshold:0.4});
    statEls.forEach(el => statIO.observe(el));
  }

  // ---------- Reveal on scroll ----------
  const revealEls = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, {threshold:0.15});
  revealEls.forEach(el => io.observe(el));

  // ---------- FAQ accordion ----------
  document.querySelectorAll('.faq-item').forEach(item => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(o => { o.classList.remove('open'); o.querySelector('.faq-a').style.maxHeight = null; });
      if(!isOpen){ item.classList.add('open'); a.style.maxHeight = a.scrollHeight + 'px'; }
    });
  });

  // ---------- Blog read-more accordion ----------
  document.querySelectorAll('.blog-item').forEach(item => {
    const btn = item.querySelector('.blog-toggle');
    const full = item.querySelector('.blog-full');
    if(!btn || !full) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      const d = (window.i18n && window.i18n.dict()) || {};
      if(!isOpen){
        item.classList.add('open');
        full.style.maxHeight = full.scrollHeight + 'px';
        btn.innerHTML = '<span data-i18n="blog_read_less">' + (d.blog_read_less || 'Read Less') + '</span> <span class="plus">+</span>';
      } else {
        item.classList.remove('open');
        full.style.maxHeight = null;
        btn.innerHTML = '<span data-i18n="blog_read_more">' + (d.blog_read_more || 'Read More') + '</span> <span class="plus">+</span>';
      }
    });
  });

  // ---------- Blog category filter ----------
  const blogFilters = document.getElementById('blogFilters');
  const blogGrid = document.getElementById('blogGrid');
  if(blogFilters && blogGrid){
    const chips = blogFilters.querySelectorAll('.filter-chip');
    const items = blogGrid.querySelectorAll('.blog-item');
    let emptyMsg = null;
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const f = chip.dataset.filter;
        let visibleCount = 0;
        items.forEach(item => {
          const show = (f === 'all') || (item.dataset.category === f);
          item.classList.toggle('hide', !show);
          if(show) visibleCount++;
        });
        if(visibleCount === 0){
          if(!emptyMsg){
            emptyMsg = document.createElement('div');
            emptyMsg.className = 'blog-empty';
            emptyMsg.setAttribute('data-i18n', 'blog_empty');
            emptyMsg.textContent = ((window.i18n && window.i18n.dict().blog_empty) || 'No posts in this category yet — check back soon.');
            blogGrid.appendChild(emptyMsg);
          }
          emptyMsg.style.display = 'block';
        } else if(emptyMsg){
          emptyMsg.style.display = 'none';
        }
      });
    });
  }

  // ---------- Yoga video thumbnails (click to load) ----------
  document.querySelectorAll('.yoga-card').forEach(card => {
    const thumb = card.querySelector('.yoga-thumb');
    const vid = card.dataset.video;
    if(!thumb || !vid) return;
    thumb.addEventListener('click', () => {
      thumb.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0" title="YouTube video player" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }, { once: true });
  });

  // ---------- Cart logic ----------
  const CART_KEY = 'ayushwellnes_cart';
  function loadCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY)) || []; }catch(e){ return []; } }
  function saveCart(cart){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  const cartCount = document.getElementById('cartCount');
  const cartItemsEl = document.getElementById('cartItems');
  const cartTotalEl = document.getElementById('cartTotal');
  const modalTotalEl = document.getElementById('modalTotal');

  function fmt(n){ return '₹' + n.toLocaleString('en-IN'); }

  function render(){
    const d = (window.i18n && window.i18n.dict()) || {};
    const cart = loadCart();
    cartCount.textContent = cart.reduce((s,i)=>s+i.qty,0);
    if(cart.length === 0){
      cartItemsEl.innerHTML = '<div class="cart-empty" data-i18n="cart_empty_html">' + (d.cart_empty_html || 'Your cart is empty.<br>Add a product to get started.') + '</div>';
    } else {
      cartItemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.name}">
          <div class="ci-info">
            <div class="ci-name">${item.name}</div>
            <div class="ci-price">${fmt(item.price)} ${d.cart_each || 'each'}</div>
            <div class="ci-qty">
              <button data-act="dec" data-id="${item.id}">−</button>
              <span>${item.qty}</span>
              <button data-act="inc" data-id="${item.id}">+</button>
            </div>
            <a class="ci-remove" data-act="remove" data-id="${item.id}">${d.cart_remove || 'Remove'}</a>
          </div>
        </div>
      `).join('');
    }
    const total = cart.reduce((s,i)=>s+i.qty*i.price,0);
    cartTotalEl.textContent = fmt(total);
    modalTotalEl.textContent = fmt(total);
  }

  function addToCart(id, name, price, img){
    const cart = loadCart();
    const existing = cart.find(i => i.id === id);
    if(existing){ existing.qty += 1; } else { cart.push({id,name,price,img,qty:1}); }
    saveCart(cart);
    render();
    const d = (window.i18n && window.i18n.dict()) || {};
    showToast((d.toast_added_to_cart || '{name} added to cart').replace('{name}', name));
    openCart();
  }

  cartItemsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if(!btn) return;
    const id = btn.dataset.id;
    let cart = loadCart();
    const item = cart.find(i => i.id === id);
    if(!item) return;
    if(btn.dataset.act === 'inc') item.qty += 1;
    if(btn.dataset.act === 'dec') item.qty = Math.max(1, item.qty - 1);
    if(btn.dataset.act === 'remove') cart = cart.filter(i => i.id !== id);
    saveCart(cart);
    render();
  });

  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      addToCart(btn.dataset.id, btn.dataset.name, parseInt(btn.dataset.price,10), btn.dataset.img);
    });
  });

  // ---------- Swipeable product gallery (product detail pages) ----------
  document.querySelectorAll('.pgallery').forEach(gallery => {
    const track = gallery.querySelector('.pgallery-track');
    const slides = gallery.querySelectorAll('.pgallery-slide');
    const dots = gallery.querySelectorAll('.pgallery-dot');
    const prevBtn = gallery.querySelector('.pgallery-arrow.prev');
    const nextBtn = gallery.querySelector('.pgallery-arrow.next');
    if(!track || slides.length < 2){ gallery.classList.add('single'); return; }

    function goTo(i){
      i = (i + slides.length) % slides.length;
      track.scrollTo({left: slides[i].offsetLeft, behavior:'smooth'});
    }
    function currentIndex(){
      return Math.round(track.scrollLeft / track.clientWidth);
    }
    function updateDots(){
      const idx = currentIndex();
      dots.forEach((d,i) => d.classList.toggle('active', i===idx));
    }
    dots.forEach((d,i) => d.addEventListener('click', () => { goTo(i); restartAutoplay(); }));
    if(prevBtn) prevBtn.addEventListener('click', () => { goTo(currentIndex()-1); restartAutoplay(); });
    if(nextBtn) nextBtn.addEventListener('click', () => { goTo(currentIndex()+1); restartAutoplay(); });
    track.addEventListener('scroll', () => {
      clearTimeout(track._t);
      track._t = setTimeout(updateDots, 80);
    });
    updateDots();

    // Auto-scroll through the gallery images on their own
    const AUTOPLAY_MS = 3500;
    let autoplayTimer;
    function startAutoplay(){
      clearInterval(autoplayTimer);
      autoplayTimer = setInterval(() => goTo(currentIndex()+1), AUTOPLAY_MS);
    }
    function stopAutoplay(){ clearInterval(autoplayTimer); }
    function restartAutoplay(){ stopAutoplay(); startAutoplay(); }
    gallery.addEventListener('mouseenter', stopAutoplay);
    gallery.addEventListener('mouseleave', startAutoplay);
    gallery.addEventListener('touchstart', stopAutoplay, {passive:true});
    gallery.addEventListener('touchend', () => {
      clearTimeout(gallery._resumeT);
      gallery._resumeT = setTimeout(startAutoplay, 2500);
    });
    startAutoplay();
  });

  // ---------- Drawer open/close ----------
  const overlay = document.getElementById('overlay');
  const cartDrawer = document.getElementById('cartDrawer');
  function openCart(){ cartDrawer.classList.add('show'); overlay.classList.add('show'); }
  function closeCart(){ cartDrawer.classList.remove('show'); overlay.classList.remove('show'); }
  document.getElementById('cartOpenBtn').addEventListener('click', openCart);
  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  overlay.addEventListener('click', () => { closeCart(); closeModal(); });

  // ---------- Toast ----------
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toastText');
  let toastTimer;
  function showToast(msg){
    toastText.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  // ---------- Checkout modal ----------
  const checkoutModal = document.getElementById('checkoutModal');
  const modalFormWrap = document.getElementById('modalFormWrap');
  const modalSuccessWrap = document.getElementById('modalSuccessWrap');
  function openModal(){
    if(loadCart().length === 0){ const d = (window.i18n && window.i18n.dict()) || {}; showToast(d.toast_cart_empty || 'Your cart is empty'); return; }
    modalFormWrap.style.display = 'block';
    modalSuccessWrap.style.display = 'none';
    checkoutModal.classList.add('show');
    closeCart();
  }
  function closeModal(){ checkoutModal.classList.remove('show'); }
  document.getElementById('checkoutBtn').addEventListener('click', openModal);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalDoneBtn').addEventListener('click', () => { closeModal(); });

  document.getElementById('checkoutForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const cart = loadCart();
    const name = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const addr = document.getElementById('cAddr').value.trim();
    const total = cart.reduce((s,i)=>s+i.qty*i.price,0);
    const itemLines = cart.map(i => '- ' + i.name + ' x' + i.qty + ' (' + fmt(i.qty*i.price) + ')').join('\n');
    const waMsg = 'New order:\n' + itemLines + '\n\nTotal: ' + fmt(total) +
      '\n\nName: ' + name + '\nPhone: ' + phone + '\nDelivery Address: ' + addr;
    window.open('https://wa.me/918808592212?text=' + encodeURIComponent(waMsg), '_blank');
    modalFormWrap.style.display = 'none';
    modalSuccessWrap.style.display = 'block';
    saveCart([]);
    render();
  });

  // ---------- Enquiry form ----------
  const enquiryForm = document.getElementById('enquiryForm');
  if(enquiryForm){
    enquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('eName').value.trim();
      const phone = document.getElementById('ePhone').value.trim();
      const product = document.getElementById('eProduct').value;
      const msg = document.getElementById('eMsg').value.trim();
      const subject = encodeURIComponent('Enquiry from ' + name + ' — ' + product);
      const body = encodeURIComponent(
        'Name: ' + name + '\n' +
        'Phone: ' + phone + '\n' +
        'Interested In: ' + product + '\n\n' +
        'Message:\n' + msg
      );
      window.location.href = 'mailto:support.ayushwellnes@gmail.com?subject=' + subject + '&body=' + body;
      const d = (window.i18n && window.i18n.dict()) || {};
      showToast(d.toast_opening_email || 'Opening your email app…');
      enquiryForm.reset();
    });
  }

  // ---------- Header hide on scroll down, show on scroll up ----------
  const header = document.querySelector('header');
  const backToTopBtn = document.getElementById('backToTopBtn');
  if(backToTopBtn){
    backToTopBtn.addEventListener('click', () => window.scrollTo({top:0, behavior:'smooth'}));
  }
  let lastScrollY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 8 ? '0 4px 20px rgba(16,37,26,0.08)' : 'none';
    header.classList.toggle('scrolled', window.scrollY > 40);
    if(backToTopBtn) backToTopBtn.classList.toggle('show', window.scrollY > 500);
    if(!ticking){
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if(currentY > lastScrollY && currentY > 90){
          header.classList.add('hide-nav');
          siteNav.classList.remove('open');
        } else {
          header.classList.remove('hide-nav');
        }
        lastScrollY = currentY;
        ticking = false;
      });
      ticking = true;
    }
  });

  // ---------- Herb ingredient carousel ----------
  const herbTrack = document.getElementById('herbTrack');
  const herbPrev = document.getElementById('herbPrev');
  const herbNext = document.getElementById('herbNext');
  if(herbTrack && herbPrev && herbNext){
    const scrollAmount = () => herbTrack.querySelector('.herb-card').offsetWidth + 18;
    herbPrev.addEventListener('click', () => herbTrack.scrollBy({left:-scrollAmount()*2, behavior:'smooth'}));
    herbNext.addEventListener('click', () => herbTrack.scrollBy({left:scrollAmount()*2, behavior:'smooth'}));
  }

  // ---------- Reviews: sort + write-a-review ----------
  const reviewGrid = document.getElementById('reviewGrid');
  const reviewSort = document.getElementById('reviewSort');
  let restartReviewAutoSlide = () => {};
  if(reviewGrid && reviewSort){
    reviewSort.addEventListener('change', () => {
      const cards = Array.from(reviewGrid.children);
      const mode = reviewSort.value;
      cards.sort((a,b) => {
        if(mode === 'high') return b.dataset.rating - a.dataset.rating;
        if(mode === 'low') return a.dataset.rating - b.dataset.rating;
        return new Date(b.dataset.date) - new Date(a.dataset.date);
      });
      cards.forEach(c => reviewGrid.appendChild(c));
      reviewGrid.scrollTo({left:0});
      restartReviewAutoSlide();
    });
  }
  // ---------- Write a Review modal ----------
  const reviewModal = document.getElementById('reviewModal');
  const reviewFormWrap = document.getElementById('reviewFormWrap');
  const reviewSuccessWrap = document.getElementById('reviewSuccessWrap');
  const writeReviewForm = document.getElementById('writeReviewForm');
  function openReviewModal(){
    reviewFormWrap.style.display = 'block';
    reviewSuccessWrap.style.display = 'none';
    reviewModal.classList.add('show');
  }
  function closeReviewModal(){ reviewModal.classList.remove('show'); }
  const writeReviewBtn = document.getElementById('writeReviewBtn');
  if(writeReviewBtn && reviewModal){
    writeReviewBtn.addEventListener('click', openReviewModal);
    document.getElementById('reviewModalCloseBtn').addEventListener('click', closeReviewModal);
    document.getElementById('reviewDoneBtn').addEventListener('click', closeReviewModal);
    reviewModal.addEventListener('click', (e) => { if(e.target === reviewModal) closeReviewModal(); });
  }
  if(writeReviewForm && reviewGrid){
    writeReviewForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('rvName').value.trim();
      const product = document.getElementById('rvProduct').value;
      const rating = document.getElementById('rvRating').value;
      const text = document.getElementById('rvText').value.trim();
      const d = (window.i18n && window.i18n.dict()) || {};

      // Build and prepend the new review card so it shows immediately for this visitor
      const today = new Date();
      const iso = today.toISOString().slice(0,10);
      const dmy = String(today.getDate()).padStart(2,'0') + '/' + String(today.getMonth()+1).padStart(2,'0') + '/' + today.getFullYear();
      const card = document.createElement('div');
      card.className = 'test-card';
      card.dataset.rating = rating;
      card.dataset.date = iso;
      card.innerHTML =
        '<div class="stars">' + '★'.repeat(rating) + '☆'.repeat(5-rating) + '</div>' +
        '<p></p>' +
        '<div class="test-who">' +
          '<div class="test-avatar"></div>' +
          '<div><div class="wn"></div><div class="wl"></div></div>' +
        '</div>' +
        '<div class="rev-date">' + dmy + '</div>';
      card.querySelector('p').textContent = '\u201c' + text + '\u201d';
      card.querySelector('.test-avatar').textContent = (name[0] || '?').toUpperCase();
      card.querySelector('.wn').textContent = name;
      card.querySelector('.wl').textContent = d.review_pending_label || 'Just submitted — ' + product;
      reviewGrid.prepend(card);
      reviewGrid.scrollTo({left:0});
      restartReviewAutoSlide();

      // Email the team so they can moderate and publish it site-wide (this is a static site with no live database)
      const subject = encodeURIComponent('New review from ' + name + ' — ' + product);
      const body = encodeURIComponent(
        'Name: ' + name + '\n' +
        'Product: ' + product + '\n' +
        'Rating: ' + rating + ' / 5\n\n' +
        'Review:\n' + text
      );
      window.location.href = 'mailto:support.ayushwellnes@gmail.com?subject=' + subject + '&body=' + body;

      reviewFormWrap.style.display = 'none';
      reviewSuccessWrap.style.display = 'block';
      writeReviewForm.reset();
    });
  }

  // ---------- Reviews: auto-slide through cards on mobile ----------
  if(reviewGrid){
    const mobileMQ = window.matchMedia('(max-width:980px)');
    let reviewTimer;
    function reviewCardStep(){
      const card = reviewGrid.querySelector('.test-card');
      if(!card) return reviewGrid.clientWidth;
      const style = getComputedStyle(reviewGrid);
      return card.getBoundingClientRect().width + parseFloat(style.gap || 16);
    }
    function reviewNext(){
      const atEnd = reviewGrid.scrollLeft + reviewGrid.clientWidth >= reviewGrid.scrollWidth - 8;
      reviewGrid.scrollTo({left: atEnd ? 0 : reviewGrid.scrollLeft + reviewCardStep(), behavior:'smooth'});
    }
    function startReviewAutoSlide(){
      clearInterval(reviewTimer);
      if(!mobileMQ.matches) return;
      reviewTimer = setInterval(reviewNext, 4000);
    }
    function stopReviewAutoSlide(){ clearInterval(reviewTimer); }
    restartReviewAutoSlide = () => { stopReviewAutoSlide(); startReviewAutoSlide(); };
    reviewGrid.addEventListener('touchstart', stopReviewAutoSlide, {passive:true});
    reviewGrid.addEventListener('touchend', () => {
      clearTimeout(reviewGrid._resumeT);
      reviewGrid._resumeT = setTimeout(startReviewAutoSlide, 3000);
    });
    if(mobileMQ.addEventListener) mobileMQ.addEventListener('change', startReviewAutoSlide);
    else mobileMQ.addListener(startReviewAutoSlide);
    document.addEventListener('visibilitychange', () => {
      if(document.hidden) stopReviewAutoSlide(); else startReviewAutoSlide();
    });
    startReviewAutoSlide();
  }

  render();
  window.__i18nRerender = render;
})();
