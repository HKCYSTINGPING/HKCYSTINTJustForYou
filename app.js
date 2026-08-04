/* ═══════════════════════════════════════════════════════════════════════════
   HKCYSTINTJustForYou — Frontend Application
   Sections: Configuration, State, DOM, Utilities, API, Combobox,
             Messaging, Admin Monitor, Sent Watch, Trophy, Init
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Configuration ──────────────────────────────────────────────────────────

const API_URL = 'https://script.google.com/macros/s/AKfycbwMYdGrwHEvW_9M8sH3apxJnlXEAHUr4oQs3Ac-DkEHh5_zkgI0YP6nCPE0L4N9rUQThg/exec';

const CONFIG = {
  PARTICIPANTS_CACHE_KEY: 'hkcy_participants',
  PARTICIPANTS_CACHE_TTL: 30 * 60 * 1000,
  INBOX_CACHE_PREFIX: 'hkcy_inbox_',
  READ_MSG_PREFIX: 'hkcy_read_',
  ADMIN_ID: 'ADMIN',
  ADMIN_PHONE: '23082026',
  MAX_MESSAGE_LENGTH: 300,
  CHAR_WARN_THRESHOLD: 250,
  ADMIN_WATCH_INTERVAL: 800,
  ADMIN_WATCH_INTERVAL_HIDDEN: 3000,
  ADMIN_BACKUP_SYNC: 12000,
  SENT_WATCH_INTERVAL: 1500,
  SENT_WATCH_INTERVAL_HIDDEN: 4000,
  SENT_BACKUP_SYNC: 15000,
  TROPHY_WATCH_INTERVAL: 2000,
  TROPHY_WATCH_INTERVAL_HIDDEN: 5000,
  TOAST_DURATION: 3000,
  API_TIMEOUT_MS: 25000
};

const BAD_WORDS = [
  '撚','柒','屌','閪','仆街','死全家','操你','草你','fuck','shit','bitch','asshole',
  'damn','cunt','bastard','whore','slut','dick','pussy','cock','nigger','faggot',
  '冚家剷','死開','去死','白痴','蠢材','廢物','垃圾','人渣','賤人','婊子','雞婆',
  '老母','老味','鳩','戇鳩','戇居','戇撚','柒頭','粉腸','豬頭','死仔','死女',
  '撚樣','柒樣','臭閪','臭化','頂你','頂心','頂肺','收皮','仆你','戇鳩',
  'stupid','idiot','moron','retard','dumbass','motherfucker','mf','wtf',
  '撚毛','柒毛','死撚','死柒','臭撚','臭柒','閪仔','閪女','鳩仔','鳩女',
  'on9','on99','on999','撚樣','柒皮','柒精','柒撚','撚精','撚皮','死蠢',
  'hell','dammit','bullshit','horseshit','dickhead','jackass','twat','wanker',
  '撚閪','柒閪','死閪','臭閪','閪毛','鳩毛','撚鳩','柒鳩','死鳩','臭鳩'
];

// ─── State ──────────────────────────────────────────────────────────────────

const state = {
  participantId: null,
  phoneNumber: null,
  apiVersion: null,
  participants: [],
  inboxMessages: [],
  sentMessages: [],
  sentRevision: '',
  messagingOpen: true,
  isAdmin: false,
  monitorMessages: [],
  monitorRevision: '',
  monitorViewFilter: 'all',
  knownMessageIds: new Set(),
  trophy: {
    loaded: false,
    loading: false,
    votingStatus: 'DRAFT',
    trophies: [],
    teammates: [],
    assignments: {},
    readonly: false,
    editable: false,
    submissionStatus: 'draft',
    progress: { assigned: 0, total: 0 },
    myAwards: [],
    showResults: false,
    trophyRevision: '',
    resultsModalRevision: ''
  },
  adminTrophy: {
    loading: false,
    overview: null,
    auditVotes: [],
    profiles: [],
    trophySummary: [],
    fallbackActivated: false
  },
  adminParticipant: {
    selectedId: null,
    detail: null
  }
};

let adminParticipantCombobox = null;

let sentWatchAbort = null;
let adminWatchAbort = null;
let trophyWatchAbort = null;
let sentWatchTimer = null;
let adminWatchTimer = null;
let trophyWatchTimer = null;
let sentBackupTimer = null;
let adminBackupTimer = null;

// ─── DOM References ─────────────────────────────────────────────────────────

const DOM = {};

function cacheDOM() {
  DOM.loadingOverlay = document.getElementById('loading-overlay');
  DOM.loadingPercent = document.getElementById('loading-percent');
  DOM.loadingBarFill = document.getElementById('loading-bar-fill');
  DOM.splashPercent = document.getElementById('splash-percent');
  DOM.splashBarFill = document.getElementById('splash-bar-fill');
  DOM.toastContainer = document.getElementById('toast-container');
  DOM.confettiCanvas = document.getElementById('confetti-canvas');

  DOM.screenSplash = document.getElementById('screen-splash');
  DOM.screenLogin = document.getElementById('screen-login');
  DOM.screenParticipant = document.getElementById('screen-participant');
  DOM.screenAdmin = document.getElementById('screen-admin');

  DOM.loginForm = document.getElementById('login-form');
  DOM.loginParticipant = document.getElementById('login-participant');
  DOM.loginPhone = document.getElementById('login-phone');
  DOM.loginSubmit = document.getElementById('login-submit');
  DOM.loginDropdown = document.getElementById('login-dropdown');
  DOM.loginComboboxToggle = document.getElementById('login-combobox-toggle');
  DOM.loginNoMatch = document.getElementById('login-no-match');
  DOM.loginStatusBanner = document.getElementById('login-status-banner');

  DOM.participantGreeting = document.getElementById('participant-greeting');
  DOM.participantSubgreeting = document.getElementById('participant-subgreeting');
  DOM.participantLogout = document.getElementById('participant-logout');
  DOM.homeInboxBadge = document.getElementById('home-inbox-badge');

  DOM.sendForm = document.getElementById('send-form');
  DOM.sendReceiver = document.getElementById('send-receiver');
  DOM.sendDropdown = document.getElementById('send-dropdown');
  DOM.sendComboboxToggle = document.getElementById('send-combobox-toggle');
  DOM.sendContent = document.getElementById('send-content');
  DOM.sendSubmit = document.getElementById('send-submit');
  DOM.sendClosedBanner = document.getElementById('send-closed-banner');
  DOM.sendClosedState = document.getElementById('send-closed-state');
  DOM.charCounter = document.getElementById('char-counter');
  DOM.badWordsWarning = document.getElementById('bad-words-warning');

  DOM.inboxList = document.getElementById('inbox-list');
  DOM.inboxEmpty = document.getElementById('inbox-empty');
  DOM.inboxBadge = document.getElementById('inbox-badge');
  DOM.inboxRefresh = document.getElementById('inbox-refresh');

  DOM.sentList = document.getElementById('sent-list');
  DOM.sentEmpty = document.getElementById('sent-empty');
  DOM.sentRefresh = document.getElementById('sent-refresh');

  DOM.trophyNotOpen = document.getElementById('trophy-not-open');
  DOM.trophyStatusBanner = document.getElementById('trophy-status-banner');
  DOM.trophyResultsPanel = document.getElementById('trophy-results-panel');
  DOM.trophyResultsList = document.getElementById('trophy-results-list');
  DOM.trophyResultsTitle = document.getElementById('trophy-results-title');
  DOM.trophyVotingSection = document.getElementById('trophy-voting-section');
  DOM.trophyResultsModal = document.getElementById('trophy-results-modal');
  DOM.trophyResultsModalList = document.getElementById('trophy-results-modal-list');
  DOM.trophyResultsModalClose = document.getElementById('trophy-results-modal-close');
  DOM.trophyProgressText = document.getElementById('trophy-progress-text');
  DOM.trophyProgressFill = document.getElementById('trophy-progress-fill');
  DOM.trophyTeammates = document.getElementById('trophy-teammates');
  DOM.trophyEmpty = document.getElementById('trophy-empty');
  DOM.trophyActions = document.getElementById('trophy-actions');
  DOM.trophySaveDraft = document.getElementById('trophy-save-draft');
  DOM.trophySubmitAll = document.getElementById('trophy-submit-all');
  DOM.trophySubmittedHome = document.getElementById('trophy-submitted-home');

  DOM.profileAvatar = document.getElementById('profile-avatar');
  DOM.profileName = document.getElementById('profile-name');
  DOM.profileGroup = document.getElementById('profile-group');
  DOM.profileStats = document.getElementById('profile-stats');

  DOM.adminLogout = document.getElementById('admin-logout');
  DOM.adminDashboardPanel = document.getElementById('admin-dashboard-panel');
  DOM.adminDashboardStats = document.getElementById('admin-dashboard-stats');
  DOM.adminDashboardStatus = document.getElementById('admin-dashboard-status');
  DOM.adminRecentActivity = document.getElementById('admin-recent-activity');
  DOM.adminSyncTime = document.getElementById('admin-sync-time');
  DOM.adminMsgCount = document.getElementById('admin-msg-count');
  DOM.adminMsgSearch = document.getElementById('admin-msg-search');
  DOM.adminMessageList = document.getElementById('admin-message-list');
  DOM.adminMsgEmpty = document.getElementById('admin-msg-empty');
  DOM.adminEnableMsg = document.getElementById('admin-enable-msg');
  DOM.adminDisableMsg = document.getElementById('admin-disable-msg');
  DOM.adminMessagesPanel = document.getElementById('admin-messages-panel');
  DOM.adminTrophyPanel = document.getElementById('admin-trophy-panel');
  DOM.adminResultsPanel = document.getElementById('admin-results-panel');
  DOM.adminVotingStatusBadge = document.getElementById('admin-voting-status-badge');

  DOM.adminTrophyStats = document.getElementById('admin-trophy-stats');
  DOM.adminPendingVoters = document.getElementById('admin-pending-voters');
  DOM.adminFallbackBanner = document.getElementById('admin-fallback-banner');
  DOM.adminOpenVoting = document.getElementById('admin-open-voting');
  DOM.adminCloseVoting = document.getElementById('admin-close-voting');
  DOM.adminCalculate = document.getElementById('admin-calculate');
  DOM.adminPublish = document.getElementById('admin-publish');

  DOM.auditSearch = document.getElementById('audit-search');
  DOM.auditTrophyFilter = document.getElementById('audit-trophy-filter');
  DOM.auditCards = document.getElementById('audit-cards');
  DOM.auditTableBody = document.querySelector('#audit-table tbody');
  DOM.profilesList = document.getElementById('profiles-list');
  DOM.summaryList = document.getElementById('summary-list');

  DOM.adminParticipantsPanel = document.getElementById('admin-participants-panel');
  DOM.adminParticipantSelect = document.getElementById('admin-participant-select');
  DOM.adminParticipantDropdown = document.getElementById('admin-participant-dropdown');
  DOM.adminParticipantToggle = document.getElementById('admin-participant-toggle');
  DOM.adminParticipantDetail = document.getElementById('admin-participant-detail');
  DOM.adminParticipantStats = document.getElementById('admin-participant-stats');
  DOM.adminEditPhone = document.getElementById('admin-edit-phone');
  DOM.adminEditGroup = document.getElementById('admin-edit-group');
  DOM.adminSaveParticipant = document.getElementById('admin-save-participant');
  DOM.adminDeleteMessages = document.getElementById('admin-delete-messages');
  DOM.adminResetTrophy = document.getElementById('admin-reset-trophy');
  DOM.adminDeleteAllRecords = document.getElementById('admin-delete-all-records');
  DOM.adminBulkGroup = document.getElementById('admin-bulk-group');
  DOM.adminBulkAutoGroup = document.getElementById('admin-bulk-auto-group');
  DOM.adminBulkApplyGroup = document.getElementById('admin-bulk-apply-group');
  DOM.adminBulkDeleteAll = document.getElementById('admin-bulk-delete-all');
  DOM.adminVersion = document.getElementById('admin-version');
  DOM.adminParticipantCount = document.getElementById('admin-participant-count');
}

// ─── Utilities ──────────────────────────────────────────────────────────────

function normalizeId(id) {
  if (!id) return '';
  const s = String(id).trim().toUpperCase();
  return s === 'ADMIN' ? CONFIG.ADMIN_ID : s;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function isAdminLogin(participantId) {
  return String(participantId || '').trim().toLowerCase() === 'admin';
}

function showScreen(name) {
  if (DOM.screenSplash) DOM.screenSplash.classList.add('hidden');
  DOM.screenLogin.classList.toggle('hidden', name !== 'login');
  DOM.screenParticipant.classList.toggle('hidden', name !== 'participant');
  DOM.screenAdmin.classList.toggle('hidden', name !== 'admin');
  document.body.classList.toggle('participant-active', name === 'participant');
  document.body.classList.toggle('admin-active', name === 'admin');
}

let loadingTickTimer = null;
let splashTickTimer = null;
let loadingSafetyTimer = null;

function setLoadingPercent(percent) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  if (DOM.loadingPercent) DOM.loadingPercent.textContent = value + '%';
  if (DOM.loadingBarFill) DOM.loadingBarFill.style.width = value + '%';
  if (DOM.loadingOverlay) DOM.loadingOverlay.setAttribute('aria-valuenow', String(value));
  return value;
}

function setSplashPercent(percent) {
  const value = Math.min(100, Math.max(0, Math.round(percent)));
  if (DOM.splashPercent) DOM.splashPercent.textContent = value + '%';
  if (DOM.splashBarFill) DOM.splashBarFill.style.width = value + '%';
  return value;
}

function stopLoadingTick() {
  if (loadingTickTimer) {
    clearInterval(loadingTickTimer);
    loadingTickTimer = null;
  }
}

function clearLoadingSafetyTimer() {
  if (loadingSafetyTimer) {
    clearTimeout(loadingSafetyTimer);
    loadingSafetyTimer = null;
  }
}

function startLoadingTick() {
  stopLoadingTick();
  loadingTickTimer = setInterval(() => {
    const current = parseInt(DOM.loadingPercent?.textContent || '0', 10) || 0;
    if (current < 80) setLoadingPercent(current + 2);
    else if (current < 96) setLoadingPercent(current + 1);
  }, 120);
}

function showLoading(show, percent) {
  if (!show) {
    stopLoadingTick();
    clearLoadingSafetyTimer();
    DOM.loadingOverlay.classList.add('hidden');
    DOM.loadingOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-loading');
    return;
  }

  DOM.loadingOverlay.classList.remove('hidden');
  DOM.loadingOverlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('is-loading');

  setLoadingPercent(percent !== undefined ? percent : 0);
  startLoadingTick();

  clearLoadingSafetyTimer();
  loadingSafetyTimer = setTimeout(() => {
    if (!DOM.loadingOverlay.classList.contains('hidden')) {
      finishLoading();
      showToast('載入時間較長，請檢查網絡後再試', 'error');
    }
  }, CONFIG.API_TIMEOUT_MS + 3000);
}

function finishLoading() {
  stopLoadingTick();
  clearLoadingSafetyTimer();
  setLoadingPercent(100);
  setTimeout(() => showLoading(false), 120);
}

function showSplashThenLogin() {
  if (!DOM.screenSplash) {
    showScreen('login');
    return;
  }
  DOM.screenSplash.classList.remove('hidden');
  DOM.screenLogin.classList.add('hidden');
  setSplashPercent(0);

  if (splashTickTimer) clearInterval(splashTickTimer);
  splashTickTimer = setInterval(() => {
    const current = parseInt(DOM.splashPercent?.textContent || '0', 10) || 0;
    if (current < 100) setSplashPercent(current + 2);
  }, 36);

  setTimeout(() => {
    if (splashTickTimer) {
      clearInterval(splashTickTimer);
      splashTickTimer = null;
    }
    setSplashPercent(100);
    DOM.screenSplash.classList.add('splash-exit');
    setTimeout(() => {
      DOM.screenSplash.classList.add('hidden');
      showScreen('login');
    }, 400);
  }, 1800);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.setAttribute('role', 'alert');
  toast.textContent = message;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), CONFIG.TOAST_DURATION);
}

function formatDateTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso.replace(' ', 'T'));
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleString('zh-Hant', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch (_) {
    return iso;
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getReadMessageIds(participantId) {
  try {
    const raw = localStorage.getItem(CONFIG.READ_MSG_PREFIX + participantId);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

function saveReadMessageIds(participantId, ids) {
  localStorage.setItem(CONFIG.READ_MSG_PREFIX + participantId, JSON.stringify(ids));
}

function markAllInboxRead() {
  if (!state.participantId) return;
  const ids = state.inboxMessages.map(m => m.message_id);
  saveReadMessageIds(state.participantId, ids);
  updateInboxBadge();
}

function updateInboxBadge() {
  if (!state.participantId) return;
  const readIds = new Set(getReadMessageIds(state.participantId));
  const unread = state.inboxMessages.filter(m => !readIds.has(m.message_id)).length;
  if (DOM.inboxBadge) {
    DOM.inboxBadge.textContent = unread;
    DOM.inboxBadge.classList.toggle('hidden', unread === 0);
  }
  if (DOM.homeInboxBadge) {
    DOM.homeInboxBadge.textContent = unread;
    DOM.homeInboxBadge.classList.toggle('hidden', unread === 0);
  }
}

function launchConfetti() {
  const canvas = DOM.confettiCanvas;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ['#E9C46A', '#D4A373', '#7FB77E', '#D66A6A', '#FFF9F2'];
  const pieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height - canvas.height,
    w: 6 + Math.random() * 6,
    h: 4 + Math.random() * 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    vx: (Math.random() - 0.5) * 4,
    vy: 2 + Math.random() * 4,
    rot: Math.random() * 360,
    vr: (Math.random() - 0.5) * 8
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.vy += 0.05;
    });
    frame++;
    if (frame < 120) requestAnimationFrame(draw);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  draw();
}

function containsBadWords(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(word => lower.includes(word.toLowerCase()));
}

function runProgressButton(btn, promise) {
  btn.classList.add('is-loading');
  btn.disabled = true;
  return promise.finally(() => {
    btn.classList.remove('is-loading');
    btn.disabled = false;
  });
}

function getParticipantsCache() {
  try {
    const raw = sessionStorage.getItem(CONFIG.PARTICIPANTS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.timestamp > CONFIG.PARTICIPANTS_CACHE_TTL) return null;
    return data.participants;
  } catch (_) {
    return null;
  }
}

function setParticipantsCache(participants) {
  sessionStorage.setItem(CONFIG.PARTICIPANTS_CACHE_KEY, JSON.stringify({
    participants,
    timestamp: Date.now()
  }));
}

function buildPairingsFromAssignments(assignments) {
  const pairings = [];
  Object.entries(assignments).forEach(([receiverId, trophyIds]) => {
    (trophyIds || []).forEach(trophyId => {
      pairings.push({ receiver_id: receiverId, trophy_id: trophyId });
    });
  });
  return pairings;
}

function getWatchInterval(fast, slow) {
  return document.hidden ? slow : fast;
}

// ─── API ────────────────────────────────────────────────────────────────────

async function apiGet(params, options = {}) {
  const url = new URL(API_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const controller = new AbortController();
  const timeoutMs = options.timeout || CONFIG.API_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const fetchOpts = { method: 'GET', signal: controller.signal };

  try {
    const res = await fetch(url.toString(), fetchOpts);
    if (!res.ok) throw new Error('網路錯誤：' + res.status);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('連線逾時，請稍後再試');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function apiPost(body, options = {}) {
  const controller = new AbortController();
  const timeoutMs = options.timeout || CONFIG.API_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) throw new Error('網路錯誤：' + res.status);
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('連線逾時，請稍後再試');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function apiBootstrap() {
  return apiGet({ action: 'bootstrap' });
}

async function apiFetchInbox() {
  return apiGet({
    fetch_type: 'inbox',
    participant_id: state.participantId,
    phone_number: state.phoneNumber
  });
}

async function apiFetchSent() {
  return apiGet({
    fetch_type: 'sent',
    participant_id: state.participantId,
    phone_number: state.phoneNumber
  });
}

async function apiWatchSent(revision, options = {}) {
  return apiGet({
    fetch_type: 'watch_sent_messages',
    participant_id: state.participantId,
    phone_number: state.phoneNumber,
    revision: revision
  }, options);
}

async function apiSendMessage(receiverId, content) {
  return apiPost({
    sender_id: state.participantId,
    phone: state.phoneNumber,
    receiver_id: receiverId,
    content
  });
}

async function apiAdminFetch() {
  return apiGet({
    fetch_type: 'admin',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE
  });
}

async function apiAdminWatch(revision) {
  return apiGet({
    action: 'admin_watch_messages',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    revision
  });
}

async function apiAdminDeleteMessage(messageId) {
  return apiGet({
    action: 'admin_delete_message',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    message_id: messageId
  });
}

async function apiSetMessagingStatus(status) {
  try {
    return await apiGet({
      action: 'set_messaging_status',
      participant_id: CONFIG.ADMIN_ID,
      phone_number: CONFIG.ADMIN_PHONE,
      messaging_status: status
    });
  } catch (_) {
    return apiGet({
      action: 'get_messaging_status',
      admin: 'TNIT23082026',
      phone_number: CONFIG.ADMIN_PHONE,
      sub_action: 'set',
      messaging_status: status
    });
  }
}

async function apiWatchTrophyStatus(revision, options = {}) {
  return apiGet({
    action: 'watch_trophy_status',
    participant_id: state.participantId,
    phone_number: state.phoneNumber,
    revision: revision
  }, options);
}

async function apiAdminParticipantDetail(participantId) {
  return apiGet({
    action: 'admin_participant_detail',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    target_participant_id: participantId
  });
}

async function apiAdminUpdateParticipant(participantId, phone, groupId) {
  return apiPost({
    action: 'admin_update_participant',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    target_participant_id: participantId,
    new_phone_number: phone,
    group_id: groupId
  });
}

async function apiAdminDeleteParticipantRecords(participantId, options = {}) {
  return apiPost({
    action: 'admin_delete_participant_records',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    target_participant_id: participantId,
    delete_messages: options.deleteMessages !== false,
    delete_trophy: options.deleteTrophy !== false,
    delete_results: options.deleteResults !== false
  });
}

async function apiAdminResetParticipantVote(participantId) {
  return apiGet({
    action: 'admin_reset_participant_vote',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    target_participant_id: participantId
  });
}

async function apiAdminBulkUpdateParticipants(mode, groupId) {
  const body = {
    action: 'admin_bulk_update_participants',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    mode
  };
  if (groupId) body.group_id = groupId;
  return apiPost(body);
}

async function apiAdminBulkDeleteAllRecords() {
  return apiPost({
    action: 'admin_bulk_delete_all_records',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE
  });
}

async function apiTrophyBootstrap() {
  return apiGet({
    action: 'trophy_bootstrap',
    participant_id: state.participantId,
    phone_number: state.phoneNumber
  });
}

async function apiTrophySaveDraft(pairings) {
  return apiPost({
    action: 'trophy_save_draft',
    participant_id: state.participantId,
    phone_number: state.phoneNumber,
    pairings
  });
}

async function apiTrophySubmit(pairings) {
  return apiPost({
    action: 'trophy_submit',
    participant_id: state.participantId,
    phone_number: state.phoneNumber,
    pairings
  });
}

async function apiAdminTrophyOverview() {
  return apiGet({
    action: 'admin_trophy_overview',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE
  });
}

async function apiAdminTrophyAudit() {
  return apiGet({
    action: 'admin_trophy_audit',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE
  });
}

async function apiAdminTrophyResults() {
  return apiGet({
    action: 'admin_trophy_results',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE
  });
}

async function apiAdminSetVotingStatus(votingStatus, allowResubmit) {
  const params = {
    action: 'admin_set_voting_status',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE,
    voting_status: votingStatus
  };
  if (allowResubmit !== undefined) params.allow_resubmit = allowResubmit;
  return apiGet(params);
}

async function apiAdminCalculate() {
  return apiGet({
    action: 'admin_calculate_trophy_results',
    participant_id: CONFIG.ADMIN_ID,
    phone_number: CONFIG.ADMIN_PHONE
  });
}

function checkApiResponse(data) {
  if (data.status === 'error') throw new Error(data.message || '操作失敗');
  return data;
}

// ─── Combobox ───────────────────────────────────────────────────────────────

function createCombobox(config) {
  const {
    input, dropdown, toggle, getLabel, onSelect
  } = config;

  const comboState = {
    items: config.items || [],
    excludeIds: config.excludeIds || []
  };

  let highlightedIndex = -1;
  let isOpen = false;

  function getFilteredItems(query) {
    const q = (query || '').trim().toUpperCase();
    return comboState.items.filter(item => {
      const id = typeof item === 'string' ? item : item.participant_id;
      if (comboState.excludeIds.includes(id)) return false;
      if (!q) return true;
      return id.toUpperCase().includes(q);
    });
  }

  function renderDropdown(query) {
    const filtered = getFilteredItems(query);
    dropdown.innerHTML = '';
    highlightedIndex = -1;

    if (filtered.length === 0) {
      const li = document.createElement('li');
      li.textContent = '無匹配結果';
      li.style.color = 'var(--text-muted)';
      li.style.pointerEvents = 'none';
      dropdown.appendChild(li);
      return;
    }

    filtered.forEach((item, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.textContent = getLabel(item);
      li.dataset.index = i;
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectItem(item);
      });
      dropdown.appendChild(li);
    });
  }

  function openDropdown() {
    isOpen = true;
    input.setAttribute('aria-expanded', 'true');
    dropdown.classList.remove('hidden');
    renderDropdown(input.value);
  }

  function closeDropdown() {
    isOpen = false;
    input.setAttribute('aria-expanded', 'false');
    dropdown.classList.add('hidden');
    highlightedIndex = -1;
  }

  function selectItem(item) {
    const label = getLabel(item);
    input.value = label;
    closeDropdown();
    if (onSelect) onSelect(item);
  }

  function highlightItem(index) {
    const lis = dropdown.querySelectorAll('li[data-index]');
    lis.forEach(li => li.classList.remove('highlighted'));
    if (index >= 0 && index < lis.length) {
      lis[index].classList.add('highlighted');
      lis[index].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('input', () => {
    if (!isOpen) openDropdown();
    else renderDropdown(input.value);
    if (config.onInput) config.onInput(input.value);
  });

  input.addEventListener('focus', () => openDropdown());

  input.addEventListener('keydown', (e) => {
    const lis = dropdown.querySelectorAll('li[data-index]');
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) openDropdown();
      highlightedIndex = Math.min(highlightedIndex + 1, lis.length - 1);
      highlightItem(highlightedIndex);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = Math.max(highlightedIndex - 1, 0);
      highlightItem(highlightedIndex);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && lis[highlightedIndex]) {
        const filtered = getFilteredItems(input.value);
        selectItem(filtered[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  if (toggle) {
    toggle.addEventListener('click', () => {
      if (isOpen) closeDropdown();
      else { input.focus(); openDropdown(); }
    });
  }

  document.addEventListener('click', (e) => {
    if (!input.closest('.combobox-wrapper').contains(e.target)) {
      closeDropdown();
    }
  });

  return {
    openDropdown,
    closeDropdown,
    renderDropdown,
    getFilteredItems,
    setItems(items) { comboState.items = items; },
    setExcludeIds(ids) { comboState.excludeIds = ids; }
  };
}

let loginCombobox = null;
let sendCombobox = null;
let selectedReceiverId = null;

function initLoginCombobox() {
  loginCombobox = createCombobox({
    input: DOM.loginParticipant,
    dropdown: DOM.loginDropdown,
    toggle: DOM.loginComboboxToggle,
    items: state.participants,
    getLabel: (item) => item.participant_id,
    onInput: (value) => {
      const isAdmin = isAdminLogin(value);
      DOM.loginComboboxToggle.classList.toggle('hidden', isAdmin);
      DOM.loginNoMatch.classList.add('hidden');
      if (isAdmin) {
        loginCombobox.closeDropdown();
      } else {
        const filtered = loginCombobox.getFilteredItems(value);
        DOM.loginNoMatch.classList.toggle('hidden', !value.trim() || filtered.length > 0 || isAdmin);
      }
    },
    onSelect: (item) => {
      DOM.loginParticipant.value = item.participant_id;
    }
  });
}

function initSendCombobox() {
  const exclude = [state.participantId, CONFIG.ADMIN_ID];
  sendCombobox = createCombobox({
    input: DOM.sendReceiver,
    dropdown: DOM.sendDropdown,
    toggle: DOM.sendComboboxToggle,
    items: state.participants,
    excludeIds: exclude,
    getLabel: (item) => item.participant_id,
    onSelect: (item) => {
      selectedReceiverId = item.participant_id;
      DOM.sendReceiver.value = item.participant_id;
    }
  });
}

function refreshComboboxItems() {
  if (loginCombobox) loginCombobox.setItems(state.participants);
  if (sendCombobox) {
    sendCombobox.setItems(state.participants);
    sendCombobox.setExcludeIds([state.participantId, CONFIG.ADMIN_ID]);
  }
}

// ─── Login ──────────────────────────────────────────────────────────────────

async function bootstrapApp() {
  try {
    const cached = getParticipantsCache();
    if (cached) {
      state.participants = cached;
      initLoginCombobox();
    }

    const data = checkApiResponse(await apiBootstrap());
    state.participants = data.participants || [];
    state.messagingOpen = data.messaging_status === 'OPEN';
    state.apiVersion = data.version;
    setParticipantsCache(state.participants);

    if (!loginCombobox) initLoginCombobox();
    else refreshComboboxItems();

    updateLoginStatusBanner();
  } catch (err) {
    if (!state.participants.length) {
      showToast('無法載入參加者名單：' + err.message, 'error');
    }
  }
}

function updateLoginStatusBanner() {
  if (!state.messagingOpen) {
    DOM.loginStatusBanner.textContent = '留言功能目前已關閉';
    DOM.loginStatusBanner.className = 'status-banner status-banner-warning';
    DOM.loginStatusBanner.classList.remove('hidden');
  } else {
    DOM.loginStatusBanner.classList.add('hidden');
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const rawId = DOM.loginParticipant.value.trim();
  const phone = normalizePhone(DOM.loginPhone.value);

  if (!rawId) { showToast('請輸入參加者編號', 'error'); return; }
  if (!phone) { showToast('請輸入電話號碼', 'error'); return; }

  const isAdmin = isAdminLogin(rawId);
  const participantId = isAdmin ? CONFIG.ADMIN_ID : normalizeId(rawId);

  if (!isAdmin) {
    const match = state.participants.find(p =>
      p.participant_id === participantId && normalizePhone(p.phone_number) === phone
    );
    if (!match) {
      showToast('參加者編號或電話號碼不正確', 'error');
      return;
    }
  } else if (phone !== CONFIG.ADMIN_PHONE) {
    showToast('管理員電話號碼不正確', 'error');
    return;
  }

  await runProgressButton(DOM.loginSubmit, (async () => {
    state.participantId = participantId;
    state.phoneNumber = phone;
    state.isAdmin = isAdmin;

    if (isAdmin) {
      await enterAdminDashboard();
    } else {
      await enterParticipantDashboard();
    }
  })());
}

async function enterParticipantDashboard() {
  showScreen('participant');
  updateParticipantGreeting();
  initSendCombobox();
  updateSendFormState();
  updateCharCounter();
  switchParticipantView('home');

  try {
    showLoading(true, 0);
    const inboxPromise = apiFetchInbox().then(data => {
      setLoadingPercent(35);
      return data;
    });
    const sentPromise = apiFetchSent().then(data => {
      setLoadingPercent(65);
      return data;
    });
    const [inboxData, sentData] = await Promise.all([
      checkApiResponse(await inboxPromise),
      checkApiResponse(await sentPromise)
    ]);
    setLoadingPercent(85);
    state.inboxMessages = inboxData.messages || [];
    state.sentMessages = sentData.sent_messages || [];
    state.sentRevision = sentData.revision || '';
    state.messagingOpen = sentData.messaging_status === 'OPEN';
    updateSendFormState();
    renderInbox();
    renderSent();
    renderProfile();
    startSentWatch();
    await loadTrophyData(false, { silent: true });
    setLoadingPercent(98);
    startTrophyWatch();
  } catch (err) {
    showToast('載入資料失敗：' + err.message, 'error');
  } finally {
    finishLoading();
  }
}

function updateParticipantGreeting() {
  if (!DOM.participantGreeting) return;
  DOM.participantGreeting.textContent = '你好，' + (state.participantId || '') + ' 👋';
  if (DOM.participantSubgreeting) {
    DOM.participantSubgreeting.textContent = 'Just For You ❤️';
  }
}

function renderProfile() {
  if (!DOM.profileStats) return;
  const p = state.participants.find(x => x.participant_id === state.participantId) || {};
  if (DOM.profileAvatar) DOM.profileAvatar.textContent = (state.participantId || '?').slice(0, 2);
  if (DOM.profileName) DOM.profileName.textContent = state.participantId || '—';
  if (DOM.profileGroup) DOM.profileGroup.textContent = p.group_id || '未分組';

  const sentCount = state.sentMessages.filter(m => m.status === 'active').length;
  const receivedCount = state.inboxMessages.length;
  const votingLabel = state.trophy.submissionStatus === 'submitted' ? '已提交' :
    (state.trophy.editable ? '進行中' : VOTING_STATUS_LABELS[state.trophy.votingStatus] || '—');

  DOM.profileStats.innerHTML = `
    <div class="profile-stat"><div class="profile-stat-value">${sentCount}</div><div class="profile-stat-label">已發留言</div></div>
    <div class="profile-stat"><div class="profile-stat-value">${receivedCount}</div><div class="profile-stat-label">收到留言</div></div>
    <div class="profile-stat"><div class="profile-stat-value">${escapeHtml(p.group_id || '—')}</div><div class="profile-stat-label">分組</div></div>
    <div class="profile-stat"><div class="profile-stat-value">${votingLabel}</div><div class="profile-stat-label">投票狀態</div></div>
  `;
}

async function enterAdminDashboard() {
  stopSentWatch();
  stopTrophyWatch();
  showScreen('admin');

  try {
    showLoading(true, 0);
    const adminPromise = apiAdminFetch().then(data => {
      setLoadingPercent(25);
      return data;
    });
    const bootstrapPromise = apiBootstrap().catch(() => ({ status: 'error' })).then(data => {
      setLoadingPercent(45);
      return data;
    });
    const overviewPromise = apiAdminTrophyOverview().catch(() => ({ status: 'error' })).then(data => {
      setLoadingPercent(70);
      return data;
    });
    const [data, bootstrap, overview] = await Promise.all([
      checkApiResponse(await adminPromise),
      bootstrapPromise,
      overviewPromise
    ]);
    setLoadingPercent(90);
    if (bootstrap.status === 'success') {
      state.participants = bootstrap.participants || [];
      state.apiVersion = bootstrap.version;
      setParticipantsCache(state.participants);
    }
    state.monitorMessages = data.messages || [];
    state.monitorRevision = data.revision || '';
    state.messagingOpen = data.messaging_status === 'OPEN';
    state.knownMessageIds = new Set(state.monitorMessages.map(m => m.message_id));
    if (overview.status === 'success') {
      state.adminTrophy.overview = overview;
    }
    renderAdminMessages();
    renderAdminDashboard(data);
    if (overview.status === 'success') {
      renderAdminTrophyStats();
      updateVotingStepper();
      if (DOM.adminVotingStatusBadge) {
        const vs = overview.voting_status || 'DRAFT';
        DOM.adminVotingStatusBadge.textContent = VOTING_STATUS_LABELS[vs] || vs;
      }
    }
    switchAdminTab('dashboard', { skipLoad: true });
    startAdminWatch();
  } catch (err) {
    showToast('載入管理員資料失敗：' + err.message, 'error');
    switchAdminTab('dashboard', { skipLoad: true });
  } finally {
    finishLoading();
  }
}

function renderAdminDashboard(fetchData) {
  const msgCount = fetchData?.messages ? fetchData.messages.length : state.monitorMessages.length;
  const activeCount = state.monitorMessages.filter(m => m.status === 'active').length;

  if (DOM.adminDashboardStats) {
    DOM.adminDashboardStats.innerHTML = `
      <div class="stat-card"><div class="stat-value">${state.participants.length || '—'}</div><div class="stat-label">參加者</div></div>
      <div class="stat-card"><div class="stat-value">${msgCount}</div><div class="stat-label">留言</div></div>
      <div class="stat-card"><div class="stat-value">${activeCount}</div><div class="stat-label">有效留言</div></div>
      <div class="stat-card"><div class="stat-value">${state.messagingOpen ? '開啟' : '關閉'}</div><div class="stat-label">留言狀態</div></div>
    `;
  }

  if (DOM.adminDashboardStatus) {
    const votingLabel = state.adminTrophy.overview
      ? (VOTING_STATUS_LABELS[state.adminTrophy.overview.voting_status] || '—')
      : '—';
    DOM.adminDashboardStatus.innerHTML = `
      <div class="status-item"><span>留言功能</span><span>${state.messagingOpen ? '🟢 開啟' : '🔴 關閉'}</span></div>
      <div class="status-item"><span>投票狀態</span><span>${votingLabel}</span></div>
    `;
  }

  if (DOM.adminRecentActivity) {
    const recent = state.monitorMessages.slice(0, 5);
    DOM.adminRecentActivity.innerHTML = recent.length === 0
      ? '<p class="form-hint">暫無最近活動</p>'
      : recent.map(m => `
        <div class="activity-item">
          <span>${escapeHtml(m.sender_id)} → ${escapeHtml(m.receiver_id)}</span>
          <time>${formatDateTime(m.created_at)}</time>
        </div>
      `).join('');
  }

  if (DOM.adminVersion) DOM.adminVersion.textContent = state.apiVersion ? 'v' + state.apiVersion : '—';
  if (DOM.adminParticipantCount) DOM.adminParticipantCount.textContent = String(state.participants.length || '—');
}

function handleLogout() {
  stopSentWatch();
  stopAdminWatch();
  stopTrophyWatch();
  state.participantId = null;
  state.phoneNumber = null;
  state.isAdmin = false;
  state.inboxMessages = [];
  state.sentMessages = [];
  state.sentRevision = '';
  state.monitorMessages = [];
  state.monitorRevision = '';
  hideTrophyResultsModal();
  state.trophy = {
    loaded: false,
    loading: false,
    votingStatus: 'DRAFT',
    trophies: [],
    teammates: [],
    assignments: {},
    readonly: false,
    editable: false,
    submissionStatus: 'draft',
    progress: { assigned: 0, total: 0 },
    myAwards: [],
    showResults: false,
    trophyRevision: '',
    resultsModalRevision: ''
  };
  DOM.loginParticipant.value = '';
  DOM.loginPhone.value = '';
  showScreen('login');
  bootstrapApp();
}

// ─── Messaging — Send ─────────────────────────────────────────────────────────

function updateSendFormState() {
  const closed = !state.messagingOpen;
  if (DOM.sendClosedBanner) {
    DOM.sendClosedBanner.textContent = '留言功能目前已關閉，請稍後再試';
    DOM.sendClosedBanner.classList.toggle('hidden', !closed);
  }
  if (DOM.sendClosedState) DOM.sendClosedState.classList.toggle('hidden', !closed);
  if (DOM.sendForm) {
    DOM.sendForm.classList.toggle('hidden', closed);
    DOM.sendForm.classList.toggle('disabled', closed);
  }
  if (DOM.sendSubmit) DOM.sendSubmit.disabled = closed;
}

function updateCharCounter() {
  const len = DOM.sendContent.value.length;
  DOM.charCounter.textContent = len + '/' + CONFIG.MAX_MESSAGE_LENGTH;
  DOM.charCounter.classList.toggle('warn', len >= CONFIG.CHAR_WARN_THRESHOLD && len <= CONFIG.MAX_MESSAGE_LENGTH);
  DOM.charCounter.classList.toggle('over', len > CONFIG.MAX_MESSAGE_LENGTH);

  const hasBad = containsBadWords(DOM.sendContent.value);
  DOM.badWordsWarning.classList.toggle('hidden', !hasBad);
  const empty = !DOM.sendContent.value.trim();
  DOM.sendSubmit.disabled = hasBad || !state.messagingOpen || empty;
}

async function handleSendMessage(e) {
  e.preventDefault();
  if (!state.messagingOpen) {
    showToast('留言功能目前已關閉', 'error');
    return;
  }

  const receiverId = selectedReceiverId || normalizeId(DOM.sendReceiver.value);
  const content = DOM.sendContent.value.trim();

  if (!receiverId) { showToast('請選擇接收者', 'error'); return; }
  if (!content) { showToast('請輸入留言內容', 'error'); return; }
  if (containsBadWords(content)) { showToast('內容包含不適當用語', 'error'); return; }

  await runProgressButton(DOM.sendSubmit, (async () => {
    try {
      checkApiResponse(await apiSendMessage(receiverId, content));
      showToast('留言已發送', 'success');
      DOM.sendContent.value = '';
      DOM.sendReceiver.value = '';
      selectedReceiverId = null;
      updateCharCounter();

      const sentData = checkApiResponse(await apiFetchSent());
      state.sentMessages = sentData.sent_messages || [];
      state.sentRevision = sentData.revision || '';
      renderSent();
      switchParticipantView('sent');
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Messaging — Inbox ────────────────────────────────────────────────────────

function renderInbox() {
  const messages = state.inboxMessages;
  const readIds = new Set(getReadMessageIds(state.participantId));
  DOM.inboxEmpty.classList.toggle('hidden', messages.length > 0);
  DOM.inboxList.innerHTML = '';

  messages.forEach(msg => {
    const isUnread = !readIds.has(msg.message_id);
    const card = document.createElement('div');
    card.className = 'message-card' + (isUnread ? ' unread' : '');
    card.innerHTML = `
      <div class="message-meta">
        <span class="message-anon-badge">🔒 匿名留言</span>
        <div style="display:flex;align-items:center;gap:6px">
          ${isUnread ? '<span class="unread-dot" aria-label="未讀"></span>' : ''}
          <time datetime="${escapeHtml(msg.created_at)}">${formatDateTime(msg.created_at)}</time>
        </div>
      </div>
      <div class="message-content">${escapeHtml(msg.content)}</div>
    `;
    card.addEventListener('click', () => {
      if (isUnread) {
        const ids = getReadMessageIds(state.participantId);
        if (!ids.includes(msg.message_id)) {
          ids.push(msg.message_id);
          saveReadMessageIds(state.participantId, ids);
        }
        card.classList.remove('unread');
        card.classList.add('read-animation');
        card.querySelector('.unread-dot')?.remove();
        updateInboxBadge();
      }
    });
    DOM.inboxList.appendChild(card);
  });

  updateInboxBadge();
}

async function refreshInbox() {
  await runProgressButton(DOM.inboxRefresh, (async () => {
    try {
      const data = checkApiResponse(await apiFetchInbox());
      state.inboxMessages = data.messages || [];
      state.messagingOpen = data.messaging_status === 'OPEN';
      updateSendFormState();
      renderInbox();
      showToast('收件箱已更新', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Messaging — Sent ─────────────────────────────────────────────────────────

function renderSent() {
  const messages = state.sentMessages;
  DOM.sentEmpty.classList.toggle('hidden', messages.length > 0);
  DOM.sentList.innerHTML = '';

  messages.forEach(msg => {
    const isDeleted = msg.status === 'deleted';
    const card = document.createElement('div');
    card.className = 'message-card' + (isDeleted ? ' deleted' : '');
    card.dataset.messageId = msg.message_id;

    let deletedHtml = '';
    if (isDeleted) {
      deletedHtml = `
        <div class="message-deleted-info">
          <span class="badge badge-deleted">管理員已撤回</span>
          ${msg.deleted_reason ? '<br>' + escapeHtml(msg.deleted_reason) : ''}
          ${msg.deleted_at ? '<br><time>' + formatDateTime(msg.deleted_at) + '</time>' : ''}
        </div>
      `;
    }

    card.innerHTML = `
      <div class="message-meta">
        <span class="message-receiver">→ ${escapeHtml(msg.receiver_id)}</span>
        <time datetime="${escapeHtml(msg.created_at)}">${formatDateTime(msg.created_at)}</time>
      </div>
      <div class="message-content">${escapeHtml(msg.content)}</div>
      ${isDeleted ? '' : '<span class="badge badge-pill" style="margin-top:8px">正常</span>'}
      ${deletedHtml}
    `;
    DOM.sentList.appendChild(card);
  });
}

async function refreshSent() {
  await runProgressButton(DOM.sentRefresh, (async () => {
    try {
      const data = checkApiResponse(await apiFetchSent());
      state.sentMessages = data.sent_messages || [];
      state.sentRevision = data.revision || '';
      renderSent();
      showToast('已發送列表已更新', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Sent Watch ───────────────────────────────────────────────────────────────

function stopSentWatch() {
  if (sentWatchAbort) { sentWatchAbort.abort(); sentWatchAbort = null; }
  if (sentWatchTimer) { clearTimeout(sentWatchTimer); sentWatchTimer = null; }
  if (sentBackupTimer) { clearInterval(sentBackupTimer); sentBackupTimer = null; }
}

function shouldApplySentWatch(data) {
  return data.changed === true ||
    data.message_count !== state.sentMessages.length ||
    data.revision !== state.sentRevision;
}

function applySentMessages(messages, revision) {
  state.sentMessages = messages;
  state.sentRevision = revision;
  if (document.getElementById('view-sent')?.classList.contains('active')) {
    renderSent();
  }
}

async function runSentWatchLoop() {
  if (!state.participantId || state.isAdmin) return;

  sentWatchAbort = new AbortController();

  try {
    const data = checkApiResponse(await apiWatchSent(state.sentRevision, { signal: sentWatchAbort.signal }));
    if (shouldApplySentWatch(data)) {
      if (data.sent_messages && data.sent_messages.length > 0) {
        applySentMessages(data.sent_messages, data.revision);
      } else if (data.changed) {
        const full = checkApiResponse(await apiFetchSent());
        applySentMessages(full.sent_messages || [], full.revision || '');
      }
    }
    if (data.messaging_status) {
      state.messagingOpen = data.messaging_status === 'OPEN';
      updateSendFormState();
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Sent watch error:', err.message);
    }
  }

  const interval = getWatchInterval(CONFIG.SENT_WATCH_INTERVAL, CONFIG.SENT_WATCH_INTERVAL_HIDDEN);
  sentWatchTimer = setTimeout(runSentWatchLoop, interval);
}

function startSentWatch() {
  stopSentWatch();
  if (!state.participantId || state.isAdmin) return;

  runSentWatchLoop();

  sentBackupTimer = setInterval(async () => {
    if (!state.participantId || state.isAdmin) return;
    try {
      const data = checkApiResponse(await apiFetchSent());
      applySentMessages(data.sent_messages || [], data.revision || '');
    } catch (_) { /* silent */ }
  }, CONFIG.SENT_BACKUP_SYNC);
}

// ─── Trophy Watch (Participant — real-time results) ───────────────────────────

function stopTrophyWatch() {
  if (trophyWatchAbort) { trophyWatchAbort.abort(); trophyWatchAbort = null; }
  if (trophyWatchTimer) { clearTimeout(trophyWatchTimer); trophyWatchTimer = null; }
}

async function runTrophyWatchLoop() {
  if (!state.participantId || state.isAdmin) return;

  trophyWatchAbort = new AbortController();

  try {
    const data = checkApiResponse(
      await apiWatchTrophyStatus(state.trophy.trophyRevision, { signal: trophyWatchAbort.signal })
    );
    if (data.changed) {
      applyTrophyWatchData(data, true);
      if (data.voting_status === 'PUBLISHED' && !state.trophy.loaded) {
        loadTrophyData(false);
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.warn('Trophy watch error:', err.message);
    }
  }

  const interval = getWatchInterval(CONFIG.TROPHY_WATCH_INTERVAL, CONFIG.TROPHY_WATCH_INTERVAL_HIDDEN);
  trophyWatchTimer = setTimeout(runTrophyWatchLoop, interval);
}

function startTrophyWatch() {
  stopTrophyWatch();
  if (!state.participantId || state.isAdmin) return;
  runTrophyWatchLoop();
}

// ─── Admin Monitor ────────────────────────────────────────────────────────────

function stopAdminWatch() {
  if (adminWatchAbort) { adminWatchAbort.abort(); adminWatchAbort = null; }
  if (adminWatchTimer) { clearTimeout(adminWatchTimer); adminWatchTimer = null; }
  if (adminBackupTimer) { clearInterval(adminBackupTimer); adminBackupTimer = null; }
}

function getFilteredAdminMessages() {
  const filter = state.monitorViewFilter;
  const search = (DOM.adminMsgSearch?.value || '').trim().toUpperCase();
  let messages = state.monitorMessages;
  if (filter === 'active') messages = messages.filter(m => m.status === 'active');
  else if (filter === 'deleted') messages = messages.filter(m => m.status === 'deleted');
  if (search) {
    messages = messages.filter(m =>
      m.sender_id.toUpperCase().includes(search) ||
      m.receiver_id.toUpperCase().includes(search) ||
      m.content.toUpperCase().includes(search)
    );
  }
  return messages;
}

function renderAdminMessages() {
  const messages = getFilteredAdminMessages();
  DOM.adminMsgEmpty.classList.toggle('hidden', messages.length > 0);
  DOM.adminMsgCount.textContent = '共 ' + state.monitorMessages.length + ' 則';
  DOM.adminSyncTime.textContent = '上次同步：' + formatDateTime(new Date().toISOString());

  DOM.adminMessageList.innerHTML = '';

  messages.forEach(msg => {
    const isDeleted = msg.status === 'deleted';
    const isNew = !state.knownMessageIds.has(msg.message_id);
    const card = document.createElement('div');
    card.className = 'admin-msg-card' +
      (isDeleted ? ' deleted' : '') +
      (isNew ? ' new-highlight' : '');

    let deleteBtn = '';
    if (!isDeleted) {
      deleteBtn = `<button type="button" class="btn btn-danger btn-sm admin-delete-btn" data-id="${escapeHtml(msg.message_id)}">撤回</button>`;
    } else {
      deleteBtn = '<span class="badge badge-deleted">已撤回</span>';
    }

    card.innerHTML = `
      <div class="admin-msg-route">
        ${escapeHtml(msg.sender_id)}<span class="arrow">→</span>${escapeHtml(msg.receiver_id)}
      </div>
      <div class="admin-msg-content">${escapeHtml(msg.content)}</div>
      <div class="admin-msg-footer">
        <time>${formatDateTime(msg.created_at)}</time>
        ${deleteBtn}
      </div>
    `;
    DOM.adminMessageList.appendChild(card);
    state.knownMessageIds.add(msg.message_id);
  });

  DOM.adminMessageList.querySelectorAll('.admin-delete-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAdminDelete(btn.dataset.id, btn));
  });
}

function shouldApplyAdminWatch(data) {
  return data.changed === true ||
    data.message_count !== state.monitorMessages.length ||
    data.revision !== state.monitorRevision;
}

function applyAdminMessages(messages, revision) {
  state.monitorMessages = messages;
  state.monitorRevision = revision;
  if (DOM.adminMessagesPanel.classList.contains('active')) {
    renderAdminMessages();
  }
}

async function runAdminWatchLoop() {
  if (!state.isAdmin) return;

  adminWatchAbort = new AbortController();

  try {
    const data = checkApiResponse(await apiAdminWatch(state.monitorRevision));
    if (shouldApplyAdminWatch(data)) {
      if (data.messages && data.messages.length > 0) {
        applyAdminMessages(data.messages, data.revision);
      } else if (data.changed) {
        const full = checkApiResponse(await apiAdminFetch());
        applyAdminMessages(full.messages || [], full.revision || '');
      }
    }
    if (data.messaging_status !== undefined) {
      state.messagingOpen = data.messaging_status === 'OPEN';
    }
  } catch (err) {
    console.warn('Admin watch error:', err.message);
  }

  const interval = getWatchInterval(CONFIG.ADMIN_WATCH_INTERVAL, CONFIG.ADMIN_WATCH_INTERVAL_HIDDEN);
  adminWatchTimer = setTimeout(runAdminWatchLoop, interval);
}

function startAdminWatch() {
  stopAdminWatch();
  if (!state.isAdmin) return;

  runAdminWatchLoop();

  adminBackupTimer = setInterval(async () => {
    if (!state.isAdmin) return;
    try {
      const data = checkApiResponse(await apiAdminFetch());
      applyAdminMessages(data.messages || [], data.revision || '');
    } catch (_) { /* silent */ }
  }, CONFIG.ADMIN_BACKUP_SYNC);
}

async function handleAdminDelete(messageId, btn) {
  if (!window.confirm('確定要撤回此留言嗎？接收者將不會收到此訊息。')) return;

  await runProgressButton(btn, (async () => {
    try {
      checkApiResponse(await apiAdminDeleteMessage(messageId));
      showToast('留言已撤回', 'success');
      const data = checkApiResponse(await apiAdminFetch());
      applyAdminMessages(data.messages || [], data.revision || '');
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleSetMessagingStatus(status, btn) {
  await runProgressButton(btn, (async () => {
    try {
      const data = checkApiResponse(await apiSetMessagingStatus(status));
      state.messagingOpen = (data.messaging_status || status) === 'OPEN';
      showToast(status === 'OPEN' ? '留言功能已開啟' : '留言功能已關閉', 'success');
      renderAdminDashboard();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Trophy (Participant) ─────────────────────────────────────────────────────

const VOTING_STATUS_LABELS = {
  DRAFT: '投票尚未開始',
  VOTING_OPEN: '投票進行中',
  VOTING_CLOSED: '投票已關閉',
  CALCULATED: '結果已計算',
  PUBLISHED: '結果已公布'
};

function filterValidTrophies(trophies) {
  return (trophies || []).filter(t => /^T\d+$/i.test(String(t.trophy_id || '').trim()));
}

function renderAwardSourceBadge(source) {
  const isFallback = source === 'fallback';
  return `<span class="badge ${isFallback ? 'badge-source-fallback' : 'badge-source-round1'}">${isFallback ? '保底配對' : '全組最高票'}</span>`;
}

function buildAwardsHtml(awards) {
  if (!awards || awards.length === 0) {
    return '<p class="trophy-results-empty">暫未獲得 Trophy，請稍後再查看</p>';
  }
  return awards.map(a => `
    <div class="trophy-result-item">
      <div class="trophy-result-name">${escapeHtml(a.trophy_name)}</div>
      ${renderAwardSourceBadge(a.award_source)}
    </div>
  `).join('');
}

function showTrophyResultsModal(awards) {
  if (!DOM.trophyResultsModal) return;
  DOM.trophyResultsModalList.innerHTML = buildAwardsHtml(awards);
  DOM.trophyResultsModal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  state.trophy.resultsModalRevision = state.trophy.trophyRevision;
  launchConfetti();
}

function hideTrophyResultsModal() {
  if (!DOM.trophyResultsModal) return;
  DOM.trophyResultsModal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function maybeShowPublishedModal(isNewPublish) {
  if (state.trophy.votingStatus !== 'PUBLISHED') return;
  if (state.trophy.resultsModalRevision === state.trophy.trophyRevision) return;
  showTrophyResultsModal(state.trophy.myAwards);
  if (isNewPublish) {
    showToast('Trophy 結果已公布！', 'success');
    updateTrophyTabBadge(true);
  }
}

function updateTrophyTabBadge(show) {
  const trophyNav = document.querySelector('.bottom-nav-item[data-tab="trophy"]');
  if (!trophyNav) return;
  let badge = trophyNav.querySelector('.bottom-nav-badge-results');
  if (show && state.trophy.votingStatus === 'PUBLISHED') {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'bottom-nav-badge bottom-nav-badge-results';
      badge.textContent = '!';
      badge.title = '結果已公布';
      trophyNav.appendChild(badge);
    }
  } else if (badge) {
    badge.remove();
  }
}

function applyTrophyWatchData(data, isNewPublish) {
  const prevStatus = state.trophy.votingStatus;
  state.trophy.votingStatus = data.voting_status;
  state.trophy.showResults = !!data.show_results;
  state.trophy.trophyRevision = data.revision || '';

  if (data.my_awards && data.my_awards.length > 0) {
    state.trophy.myAwards = data.my_awards;
  } else if (data.changed && data.voting_status === 'PUBLISHED') {
    state.trophy.myAwards = data.my_awards || [];
  }

  const justPublished = isNewPublish || (prevStatus !== 'PUBLISHED' && data.voting_status === 'PUBLISHED');

  updateTrophyStatusBanner();
  renderParticipantTrophyResults();
  maybeShowPublishedModal(justPublished);

  if (justPublished && state.trophy.loaded) {
    state.trophy.editable = false;
    state.trophy.readonly = true;
  }
}

function renderParticipantTrophyResults() {
  const { votingStatus, myAwards, showResults } = state.trophy;
  const isPublished = votingStatus === 'PUBLISHED';

  DOM.trophyResultsPanel.classList.toggle('hidden', !isPublished);
  if (isPublished) {
    DOM.trophyResultsTitle.textContent = '你的 Trophy 結果';
    DOM.trophyResultsList.innerHTML = buildAwardsHtml(myAwards);
    DOM.trophyResultsPanel.classList.add('trophy-results-live');
  } else {
    DOM.trophyResultsPanel.classList.remove('trophy-results-live');
  }

  DOM.trophyVotingSection.classList.toggle('hidden', isPublished);
  updateTrophyTabBadge(isPublished);
}

function updateTrophyStatusBanner() {
  const status = state.trophy.votingStatus;
  const label = VOTING_STATUS_LABELS[status] || status;
  const isDraft = status === 'DRAFT';
  const isSubmitted = state.trophy.submissionStatus === 'submitted' && !state.trophy.editable;

  if (DOM.trophyNotOpen) {
    DOM.trophyNotOpen.classList.toggle('hidden', !isDraft || state.trophy.showResults);
  }
  if (DOM.trophyVotingSection) {
    DOM.trophyVotingSection.classList.toggle('hidden', isDraft || state.trophy.showResults || isSubmitted);
  }

  if (DOM.trophyStatusBanner) {
    DOM.trophyStatusBanner.textContent = label;
    DOM.trophyStatusBanner.className = 'status-banner';
    if (status === 'VOTING_OPEN') DOM.trophyStatusBanner.classList.add('status-banner-success');
    else if (status === 'VOTING_CLOSED' || status === 'CALCULATED') DOM.trophyStatusBanner.classList.add('status-banner-warning');
    else if (status === 'PUBLISHED') DOM.trophyStatusBanner.classList.add('status-banner-success');
    DOM.trophyStatusBanner.classList.toggle('hidden', isDraft && !state.trophy.showResults);
  }
}

function updateTrophyProgress() {
  const { assigned, total } = state.trophy.progress;
  DOM.trophyProgressText.textContent = assigned + '/' + total;
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
  DOM.trophyProgressFill.style.width = pct + '%';
  const bar = DOM.trophyProgressFill.parentElement;
  bar.setAttribute('aria-valuenow', pct);
}

function recalcTrophyProgress() {
  const teammates = state.trophy.teammates;
  let assigned = 0;
  teammates.forEach(t => {
    const ids = state.trophy.assignments[t.participant_id];
    if (ids && ids.length > 0) assigned++;
  });
  state.trophy.progress = { assigned, total: teammates.length };
  updateTrophyProgress();
}

function toggleTrophyAssignment(teammateId, trophyId) {
  if (!state.trophy.editable) return;
  const assignments = state.trophy.assignments;
  if (!assignments[teammateId]) assignments[teammateId] = [];

  const idx = assignments[teammateId].indexOf(trophyId);
  if (idx >= 0) {
    assignments[teammateId].splice(idx, 1);
  } else {
    assignments[teammateId].push(trophyId);
  }
  recalcTrophyProgress();
  renderTrophyTeammates();
}

function renderTrophyTeammates() {
  const { teammates, trophies, assignments, editable } = state.trophy;
  const validTrophies = filterValidTrophies(trophies);
  DOM.trophyEmpty.classList.toggle('hidden', teammates.length > 0);
  DOM.trophyActions.classList.toggle('hidden', teammates.length === 0 || !state.trophy.editable);
  DOM.trophyTeammates.innerHTML = '';

  teammates.forEach(teammate => {
    const tid = teammate.participant_id;
    const selected = assignments[tid] || [];
    const card = document.createElement('div');
    card.className = 'trophy-card';

    const chips = validTrophies.map(trophy => {
      const isSelected = selected.includes(trophy.trophy_id);
      return `<button type="button" class="trophy-chip${isSelected ? ' selected' : ''}"
        data-teammate="${escapeHtml(tid)}" data-trophy="${escapeHtml(trophy.trophy_id)}"
        ${!editable ? 'disabled' : ''}>${escapeHtml(trophy.trophy_name)}</button>`;
    }).join('');

    card.innerHTML = `
      <div class="trophy-card-header">
        <div class="trophy-card-name">
          <span class="trophy-card-avatar">${escapeHtml(tid.slice(0, 2))}</span>
          ${escapeHtml(tid)}
        </div>
        ${selected.length > 0 ? `<span class="assigned-count">${selected.length} 個 Trophy</span>` : ''}
      </div>
      <div class="trophy-chips">${chips}</div>
    `;
    DOM.trophyTeammates.appendChild(card);
  });

  DOM.trophyTeammates.querySelectorAll('.trophy-chip:not(:disabled)').forEach(chip => {
    chip.addEventListener('click', () => {
      toggleTrophyAssignment(chip.dataset.teammate, chip.dataset.trophy);
    });
  });
}

async function loadTrophyData(force, options = {}) {
  const silent = options.silent === true;
  if (state.trophy.loading) return;
  try {
    state.trophy.loading = true;
    if (!silent && (force || !state.trophy.loaded)) showLoading(true, 15);
    const data = checkApiResponse(await apiTrophyBootstrap());
    if (!silent) setLoadingPercent(92);
    state.trophy.loaded = true;
    state.trophy.votingStatus = data.voting_status;
    state.trophy.trophies = filterValidTrophies(data.trophies || []);
    state.trophy.teammates = data.teammates || [];
    state.trophy.assignments = data.assignments || {};
    state.trophy.readonly = data.readonly;
    state.trophy.editable = data.editable;
    state.trophy.submissionStatus = data.submission_status;
    state.trophy.progress = data.progress || { assigned: 0, total: 0 };
    state.trophy.myAwards = data.my_awards || [];
    state.trophy.showResults = !!data.show_results;
    state.trophy.trophyRevision = data.revision || '';

    updateTrophyStatusBanner();
    renderParticipantTrophyResults();
    maybeShowPublishedModal(state.trophy.votingStatus === 'PUBLISHED');
    updateTrophyProgress();
    renderTrophyTeammates();
    renderProfile();
  } catch (err) {
    showToast('載入 Trophy 資料失敗：' + err.message, 'error');
  } finally {
    state.trophy.loading = false;
    if (!silent && !DOM.loadingOverlay.classList.contains('hidden')) finishLoading();
  }
}

async function handleTrophySaveDraft() {
  const pairings = buildPairingsFromAssignments(state.trophy.assignments);
  await runProgressButton(DOM.trophySaveDraft, (async () => {
    try {
      checkApiResponse(await apiTrophySaveDraft(pairings));
      showToast('草稿已儲存', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleTrophySubmitAll() {
  const teammates = state.trophy.teammates;
  const incomplete = teammates.filter(t => {
    const ids = state.trophy.assignments[t.participant_id];
    return !ids || ids.length === 0;
  });

  if (incomplete.length > 0) {
    showToast('請為每位隊友至少分配一個 Trophy', 'error');
    return;
  }

  const pairings = buildPairingsFromAssignments(state.trophy.assignments);
  await runProgressButton(DOM.trophySubmitAll, (async () => {
    try {
      checkApiResponse(await apiTrophySubmit(pairings));
      showToast('投票已提交', 'success');
      await loadTrophyData();
      switchParticipantView('trophy-submitted');
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Trophy (Admin) ───────────────────────────────────────────────────────────

async function loadAdminTrophyData(options = {}) {
  const silent = options.silent === true;
  if (state.adminTrophy.loading) return;
  try {
    state.adminTrophy.loading = true;
    if (!silent) showLoading(true, 0);
    const overviewPromise = apiAdminTrophyOverview().then(data => {
      setLoadingPercent(30);
      return data;
    });
    const auditPromise = apiAdminTrophyAudit().then(data => {
      setLoadingPercent(55);
      return data;
    });
    const resultsPromise = apiAdminTrophyResults().then(data => {
      setLoadingPercent(80);
      return data;
    });
    const [overview, audit, results] = await Promise.all([
      checkApiResponse(await overviewPromise),
      checkApiResponse(await auditPromise),
      checkApiResponse(await resultsPromise)
    ]);
    setLoadingPercent(95);

    state.adminTrophy.overview = overview;
    state.adminTrophy.auditVotes = audit.votes || [];
    state.adminTrophy.profiles = results.profiles || [];
    state.adminTrophy.trophySummary = results.trophy_summary || [];
    state.adminTrophy.fallbackActivated = results.fallback_activated;

    renderAdminTrophyStats();
    renderAdminPendingVoters();
    renderAdminFallbackBanner();
    renderAuditTable();
    renderProfiles();
    renderTrophySummary();
    populateAuditTrophyFilter();
    updateAdminVotingButtons();
    updateVotingStepper();
    renderAdminDashboard();
  } catch (err) {
    showToast('載入 Trophy 管理資料失敗：' + err.message, 'error');
  } finally {
    state.adminTrophy.loading = false;
    if (!silent) finishLoading();
  }
}

function renderAdminTrophyStats() {
  const stats = state.adminTrophy.overview?.stats || {};
  const votingStatus = state.adminTrophy.overview?.voting_status || 'DRAFT';
  DOM.adminTrophyStats.innerHTML = `
    <div class="stat-card"><div class="stat-value">${stats.completed_voters || 0}/${stats.total_participants || 0}</div><div class="stat-label">已完成投票</div></div>
    <div class="stat-card"><div class="stat-value">${stats.total_votes || 0}</div><div class="stat-label">總投票數</div></div>
    <div class="stat-card"><div class="stat-value">${stats.trophy_count || 0}</div><div class="stat-label">Trophy 種類</div></div>
    <div class="stat-card"><div class="stat-value">${VOTING_STATUS_LABELS[votingStatus] || votingStatus}</div><div class="stat-label">投票狀態</div></div>
  `;
}

function renderAdminPendingVoters() {
  const groups = state.adminTrophy.overview?.group_voting_status || [];
  const pending = state.adminTrophy.overview?.pending_participants || [];

  if (groups.length === 0) {
    DOM.adminPendingVoters.innerHTML = pending.length === 0
      ? '<p>所有參加者均已完成投票</p>'
      : `<h4>尚未完成投票（${pending.length} 人）</h4><ul>${pending.map(p => '<li>' + escapeHtml(p) + '</li>').join('')}</ul>`;
    return;
  }

  const totalPending = pending.length;
  const cards = groups.map(group => {
    const votedCount = group.members.filter(m => m.voted).length;
    const membersHtml = group.members.map(m => `
      <div class="voter-member ${m.voted ? 'voter-done' : 'voter-pending'}">
        <span class="voter-check" aria-hidden="true">${m.voted ? '✓' : '○'}</span>
        <span class="voter-id">${escapeHtml(m.participant_id)}</span>
        <span class="voter-status-label">${m.voted ? '已投票' : '未投票'}</span>
      </div>
    `).join('');

    return `
      <div class="group-voter-card">
        <div class="group-voter-header">
          <h4>${escapeHtml(group.group_label)}</h4>
          <span class="group-voter-count">${votedCount}/${group.members.length}</span>
        </div>
        <div class="group-voter-members">${membersHtml}</div>
      </div>
    `;
  }).join('');

  DOM.adminPendingVoters.innerHTML = `
    <h4 class="admin-pending-title">投票進度（按組別）${totalPending > 0 ? ` · 尚餘 ${totalPending} 人` : ''}</h4>
    <div class="group-voter-grid">${cards}</div>
  `;
}

function renderAdminFallbackBanner() {
  const activated = state.adminTrophy.fallbackActivated;
  const votingStatus = state.adminTrophy.overview?.voting_status;
  if (votingStatus !== 'CALCULATED' && votingStatus !== 'PUBLISHED') {
    DOM.adminFallbackBanner.classList.add('hidden');
    return;
  }
  DOM.adminFallbackBanner.classList.remove('hidden');
  if (activated) {
    DOM.adminFallbackBanner.textContent = '已啟用【保底配對】機制，部分參加者透過個人最高票數獲得 Trophy。';
    DOM.adminFallbackBanner.className = 'status-banner status-banner-warning';
  } else {
    DOM.adminFallbackBanner.textContent = '所有參賽者均於第一輪全組競爭中獲得 Trophy。';
    DOM.adminFallbackBanner.className = 'status-banner status-banner-success';
  }
}

function populateAuditTrophyFilter() {
  const trophies = new Map();
  state.adminTrophy.auditVotes.forEach(v => {
    trophies.set(v.trophy_id, v.trophy_name);
  });
  DOM.auditTrophyFilter.innerHTML = '<option value="">全部 Trophy</option>';
  trophies.forEach((name, id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = name;
    DOM.auditTrophyFilter.appendChild(opt);
  });
}

function renderAuditTable() {
  const search = (DOM.auditSearch?.value || '').trim().toUpperCase();
  const trophyFilter = DOM.auditTrophyFilter?.value || '';

  const filtered = state.adminTrophy.auditVotes.filter(v => {
    if (trophyFilter && v.trophy_id !== trophyFilter) return false;
    if (search) {
      return v.sender_id.toUpperCase().includes(search) ||
        v.receiver_id.toUpperCase().includes(search);
    }
    return true;
  });

  DOM.auditTableBody.innerHTML = filtered.map(v => `
    <tr>
      <td>${escapeHtml(v.sender_id)}</td>
      <td>${escapeHtml(v.receiver_id)}</td>
      <td>${escapeHtml(v.trophy_name)}</td>
    </tr>
  `).join('');

  if (DOM.auditCards) {
    DOM.auditCards.innerHTML = filtered.length === 0
      ? '<p class="form-hint">暫無投票紀錄</p>'
      : filtered.map(v => `
        <div class="audit-card">
          <div class="audit-card-route">${escapeHtml(v.sender_id)} → ${escapeHtml(v.receiver_id)}</div>
          <div class="audit-card-trophy">🏆 ${escapeHtml(v.trophy_name)}</div>
          ${v.submitted_at ? `<div class="audit-card-time">${formatDateTime(v.submitted_at)}</div>` : ''}
        </div>
      `).join('');
  }
}

function renderProfiles() {
  DOM.profilesList.innerHTML = state.adminTrophy.profiles.map(profile => {
    const trophies = (profile.trophies || []).map(t => {
      const badgeClass = t.award_source === 'fallback' ? 'badge-source-fallback' : 'badge-source-round1';
      const badgeLabel = t.award_source === 'fallback' ? '保底配對' : '全組最高票';
      return `<li class="profile-trophy-item">
        <span>${escapeHtml(t.trophy_name)} (${t.vote_count} 票)</span>
        <span class="badge ${badgeClass}">${badgeLabel}</span>
      </li>`;
    }).join('');

    return `<div class="profile-card">
      <div class="profile-card-header">
        <span>${escapeHtml(profile.participant_id)}</span>
        <span class="chip chip-secondary">${profile.vote_count || 0} 票</span>
      </div>
      <ul class="profile-trophy-list">${trophies || '<li>尚未獲得 Trophy</li>'}</ul>
    </div>`;
  }).join('');
}

function renderTrophySummary() {
  DOM.summaryList.innerHTML = state.adminTrophy.trophySummary.map((item, i) => {
    const winners = (item.winners || []);
    const winnerHtml = winners.map(w =>
      `<div class="summary-winner">${escapeHtml(w.participant_id)} · ${w.vote_count || 0} 票</div>`
    ).join('');
    const tieNote = item.is_tie ? '<div class="summary-tie">⚠ 平票</div>' : '';
    const ranking = (item.top_ranking || []).slice(0, 3).map((r, idx) =>
      `<div>${idx + 1}. ${escapeHtml(r.participant_id)} (${r.vote_count} 票)</div>`
    ).join('');

    return `<div class="summary-item" data-idx="${i}">
      <button type="button" class="summary-item-header">${escapeHtml(item.trophy_name)}</button>
      <div class="summary-item-body">
        ${tieNote}
        ${winnerHtml || '<p>暫無得主</p>'}
        ${ranking ? '<div style="margin-top:8px;font-weight:600">Top 3</div>' + ranking : ''}
      </div>
    </div>`;
  }).join('');

  DOM.summaryList.querySelectorAll('.summary-item-header').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.summary-item').classList.toggle('open');
    });
  });
}

function updateVotingStepper() {
  const status = state.adminTrophy.overview?.voting_status || 'DRAFT';
  const steps = ['DRAFT', 'VOTING_OPEN', 'VOTING_CLOSED', 'CALCULATED', 'PUBLISHED'];
  const currentIdx = steps.indexOf(status);

  if (DOM.adminVotingStatusBadge) {
    DOM.adminVotingStatusBadge.textContent = VOTING_STATUS_LABELS[status] || status;
  }

  document.querySelectorAll('.stepper-step').forEach(el => {
    const step = el.dataset.step;
    const idx = steps.indexOf(step);
    el.classList.toggle('active', step === status);
    el.classList.toggle('done', idx >= 0 && idx < currentIdx);
  });

  document.querySelectorAll('.stepper-line').forEach((line, i) => {
    line.classList.toggle('done', i < currentIdx);
  });
}

function updateAdminVotingButtons() {
  const status = state.adminTrophy.overview?.voting_status || 'DRAFT';
  const buttons = [
    { el: DOM.adminOpenVoting, active: status === 'VOTING_OPEN' },
    { el: DOM.adminCloseVoting, active: status === 'VOTING_CLOSED' },
    { el: DOM.adminCalculate, active: status === 'CALCULATED' },
    { el: DOM.adminPublish, active: status === 'PUBLISHED' }
  ];
  buttons.forEach(({ el, active }) => {
    if (!el) return;
    el.classList.toggle('btn-active-state', active);
    el.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

async function handleAdminVotingAction(status, btn) {
  const confirmMessages = {
    VOTING_OPEN: '確定要開放投票嗎？若先前已公布結果，將清除公布狀態並允許重新提交。',
    VOTING_CLOSED: '確定要關閉投票嗎？參加者將無法再提交。',
    PUBLISHED: '確定要公布結果嗎？'
  };
  if (confirmMessages[status] && !window.confirm(confirmMessages[status])) return;

  await runProgressButton(btn, (async () => {
    try {
      const data = checkApiResponse(await apiAdminSetVotingStatus(status));
      state.adminTrophy.overview = Object.assign({}, state.adminTrophy.overview, data);
      const label = VOTING_STATUS_LABELS[data.voting_status] || data.voting_status;
      showToast('投票狀態已更新：' + label, 'success');
      await loadAdminTrophyData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleAdminCalculate(btn) {
  await runProgressButton(btn, (async () => {
    try {
      checkApiResponse(await apiAdminCalculate());
      showToast('結果計算完成', 'success');
      await loadAdminTrophyData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Admin Participant Management ─────────────────────────────────────────────

function initAdminParticipantCombobox() {
  if (adminParticipantCombobox) {
    adminParticipantCombobox.setItems(state.participants);
    return;
  }
  adminParticipantCombobox = createCombobox({
    input: DOM.adminParticipantSelect,
    dropdown: DOM.adminParticipantDropdown,
    toggle: DOM.adminParticipantToggle,
    items: state.participants,
    getLabel: (item) => item.participant_id,
    onSelect: (item) => {
      selectAdminParticipant(item.participant_id);
    }
  });
}

async function selectAdminParticipant(participantId) {
  state.adminParticipant.selectedId = participantId;
  DOM.adminParticipantSelect.value = participantId;
  DOM.adminParticipantDetail.classList.remove('hidden');

  try {
    showLoading(true, 20);
    const data = checkApiResponse(await apiAdminParticipantDetail(participantId));
    setLoadingPercent(90);
    state.adminParticipant.detail = data;
    renderAdminParticipantDetail(data);
  } catch (err) {
    showToast('載入參加者資料失敗：' + err.message, 'error');
  } finally {
    finishLoading();
  }
}

function renderAdminParticipantDetail(data) {
  const p = data.participant || {};
  const stats = data.stats || {};

  DOM.adminEditPhone.value = p.phone_number || '';
  DOM.adminEditGroup.value = p.group_id || '';

  DOM.adminParticipantStats.innerHTML = `
    <div class="stat-card"><div class="stat-value">${stats.sent_active || 0}</div><div class="stat-label">有效已發留言</div></div>
    <div class="stat-card"><div class="stat-value">${stats.sent_deleted || 0}</div><div class="stat-label">已撤回留言</div></div>
    <div class="stat-card"><div class="stat-value">${stats.received_active || 0}</div><div class="stat-label">收件箱留言</div></div>
    <div class="stat-card"><div class="stat-value">${stats.trophy_votes || 0}</div><div class="stat-label">Trophy 投票數</div></div>
    <div class="stat-card"><div class="stat-value">${stats.submission_status === 'submitted' ? '已提交' : '草稿'}</div><div class="stat-label">投票狀態</div></div>
    <div class="stat-card"><div class="stat-value">${stats.trophy_awards || 0}</div><div class="stat-label">獲得 Trophy</div></div>
  `;
}

async function refreshAdminParticipantDetail() {
  if (!state.adminParticipant.selectedId) return;
  await selectAdminParticipant(state.adminParticipant.selectedId);
}

async function handleAdminSaveParticipant() {
  const pid = state.adminParticipant.selectedId;
  if (!pid) { showToast('請先選擇參加者', 'error'); return; }

  const phone = normalizePhone(DOM.adminEditPhone.value);
  const groupId = DOM.adminEditGroup.value.trim();

  if (!phone) { showToast('電話號碼不能為空', 'error'); return; }

  await runProgressButton(DOM.adminSaveParticipant, (async () => {
    try {
      checkApiResponse(await apiAdminUpdateParticipant(pid, phone, groupId));
      showToast('參加者資料已更新', 'success');
      const idx = state.participants.findIndex(p => p.participant_id === pid);
      if (idx >= 0) {
        state.participants[idx].phone_number = phone;
        state.participants[idx].group_id = groupId;
      }
      setParticipantsCache(state.participants);
      await refreshAdminParticipantDetail();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleAdminDeleteMessages() {
  const pid = state.adminParticipant.selectedId;
  if (!pid) return;
  if (!window.confirm('確定要撤回 ' + pid + ' 的所有已發留言嗎？')) return;

  await runProgressButton(DOM.adminDeleteMessages, (async () => {
    try {
      const data = checkApiResponse(await apiAdminDeleteParticipantRecords(pid, {
        deleteMessages: true,
        deleteTrophy: false,
        deleteResults: false
      }));
      showToast('已撤回 ' + (data.messages_deleted || 0) + ' 則留言', 'success');
      const full = checkApiResponse(await apiAdminFetch());
      applyAdminMessages(full.messages || [], full.revision || '');
      await refreshAdminParticipantDetail();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleAdminResetTrophy() {
  const pid = state.adminParticipant.selectedId;
  if (!pid) return;
  if (!window.confirm('確定要重置 ' + pid + ' 的 Trophy 投票嗎？')) return;

  await runProgressButton(DOM.adminResetTrophy, (async () => {
    try {
      checkApiResponse(await apiAdminResetParticipantVote(pid));
      showToast('Trophy 投票已重置', 'success');
      await refreshAdminParticipantDetail();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleAdminDeleteAllRecords() {
  const pid = state.adminParticipant.selectedId;
  if (!pid) return;
  if (!window.confirm('確定要刪除 ' + pid + ' 的所有紀錄嗎？\n包括：已發留言、Trophy 投票、結果。\n此操作無法復原！')) return;

  await runProgressButton(DOM.adminDeleteAllRecords, (async () => {
    try {
      const data = checkApiResponse(await apiAdminDeleteParticipantRecords(pid, {
        deleteMessages: true,
        deleteTrophy: true,
        deleteResults: true
      }));
      showToast('已刪除全部紀錄（留言 ' + (data.messages_deleted || 0) + ' 則）', 'success');
      const full = checkApiResponse(await apiAdminFetch());
      applyAdminMessages(full.messages || [], full.revision || '');
      await refreshAdminParticipantDetail();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleAdminBulkAutoGroup() {
  if (!window.confirm('確定要依參加者編號自動修正全部分組嗎？\n（例如 1A→GROUP_1、STAFF→GROUP_STAFF）')) return;

  await runProgressButton(DOM.adminBulkAutoGroup, (async () => {
    try {
      const data = checkApiResponse(await apiAdminBulkUpdateParticipants('auto_group'));
      showToast(data.message || ('已修正 ' + (data.updated || 0) + ' 位參加者'), 'success');
      await reloadParticipantsAfterBulk();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleAdminBulkApplyGroup() {
  const groupId = (DOM.adminBulkGroup.value || DOM.adminEditGroup.value || '').trim();
  if (!groupId) {
    showToast('請在「統一分組」欄位輸入 group_id', 'error');
    return;
  }
  if (!window.confirm('確定要將分組「' + groupId + '」套用到全部 ' + state.participants.length + ' 位參加者嗎？')) return;

  await runProgressButton(DOM.adminBulkApplyGroup, (async () => {
    try {
      const data = checkApiResponse(await apiAdminBulkUpdateParticipants('set_group_id', groupId));
      showToast(data.message || ('已套用到 ' + (data.updated || 0) + ' 位參加者'), 'success');
      await reloadParticipantsAfterBulk();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function handleAdminBulkDeleteAll() {
  const count = state.participants.length;
  if (!window.confirm('確定要刪除全部 ' + count + ' 位參加者的所有紀錄嗎？\n包括：已發留言、Trophy 投票、結果。\n此操作無法復原！')) return;
  if (!window.confirm('再次確認：真的要清除所有參加者的全部紀錄嗎？')) return;

  await runProgressButton(DOM.adminBulkDeleteAll, (async () => {
    try {
      const data = checkApiResponse(await apiAdminBulkDeleteAllRecords());
      showToast(data.message || ('已處理 ' + (data.participants_processed || 0) + ' 位參加者'), 'success');
      const full = checkApiResponse(await apiAdminFetch());
      applyAdminMessages(full.messages || [], full.revision || '');
      await reloadParticipantsAfterBulk();
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

async function reloadParticipantsAfterBulk() {
  const data = checkApiResponse(await apiBootstrap());
  state.participants = data.participants || [];
  setParticipantsCache(state.participants);
  initAdminParticipantCombobox();
  if (state.adminParticipant.selectedId) {
    await refreshAdminParticipantDetail();
  }
}

function initAdminParticipantsPanel() {
  initAdminParticipantCombobox();
  if (state.adminParticipant.selectedId) {
    refreshAdminParticipantDetail();
  }
}

// ─── Navigation ───────────────────────────────────────────────────────────

const BOTTOM_NAV_TABS = ['home', 'inbox', 'trophy', 'profile'];

function switchParticipantView(viewName) {
  document.querySelectorAll('#screen-participant .app-view').forEach(view => {
    const isActive = view.dataset.view === viewName;
    view.classList.toggle('active', isActive);
    view.classList.toggle('hidden', !isActive);
  });

  const isBottomTab = BOTTOM_NAV_TABS.includes(viewName);
  document.querySelectorAll('#screen-participant .bottom-nav-item').forEach(btn => {
    const tab = btn.dataset.tab;
    const isActive = isBottomTab && tab === viewName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  if (viewName === 'inbox') {
    markAllInboxRead();
  } else if (viewName === 'trophy') {
    loadTrophyData(true);
  } else if (viewName === 'profile') {
    renderProfile();
  }
}

function switchAdminTab(tabName, options = {}) {
  const skipLoad = options.skipLoad === true;
  document.querySelectorAll('.admin-bottom-nav .bottom-nav-item').forEach(btn => {
    const isActive = btn.dataset.adminTab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  const panels = {
    dashboard: DOM.adminDashboardPanel,
    messages: DOM.adminMessagesPanel,
    voting: DOM.adminTrophyPanel,
    results: DOM.adminResultsPanel,
    settings: DOM.adminParticipantsPanel
  };
  Object.entries(panels).forEach(([key, panel]) => {
    if (!panel) return;
    panel.classList.toggle('active', key === tabName);
    panel.classList.toggle('hidden', key !== tabName);
  });

  if (tabName === 'messages') {
    apiAdminFetch().then(data => {
      if (data.status === 'success') {
        applyAdminMessages(data.messages || [], data.revision || '');
      }
    }).catch(() => {});
    startAdminWatch();
  } else if (tabName === 'voting') {
    stopAdminWatch();
    loadAdminTrophyData();
  } else if (tabName === 'results') {
    stopAdminWatch();
    loadAdminTrophyData();
  } else if (tabName === 'settings') {
    stopAdminWatch();
    apiBootstrap().then(data => {
      if (data.status === 'success') {
        state.participants = data.participants || [];
        setParticipantsCache(state.participants);
      }
      initAdminParticipantsPanel();
      if (DOM.adminParticipantCount) DOM.adminParticipantCount.textContent = String(state.participants.length);
    }).catch(() => initAdminParticipantsPanel());
  } else if (tabName === 'dashboard') {
    stopAdminWatch();
    apiAdminFetch().then(data => {
      if (data.status === 'success') {
        state.monitorMessages = data.messages || [];
        renderAdminDashboard(data);
      }
    }).catch(() => renderAdminDashboard());
    if (!skipLoad && !state.adminTrophy.overview) loadAdminTrophyData();
  }
}

function switchResultTab(tabName) {
  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.resultTab === tabName);
  });
  document.getElementById('result-audit').classList.toggle('active', tabName === 'audit');
  document.getElementById('result-audit').classList.toggle('hidden', tabName !== 'audit');
  document.getElementById('result-profiles').classList.toggle('active', tabName === 'profiles');
  document.getElementById('result-profiles').classList.toggle('hidden', tabName !== 'profiles');
  document.getElementById('result-summary').classList.toggle('active', tabName === 'summary');
  document.getElementById('result-summary').classList.toggle('hidden', tabName !== 'summary');
}

// ─── Event Binding ────────────────────────────────────────────────────────────

function bindEvents() {
  DOM.loginForm.addEventListener('submit', handleLogin);
  DOM.participantLogout.addEventListener('click', handleLogout);
  DOM.adminLogout.addEventListener('click', handleLogout);

  DOM.loginPhone.addEventListener('input', () => {
    DOM.loginPhone.value = normalizePhone(DOM.loginPhone.value);
  });

  DOM.sendForm.addEventListener('submit', handleSendMessage);
  DOM.sendContent.addEventListener('input', updateCharCounter);

  DOM.inboxRefresh.addEventListener('click', refreshInbox);
  DOM.sentRefresh.addEventListener('click', refreshSent);

  DOM.trophySaveDraft.addEventListener('click', handleTrophySaveDraft);
  DOM.trophySubmitAll.addEventListener('click', handleTrophySubmitAll);
  DOM.trophyResultsModalClose.addEventListener('click', hideTrophyResultsModal);
  DOM.trophyResultsModal.addEventListener('click', (e) => {
    if (e.target === DOM.trophyResultsModal) hideTrophyResultsModal();
  });

  if (DOM.trophySubmittedHome) {
    DOM.trophySubmittedHome.addEventListener('click', () => switchParticipantView('home'));
  }

  document.querySelectorAll('#screen-participant .bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchParticipantView(btn.dataset.tab));
  });

  document.querySelectorAll('#screen-participant .home-card').forEach(card => {
    card.addEventListener('click', () => switchParticipantView(card.dataset.nav));
  });

  document.querySelectorAll('#screen-participant .back-btn').forEach(btn => {
    btn.addEventListener('click', () => switchParticipantView(btn.dataset.back || 'home'));
  });

  document.querySelectorAll('.admin-bottom-nav .bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchAdminTab(btn.dataset.adminTab));
  });

  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchResultTab(btn.dataset.resultTab));
  });

  document.querySelectorAll('.chip-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.chip-filter').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.monitorViewFilter = btn.dataset.filter;
      renderAdminMessages();
    });
  });

  if (DOM.adminMsgSearch) {
    DOM.adminMsgSearch.addEventListener('input', renderAdminMessages);
  }

  DOM.adminEnableMsg.addEventListener('click', () => handleSetMessagingStatus('OPEN', DOM.adminEnableMsg));
  DOM.adminDisableMsg.addEventListener('click', () => handleSetMessagingStatus('CLOSE', DOM.adminDisableMsg));

  DOM.adminOpenVoting.addEventListener('click', () => handleAdminVotingAction('VOTING_OPEN', DOM.adminOpenVoting));
  DOM.adminCloseVoting.addEventListener('click', () => handleAdminVotingAction('VOTING_CLOSED', DOM.adminCloseVoting));
  DOM.adminCalculate.addEventListener('click', () => handleAdminCalculate(DOM.adminCalculate));
  DOM.adminPublish.addEventListener('click', () => handleAdminVotingAction('PUBLISHED', DOM.adminPublish));

  DOM.adminSaveParticipant.addEventListener('click', handleAdminSaveParticipant);
  DOM.adminDeleteMessages.addEventListener('click', handleAdminDeleteMessages);
  DOM.adminResetTrophy.addEventListener('click', handleAdminResetTrophy);
  DOM.adminDeleteAllRecords.addEventListener('click', handleAdminDeleteAllRecords);
  DOM.adminBulkAutoGroup.addEventListener('click', handleAdminBulkAutoGroup);
  DOM.adminBulkApplyGroup.addEventListener('click', handleAdminBulkApplyGroup);
  DOM.adminBulkDeleteAll.addEventListener('click', handleAdminBulkDeleteAll);
  DOM.adminEditPhone.addEventListener('input', () => {
    DOM.adminEditPhone.value = normalizePhone(DOM.adminEditPhone.value);
  });

  DOM.auditSearch.addEventListener('input', renderAuditTable);
  DOM.auditTrophyFilter.addEventListener('change', renderAuditTable);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    if (state.isAdmin && DOM.adminMessagesPanel.classList.contains('active')) {
      apiAdminFetch().then(data => {
        if (data.status === 'success') {
          applyAdminMessages(data.messages || [], data.revision || '');
        }
      }).catch(() => {});
      startAdminWatch();
    } else if (state.participantId && !state.isAdmin) {
      apiFetchSent().then(data => {
        if (data.status === 'success') {
          applySentMessages(data.sent_messages || [], data.revision || '');
        }
      }).catch(() => {});
      startSentWatch();
      startTrophyWatch();
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  cacheDOM();
  bindEvents();
  showSplashThenLogin();
  bootstrapApp();
}

document.addEventListener('DOMContentLoaded', init);

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DEPLOYMENT INSTRUCTIONS (README)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * 1. Create a Google Spreadsheet with these tabs and columns:
 *    - Participants: participant_id, phone_number, group_id
 *    - Messages: message_id, sender_id, receiver_id, content, created_at, status, deleted_at
 *    - Open: cell A2 = OPEN or CLOSE
 *    - Trophy: Trophy_id, Trophy_name
 *    - Trophy_log: Tmessage_id, sender_id, receiver_id, Trophy_id
 *    - Trophy_draft: Tmessage_id, sender_id, receiver_id, Trophy_id
 *    - Trophy_submissions: participant_id, submission_status, submitted_at, updated_at
 *    - Trophy_results: participant_id, Trophy_id, award_source, calculated_at
 *    - Voting: A2=voting_status, B2=allow_resubmit, C2=calculated_at, D2=published_at
 *
 * 2. Open Extensions > Apps Script, paste Code.gs, save and bind to spreadsheet
 *
 * 3. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 *
 * 4. Copy the deployment URL and set it in app.js:
 *    const API_URL = "https://script.google.com/macros/s/YOUR_ID/exec";
 *
 * 5. Push index.html, app.js, styles.css to GitHub Pages
 *
 * Admin login: participant_id = admin, phone = 23082026
 * ═══════════════════════════════════════════════════════════════════════════
 */
