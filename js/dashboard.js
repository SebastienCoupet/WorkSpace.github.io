// ─── SUPABASE ─────────────────────────────────────────────────────────────────
const { createClient } = supabase;
const sb = createClient(
  'https://farjfneueqxzikljvepa.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcmpmbmV1ZXF4emlrbGp2ZXBhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MjEzMTcsImV4cCI6MjA4ODI5NzMxN30.JEQAAZvuFnWmKzGl-xl11LWGILHAbeLfsquyiOVZz1Q'
);

// ─── DATE ─────────────────────────────────────────────────────────────────────
const DAYS_FR   = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

function formatDateFr(d) {
  return `${DAYS_FR[d.getDay()]} ${d.getDate()} ${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`;
}

const TODAY       = new Date();
const TODAY_LABEL = formatDateFr(TODAY);

const monthEl = document.getElementById('resa-month');
if (monthEl) {
  const m = MONTHS_FR[TODAY.getMonth()];
  monthEl.textContent = m.charAt(0).toUpperCase() + m.slice(1) + ' ' + TODAY.getFullYear();
}

const todayISO = TODAY.toISOString().split('T')[0];

const modalDateEl = document.getElementById('modal-date');
if (modalDateEl) modalDateEl.value = todayISO;

const deskDateEl = document.getElementById('desk-date');
if (deskDateEl) deskDateEl.value = todayISO;

const dashDateSub = document.getElementById('dash-date-sub');
if (dashDateSub) dashDateSub.textContent = 'Site Paris – La Défense · ' + TODAY_LABEL;

// ─── AUTH GUARD ───────────────────────────────────────────────────────────────
let currentUser = null;

sb.auth.getSession().then(({ data }) => {
  if (!data.session) { window.location.href = '/auth'; return; }
  currentUser = data.session.user;

  const name      = getUserName();
  const firstName = name.split(' ')[0];

  const nameEl = document.getElementById('user-display-name');
  if (nameEl) nameEl.textContent = name;

  const initEl = document.getElementById('user-initials');
  if (initEl) initEl.textContent = name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

  const subEl = document.getElementById('tb-sub');
  if (subEl) subEl.textContent = `${TODAY_LABEL} · Bonjour ${firstName} 👋`;

  loadReservations();
});

async function logout() {
  await sb.auth.signOut();
  window.location.href = '/';
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function getUserName() {
  if (!currentUser) return 'Utilisateur';
  return currentUser.user_metadata?.full_name || currentUser.email.split('@')[0];
}

async function loadReservations() {
  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (error) { console.warn('loadReservations:', error.message); return; }
  if (!data?.length) return;

  const list = document.getElementById('resa-list');
  const emptyState = list.querySelector('[style*="50px"]');
  if (emptyState) emptyState.remove();

  data.forEach(r => {
    const dateObj = r.date ? new Date(r.date + 'T12:00:00') : null;
    const dateFr  = dateObj ? formatDateFr(dateObj) : r.date;
    addResaToList({
      dot:   r.type === 'bureau' ? 'var(--green)' : 'var(--blue)',
      title: `${dateFr} · ${r.time_slot || 'Journée'}`,
      sub:   `${r.resource_id} · ${r.objet || 'Flex office'}`,
      badge: 'b-free', label: 'Confirmée'
    });
  });
}

function frenchError(msg) {
  if (!msg) return 'Erreur inconnue.';
  if (msg.includes('does not exist'))      return 'La table n\'existe pas dans Supabase.';
  if (msg.includes('permission denied') || msg.includes('new row violates')) return 'Accès refusé — vérifiez les règles RLS dans Supabase.';
  if (msg.includes('JWT') || msg.includes('token')) return 'Session expirée, veuillez vous reconnecter.';
  if (msg.includes('duplicate') || msg.includes('unique')) return 'Cette réservation existe déjà.';
  if (msg.includes('network') || msg.includes('fetch')) return 'Erreur réseau — vérifiez votre connexion.';
  if (msg.includes('column'))              return 'Colonne manquante dans la table — vérifiez le schéma Supabase.';
  return msg;
}

async function saveReservation(data) {
  const { error } = await sb.from('reservations').insert(data);
  if (error) {
    showToast('❌ ' + frenchError(error.message));
    return false;
  }
  return true;
}

// ─── PARTICIPANTS ──────────────────────────────────────────────────────────────
let participants = [];

function initParticipants() {
  participants = currentUser
    ? [{ name: getUserName(), email: currentUser.email, external: false }]
    : [];
  renderParticipants();
  const input = document.getElementById('participant-input');
  if (input) input.value = '';
}

function renderParticipants() {
  const container = document.getElementById('participants-chips');
  if (!container) return;
  container.innerHTML = '';
  participants.forEach(p => {
    const chip = document.createElement('div');
    chip.className = 'chip' + (p.external ? ' chip-ext' : '');
    const av = document.createElement('div');
    av.className = 'chip-av';
    av.textContent = p.name.split(/\s+/).map(w => w[0] || '').join('').toUpperCase().slice(0, 2);
    chip.appendChild(av);
    chip.appendChild(document.createTextNode(p.external ? p.email : p.name));
    if (p.email !== currentUser?.email) {
      const rm = document.createElement('span');
      rm.className = 'chip-rm';
      rm.textContent = '×';
      rm.onmousedown = (e) => { e.preventDefault(); removeParticipant(p.email); };
      chip.appendChild(rm);
    }
    container.appendChild(chip);
  });
}

function addParticipant(name, email, external) {
  if (participants.some(p => p.email === email)) return;
  participants.push({ name, email, external });
  renderParticipants();
}

function removeParticipant(email) {
  participants = participants.filter(p => p.email !== email);
  renderParticipants();
}

let _searchTimer;
async function onParticipantInput(input) {
  const q = input.value.trim();
  const dropdown = document.getElementById('participant-dropdown');
  clearTimeout(_searchTimer);
  if (q.length < 2) { dropdown.style.display = 'none'; return; }

  _searchTimer = setTimeout(async () => {
    const { data } = await sb
      .from('profiles')
      .select('full_name, email')
      .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(6);

    const results = (data || []).filter(u => !participants.some(p => p.email === u.email));
    dropdown.innerHTML = '';

    results.forEach(u => {
      const item = document.createElement('div');
      item.className = 'pdrop-item';
      item.textContent = `${u.full_name} — ${u.email}`;
      item.onmousedown = (e) => { e.preventDefault(); addParticipant(u.full_name, u.email, false); input.value = ''; dropdown.style.display = 'none'; };
      dropdown.appendChild(item);
    });

    if (q.includes('@') && !participants.some(p => p.email === q)) {
      const ext = document.createElement('div');
      ext.className = 'pdrop-item pdrop-ext';
      ext.textContent = `➕ Ajouter "${q}" comme externe`;
      ext.onmousedown = (e) => { e.preventDefault(); addParticipant(q, q, true); input.value = ''; dropdown.style.display = 'none'; };
      dropdown.appendChild(ext);
    }

    dropdown.style.display = dropdown.children.length ? 'block' : 'none';
  }, 280);
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
const sites = [
  { name: 'Paris – La Défense',   short: 'La Défense' },
  { name: 'Boulogne-Billancourt', short: 'Boulogne'   },
  { name: 'Saint-Denis',          short: 'Saint-Denis' },
  { name: 'Vincennes',            short: 'Vincennes'  }
];
let siteIdx = 0;

function cycleSite() {
  siteIdx = (siteIdx + 1) % sites.length;
  const s = sites[siteIdx];
  document.getElementById('site-name').textContent = s.name;
  const s2 = document.getElementById('site-name2');
  if (s2) s2.textContent = s.short;
  document.getElementById('co-site-label').textContent = '📍 ' + s.name;
  const firstName = getUserName().split(' ')[0];
  document.getElementById('tb-sub').textContent = `${TODAY_LABEL} · Bonjour ${firstName} 👋`;
  document.getElementById('floor-title').textContent = `Plan · 2e étage — Open Space Nord · ${s.short}`;
  showToast('Site changé → ' + s.name);
}

function showPage(id, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  if (el) el.classList.add('active');
  const titles = {
    dashboard: 'Tableau de bord', salles: 'Salles de réunion',
    bureaux: 'Bureaux flex', repas: 'Commander repas',
    mesresa: 'Mes réservations', admin: 'Administration'
  };
  document.getElementById('tb-title').textContent = titles[id] || id;
}

// ─── SALLES ───────────────────────────────────────────────────────────────────
function toggleSlot(el) {
  if (el.classList.contains('taken')) return;
  el.classList.toggle('sel');
}

function selectDate(el) {
  document.querySelectorAll('#page-salles [onclick="selectDate(this)"]').forEach(d => {
    d.style.background = 'var(--light)';
    d.style.borderColor = 'var(--border)';
    d.querySelectorAll('div').forEach((c, i) => { c.style.color = i === 0 ? 'var(--muted)' : 'var(--text)'; });
  });
  el.style.background = 'var(--navy)';
  el.style.borderColor = 'var(--navy)';
  el.querySelectorAll('div').forEach(c => c.style.color = 'white');
}

// ─── MODAL RÉSERVATION SALLE ──────────────────────────────────────────────────
let currentRoom    = '';
let salleVisibilite = 'nom';
let mealOn          = true;

function openModal(name, sub) {
  currentRoom = name;
  document.getElementById('modal-room-title').textContent = 'Réserver — ' + name;
  document.getElementById('modal-room-sub').textContent   = sub;
  document.getElementById('modal').classList.add('open');
  initParticipants();
}
function closeModal() { document.getElementById('modal').classList.remove('open'); }
function closeModalOutside(e) { if (e.target === document.getElementById('modal')) closeModal(); }

function toggleMeal() {
  mealOn = !mealOn;
  document.getElementById('meal-toggle-btn').classList.toggle('off', !mealOn);
}

function setVisibility(mode) {
  salleVisibilite = mode;
  document.getElementById('vt-nom').classList.toggle('active',  mode === 'nom');
  document.getElementById('vt-anon').classList.toggle('active', mode === 'anon');
}

async function confirmBooking() {
  const isAnon   = salleVisibilite === 'anon';
  const objet    = document.querySelector('#modal .f-input[placeholder]')?.value.trim() || 'Réunion';
  const dateVal  = document.getElementById('modal-date').value;
  const timeVal  = document.getElementById('modal-time').value;
  const dureeVal = document.getElementById('modal-duree').value;
  const dateObj  = dateVal ? new Date(dateVal + 'T12:00:00') : TODAY;
  const dateFr   = formatDateFr(dateObj);
  const timeSlot = `${timeVal} · ${dureeVal}`;

  const participantList = participants.map(p => p.external ? `${p.email} (ext.)` : p.name).join(', ');

  const ok = await saveReservation({
    type: 'salle', resource_id: currentRoom,
    user_name: isAnon ? null : getUserName(), is_anonymous: isAnon,
    date: dateVal, time_slot: timeSlot, objet,
    participants: participantList,
    user_id: currentUser?.id
  });

  if (!ok) return;

  addResaToList({
    dot: 'var(--blue)',
    title: `${dateFr} · ${timeSlot}`,
    sub:   `${currentRoom} · ${objet}`,
    badge: 'b-free', label: 'Confirmée'
  });

  closeModal();
  showToast('Réservation confirmée !');
}

// ─── BUREAUX ──────────────────────────────────────────────────────────────────
let selectedDesk    = 'A4';
let deskVisibilite  = 'nom';

function selectFloor(el, floor) {
  document.querySelectorAll('.floor-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const labels = { 2: '2e étage — Open Space Nord', 3: '3e étage — Open Space Sud', 4: '4e étage — Direction' };
  document.getElementById('floor-title').textContent = `Plan · ${labels[floor]} · ${sites[siteIdx].short}`;
}

function selDesk(el, id) {
  const blocked = ['d-taken','d-mine','d-wall','d-win'];
  if (blocked.some(c => el.classList.contains(c))) return;
  document.querySelectorAll('.d-sel').forEach(d => { d.classList.remove('d-sel'); d.classList.add('d-free'); });
  el.classList.replace('d-free', 'd-sel');
  selectedDesk = id;
  const rangees = { A: 'Fenêtre', B: 'Centrale', C: 'Centrale', D: 'Sud' };
  document.getElementById('desk-selected-name').textContent = `Bureau ${id} · Rangée ${rangees[id[0]] || ''}`;
}

function setDeskVisibility(mode) {
  deskVisibilite = mode;
  document.getElementById('vt-desk-nom').classList.toggle('active',  mode === 'nom');
  document.getElementById('vt-desk-anon').classList.toggle('active', mode === 'anon');
}

async function reserverBureau() {
  const isAnon  = deskVisibilite === 'anon';
  const dateVal = document.getElementById('desk-date').value || TODAY.toISOString().split('T')[0];
  const dateObj = new Date(dateVal + 'T12:00:00');
  const dateFr  = formatDateFr(dateObj);

  const ok = await saveReservation({
    type: 'bureau', resource_id: selectedDesk,
    user_name: isAnon ? null : getUserName(), is_anonymous: isAnon,
    date: dateVal, time_slot: 'Journée',
    user_id: currentUser?.id
  });

  if (!ok) return;

  addResaToList({
    dot: 'var(--green)',
    title: `${dateFr} · Journée`,
    sub:   `Bureau ${selectedDesk} · Flex office`,
    badge: 'b-free', label: 'Confirmée'
  });

  showToast('Bureau ' + selectedDesk + ' réservé !');
}

function addResaToList(item) {
  const list = document.getElementById('resa-list');
  const emptyState = list.querySelector('[style*="50px"]');
  if (emptyState) emptyState.remove();

  const dotEl = document.createElement('div');
  dotEl.className = 'act-dot';
  dotEl.style.background = item.dot;

  const infoEl = document.createElement('div');
  infoEl.style.flex = '1';
  infoEl.innerHTML = '<div class="act-text"><strong></strong></div><div class="act-time"></div>';
  infoEl.querySelector('strong').textContent   = item.title;
  infoEl.querySelector('.act-time').textContent = item.sub;

  const badgeEl = document.createElement('span');
  badgeEl.className = `badge ${item.badge}`;
  badgeEl.style.marginLeft = 'auto';
  badgeEl.textContent = item.label;

  const div = document.createElement('div');
  div.className = 'act-item';
  div.append(dotEl, infoEl, badgeEl);
  list.appendChild(div);
}

// ─── REPAS ────────────────────────────────────────────────────────────────────
const PRICES = {
  'Plateau Croissants': 18.00, 'Salade César': 14.50,
  'Sandwichs Mix': 42.00,      'Box Fruits Frais': 8.00,
  'Yaourts & Granola': 16.00,  'Plateau Sushis': 65.00
};

function filterMeals(el, cat) {
  document.querySelectorAll('.meal-cat').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll('.meal-card').forEach(card => {
    card.style.display = (cat === 'all' || card.dataset.cat === cat) ? 'block' : 'none';
  });
}

function changeQty(btn, delta) {
  const numEl = btn.parentElement.querySelector('.qty-num');
  numEl.textContent = Math.max(0, parseInt(numEl.textContent) + delta);
  updateCart();
}

function updateCart() {
  const items = [];
  document.querySelectorAll('.meal-card').forEach(card => {
    const qty = parseInt(card.querySelector('.qty-num').textContent);
    if (qty > 0) {
      const name  = card.querySelector('.meal-name').textContent;
      const price = PRICES[name] || 0;
      items.push({ name, qty, price });
    }
  });

  const empty      = document.getElementById('cart-empty');
  const cartItems  = document.getElementById('cart-items');
  const totalRow   = document.getElementById('cart-total-row');
  const commission = document.getElementById('cart-commission');
  const btn        = document.getElementById('cart-btn');
  const hasItems   = items.length > 0;

  empty.style.display      = hasItems ? 'none'  : 'flex';
  cartItems.style.display  = hasItems ? 'block' : 'none';
  totalRow.style.display   = hasItems ? 'flex'  : 'none';
  commission.style.display = hasItems ? 'block' : 'none';
  btn.style.display        = hasItems ? 'block' : 'none';

  if (!hasItems) return;

  let total = 0;
  cartItems.innerHTML = '';
  items.forEach(({ name, qty, price }) => {
    const subtotal = qty * price;
    total += subtotal;
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `<span></span><span style="font-weight:700"></span>`;
    div.querySelector('span').textContent = `${name} x${qty}`;
    div.querySelectorAll('span')[1].textContent = `${subtotal.toFixed(2).replace('.', ',')} €`;
    cartItems.appendChild(div);
  });

  const fmt = n => n.toFixed(2).replace('.', ',') + ' €';
  document.getElementById('cart-total-val').textContent = fmt(total);
  commission.textContent = `Commission Delizia (10%) : ${fmt(total * 0.1)}`;
}

function passerCommande() {
  showToast('Commande envoyée à Delizia · Livraison prévue dans 30 min ✓');
  document.querySelectorAll('.qty-num').forEach(el => el.textContent = '0');
  updateCart();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}
