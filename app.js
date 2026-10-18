/* ============================================================
   SlideSync — application logic
   - Auth + session (localStorage)
   - Project profiles CRUD
   - Workspace (uploads, slides, AI tabs, chat, export)
============================================================ */

const STORAGE = {
  SESSION: 'slidesync_session',
  PROJECTS: 'slidesync_projects',
};

// ====================== Auth ======================
function getSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE.SESSION)) || null; }
  catch (e) { return null; }
}
function setSession(s) { localStorage.setItem(STORAGE.SESSION, JSON.stringify(s)); }
function clearSession() { localStorage.removeItem(STORAGE.SESSION); }

function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.replace('index.html');
    return false;
  }
  return true;
}

function logout() {
  clearSession();
  showToast('Signed out', 'info');
  setTimeout(() => { window.location.href = 'index.html'; }, 300);
}

function parseEmail(email) {
  const [localPart = '', domain = ''] = email.split('@');
  const parts = localPart.split(/[.\-_+]/).filter(Boolean);
  const name = parts.length
    ? parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    : 'Researcher';
  let university = 'Institution';
  if (domain) {
    const slug = domain.split('.')[0];
    const niceMap = {
      university: 'University',
      uni: 'University',
      edu: 'College',
    };
    university = (niceMap[slug.toLowerCase()] || slug.charAt(0).toUpperCase() + slug.slice(1)) +
      (slug.toLowerCase() === 'university' || slug.toLowerCase() === 'edu' ? '' : ' University');
  }
  const initials = (parts[0] ? parts[0].charAt(0).toUpperCase() : 'U') +
                   (parts[1] ? parts[1].charAt(0).toUpperCase() : '');
  return { email, name, university, initials };
}

// ====================== Login ======================
function openLogin() {
  if (getSession()) {
    window.location.href = 'my-space.html';
    return;
  }
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const inp = document.getElementById('loginEmail');
    if (inp) inp.focus();
  }, 200);
}

function closeLogin() {
  const modal = document.getElementById('loginModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  const err = document.getElementById('loginError');
  if (err) err.classList.remove('visible');
}

function openLoginWithEmail() {
  const heroEmail = document.getElementById('heroEmail');
  openLogin();
  if (heroEmail && heroEmail.value && getSession() == null) {
    setTimeout(() => {
      const target = document.getElementById('loginEmail');
      if (target) {
        target.value = heroEmail.value;
        const pw = document.getElementById('loginPassword');
        if (pw) pw.focus();
      }
    }, 220);
  }
}

function handleLogin(e) {
  e.preventDefault();
  const email = (document.getElementById('loginEmail').value || '').trim();
  const password = document.getElementById('loginPassword').value || '';
  const errorEl = document.getElementById('loginError');
  const errorText = document.getElementById('loginErrorText');
  errorEl.classList.remove('visible');

  if (!email.includes('@') || !email.split('@')[1].includes('.')) {
    errorText.textContent = 'Please enter a valid institutional email.';
    errorEl.classList.add('visible');
    return;
  }
  if (password.length < 6) {
    errorText.textContent = 'Password must be at least 6 characters.';
    errorEl.classList.add('visible');
    return;
  }

  const userInfo = parseEmail(email);
  setSession(userInfo);
  showToast(`Welcome back, ${userInfo.name.split(' ')[0]}!`, 'success');
  setTimeout(() => { window.location.href = 'my-space.html'; }, 500);
}

function handleSSO() {
  const session = {
    email: 'jane.smith@northbridge.edu',
    name: 'Jane Smith',
    university: 'Northbridge University',
    initials: 'JS',
  };
  setSession(session);
  showToast('Signed in via Institutional SSO', 'success');
  setTimeout(() => { window.location.href = 'my-space.html'; }, 500);
}

// ====================== Sidebar ======================
function initSidebarUserInfo() {
  const session = getSession();
  if (!session) return;
  const initials = document.getElementById('userInitials');
  const name = document.getElementById('userName');
  const uni = document.getElementById('userUni');
  if (initials) initials.textContent = session.initials || (session.name || 'U').charAt(0).toUpperCase();
  if (name) name.textContent = session.name || 'User';
  if (uni) uni.textContent = session.university || 'Institution';
}

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.toggle('open');
  if (ov) ov.classList.toggle('open');
}

function toggleMobileMenu() {
  const nav = document.getElementById('publicNav');
  if (nav) nav.classList.toggle('menu-open');
}

// ====================== Public nav scroll ======================
window.addEventListener('scroll', () => {
  const nav = document.getElementById('publicNav');
  if (!nav) return;
  if (window.scrollY > 20) nav.classList.add('scrolled');
  else nav.classList.remove('scrolled');
}, { passive: true });

// ====================== Toast ======================
function showToast(message, type = 'info', duration = 3000) {
  const wrap = document.getElementById('toastWrap');
  if (!wrap) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check'
    : type === 'error' ? 'fa-circle-xmark'
    : 'fa-circle-info';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ====================== Helpers ======================
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[m]));
}

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const min = 60 * 1000, hr = 60 * min, day = 24 * hr;
  if (diff < min) return 'just now';
  if (diff < hr) {
    const m = Math.floor(diff / min);
    return `${m} min${m > 1 ? 's' : ''} ago`;
  }
  if (diff < day) {
    const h = Math.floor(diff / hr);
    return `${h} hr${h > 1 ? 's' : ''} ago`;
  }
  if (diff < 7 * day) {
    const d = Math.floor(diff / day);
    return `${d} day${d > 1 ? 's' : ''} ago`;
  }
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ====================== Projects ======================
const SAMPLE_PROJECTS = [
  {
    id: 'p1',
    title: 'Intro to Machine Learning — Fall 2026',
    lastModified: Date.now() - 2 * 60 * 60 * 1000,
    slideCount: 42,
    recency: '6m',
    preferredSources: 'arxiv.org\nnature.com\npapers.nips.cc',
    excludedSources: 'wikipedia.org',
    updateTypes: ['new-research', 'examples', 'references'],
    summarization: 'concise',
    versions: [
      { date: Date.now() - 2 * 60 * 60 * 1000, change: 'Updated preferred sources' },
      { date: Date.now() - 26 * 60 * 60 * 1000, change: 'Adjusted recency to 6 months' },
      { date: Date.now() - 5 * 24 * 60 * 60 * 1000, change: 'Initial profile created' },
    ],
  },
  {
    id: 'p2',
    title: 'Organic Chemistry — Spring 2026',
    lastModified: Date.now() - 24 * 60 * 60 * 1000,
    slideCount: 36,
    recency: '1y',
    preferredSources: 'pubs.acs.org\njcedonline.com',
    excludedSources: '',
    updateTypes: ['new-research', 'terminology', 'visuals'],
    summarization: 'academic',
    versions: [
      { date: Date.now() - 24 * 60 * 60 * 1000, change: 'Initial profile created' },
    ],
  },
  {
    id: 'p3',
    title: 'Macroeconomics 201',
    lastModified: Date.now() - 5 * 24 * 60 * 60 * 1000,
    slideCount: 28,
    recency: '3m',
    preferredSources: 'imf.org\nworldbank.org\nbis.org',
    excludedSources: '',
    updateTypes: ['statistics', 'case-studies', 'references'],
    summarization: 'balanced',
    versions: [
      { date: Date.now() - 5 * 24 * 60 * 60 * 1000, change: 'Initial profile created' },
    ],
  },
];

function getProjects() {
  try {
    const raw = localStorage.getItem(STORAGE.PROJECTS);
    if (!raw) {
      setProjects(SAMPLE_PROJECTS);
      return SAMPLE_PROJECTS.slice();
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}
function setProjects(list) {
  localStorage.setItem(STORAGE.PROJECTS, JSON.stringify(list));
}
function getProjectById(id) {
  return getProjects().find(p => p.id === id);
}

function renderProfiles() {
  const grid = document.getElementById('profileGrid');
  if (!grid) return;
  const projects = getProjects().slice().sort((a, b) => b.lastModified - a.lastModified);
  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="fa-regular fa-folder-open"></i>
        <h3>No project profiles yet</h3>
        <p>Create your first profile to start updating your lecture decks with AI.</p>
        <button class="btn btn-primary" onclick="openProjectModal()">
          <i class="fa-solid fa-plus"></i> New Project Profile
        </button>
      </div>`;
    return;
  }
  grid.innerHTML = projects.map(p => `
    <article class="profile-card">
      <div class="profile-card-icon"><i class="fa-solid fa-layer-group"></i></div>
      <h3>${escapeHtml(p.title)}</h3>
      <div class="profile-meta">
        <span><i class="fa-regular fa-clock"></i> ${escapeHtml(relativeTime(p.lastModified))}</span>
        <span class="dot"></span>
        <span><i class="fa-regular fa-file"></i> ${p.slideCount} slides</span>
      </div>
      <div class="profile-actions">
        <button class="btn btn-primary btn-sm" onclick="openProject('${p.id}')">
          <i class="fa-solid fa-arrow-up-right-from-square"></i> Open
        </button>
        <button class="btn btn-outline btn-sm" onclick="editProject('${p.id}')" title="Edit">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-outline btn-sm" onclick="confirmDeleteProject('${p.id}')" title="Delete" style="color:#FCA5A5;">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </article>
  `).join('');
}

function openProjectModal(id = null) {
  const modal = document.getElementById('projectModal');
  if (!modal) return;
  const form = document.getElementById('projectForm');
  if (form) form.reset();
  document.getElementById('projectId').value = '';
  document.querySelectorAll('#updateTypesGroup .checkbox-pill').forEach(p => p.classList.remove('checked'));
  document.getElementById('versionHistoryWrap').style.display = 'none';

  if (id) {
    const project = getProjectById(id);
    if (project) {
      document.getElementById('projectModalTitle').textContent = 'Edit Project Profile';
      document.getElementById('projectModalSubtitle').textContent = 'Update settings — earlier versions are preserved.';
      document.getElementById('projectId').value = id;
      document.getElementById('projectTitle').value = project.title;
      document.getElementById('recency').value = project.recency || '6m';
      document.getElementById('preferredSources').value = project.preferredSources || '';
      document.getElementById('excludedSources').value = project.excludedSources || '';
      document.getElementById('summarization').value = project.summarization || 'concise';
      (project.updateTypes || []).forEach(t => {
        const cb = document.querySelector(`#updateTypesGroup input[value="${t}"]`);
        if (cb) {
          cb.checked = true;
          cb.closest('.checkbox-pill').classList.add('checked');
        }
      });
      const wrap = document.getElementById('versionHistoryWrap');
      const list = document.getElementById('versionList');
      wrap.style.display = 'block';
      list.innerHTML = (project.versions || []).map(v => `
        <div class="version-row">
          <span>${escapeHtml(v.change)}</span>
          <span class="when">${escapeHtml(relativeTime(v.date))}</span>
        </div>
      `).join('') || '<div style="font-size:13px; color:var(--slate-500);">No history yet.</div>';
    }
  } else {
    document.getElementById('projectModalTitle').textContent = 'New Project Profile';
    document.getElementById('projectModalSubtitle').textContent = 'Configure how SlideSync should update this lecture deck.';
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const inp = document.getElementById('projectTitle');
    if (inp) inp.focus();
  }, 200);
}

function closeProjectModal() {
  const modal = document.getElementById('projectModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

function editProject(id) { openProjectModal(id); }
function openProject(id) { window.location.href = `workspace.html?id=${encodeURIComponent(id)}`; }

function handleProjectSubmit(e) {
  e.preventDefault();
  const idField = document.getElementById('projectId').value;
  const isNew = !idField;
  const id = idField || ('p' + Date.now());
  const updateTypes = Array.from(document.querySelectorAll('#updateTypesGroup input:checked')).map(cb => cb.value);
  const data = {
    id,
    title: document.getElementById('projectTitle').value.trim(),
    recency: document.getElementById('recency').value,
    preferredSources: document.getElementById('preferredSources').value.trim(),
    excludedSources: document.getElementById('excludedSources').value.trim(),
    updateTypes,
    summarization: document.getElementById('summarization').value,
    lastModified: Date.now(),
  };
  if (!data.title) {
    showToast('Project title is required', 'error');
    return;
  }

  let projects = getProjects();
  if (isNew) {
    data.slideCount = 0;
    data.versions = [{ date: Date.now(), change: 'Initial profile created' }];
    projects.unshift(data);
    showToast('Project profile created', 'success');
  } else {
    const existing = projects.find(p => p.id === id);
    data.slideCount = existing ? existing.slideCount : 0;
    const prevVersions = (existing && existing.versions) || [];
    data.versions = [{ date: Date.now(), change: 'Settings updated' }, ...prevVersions].slice(0, 10);
    projects = projects.map(p => p.id === id ? data : p);
    showToast('Project profile updated', 'success');
  }
  setProjects(projects);
  closeProjectModal();
  renderProfiles();
}

let pendingDeleteId = null;
function confirmDeleteProject(id) {
  const p = getProjectById(id);
  if (!p) return;
  pendingDeleteId = id;
  document.getElementById('deleteProjectName').textContent = p.title;
  document.getElementById('deleteModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDeleteModal() {
  const modal = document.getElementById('deleteModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.style.overflow = '';
  pendingDeleteId = null;
}
function confirmDelete() {
  if (!pendingDeleteId) return;
  const projects = getProjects().filter(p => p.id !== pendingDeleteId);
  setProjects(projects);
  closeDeleteModal();
  renderProfiles();
  showToast('Project profile deleted', 'success');
}

// Checkbox pill toggle (event delegation)
document.addEventListener('change', (e) => {
  if (e.target && e.target.matches('.checkbox-pill input[type="checkbox"]')) {
    e.target.closest('.checkbox-pill').classList.toggle('checked', e.target.checked);
  }
});

// Modal backdrop click + Esc
document.addEventListener('click', (e) => {
  if (e.target && e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    document.body.style.overflow = '';
  }
});

// Hero email — Enter triggers login
document.addEventListener('DOMContentLoaded', () => {
  const heroEmail = document.getElementById('heroEmail');
  if (heroEmail) {
    heroEmail.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        openLoginWithEmail();
      }
    });
  }
});

// ====================== Workspace ======================
const SAMPLE_SLIDES = [
  { id: 's1', num: 1, title: 'Introduction to Neural Networks', confidence: 'high' },
  { id: 's2', num: 2, title: 'Perceptrons & Activation Functions', confidence: 'high' },
  { id: 's3', num: 3, title: 'Backpropagation Mechanics', confidence: 'med' },
  { id: 's4', num: 4, title: 'Convolutional Layers', confidence: 'high' },
  { id: 's5', num: 5, title: 'Recurrent Networks & LSTMs', confidence: 'low' },
  { id: 's6', num: 6, title: 'Attention & Transformers', confidence: 'high' },
  { id: 's7', num: 7, title: 'Diffusion Models', confidence: 'low' },
  { id: 's8', num: 8, title: 'Ethics & Bias in AI', confidence: 'high' },
];

const SAMPLE_TOPICS = [
  {
    id: 't1', slideId: 's1', slideNum: 1,
    title: 'Introduction to Neural Networks',
    summary: "Neural networks are computational models loosely inspired by biological brains. SlideSync found an updated 2025 review broadening the historical context to include analog and neuromorphic precursors.",
    tags: ['updated 2025', 'historical context'],
    confidence: 'high',
    suggestion: null,
    update: {
      title: 'Updated highlights',
      bullets: [
        'Add reference to neuromorphic computing renaissance (2024–25)',
        'Include analog neural network historical precursors',
        'Modernize "biological inspiration" framing per recent neuroscience',
      ],
    },
  },
  {
    id: 't2', slideId: 's3', slideNum: 3,
    title: 'Backpropagation Mechanics',
    summary: 'Recent work refines the role of automatic differentiation libraries. Suggestion: add brief note on JAX-style functional gradients alongside PyTorch autograd.',
    tags: ['suggestion', 'medium confidence'],
    confidence: 'med',
    suggestion: 'AI is 64% confident this is relevant. Review before applying.',
    update: {
      title: 'Suggested update',
      bullets: [
        'Add JAX-style functional autograd alternative',
        'Note: chain rule visualization tool from MIT OCW (2024)',
      ],
    },
  },
  {
    id: 't3', slideId: 's5', slideNum: 5,
    title: 'Recurrent Networks & LSTMs',
    summary: 'LSTMs are increasingly replaced by Transformer-based sequence models. Low confidence — your existing emphasis on RNNs may be intentional for pedagogical scaffolding.',
    tags: ['low confidence', 'review needed'],
    confidence: 'low',
    suggestion: 'AI is 41% confident this update fits your teaching style. Review carefully.',
    update: {
      title: 'Suggested update',
      bullets: [
        'Caveat: LSTMs largely replaced by Transformers in production (2023–25)',
        'Add brief comparison: vanishing gradients vs attention-based memory',
      ],
    },
  },
  {
    id: 't4', slideId: 's6', slideNum: 6,
    title: 'Attention & Transformers',
    summary: 'Significant update window — many new architectures since 2023. Auto-applied: Mixture of Experts, FlashAttention v3, and key efficiency improvements.',
    tags: ['auto-applied', 'high confidence', '2025'],
    confidence: 'high',
    suggestion: null,
    update: {
      title: 'Auto-applied updates',
      bullets: [
        'Mixture of Experts (MoE) architectures',
        'FlashAttention v3 — IO-aware attention',
        'Sliding window & sparse attention variants',
        'Long-context techniques: YaRN, RoPE scaling',
      ],
    },
  },
  {
    id: 't5', slideId: 's7', slideNum: 7,
    title: 'Diffusion Models',
    summary: 'Suggested addition — your deck does not currently cover diffusion models, which now dominate generative image work. Low confidence as this changes scope.',
    tags: ['suggested addition', 'low confidence'],
    confidence: 'low',
    suggestion: 'AI is 38% confident you want to expand scope here. Approve to add a new slide.',
    update: {
      title: 'Suggested new slide',
      bullets: [
        'DDPM, score-based, and flow matching frameworks',
        'Latent diffusion (Stable Diffusion family)',
        'Connection to Transformers via DiT architectures',
      ],
    },
  },
  {
    id: 't6', slideId: 's8', slideNum: 8,
    title: 'Ethics & Bias in AI',
    summary: 'Substantial new regulatory and academic developments since 2024. Auto-applied references to EU AI Act compliance and recent fairness benchmarks.',
    tags: ['auto-applied', 'high confidence', 'regulatory'],
    confidence: 'high',
    suggestion: null,
    update: {
      title: 'Auto-applied updates',
      bullets: [
        'EU AI Act compliance framework (in force 2024)',
        'Updated bias benchmarks: BOLD, BBQ, StereoSet revisions',
        'Add citation: NIST AI Risk Management Framework 1.0',
      ],
    },
  },
];

const SAMPLE_SOURCES = [
  { title: 'Attention Is All You Need (revisited)', url: 'https://arxiv.org/abs/1706.03762', tag: 'arXiv', date: '2024' },
  { title: 'FlashAttention-3: Asynchrony, Low-Precision', url: 'https://arxiv.org/abs/2407.08608', tag: 'arXiv', date: '2024' },
  { title: 'Mixture of Experts: A Comprehensive Review', url: 'https://www.nature.com/articles/example', tag: 'Nature', date: '2025' },
  { title: 'Denoising Diffusion Probabilistic Models', url: 'https://arxiv.org/abs/2006.11239', tag: 'arXiv', date: '2024' },
  { title: 'EU AI Act — Official Journal Text', url: 'https://eur-lex.europa.eu/AI-Act', tag: 'EU Law', date: '2024' },
  { title: 'NIST AI Risk Management Framework 1.0', url: 'https://www.nist.gov/itl/ai-rmf', tag: 'NIST', date: '2024' },
  { title: 'BBQ: Bias Benchmark for Question Answering', url: 'https://aclanthology.org/2022.findings-acl.165/', tag: 'ACL', date: '2024' },
  { title: 'YaRN: Efficient Context Window Extension', url: 'https://arxiv.org/abs/2309.00071', tag: 'arXiv', date: '2025' },
  { title: 'Neuromorphic Computing Renaissance', url: 'https://www.nature.com/example-neuro', tag: 'Nature', date: '2025' },
  { title: 'JAX: Composable Function Transformations', url: 'https://jax.readthedocs.io', tag: 'Docs', date: '2024' },
  { title: 'Stable Diffusion 3 Technical Report', url: 'https://stability.ai/research/sd3', tag: 'Industry', date: '2024' },
  { title: 'Sliding Window Attention Patterns', url: 'https://arxiv.org/abs/2004.05150', tag: 'arXiv', date: '2024' },
];

let workspaceState = {
  projectId: null,
  project: null,
  activeSlide: 's1',
  activeTab: 'summary',
  slides: SAMPLE_SLIDES.slice(),
  topics: SAMPLE_TOPICS.slice(),
  sources: SAMPLE_SOURCES.slice(),
};

function initWorkspace() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  workspaceState.projectId = id;
  workspaceState.project = id ? getProjectById(id) : null;

  const titleEl = document.getElementById('projectTitleHeader');
  if (titleEl) {
    titleEl.textContent = workspaceState.project ? workspaceState.project.title : 'Untitled Project';
  }

  renderThumbnails();
  renderSummary();
  renderEslides();
  renderSources();
  initUploadZone();
  updateCounts();
}

function updateCounts() {
  const sc = document.getElementById('summaryCount');
  const ec = document.getElementById('eslidesCount');
  const so = document.getElementById('sourcesCount');
  if (sc) sc.textContent = workspaceState.topics.length;
  if (ec) ec.textContent = workspaceState.topics.length;
  if (so) so.textContent = workspaceState.sources.length;

  const high = workspaceState.topics.filter(t => t.confidence === 'high').length;
  const review = workspaceState.topics.filter(t => t.confidence !== 'high').length;
  const info = document.getElementById('tabToolbarInfo');
  if (info) {
    info.innerHTML =
      `<strong>${workspaceState.topics.length} topics extracted</strong> · ${high} high-confidence · ${review} needing review`;
  }
}

function renderThumbnails() {
  const root = document.getElementById('thumbnails');
  if (!root) return;
  root.innerHTML = workspaceState.slides.map(s => `
    <div class="thumbnail ${s.id === workspaceState.activeSlide ? 'active' : ''}"
         onclick="selectSlide('${s.id}')">
      <div class="thumbnail-num">${s.num}</div>
      <div class="thumbnail-info">
        <div class="title">${escapeHtml(s.title)}</div>
        <div class="meta">
          <span class="confidence-pill ${s.confidence}">
            <i class="fa-solid fa-circle" style="font-size:6px;"></i>
            ${s.confidence === 'high' ? 'Auto-applied' : s.confidence === 'med' ? 'Review' : 'Low conf.'}
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

function selectSlide(id) {
  workspaceState.activeSlide = id;
  renderThumbnails();
  const topic = workspaceState.topics.find(t => t.slideId === id);
  if (topic) {
    const targetId = workspaceState.activeTab === 'eslides' ? `eslide-${topic.id}` : `summary-${topic.id}`;
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.transition = 'box-shadow 0.4s';
      el.style.boxShadow = '0 0 0 2px var(--primary)';
      setTimeout(() => { el.style.boxShadow = ''; }, 1400);
    }
  }
}

function renderSummary() {
  const root = document.getElementById('summaryList');
  if (!root) return;
  if (workspaceState.topics.length === 0) {
    root.innerHTML = `<div class="empty-state" style="grid-column:auto;">
      <i class="fa-regular fa-file-lines"></i>
      <h3>No topics yet</h3>
      <p>Upload slides to start AI extraction.</p>
    </div>`;
    return;
  }
  root.innerHTML = workspaceState.topics.map(t => `
    <article class="summary-card" id="summary-${t.id}" onclick="selectSlide('${t.slideId}')">
      <div class="summary-card-head">
        <div>
          <div class="summary-card-title">${escapeHtml(t.title)}</div>
          <div class="summary-card-slide">
            <i class="fa-regular fa-file"></i> Slide ${t.slideNum}
          </div>
        </div>
        <span class="confidence-pill ${t.confidence}">
          <i class="fa-solid fa-circle" style="font-size:6px;"></i>
          ${t.confidence === 'high' ? 'High confidence' : t.confidence === 'med' ? 'Medium' : 'Low confidence'}
        </span>
      </div>
      <p>${escapeHtml(t.summary)}</p>
      <div class="summary-tags">
        ${t.tags.map(tag => `<span class="summary-tag">${escapeHtml(tag)}</span>`).join('')}
      </div>
    </article>
  `).join('');
}

function renderEslides() {
  const root = document.getElementById('eslidesList');
  if (!root) return;
  if (workspaceState.topics.length === 0) {
    root.innerHTML = `<div class="empty-state" style="grid-column:auto;">
      <i class="fa-solid fa-table-columns"></i>
      <h3>No e-slides yet</h3>
      <p>Upload your deck to see side-by-side AI updates.</p>
    </div>`;
    return;
  }
  root.innerHTML = workspaceState.topics.map(t => `
    <div class="eslide-row" id="eslide-${t.id}">
      <div class="eslide-side original">
        <div class="eslide-label">
          <i class="fa-regular fa-file-lines"></i> Original — Slide ${t.slideNum}
        </div>
        <div class="eslide-content">
          <h4>${escapeHtml(t.title)}</h4>
          <p style="color:var(--slate-400); font-size:13px;">Original slide content as authored. Existing structure and key points preserved.</p>
          <ul>
            <li>Original outline preserved</li>
            <li>No modification to slide title</li>
            <li>Visual layout untouched</li>
          </ul>
        </div>
      </div>
      <div class="eslide-side update">
        <div class="eslide-label update">
          <i class="fa-solid fa-wand-magic-sparkles"></i>
          ${t.confidence === 'high' ? 'AI Update — Auto-Applied' : 'AI Update — Suggestion'}
        </div>
        <div class="eslide-content">
          <h4>${escapeHtml(t.update.title)}</h4>
          <textarea class="eslide-textarea" id="textarea-${t.id}"
            onchange="updateEslideNote('${t.id}', this.value)"
            placeholder="Edit AI update notes (keywords, bullets)…"
          >${escapeHtml(t.update.bullets.map(b => '• ' + b).join('\n'))}</textarea>
          ${t.suggestion ? `
            <div class="suggestion-bar">
              <i class="fa-solid fa-circle-exclamation"></i>
              <span>${escapeHtml(t.suggestion)}</span>
              <div class="actions">
                <button class="btn-approve" onclick="approveSuggestion('${t.id}')" type="button">
                  <i class="fa-solid fa-check"></i> Approve
                </button>
                <button class="btn-reject" onclick="rejectSuggestion('${t.id}')" type="button">
                  <i class="fa-solid fa-xmark"></i> Reject
                </button>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    </div>
  `).join('');
}

function renderSources() {
  const root = document.getElementById('sourcesList');
  if (!root) return;
  root.innerHTML = workspaceState.sources.map((s, idx) => `
    <div class="source-row">
      <div class="source-icon"><i class="fa-solid fa-book-open"></i></div>
      <div class="source-info">
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="source-title">${escapeHtml(s.title)}</a>
        <div class="source-meta">
          <span class="source-tag">${escapeHtml(s.tag)}</span>
          <span><i class="fa-regular fa-calendar"></i> ${escapeHtml(s.date)}</span>
          <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="source-link">
            ${escapeHtml(s.url)} <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:10px;"></i>
          </a>
        </div>
      </div>
      <div class="source-actions">
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" title="Open in new tab">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>
        </a>
        <a href="#" onclick="copySource(event, ${idx})" title="Copy link">
          <i class="fa-regular fa-copy"></i>
        </a>
      </div>
    </div>
  `).join('');
}

function copySource(e, idx) {
  e.preventDefault();
  const src = workspaceState.sources[idx];
  if (!src) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(src.url).then(
      () => showToast('Source link copied', 'success'),
      () => showToast('Could not copy link', 'error')
    );
  } else {
    showToast('Clipboard not available', 'error');
  }
}

function switchTab(name) {
  workspaceState.activeTab = name;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${name}`));
}

function approveSuggestion(id) {
  const topic = workspaceState.topics.find(t => t.id === id);
  if (!topic) return;
  topic.confidence = 'high';
  topic.suggestion = null;
  topic.tags = ['approved', 'auto-applied'];
  // Update slide confidence too
  const slide = workspaceState.slides.find(s => s.id === topic.slideId);
  if (slide) slide.confidence = 'high';
  renderEslides();
  renderSummary();
  renderThumbnails();
  updateCounts();
  showToast('Suggestion approved and applied', 'success');
}

function rejectSuggestion(id) {
  const topic = workspaceState.topics.find(t => t.id === id);
  if (!topic) return;
  workspaceState.topics = workspaceState.topics.filter(t => t.id !== id);
  // Mark slide as no-update
  const slide = workspaceState.slides.find(s => s.id === topic.slideId);
  if (slide) slide.confidence = 'high';
  renderEslides();
  renderSummary();
  renderThumbnails();
  updateCounts();
  showToast('Suggestion rejected', 'info');
}

function updateEslideNote(id, val) {
  const topic = workspaceState.topics.find(t => t.id === id);
  if (topic) {
    topic.update.bullets = val.split('\n').map(l => l.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
  }
}

// ====================== Upload ======================
function initUploadZone() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('fileInput');
  if (!zone || !input) return;
  ['dragenter', 'dragover'].forEach(ev => {
    zone.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach(ev => {
    zone.addEventListener(ev, e => {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('dragover');
    });
  });
  zone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
  input.addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(files) {
  if (!files || !files.length) return;
  const valid = ['pdf', 'ppt', 'pptx'];
  const accepted = [];
  const rejected = [];
  for (const f of files) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!valid.includes(ext)) {
      rejected.push({ name: f.name, reason: 'Unsupported format — use PDF, PPT, or PPTX' });
      continue;
    }
    if (f.size === 0) {
      rejected.push({ name: f.name, reason: 'File appears corrupted (0 bytes)' });
      continue;
    }
    if (f.size > 50 * 1024 * 1024) {
      rejected.push({ name: f.name, reason: 'Larger than 50MB' });
      continue;
    }
    accepted.push(f);
  }

  const status = document.getElementById('uploadStatus');
  if (!status) return;

  if (accepted.length && !rejected.length) {
    status.className = 'upload-status visible success';
    status.innerHTML = `<i class="fa-solid fa-circle-check"></i>
      <span>${accepted.length} file${accepted.length > 1 ? 's' : ''} uploaded · AI processing started</span>`;
    showToast(`${accepted.length} file${accepted.length > 1 ? 's' : ''} uploaded — AI is extracting topics…`, 'success');
  } else if (accepted.length && rejected.length) {
    status.className = 'upload-status visible success';
    status.innerHTML = `<i class="fa-solid fa-circle-info"></i>
      <span>${accepted.length} accepted · ${rejected.length} rejected (${escapeHtml(rejected[0].reason)})</span>`;
    showToast(`${accepted.length} uploaded, ${rejected.length} rejected`, 'info');
  } else {
    status.className = 'upload-status visible error';
    status.innerHTML = `<i class="fa-solid fa-circle-xmark"></i>
      <span>Upload failed: ${escapeHtml(rejected[0].reason)}</span>`;
    showToast('Upload failed — check file types', 'error');
  }
  setTimeout(() => status.classList.remove('visible'), 6000);
}

// ====================== Chat ======================
const SAMPLE_REPLIES = [
  "I pulled that update from arxiv.org/2024/12345 — it appeared in 3 of your preferred sources, hence high confidence.",
  "Good question. The suggestion is at 64% confidence because the source overlaps with one of your excluded domains.",
  "You can adjust recency in the project profile to filter out anything older than 3 months.",
  "I'd recommend approving slides 1, 4, 6, and 8 — they're all above 90% confidence.",
  "For Slide 5, I noted LSTMs are largely replaced by Transformers, but the suggestion stays low-confidence so you can decide whether to keep RNNs for pedagogical reasons.",
  "The export will preserve your original formatting and append AI update notes as speaker notes.",
  "Sure — I can ground all suggestions strictly to peer-reviewed venues. Update your preferred-sources list to enforce that.",
];
let replyIdx = 0;
function sendChat(e) {
  e.preventDefault();
  const input = document.getElementById('chatInput');
  const messages = document.getElementById('chatMessages');
  if (!input || !messages) return;
  const text = (input.value || '').trim();
  if (!text) return;

  const user = document.createElement('div');
  user.className = 'chat-message user';
  user.textContent = text;
  messages.appendChild(user);
  input.value = '';
  messages.scrollTop = messages.scrollHeight;

  setTimeout(() => {
    const ai = document.createElement('div');
    ai.className = 'chat-message ai';
    ai.textContent = SAMPLE_REPLIES[replyIdx % SAMPLE_REPLIES.length];
    replyIdx++;
    messages.appendChild(ai);
    messages.scrollTop = messages.scrollHeight;
  }, 700);
}

// ====================== Export ======================
function exportSlides() {
  const btn = document.getElementById('exportBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating…'; }
  showToast('Generating enhanced slide deck (PDF + PPTX)…', 'info');
  setTimeout(() => {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-file-export"></i> Export Enhanced Slides'; }
    showToast('Export complete — check your downloads', 'success');
  }, 1800);
}

// ====================== Theme ======================
const THEME_KEY = 'slidesync_theme';

function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') theme = 'dark';
  // Smooth global color transition
  document.documentElement.classList.add('theme-transitioning');
  document.documentElement.setAttribute('data-theme', theme);
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* private mode */ }
  setTimeout(() => {
    document.documentElement.classList.remove('theme-transitioning');
  }, 500);
}

function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

// Sync with system theme changes (only if user hasn't picked one)
if (window.matchMedia) {
  try {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        setTheme(e.matches ? 'light' : 'dark');
      }
    });
  } catch (e) { /* older browsers */ }
}

// ====================== Scroll reveal ======================
function initRevealObserver() {
  const reveals = document.querySelectorAll('.reveal, .reveal-scale, .reveal-stagger');
  if (!reveals.length) return;
  if (!('IntersectionObserver' in window)) {
    reveals.forEach(el => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -60px 0px',
  });
  reveals.forEach(el => observer.observe(el));
}

// Subtle pointer-tracked glow on the hero — premium ambient touch.
// The hero already has CSS-driven beam pulse + star twinkle; this adds a
// soft cursor-following light without disturbing the layered gradient.
function initHeroGlow() {
  const heroBg = document.querySelector('.hero-bg');
  if (!heroBg) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (window.matchMedia && window.matchMedia('(hover: none)').matches) return; // skip on touch
  let glow = heroBg.querySelector('.hero-glow');
  if (!glow) {
    glow = document.createElement('div');
    glow.className = 'hero-glow';
    heroBg.appendChild(glow);
  }
  let ticking = false;
  heroBg.addEventListener('pointermove', (e) => {
    if (ticking) return;
    requestAnimationFrame(() => {
      const rect = heroBg.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      glow.style.setProperty('--gx', x + '%');
      glow.style.setProperty('--gy', y + '%');
      glow.style.opacity = '1';
      ticking = false;
    });
    ticking = true;
  });
  heroBg.addEventListener('pointerleave', () => {
    glow.style.opacity = '0';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initRevealObserver();
  initHeroGlow();
});
