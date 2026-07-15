
(function(){
  // ---------- Mobile nav ----------
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  menuToggle.addEventListener('click', () => siteNav.classList.toggle('open'));
  document.querySelectorAll('#siteNav a').forEach(a => a.addEventListener('click', () => siteNav.classList.remove('open')));

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
    const cart = loadCart();
    cartCount.textContent = cart.reduce((s,i)=>s+i.qty,0);
    if(cart.length === 0){
      cartItemsEl.innerHTML = '<div class="cart-empty">Your cart is empty.<br>Add a product to get started.</div>';
    } else {
      cartItemsEl.innerHTML = cart.map(item => `
        <div class="cart-item">
          <img src="${item.img}" alt="${item.name}">
          <div class="ci-info">
            <div class="ci-name">${item.name}</div>
            <div class="ci-price">${fmt(item.price)} each</div>
            <div class="ci-qty">
              <button data-act="dec" data-id="${item.id}">−</button>
              <span>${item.qty}</span>
              <button data-act="inc" data-id="${item.id}">+</button>
            </div>
            <a class="ci-remove" data-act="remove" data-id="${item.id}">Remove</a>
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
    showToast(name + ' added to cart');
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
    if(loadCart().length === 0){ showToast('Your cart is empty'); return; }
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
      showToast('Opening your email app…');
      enquiryForm.reset();
    });
  }

  // ---------- Header hide on scroll down, show on scroll up ----------
  const header = document.querySelector('header');
  let lastScrollY = window.scrollY;
  let ticking = false;
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 8 ? '0 4px 20px rgba(16,37,26,0.08)' : 'none';
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

  render();
})();
