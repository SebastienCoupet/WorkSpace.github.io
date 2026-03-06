// ── NAV SCROLL ──
const nav = document.querySelector('nav');
window.addEventListener('scroll', () => {
  nav.style.boxShadow = window.scrollY > 60
    ? '0 2px 30px rgba(26,60,255,0.1)'
    : '0 1px 20px rgba(26,60,255,0.06)';
});

// ── MOBILE MENU ──
const navLinks = document.querySelector('.nav-links');

// Fermer le menu en cliquant sur un lien (une seule fois, via délégation)
navLinks.addEventListener('click', e => {
  if (e.target.tagName === 'A') navLinks.style.display = 'none';
});

function toggleMenu() {
  if (navLinks.style.display === 'flex') {
    navLinks.style.display = 'none';
  } else {
    navLinks.style.cssText = 'display:flex;flex-direction:column;position:fixed;top:68px;left:0;right:0;background:rgba(255,255,255,0.98);padding:24px;gap:20px;z-index:999;backdrop-filter:blur(16px);border-bottom:1px solid #dde3ff;box-shadow:0 8px 24px rgba(26,60,255,0.1)';
  }
}

// ── FORM SUBMIT ──
function handleSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('.btn-submit');
  const original = btn.innerHTML;
  btn.innerHTML = '✅ Message envoyé !';
  btn.style.background = '#16a34a';
  btn.disabled = true;
  setTimeout(() => {
    btn.innerHTML = original;
    btn.style.background = '';
    btn.disabled = false;
    e.target.reset();
  }, 4000);
}

// ── SESSION CHECK ──
(function() {
  const { createClient } = supabase;
  const sb = createClient(
    'https://farjfneueqxzikljvepa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcmpmbmV1ZXF4emlrbGp2ZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjEzMTcsImV4cCI6MjA4ODI5NzMxN30.JEQAAZvuFnWmKzGl-xl11LWGILHAbeLfsquyiOVZz1Q'
  );
  sb.auth.getSession().then(({ data }) => {
    if (!data.session) return;
    document.getElementById('nav-logo-link').href = '/dashboard';
    const authBtn = document.getElementById('nav-auth-btn');
    authBtn.href = '/dashboard';
    authBtn.textContent = 'Mon espace →';
  });
})();
