/* ═══════════════════════════════════════════════════════════════════════════
   HKCYSTINTJustForYou — Frontend Application
   Sections: Configuration, State, DOM, Utilities, API, Combobox,
             Messaging, Admin Monitor, Sent Watch, Trophy, Init
   ═══════════════════════════════════════════════════════════════════════════ */

// ─── Configuration ──────────────────────────────────────────────────────────

const API_URL = 'https://script.google.com/macros/s/AKfycbxBy2Nam58McN8ecs9PH_wUQIzWrXiqsMA_3S_R6cH2UR41cYMUg0hRV4gn2Y2h3E47vg/exec';

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
  TOAST_DURATION: 3000
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
    votingStatus: 'DRAFT',
    trophies: [],
    teammates: [],
    assignments: {},
    readonly: false,
    editable: false,
    submissionStatus: 'draft',
    progress: { assigned: 0, total: 0 }
  },
  adminTrophy: {
    overview: null,
    auditVotes: [],
    profiles: [],
    trophySummary: [],
    fallbackActivated: false
  }
};

let sentWatchAbort = null;
let adminWatchAbort = null;
let sentWatchTimer = null;
let adminWatchTimer = null;
let sentBackupTimer = null;
let adminBackupTimer = null;

// ─── DOM References ─────────────────────────────────────────────────────────

const DOM = {};

function cacheDOM() {
  DOM.loadingOverlay = document.getElementById('loading-overlay');
  DOM.loadingPercent = document.getElementById('loading-percent');
  DOM.toastContainer = document.getElementById('toast-container');

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

  DOM.participantBadge = document.getElementById('participant-badge');
  DOM.participantLogout = document.getElementById('participant-logout');

  DOM.sendForm = document.getElementById('send-form');
  DOM.sendReceiver = document.getElementById('send-receiver');
  DOM.sendDropdown = document.getElementById('send-dropdown');
  DOM.sendComboboxToggle = document.getElementById('send-combobox-toggle');
  DOM.sendContent = document.getElementById('send-content');
  DOM.sendSubmit = document.getElementById('send-submit');
  DOM.sendClosedBanner = document.getElementById('send-closed-banner');
  DOM.charCounter = document.getElementById('char-counter');
  DOM.badWordsWarning = document.getElementById('bad-words-warning');

  DOM.inboxList = document.getElementById('inbox-list');
  DOM.inboxEmpty = document.getElementById('inbox-empty');
  DOM.inboxBadge = document.getElementById('inbox-badge');
  DOM.inboxRefresh = document.getElementById('inbox-refresh');

  DOM.sentList = document.getElementById('sent-list');
  DOM.sentEmpty = document.getElementById('sent-empty');
  DOM.sentRefresh = document.getElementById('sent-refresh');

  DOM.trophyStatusBanner = document.getElementById('trophy-status-banner');
  DOM.trophyProgressText = document.getElementById('trophy-progress-text');
  DOM.trophyProgressFill = document.getElementById('trophy-progress-fill');
  DOM.trophyTeammates = document.getElementById('trophy-teammates');
  DOM.trophyEmpty = document.getElementById('trophy-empty');
  DOM.trophyActions = document.getElementById('trophy-actions');
  DOM.trophySaveDraft = document.getElementById('trophy-save-draft');
  DOM.trophySubmitAll = document.getElementById('trophy-submit-all');

  DOM.adminLogout = document.getElementById('admin-logout');
  DOM.adminSyncTime = document.getElementById('admin-sync-time');
  DOM.adminMsgCount = document.getElementById('admin-msg-count');
  DOM.adminMessageList = document.getElementById('admin-message-list');
  DOM.adminMsgEmpty = document.getElementById('admin-msg-empty');
  DOM.adminEnableMsg = document.getElementById('admin-enable-msg');
  DOM.adminDisableMsg = document.getElementById('admin-disable-msg');
  DOM.adminMessagesPanel = document.getElementById('admin-messages-panel');
  DOM.adminTrophyPanel = document.getElementById('admin-trophy-panel');

  DOM.adminTrophyStats = document.getElementById('admin-trophy-stats');
  DOM.adminPendingVoters = document.getElementById('admin-pending-voters');
  DOM.adminFallbackBanner = document.getElementById('admin-fallback-banner');
  DOM.adminOpenVoting = document.getElementById('admin-open-voting');
  DOM.adminCloseVoting = document.getElementById('admin-close-voting');
  DOM.adminCalculate = document.getElementById('admin-calculate');
  DOM.adminPublish = document.getElementById('admin-publish');

  DOM.auditSearch = document.getElementById('audit-search');
  DOM.auditTrophyFilter = document.getElementById('audit-trophy-filter');
  DOM.auditTableBody = document.querySelector('#audit-table tbody');
  DOM.profilesList = document.getElementById('profiles-list');
  DOM.summaryList = document.getElementById('summary-list');
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
  DOM.screenLogin.classList.toggle('hidden', name !== 'login');
  DOM.screenParticipant.classList.toggle('hidden', name !== 'participant');
  DOM.screenAdmin.classList.toggle('hidden', name !== 'admin');
  document.body.classList.toggle('participant-active', name === 'participant');
  document.body.classList.toggle('admin-active', name === 'admin');
}

function showLoading(show, percent) {
  DOM.loadingOverlay.classList.toggle('hidden', !show);
  document.body.classList.toggle('is-loading', show);
  if (percent !== undefined) {
    DOM.loadingPercent.textContent = percent + '%';
    DOM.loadingPercent.classList.toggle('hidden', false);
  } else {
    DOM.loadingPercent.classList.add('hidden');
  }
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
  DOM.inboxBadge.textContent = unread;
  DOM.inboxBadge.classList.toggle('hidden', unread === 0);
}

function containsBadWords(text) {
  const lower = text.toLowerCase();
  return BAD_WORDS.some(word => lower.includes(word.toLowerCase()));
}

function runProgressButton(btn, promise) {
  btn.classList.add('is-running');
  btn.disabled = true;
  const bar = btn.querySelector('.btn-progress-bar');
  if (bar) bar.style.width = '30%';
  return promise.finally(() => {
    btn.classList.remove('is-running');
    btn.disabled = false;
    if (bar) bar.style.width = '0%';
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
  const fetchOpts = { method: 'GET' };
  if (options.signal) fetchOpts.signal = options.signal;
  const res = await fetch(url.toString(), fetchOpts);
  if (!res.ok) throw new Error('網路錯誤：' + res.status);
  return res.json();
}

async function apiPost(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('網路錯誤：' + res.status);
  return res.json();
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
  DOM.participantBadge.textContent = state.participantId;
  initSendCombobox();
  updateSendFormState();

  try {
    showLoading(true);
    const [inboxData, sentData] = await Promise.all([
      checkApiResponse(await apiFetchInbox()),
      checkApiResponse(await apiFetchSent())
    ]);
    state.inboxMessages = inboxData.messages || [];
    state.sentMessages = sentData.sent_messages || [];
    state.sentRevision = sentData.revision || '';
    state.messagingOpen = sentData.messaging_status === 'OPEN';
    updateSendFormState();
    renderInbox();
    renderSent();
    startSentWatch();
  } catch (err) {
    showToast('載入資料失敗：' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

async function enterAdminDashboard() {
  stopSentWatch();
  showScreen('admin');

  try {
    showLoading(true);
    const data = checkApiResponse(await apiAdminFetch());
    state.monitorMessages = data.messages || [];
    state.monitorRevision = data.revision || '';
    state.messagingOpen = data.messaging_status === 'OPEN';
    state.knownMessageIds = new Set(state.monitorMessages.map(m => m.message_id));
    renderAdminMessages();
    startAdminWatch();
    await loadAdminTrophyData();
  } catch (err) {
    showToast('載入管理員資料失敗：' + err.message, 'error');
  } finally {
    showLoading(false);
  }
}

function handleLogout() {
  stopSentWatch();
  stopAdminWatch();
  state.participantId = null;
  state.phoneNumber = null;
  state.isAdmin = false;
  state.inboxMessages = [];
  state.sentMessages = [];
  state.sentRevision = '';
  state.monitorMessages = [];
  state.monitorRevision = '';
  state.trophy.loaded = false;
  DOM.loginParticipant.value = '';
  DOM.loginPhone.value = '';
  showScreen('login');
  bootstrapApp();
}

// ─── Messaging — Send ─────────────────────────────────────────────────────────

function updateSendFormState() {
  const closed = !state.messagingOpen;
  DOM.sendClosedBanner.classList.toggle('hidden', !closed);
  DOM.sendForm.classList.toggle('disabled', closed);
  DOM.sendSubmit.disabled = closed;
}

function updateCharCounter() {
  const len = DOM.sendContent.value.length;
  DOM.charCounter.textContent = len + '/' + CONFIG.MAX_MESSAGE_LENGTH;
  DOM.charCounter.classList.toggle('warn', len >= CONFIG.CHAR_WARN_THRESHOLD && len <= CONFIG.MAX_MESSAGE_LENGTH);
  DOM.charCounter.classList.toggle('over', len > CONFIG.MAX_MESSAGE_LENGTH);

  const hasBad = containsBadWords(DOM.sendContent.value);
  DOM.badWordsWarning.classList.toggle('hidden', !hasBad);
  DOM.sendSubmit.disabled = hasBad || !state.messagingOpen;
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
      switchParticipantTab('sent');
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Messaging — Inbox ────────────────────────────────────────────────────────

function renderInbox() {
  const messages = state.inboxMessages;
  DOM.inboxEmpty.classList.toggle('hidden', messages.length > 0);
  DOM.inboxList.innerHTML = '';

  messages.forEach(msg => {
    const card = document.createElement('div');
    card.className = 'message-card';
    card.innerHTML = `
      <div class="message-meta">
        <span>匿名留言</span>
        <time datetime="${escapeHtml(msg.created_at)}">${formatDateTime(msg.created_at)}</time>
      </div>
      <div class="message-content">${escapeHtml(msg.content)}</div>
    `;
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
  if (document.querySelector('#tab-sent.active')) {
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

// ─── Admin Monitor ────────────────────────────────────────────────────────────

function stopAdminWatch() {
  if (adminWatchAbort) { adminWatchAbort.abort(); adminWatchAbort = null; }
  if (adminWatchTimer) { clearTimeout(adminWatchTimer); adminWatchTimer = null; }
  if (adminBackupTimer) { clearInterval(adminBackupTimer); adminBackupTimer = null; }
}

function getFilteredAdminMessages() {
  const filter = state.monitorViewFilter;
  if (filter === 'active') return state.monitorMessages.filter(m => m.status === 'active');
  if (filter === 'deleted') return state.monitorMessages.filter(m => m.status === 'deleted');
  return state.monitorMessages;
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

function updateTrophyStatusBanner() {
  const status = state.trophy.votingStatus;
  const label = VOTING_STATUS_LABELS[status] || status;
  DOM.trophyStatusBanner.textContent = label;
  DOM.trophyStatusBanner.className = 'status-banner';
  if (status === 'VOTING_OPEN') DOM.trophyStatusBanner.classList.add('status-banner-success');
  else if (status === 'VOTING_CLOSED' || status === 'CALCULATED') DOM.trophyStatusBanner.classList.add('status-banner-warning');
  DOM.trophyStatusBanner.classList.remove('hidden');
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
  const { teammates, trophies, assignments, editable, readonly } = state.trophy;
  DOM.trophyEmpty.classList.toggle('hidden', teammates.length > 0);
  DOM.trophyActions.classList.toggle('hidden', teammates.length === 0 || readonly || !state.trophy.editable);
  DOM.trophyTeammates.innerHTML = '';

  teammates.forEach(teammate => {
    const tid = teammate.participant_id;
    const selected = assignments[tid] || [];
    const card = document.createElement('div');
    card.className = 'trophy-card';

    const chips = trophies.map(trophy => {
      const isSelected = selected.includes(trophy.trophy_id);
      return `<button type="button" class="trophy-chip${isSelected ? ' selected' : ''}"
        data-teammate="${escapeHtml(tid)}" data-trophy="${escapeHtml(trophy.trophy_id)}"
        ${!editable ? 'disabled' : ''}>${escapeHtml(trophy.trophy_name)}</button>`;
    }).join('');

    card.innerHTML = `
      <div class="trophy-card-header">
        ${escapeHtml(tid)}
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

async function loadTrophyData() {
  try {
    showLoading(true);
    const data = checkApiResponse(await apiTrophyBootstrap());
    state.trophy.loaded = true;
    state.trophy.votingStatus = data.voting_status;
    state.trophy.trophies = data.trophies || [];
    state.trophy.teammates = data.teammates || [];
    state.trophy.assignments = data.assignments || {};
    state.trophy.readonly = data.readonly;
    state.trophy.editable = data.editable;
    state.trophy.submissionStatus = data.submission_status;
    state.trophy.progress = data.progress || { assigned: 0, total: 0 };

    updateTrophyStatusBanner();
    updateTrophyProgress();
    renderTrophyTeammates();
  } catch (err) {
    showToast('載入 Trophy 資料失敗：' + err.message, 'error');
  } finally {
    showLoading(false);
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
    } catch (err) {
      showToast(err.message, 'error');
    }
  })());
}

// ─── Trophy (Admin) ───────────────────────────────────────────────────────────

async function loadAdminTrophyData() {
  try {
    const [overview, audit, results] = await Promise.all([
      checkApiResponse(await apiAdminTrophyOverview()),
      checkApiResponse(await apiAdminTrophyAudit()),
      checkApiResponse(await apiAdminTrophyResults())
    ]);

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
  } catch (err) {
    showToast('載入 Trophy 管理資料失敗：' + err.message, 'error');
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
  const pending = state.adminTrophy.overview?.pending_participants || [];
  if (pending.length === 0) {
    DOM.adminPendingVoters.innerHTML = '<p>所有參加者均已完成投票 🎉</p>';
    return;
  }
  DOM.adminPendingVoters.innerHTML = `
    <h4>尚未完成投票（${pending.length} 人）</h4>
    <ul>${pending.map(p => '<li>' + escapeHtml(p) + '</li>').join('')}</ul>
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
      <h4>${escapeHtml(profile.participant_id)}</h4>
      <ul class="profile-trophy-list">${trophies || '<li>尚未獲得 Trophy</li>'}</ul>
    </div>`;
  }).join('');
}

function renderTrophySummary() {
  DOM.summaryList.innerHTML = state.adminTrophy.trophySummary.map(item => {
    const winners = (item.winners || []).map(w =>
      `<span class="winner-tag">${escapeHtml(w.participant_id)}</span>`
    ).join('');
    return `<div class="summary-card">
      <h4>${escapeHtml(item.trophy_name)}</h4>
      <div class="summary-winners">${winners || '暫無得主'}</div>
    </div>`;
  }).join('');
}

async function handleAdminVotingAction(status, btn) {
  await runProgressButton(btn, (async () => {
    try {
      checkApiResponse(await apiAdminSetVotingStatus(status));
      showToast('投票狀態已更新', 'success');
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

// ─── Tab Navigation ───────────────────────────────────────────────────────────

function switchParticipantTab(tabName) {
  document.querySelectorAll('#screen-participant .tab-btn').forEach(btn => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  document.querySelectorAll('#screen-participant .tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === 'tab-' + tabName);
    panel.classList.toggle('hidden', panel.id !== 'tab-' + tabName);
  });

  if (tabName === 'inbox') {
    markAllInboxRead();
  } else if (tabName === 'trophy' && !state.trophy.loaded) {
    loadTrophyData();
  }
}

function switchAdminTab(tabName) {
  document.querySelectorAll('.admin-mode-nav .tab-btn').forEach(btn => {
    const isActive = btn.dataset.adminTab === tabName;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });
  DOM.adminMessagesPanel.classList.toggle('active', tabName === 'messages');
  DOM.adminMessagesPanel.classList.toggle('hidden', tabName !== 'messages');
  DOM.adminTrophyPanel.classList.toggle('active', tabName === 'trophy');
  DOM.adminTrophyPanel.classList.toggle('hidden', tabName !== 'trophy');

  if (tabName === 'messages') {
    apiAdminFetch().then(data => {
      if (data.status === 'success') {
        applyAdminMessages(data.messages || [], data.revision || '');
      }
    }).catch(() => {});
    startAdminWatch();
  } else if (tabName === 'trophy') {
    loadAdminTrophyData();
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

  document.querySelectorAll('#screen-participant .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchParticipantTab(btn.dataset.tab));
  });

  document.querySelectorAll('.admin-mode-nav .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchAdminTab(btn.dataset.adminTab));
  });

  document.querySelectorAll('.sub-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchResultTab(btn.dataset.resultTab));
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.monitorViewFilter = btn.dataset.filter;
      renderAdminMessages();
    });
  });

  DOM.adminEnableMsg.addEventListener('click', () => handleSetMessagingStatus('OPEN', DOM.adminEnableMsg));
  DOM.adminDisableMsg.addEventListener('click', () => handleSetMessagingStatus('CLOSE', DOM.adminDisableMsg));

  DOM.adminOpenVoting.addEventListener('click', () => handleAdminVotingAction('VOTING_OPEN', DOM.adminOpenVoting));
  DOM.adminCloseVoting.addEventListener('click', () => handleAdminVotingAction('VOTING_CLOSED', DOM.adminCloseVoting));
  DOM.adminCalculate.addEventListener('click', () => handleAdminCalculate(DOM.adminCalculate));
  DOM.adminPublish.addEventListener('click', () => handleAdminVotingAction('PUBLISHED', DOM.adminPublish));

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
    }
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  cacheDOM();
  bindEvents();
  showScreen('login');
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
