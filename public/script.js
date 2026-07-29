// =========================================================
// CREATOR HUB — Interactions + Espace Admin (version serveur)
// =========================================================
// Les vidéos et partenariats sont lus/écrits via l'API du serveur
// (server.js). Toute modification enregistrée par l'admin est donc
// visible par TOUS les visiteurs, immédiatement.
// =========================================================

const SESSION_KEY = 'creatorhub_admin_token';

let videosData = [];
let partnersData = [];

/* ---------- Appels API ---------- */
async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Erreur réseau');
  return res.json();
}

async function apiPost(url, body, auth = false) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${getToken()}`;
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

function getToken() {
  return sessionStorage.getItem(SESSION_KEY);
}
function isAuthed() {
  return Boolean(getToken());
}

/* ---------- Rendu public : vidéos à la une ---------- */
function renderVideos() {
  const grid = document.getElementById('contentGrid');
  if (!grid) return;
  grid.innerHTML = videosData.map((v, i) => `
    <div class="content-card reveal in" style="--i:${i};">
      <div class="content-thumb">
        <span class="content-platform-tag">${escapeHTML(v.platform)}</span>
        ${v.thumb ? `<img src="${escapeAttr(v.thumb)}" alt="${escapeAttr(v.title)}" style="width:100%;height:100%;object-fit:cover;">` : ''}
        <div class="play-btn">▶</div>
      </div>
      <div class="content-body">
        <div class="content-title">${escapeHTML(v.title)}</div>
        <div class="content-sub">${escapeHTML(v.meta)}</div>
      </div>
    </div>
  `).join('');
}

/* ---------- Rendu public : partenariats ---------- */
function renderPartners() {
  const grid = document.getElementById('partnersGrid');
  if (!grid) return;

  if (!partnersData.length) {
    grid.innerHTML = `<div class="partners-empty">Aucun partenariat pour l'instant — reviens bientôt !</div>`;
    return;
  }

  grid.innerHTML = partnersData.map((p, i) => `
    <div class="partner-card reveal in" style="--i:${i};">
      <div class="partner-photo">
        ${p.photo
          ? `<img src="${escapeAttr(p.photo)}" alt="${escapeAttr(p.name)}">`
          : `<div class="placeholder">Photo du partenariat</div>`}
      </div>
      <div class="partner-body">
        <div class="partner-name">${escapeHTML(p.name)}</div>
        <div class="partner-desc">${escapeHTML(p.description)}</div>
        ${p.link ? `<a class="btn btn-ghost" href="${escapeAttr(p.link)}" target="_blank" rel="noopener">${escapeHTML(p.buttonLabel || 'Découvrir')} ↗</a>` : ''}
      </div>
    </div>
  `).join('');
}

function escapeHTML(str = '') {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
function escapeAttr(str = '') {
  return String(str).replace(/"/g, '&quot;');
}

/* ---------- Admin : ouverture / fermeture des modals ---------- */
function openLoginModal() {
  document.getElementById('adminLoginOverlay').classList.add('open');
  document.getElementById('adminPass').focus();
}
function closeLoginModal() {
  document.getElementById('adminLoginOverlay').classList.remove('open');
  document.getElementById('adminError').hidden = true;
  document.getElementById('adminLoginForm').reset();
}
function openDashboard() {
  buildVideoEditor();
  buildPartnerEditor();
  document.getElementById('adminDashOverlay').classList.add('open');
}
function closeDashboard() {
  document.getElementById('adminDashOverlay').classList.remove('open');
}

function updateAdminButtonState() {
  const btn = document.getElementById('adminOpenBtn');
  if (!btn) return;
  btn.classList.toggle('is-authed', isAuthed());
  btn.title = isAuthed() ? 'Espace administrateur (connecté)' : 'Connexion admin';
}

/* ---------- Admin : éditeur de vidéos ---------- */
function buildVideoEditor() {
  const list = document.getElementById('videoEditList');
  list.innerHTML = videosData.map((v, i) => `
    <div class="admin-edit-card" data-index="${i}">
      <div class="admin-edit-row">
        <div class="field">
          <label>Plateforme</label>
          <select data-field="platform">
            ${['YouTube', 'Twitch', 'TikTok', 'Discord'].map(p => `<option ${p === v.platform ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>Infos (date, vues...)</label>
          <input type="text" data-field="meta" value="${escapeAttr(v.meta)}" placeholder="Il y a 2 jours • 45K vues">
        </div>
      </div>
      <div class="field">
        <label>Titre de la vidéo</label>
        <input type="text" data-field="title" value="${escapeAttr(v.title)}" placeholder="Titre de la vidéo">
      </div>
      <div class="field">
        <label>URL de la miniature (optionnel)</label>
        <input type="text" data-field="thumb" value="${escapeAttr(v.thumb || '')}" placeholder="https://... ou laisse vide">
      </div>
    </div>
  `).join('');
}

function collectVideosFromEditor() {
  const cards = document.querySelectorAll('#videoEditList .admin-edit-card');
  return Array.from(cards).map(card => ({
    platform: card.querySelector('[data-field="platform"]').value,
    title: card.querySelector('[data-field="title"]').value.trim() || 'Sans titre',
    meta: card.querySelector('[data-field="meta"]').value.trim(),
    thumb: card.querySelector('[data-field="thumb"]').value.trim()
  }));
}

/* ---------- Admin : éditeur de partenariats ---------- */
function buildPartnerEditor() {
  const list = document.getElementById('partnerEditList');
  list.innerHTML = partnersData.map((p, i) => `
    <div class="admin-edit-card" data-index="${i}">
      <button type="button" class="admin-edit-remove" data-remove-partner="${i}">Supprimer</button>
      <div class="field">
        <label>Nom du partenaire</label>
        <input type="text" data-field="name" value="${escapeAttr(p.name)}" placeholder="Nom de la marque / du partenaire">
      </div>
      <div class="field">
        <label>Description</label>
        <textarea data-field="description" placeholder="Décris ce partenariat...">${escapeHTML(p.description || '')}</textarea>
      </div>
      <div class="admin-edit-row">
        <div class="field">
          <label>Lien (site, boutique, code promo...)</label>
          <input type="text" data-field="link" value="${escapeAttr(p.link || '')}" placeholder="https://...">
        </div>
        <div class="field">
          <label>Texte du bouton</label>
          <input type="text" data-field="buttonLabel" value="${escapeAttr(p.buttonLabel || '')}" placeholder="Découvrir">
        </div>
      </div>
      <div class="field">
        <label>Photo du partenariat</label>
        <div class="admin-photo-preview" data-preview>
          ${p.photo ? `<img src="${escapeAttr(p.photo)}" alt="">` : 'Aucune photo choisie'}
        </div>
        <input type="file" accept="image/*" data-field="photoFile" style="margin-top:10px;">
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-remove-partner]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.removePartner);
      partnersData.splice(idx, 1);
      buildPartnerEditor();
    });
  });

  list.querySelectorAll('[data-field="photoFile"]').forEach(input => {
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 4 * 1024 * 1024) {
        alert('Photo trop lourde (max ~4 Mo). Choisis une image plus légère.');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const card = input.closest('.admin-edit-card');
        const preview = card.querySelector('[data-preview]');
        preview.innerHTML = `<img src="${reader.result}" alt="">`;
        card.dataset.photoData = reader.result;
      };
      reader.readAsDataURL(file);
    });
  });
}

function collectPartnersFromEditor() {
  const cards = document.querySelectorAll('#partnerEditList .admin-edit-card');
  return Array.from(cards).map(card => {
    const existingIndex = Number(card.dataset.index);
    const newPhoto = card.dataset.photoData;
    return {
      name: card.querySelector('[data-field="name"]').value.trim() || 'Partenaire',
      description: card.querySelector('[data-field="description"]').value.trim(),
      link: card.querySelector('[data-field="link"]').value.trim(),
      buttonLabel: card.querySelector('[data-field="buttonLabel"]').value.trim(),
      photo: newPhoto || (partnersData[existingIndex] ? partnersData[existingIndex].photo : '')
    };
  });
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async () => {

  try {
    videosData = await apiGet('/api/videos');
  } catch { videosData = []; }
  try {
    partnersData = await apiGet('/api/partners');
  } catch { partnersData = []; }

  renderVideos();
  renderPartners();
  updateAdminButtonState();

  /* ---- Navbar: fond au scroll ---- */
  const navbar = document.getElementById('navbar');
  const backTop = document.getElementById('backTop');
  const onScroll = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
    backTop.classList.toggle('show', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---- Menu mobile ---- */
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  navToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    navToggle.classList.toggle('open');
  });
  mobileMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => mobileMenu.classList.remove('open'));
  });

  /* ---- Animations au scroll ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  /* ---- Formulaire de contact ---- */
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalText = btn.textContent;
      btn.textContent = 'Envoi en cours...';
      btn.disabled = true;
      setTimeout(() => {
        btn.textContent = 'Message envoyé ✓';
        form.reset();
        setTimeout(() => { btn.textContent = originalText; btn.disabled = false; }, 2500);
      }, 900);
    });
  }

  /* =========================================================
     ADMIN
     ========================================================= */
  const adminOpenBtn = document.getElementById('adminOpenBtn');
  const adminLoginOverlay = document.getElementById('adminLoginOverlay');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminLoginClose = document.getElementById('adminLoginClose');
  const adminError = document.getElementById('adminError');
  const adminDashOverlay = document.getElementById('adminDashOverlay');
  const adminDashClose = document.getElementById('adminDashClose');
  const adminLogoutBtn = document.getElementById('adminLogoutBtn');

  adminOpenBtn.addEventListener('click', () => {
    if (isAuthed()) openDashboard();
    else openLoginModal();
  });

  adminLoginClose.addEventListener('click', closeLoginModal);
  adminLoginOverlay.addEventListener('click', (e) => { if (e.target === adminLoginOverlay) closeLoginModal(); });

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const pass = document.getElementById('adminPass').value;
    const submitBtn = adminLoginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const { token } = await apiPost('/api/login', { password: pass });
      sessionStorage.setItem(SESSION_KEY, token);
      updateAdminButtonState();
      closeLoginModal();
      openDashboard();
    } catch {
      adminError.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  adminDashClose.addEventListener('click', closeDashboard);
  adminDashOverlay.addEventListener('click', (e) => { if (e.target === adminDashOverlay) closeDashboard(); });

  adminLogoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    updateAdminButtonState();
    closeDashboard();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeLoginModal(); closeDashboard(); }
  });

  /* ---- Tabs du dashboard ---- */
  document.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('panel-videos').hidden = target !== 'videos';
      document.getElementById('panel-partners').hidden = target !== 'partners';
    });
  });

  /* ---- Enregistrer les vidéos (écrit sur le serveur → visible par tous) ---- */
  document.getElementById('saveVideosBtn').addEventListener('click', async () => {
    const btn = document.getElementById('saveVideosBtn');
    const msg = document.getElementById('videosSaved');
    btn.disabled = true;
    try {
      videosData = collectVideosFromEditor();
      await apiPost('/api/videos', videosData, true);
      renderVideos();
      msg.textContent = '✓ Enregistré — visible par tous les visiteurs';
      msg.hidden = false;
      setTimeout(() => { msg.hidden = true; }, 2500);
    } catch (err) {
      alert('Erreur : ' + err.message + ' (ta session a peut-être expiré, reconnecte-toi)');
    } finally {
      btn.disabled = false;
    }
  });

  /* ---- Ajouter / enregistrer les partenariats ---- */
  document.getElementById('addPartnerBtn').addEventListener('click', () => {
    partnersData.push({ name: '', description: '', link: '', buttonLabel: 'Découvrir', photo: '' });
    buildPartnerEditor();
  });

  document.getElementById('savePartnersBtn').addEventListener('click', async () => {
    const btn = document.getElementById('savePartnersBtn');
    const msg = document.getElementById('partnersSaved');
    btn.disabled = true;
    try {
      partnersData = collectPartnersFromEditor();
      await apiPost('/api/partners', partnersData, true);
      renderPartners();
      buildPartnerEditor();
      msg.textContent = '✓ Enregistré — visible par tous les visiteurs';
      msg.hidden = false;
      setTimeout(() => { msg.hidden = true; }, 2500);
    } catch (err) {
      alert('Erreur : ' + err.message + ' (ta session a peut-être expiré, reconnecte-toi)');
    } finally {
      btn.disabled = false;
    }
  });

});
