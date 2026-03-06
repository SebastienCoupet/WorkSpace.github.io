// ── SUPABASE ──────────────────────────────────────────────────────────────────
const { createClient } = supabase;
const sb = createClient(
  'https://farjfneueqxzikljvepa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcmpmbmV1ZXF4emlrbGp2ZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjEzMTcsImV4cCI6MjA4ODI5NzMxN30.JEQAAZvuFnWmKzGl-xl11LWGILHAbeLfsquyiOVZz1Q'
);

// Redirect if already logged in
sb.auth.getSession().then(({ data }) => {
  if (data.session) window.location.href = '/dashboard';
});

// ── UI ────────────────────────────────────────────────────────────────────────
function switchTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('form-signup').style.display = tab === 'signup' ? 'block' : 'none';
  clearMsg();
}

function showMsg(text, type) {
  const el = document.getElementById('auth-msg');
  el.textContent = text;
  el.className = 'msg ' + type;
}
function clearMsg() {
  const el = document.getElementById('auth-msg');
  el.className = 'msg';
  el.textContent = '';
}

function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  if (loading) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span>Chargement…';
  } else {
    btn.disabled = false;
    btn.innerHTML = btnId === 'btn-login' ? 'Se connecter →' : 'Créer mon compte →';
  }
}

// ── AUTH ACTIONS ──────────────────────────────────────────────────────────────
async function loginEmail() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  if (!email || !password) return showMsg('Merci de remplir tous les champs.', 'error');

  setLoading('btn-login', true);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  setLoading('btn-login', false);

  if (error) return showMsg(translateError(error.message), 'error');
  window.location.href = '/dashboard';
}

async function signupEmail() {
  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  if (!name || !email || !password) return showMsg('Merci de remplir tous les champs.', 'error');
  if (password.length < 8) return showMsg('Le mot de passe doit faire au moins 8 caractères.', 'error');

  setLoading('btn-signup', true);
  const { error } = await sb.auth.signUp({
    email, password,
    options: { data: { full_name: name } }
  });
  setLoading('btn-signup', false);

  if (error) return showMsg(translateError(error.message), 'error');
  showMsg('✅ Compte créé ! Vérifiez votre email pour confirmer votre inscription.', 'success');
}

async function loginGoogle() {
  const { error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/dashboard' }
  });
  if (error) showMsg(translateError(error.message), 'error');
}

// ── ERROR TRANSLATION ─────────────────────────────────────────────────────────
function translateError(msg) {
  if (msg.includes('Invalid login')) return 'Email ou mot de passe incorrect.';
  if (msg.includes('Email not confirmed')) return 'Veuillez confirmer votre email avant de vous connecter.';
  if (msg.includes('User already registered')) return 'Un compte existe déjà avec cet email.';
  if (msg.includes('Password should be')) return 'Le mot de passe doit faire au moins 8 caractères.';
  if (msg.includes('rate limit')) return 'Trop de tentatives. Réessayez dans quelques minutes.';
  return 'Une erreur est survenue. Réessayez.';
}

// ── ENTER KEY ─────────────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const loginVisible = document.getElementById('form-login').style.display !== 'none';
  if (loginVisible) loginEmail();
  else signupEmail();
});
