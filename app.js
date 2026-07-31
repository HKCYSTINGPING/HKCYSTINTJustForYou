/* ==========================================
   Configuration
   ========================================== */
const API_URL = "https://script.google.com/macros/s/AKfycbyuXjz93rfQgwRegranli192KiMzIOEonVw9kdxFo-6qvw_koYr8bY5MozwGs_fflMn7Q/exec";

const MAX_CHARS = 300;

const BAD_WORDS_LIST = [
  // Sentences & Phrases
  "小你老母", "吊你老母", "小你老味", "你老味", "你老母", "老.母", "老 母", "老母係街市賣鴨蛋",
  "含能", "臭化西", "臭西", "傻西", "凸你", "屌.你", "屌 你", "屌你", "吊你", "小你","賓州",
  "九兩菜", "收皮啦", "收皮", "把撚", "條撚", "賓周", "賓.周", "仆街", "仆.街", "卜街", "POP街",
  "diu 9", "sub 9", "sub9", "chi lan sin", "撚樣", "能樣", "柒頭", "笨七", "鳩登", "膠登",
  "契弟", "ass hole", "asshole", "A S S", "on lun 7 7", "臭爛袋", "挑那星", "陷家剷", "陷家",
  "吊夠", "吊 夠", "戇尻尻", "戇尻", "戇-尻", "戇 尻", "on 99", "ON 九", "on 9", "on.9", "on9",
  "ｏｎ ９９", "戇鳩", "戇.鳩", "撚屌鳩", "d i u", "DIU", "fxxk", "fuxk", "fxck", "suck", "bitch",
   "fuck", "f u c k", "dllm", "D l l m", "DLLM","戇尻膠","Penis",
   "onL9", "ass", "shit", "shitting", "C8", "バカ", "8卡","Vagina",
  "撚", "屌", "尻", "鳩", "柒", "仆", "𨳒", "𨳊", "𨳍", "冚家剷", "食屎狗", "屎", "蛋散", "On nine dog", "閪",
   "CNM", "傻逼", "CLS", "7頭皮", "Weed", "Smoke", "D I U", "D iu", "Di u", "尸口巾", "Seven head boy", 
   "吊梨老尾", "幹你娘", "含L", "碌7啦", "pk", "Nigger", "c 8", "馬鹿やろ", "nigga", "米田共", "乜9",
  "&#23628;", "&#x5C4C;", "&#x5C3B;", "&#23611;", "&#x649A;", "&#25754;"
];

/* ==========================================
   State
   ========================================== */
const PARTICIPANTS_CACHE_KEY = "ams_participants_cache";
const PARTICIPANTS_CACHE_TTL = 30 * 60 * 1000;
const PARTICIPANTS_FETCH_TIMEOUT = 20000;
const LOGIN_FETCH_TIMEOUT = 25000;
const SEND_FETCH_TIMEOUT = 25000;
const MONITOR_WATCH_TIMEOUT = 15000;
const MONITOR_WATCH_INTERVAL = 800;
const MONITOR_WATCH_RETRY_MS = 2000;
const ADMIN_PARTICIPANT_ID = "ADMIN";
const ADMIN_PHONE = "23082026";
const ADMIN_DELETED_REASON = "此留言已被管理員撤回，未能送達接收者（管理員決定）";

const REQUIRED_TROPHY_API_VERSION = 13;

const state = {
  participantId: null,
  phoneNumber: null,
  apiVersion: null,
  participants: [],
  participantsLoaded: false,
  inboxMessages: [],
  sentMessages: [],
  sentLoaded: false,
  messagingOpen: true,
  messagingStatusLoaded: false,
  isAdmin: false,
  monitorMessages: [],
  monitorViewFilter: "all",
  trophy: {
    loaded: false,
    votingStatus: "DRAFT",
    allowResubmit: false,
    submissionStatus: null,
    submittedAt: "",
    trophies: [],
    teammates: [],
    groupId: "",
    assignments: {},
    readonly: false
  },
  adminTrophy: {
    overview: null,
    auditVotes: [],
    profiles: [],
    view: "audit"
  }
};

/* ==========================================
   DOM Elements
   ========================================== */
const loginScreen = document.getElementById("login-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
const adminScreen = document.getElementById("admin-screen");
const loginForm = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const userBadge = document.getElementById("user-badge");
const sendForm = document.getElementById("send-form");
const sendBtn = document.getElementById("send-btn");
const participantSelect = document.getElementById("participant-id");
const participantToggle = document.getElementById("participant-toggle");
const participantClear = document.getElementById("participant-clear");
const participantPicker = document.getElementById("participant-picker");
const participantPickerList = document.getElementById("participant-picker-list");
const participantPickerCount = document.getElementById("participant-picker-count");
const participantHint = document.getElementById("participant-hint");
const receiverSelect = document.getElementById("receiver-id");
const receiverToggle = document.getElementById("receiver-toggle");
const receiverClear = document.getElementById("receiver-clear");
const receiverPicker = document.getElementById("receiver-picker");
const receiverPickerList = document.getElementById("receiver-picker-list");
const receiverPickerCount = document.getElementById("receiver-picker-count");

const participantCombobox = {
  root: document.getElementById("participant-combobox"),
  input: participantSelect,
  toggle: participantToggle,
  clear: participantClear,
  picker: participantPicker,
  list: participantPickerList,
  count: participantPickerCount,
  getExcludeId: () => null,
  emptyNoList: "請手動輸入編號",
  emptyNoMatch: "找不到符合的參加者",
  onSelect: () => {}
};

const receiverCombobox = {
  root: document.getElementById("receiver-combobox"),
  input: receiverSelect,
  toggle: receiverToggle,
  clear: receiverClear,
  picker: receiverPicker,
  list: receiverPickerList,
  count: receiverPickerCount,
  getExcludeId: () => state.participantId,
  emptyNoList: "請手動輸入編號",
  emptyNoMatch: "找不到符合的接收對象",
  onSelect: () => validateMessageInput()
};
const messageContent = document.getElementById("message-content");
const charCount = document.getElementById("char-count");
const badWordWarning = document.getElementById("bad-word-warning");
const inboxList = document.getElementById("inbox-list");
const sentList = document.getElementById("sent-list");
const refreshInboxBtn = document.getElementById("refresh-inbox-btn");
const refreshSentBtn = document.getElementById("refresh-sent-btn");
const inboxBadge = document.getElementById("inbox-badge");
const toastContainer = document.getElementById("toast-container");
const loadingOverlay = document.getElementById("loading-overlay");
const loadingOverlayText = document.getElementById("loading-overlay-text");
const loadingOverlayPercent = document.getElementById("loading-overlay-percent");
const messagingClosedBanner = document.getElementById("messaging-closed-banner");
const adminLogoutBtn = document.getElementById("admin-logout-btn");
const monitorList = document.getElementById("monitor-list");
const monitorLastUpdated = document.getElementById("monitor-last-updated");
const monitorMessageCount = document.getElementById("monitor-message-count");
const monitorMessagingStatus = document.getElementById("monitor-messaging-status");
const monitorEnableBtn = document.getElementById("monitor-enable-btn");
const monitorDisableBtn = document.getElementById("monitor-disable-btn");

const trophyStatusBanner = document.getElementById("trophy-status-banner");
const trophyProgress = document.getElementById("trophy-progress");
const trophyProgressFill = document.getElementById("trophy-progress-fill");
const trophyProgressText = document.getElementById("trophy-progress-text");
const trophyIncompleteWarning = document.getElementById("trophy-incomplete-warning");
const trophyMatchingList = document.getElementById("trophy-matching-list");
const trophyActions = document.getElementById("trophy-actions");
const trophySaveDraftBtn = document.getElementById("trophy-save-draft-btn");
const trophySubmitBtn = document.getElementById("trophy-submit-btn");

const adminTrophyPanel = document.getElementById("admin-trophy-panel");
const adminMessagesPanel = document.getElementById("admin-messages-panel");
const trophyAdminVotingStatus = document.getElementById("trophy-admin-voting-status");
const trophyStatCompleted = document.getElementById("trophy-stat-completed");
const trophyStatVotes = document.getElementById("trophy-stat-votes");
const trophyStatTrophyCount = document.getElementById("trophy-stat-trophy-count");
const trophyStatWithTrophy = document.getElementById("trophy-stat-with-trophy");
const trophyPendingList = document.getElementById("trophy-pending-list");
const trophyOpenVotingBtn = document.getElementById("trophy-open-voting-btn");
const trophyCloseVotingBtn = document.getElementById("trophy-close-voting-btn");
const trophyCalculateBtn = document.getElementById("trophy-calculate-btn");
const trophyPublishBtn = document.getElementById("trophy-publish-btn");
const trophyAuditSearch = document.getElementById("trophy-audit-search");
const trophyAuditFilterTrophy = document.getElementById("trophy-audit-filter-trophy");
const trophyAuditTableWrap = document.getElementById("trophy-audit-table-wrap");
const trophyProfilesList = document.getElementById("trophy-profiles-list");
const trophyCelebrationGrid = document.getElementById("trophy-celebration-grid");

let monitorWatchActive = false;
let monitorWatchController = null;
let monitorLoading = false;

let loadingCount = 0;

const ICON_PATHS = {
  mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  inbox: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/>',
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>'
};

function svgIcon(name, size = 22) {
  const path = ICON_PATHS[name] || ICON_PATHS.sparkles;
  return `<svg class="icon icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function statusDot(type = "generating") {
  return `<span class="status-dot status-dot--${type}" aria-hidden="true"></span>`;
}

const TOAST_DOT = {
  success: "success",
  error: "notice",
  warning: "notice",
  info: "generating"
};

/* ==========================================
   Utility Functions
   ========================================== */
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${statusDot(TOAST_DOT[type] || "generating")}<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function setGlobalLoading(active, percent) {
  if (active) {
    loadingCount++;
    loadingOverlay.classList.remove("hidden");
    loadingOverlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-loading");
  } else {
    loadingCount = Math.max(0, loadingCount - 1);
    if (loadingCount === 0) {
      loadingOverlay.classList.add("hidden");
      loadingOverlay.setAttribute("aria-hidden", "true");
      document.body.classList.remove("is-loading");
    }
  }
  if (typeof percent === "number") {
    loadingOverlayPercent.textContent = `${Math.round(percent)}%`;
  }
}

function updateProgressUI(button, percent) {
  if (button) {
    const bar = button.querySelector(".btn-progress-bar");
    if (bar) bar.style.width = `${percent}%`;
  }
  if (loadingOverlayPercent) {
    loadingOverlayPercent.textContent = `${Math.round(percent)}%`;
  }
}

function resetProgressUI(button, useGlobalOverlay = true) {
  if (button) {
    const bar = button.querySelector(".btn-progress-bar");
    const textEl = button.querySelector(".btn-text");
    button.classList.remove("loading");
    button.disabled = false;
    if (bar) bar.style.width = "0%";
    if (textEl && button.dataset.originalText) {
      textEl.textContent = button.dataset.originalText;
      delete button.dataset.originalText;
    }
  }
  if (useGlobalOverlay) {
    setGlobalLoading(false);
  }
}

function setButtonLoadingText(button, text) {
  if (!button) return;
  const textEl = button.querySelector(".btn-text");
  if (!textEl) return;
  if (!button.dataset.originalText) {
    button.dataset.originalText = textEl.textContent;
  }
  textEl.textContent = text;
}

/**
 * Runs an async task with progress synced to the actual request.
 * Progress eases to 90% while waiting, hits 100% when done,
 * runs onComplete immediately at 100%, then cleans up.
 */
async function runWithProgress(button, taskFn, onComplete, loadingText = "正在處理…", options = {}) {
  const useGlobalOverlay = options.useGlobalOverlay !== false;
  const buttonLoadingText = options.buttonLoadingText || loadingText;

  if (useGlobalOverlay && loadingOverlayText) {
    loadingOverlayText.textContent = loadingText;
  }
  if (button) {
    button.classList.add("loading");
    button.disabled = true;
    setButtonLoadingText(button, buttonLoadingText);
  }
  if (useGlobalOverlay) {
    setGlobalLoading(true, 0);
  }

  let progress = 0;
  let finished = false;
  const timer = setInterval(() => {
    if (finished) return;
    const increment = Math.max(0.4, (90 - progress) * 0.07);
    progress = Math.min(progress + increment, 90);
    updateProgressUI(button, progress);
  }, 40);

  try {
    const result = await taskFn();
    finished = true;
    clearInterval(timer);

    progress = 100;
    updateProgressUI(button, 100);

    if (onComplete) {
      await onComplete(result);
    }

    await new Promise((r) => setTimeout(r, 0));
    return result;
  } catch (err) {
    finished = true;
    clearInterval(timer);
    throw err;
  } finally {
    clearInterval(timer);
    resetProgressUI(button, useGlobalOverlay);
  }
}

function checkBadWords(text) {
  if (!text) return [];
  const found = [];
  const lowerText = text.toLowerCase();
  BAD_WORDS_LIST.forEach((word) => {
    if (lowerText.includes(word.toLowerCase()) && !found.includes(word)) {
      found.push(word);
    }
  });
  return found;
}

function formatParticipantLabel(id) {
  return `參加者 ${id}`;
}

function getReadMessagesKey() {
  return `read_messages_${state.participantId}`;
}

function getReadMessageIds() {
  try {
    return JSON.parse(localStorage.getItem(getReadMessagesKey())) || [];
  } catch {
    return [];
  }
}

function markMessageAsRead(messageId) {
  const ids = getReadMessageIds();
  if (!ids.includes(messageId)) {
    ids.push(messageId);
    localStorage.setItem(getReadMessagesKey(), JSON.stringify(ids));
  }
}

function applyInboxFromApi(data) {
  state.inboxMessages = data.messages || [];
  if (data.messaging_status) {
    applyMessagingStatus(data.messaging_status);
  }
}

function applySentFromApi(data) {
  state.sentMessages = data.sent_messages || [];
  state.sentLoaded = true;
  if (data.messaging_status) {
    applyMessagingStatus(data.messaging_status);
  }
}

function saveSession() {
  // Session is kept in memory only; no auto-login on refresh.
}

function clearSession() {
  sessionStorage.removeItem("ams_participant_id");
  sessionStorage.removeItem("ams_phone_number");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderEmptyState(title, desc = "", iconName = "mail") {
  return `
    <div class="empty-state">
      <div class="empty-icon-wrap" aria-hidden="true">${svgIcon(iconName, 26)}</div>
      <p class="empty-title">${escapeHtml(title)}</p>
      ${desc ? `<p class="empty-desc">${escapeHtml(desc)}</p>` : ""}
    </div>`;
}

function renderLoadingState(title = "載入中…") {
  return `
    <div class="empty-state list-loading">
      <div class="loading-shimmer inline-shimmer" aria-hidden="true"></div>
      <p class="empty-title">${escapeHtml(title)}</p>
    </div>`;
}

/* ==========================================
   API Calls
   ========================================== */
async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("API 回傳格式錯誤，請確認 Apps Script 已重新部署");
  }
}

let apiWarmPromise = null;

function getInboxCacheKey(participantId) {
  return `ams_inbox_cache_${normalizeParticipantId(participantId)}`;
}

function saveInboxCache(participantId, messages) {
  sessionStorage.setItem(getInboxCacheKey(participantId), JSON.stringify({
    messages,
    cachedAt: Date.now()
  }));
}

function clearInboxCache(participantId) {
  if (participantId) {
    sessionStorage.removeItem(getInboxCacheKey(participantId));
  }
}

function normalizeParticipantId(id) {
  return String(id || "").trim().toUpperCase();
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function isSameParticipantId(a, b) {
  return normalizeParticipantId(a) === normalizeParticipantId(b);
}

function warmUpApi() {
  if (!apiWarmPromise) {
    apiWarmPromise = fetchWithTimeout(`${API_URL}?action=get_messaging_status`, {}, 8000).catch(() => {});
  }
  return apiWarmPromise;
}

function getParticipantsCache() {
  try {
    const raw = sessionStorage.getItem(PARTICIPANTS_CACHE_KEY);
    if (!raw) return null;
    const { participants, cachedAt } = JSON.parse(raw);
    if (!Array.isArray(participants) || Date.now() - cachedAt > PARTICIPANTS_CACHE_TTL) {
      return null;
    }
    return participants;
  } catch {
    return null;
  }
}

function saveParticipantsCache(participants) {
  sessionStorage.setItem(PARTICIPANTS_CACHE_KEY, JSON.stringify({
    participants,
    cachedAt: Date.now()
  }));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = PARTICIPANTS_FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  if (options.signal) {
    options.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function apiFetchParticipants() {
  const response = await fetchWithTimeout(`${API_URL}?action=list_participants`);
  return parseJsonResponse(response);
}

async function apiFetchBootstrap() {
  const response = await fetchWithTimeout(`${API_URL}?action=bootstrap`);
  return parseJsonResponse(response);
}

function markParticipantsLoaded() {
  state.participantsLoaded = true;
}

function getComboboxEmptyListMessage(combobox) {
  if (!state.participantsLoaded) {
    return "加載中，可手動輸入";
  }
  return combobox.emptyNoList;
}

function applyParticipantsList(participants) {
  state.participants = participants
    .map(normalizeParticipantId)
    .filter((id) => id !== ADMIN_PARTICIPANT_ID);
  markParticipantsLoaded();
  renderComboboxPicker(participantCombobox);
  renderComboboxPicker(receiverCombobox);
  saveParticipantsCache(state.participants);
  setParticipantInputReady("請選擇或輸入編號 (如 1A, 3C...)");
}

async function refreshParticipantsInBackground() {
  try {
    const data = await apiFetchParticipants();
    if (data.status === "success" && Array.isArray(data.participants) && data.participants.length > 0) {
      applyParticipantsList(data.participants);
    }
  } catch (err) {
    console.warn("Background participant refresh failed:", err);
  }
}

async function apiFetchMessages(participantId, phoneNumber, fetchType = "inbox") {
  const params = new URLSearchParams({
    participant_id: normalizeParticipantId(participantId),
    phone_number: normalizePhone(phoneNumber),
    fetch_type: fetchType
  });

  const response = await fetchWithTimeout(`${API_URL}?${params.toString()}`, {}, LOGIN_FETCH_TIMEOUT);
  return parseJsonResponse(response);
}

function isAdminLogin(participantId, phoneNumber) {
  return isSameParticipantId(participantId, ADMIN_PARTICIPANT_ID) &&
    normalizePhone(phoneNumber) === ADMIN_PHONE;
}

function isAdminParticipantInput(value) {
  return isSameParticipantId(value, ADMIN_PARTICIPANT_ID);
}

function updateParticipantAdminPickerUI() {
  const isAdmin = isAdminParticipantInput(participantSelect.value);
  participantToggle.classList.toggle("hidden", isAdmin);
  participantCombobox.root.classList.toggle("is-admin-input", isAdmin);
  if (isAdmin) {
    closeCombobox(participantCombobox);
  }
}

function buildAdminApiParams(extra = {}) {
  return {
    participant_id: normalizeParticipantId(state.participantId),
    phone_number: normalizePhone(state.phoneNumber),
    ...extra
  };
}

async function apiAdminLogin(participantId, phoneNumber) {
  return apiFetchMessages(participantId, phoneNumber, "admin");
}

async function apiSendMessage(senderId, phoneNumber, receiverId, content) {
  const response = await fetchWithTimeout(
    API_URL,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        sender_id: senderId,
        phone_number: phoneNumber,
        receiver_id: receiverId,
        content: content
      })
    },
    SEND_FETCH_TIMEOUT
  );
  return parseJsonResponse(response);
}

async function apiGetMessagingStatus() {
  const response = await fetchWithTimeout(`${API_URL}?action=get_messaging_status`);
  return parseJsonResponse(response);
}

async function apiAdminGet(params, timeoutMs = PARTICIPANTS_FETCH_TIMEOUT, options = {}) {
  const response = await fetchWithTimeout(
    `${API_URL}?${new URLSearchParams(params).toString()}`,
    options,
    timeoutMs
  );
  return parseJsonResponse(response);
}

function isLegacyBackendError(data) {
  const message = data?.message || "";
  return data?.status === "error" && (
    message.includes("participant_id") ||
    message.includes("phone_number") ||
    message.includes("不支援")
  );
}

async function apiAdminRequest(primaryParams, fallbackParams, validateFn) {
  let data = await apiAdminGet(primaryParams);
  if (validateFn(data)) return data;

  if (fallbackParams && (isLegacyBackendError(data) || needsAdminFallback(data, validateFn))) {
    data = await apiAdminGet(fallbackParams);
    if (validateFn(data)) return data;
  }

  return data;
}

function needsAdminFallback(data, validateFn) {
  return data?.status === "success" && !validateFn(data);
}

async function apiSetMessagingStatus(messagingStatus) {
  return apiAdminRequest(
    buildAdminApiParams({
      action: "set_messaging_status",
      messaging_status: messagingStatus
    }),
    buildAdminApiParams({
      action: "get_messaging_status",
      admin: "set_status",
      messaging_status: messagingStatus
    }),
    (data) => data.status === "success" && !!data.messaging_status
  );
}

async function apiAdminListMessages() {
  const data = await apiAdminRequest(
    buildAdminApiParams({ action: "admin_list_messages" }),
    buildAdminApiParams({ action: "get_messaging_status", admin: "list_messages" }),
    (result) => result.status === "success" && Array.isArray(result.messages)
  );

  if (data.status === "success" && !Array.isArray(data.messages)) {
    return { status: "error", message: "BACKEND_OUTDATED" };
  }

  return data;
}

async function apiAdminWatchMessages(revision, options = {}) {
  const params = buildAdminApiParams({
    action: "admin_watch_messages",
    revision: revision || ""
  });
  const fallbackParams = buildAdminApiParams({
    action: "get_messaging_status",
    admin: "watch_messages",
    revision: revision || ""
  });
  const fetchOptions = options.signal ? { signal: options.signal } : {};

  let data = await apiAdminGet(params, MONITOR_WATCH_TIMEOUT, fetchOptions);
  const isValidWatch = (result) =>
    result.status === "success" && Array.isArray(result.messages) && typeof result.changed === "boolean";

  if (isValidWatch(data)) return data;

  if (isLegacyBackendError(data) || needsAdminFallback(data, isValidWatch)) {
    data = await apiAdminGet(fallbackParams, MONITOR_WATCH_TIMEOUT, fetchOptions);
    if (isValidWatch(data)) return data;
  }

  if (data.status !== "success" || typeof data.changed !== "boolean") {
    const listData = await apiAdminListMessages();
    if (listData.status !== "success") return listData;

    const nextRevision = getMonitorRevision(listData.messages || []);
    return {
      status: "success",
      changed: nextRevision !== revision,
      revision: nextRevision,
      messages: listData.messages || [],
      legacyWatch: true
    };
  }

  return data;
}

async function apiAdminDeleteMessage(messageId) {
  return apiAdminRequest(
    buildAdminApiParams({
      action: "admin_delete_message",
      message_id: messageId
    }),
    buildAdminApiParams({
      action: "get_messaging_status",
      admin: "delete_message",
      message_id: messageId
    }),
    (data) => data.status === "success" && !!data.message_id
  );
}

function getAdminAuthErrorMessage(data) {
  const message = data?.message || "";

  if (
    message === "BACKEND_OUTDATED" ||
    message.includes("participant_id") ||
    message.includes("phone_number")
  ) {
    return "後端尚未部署監察功能，請將最新 Code.gs 貼到 Apps Script 並重新部署";
  }

  if (message.includes("留言功能目前已關閉")) {
    return "管理員驗證失敗，請確認 Apps Script 已重新部署最新版本";
  }

  return message || "驗證失敗";
}

function isMessageDeleted(msg) {
  if (String(msg?.status || "").trim().toLowerCase() === "deleted") {
    return true;
  }
  return Boolean(String(msg?.deleted_at || "").trim());
}

function isMessagingOpen() {
  return state.messagingOpen !== false;
}

function applyMessagingStatus(messagingStatus) {
  state.messagingOpen = String(messagingStatus || "OPEN").trim().toUpperCase() !== "CLOSE";
  state.messagingStatusLoaded = true;
  updateMessagingUI();
}

function updateMessagingUI() {
  const open = isMessagingOpen();

  if (messagingClosedBanner) {
    messagingClosedBanner.classList.toggle("hidden", open);
  }

  if (monitorMessagingStatus) {
    monitorMessagingStatus.innerHTML = open
      ? `${statusDot("success")}目前狀態：開通留言`
      : `${statusDot("notice")}目前狀態：關閉留言`;
    monitorMessagingStatus.classList.toggle("is-open", open);
    monitorMessagingStatus.classList.toggle("is-closed", !open);
  }

  if (monitorEnableBtn) monitorEnableBtn.disabled = open;
  if (monitorDisableBtn) monitorDisableBtn.disabled = !open;

  if (messagingClosedBanner) {
    messagingClosedBanner.classList.toggle("hidden", open);
  }

  if (sendForm) {
    sendForm.classList.toggle("is-closed", !open);
  }

  if (receiverSelect) receiverSelect.disabled = !open;
  if (receiverToggle) receiverToggle.disabled = !open;
  if (messageContent) messageContent.disabled = !open;
  if (!open) closeAllComboboxes();
  updateComboboxClearButton(receiverCombobox);

  validateMessageInput();
}

async function loadMessagingStatus(options = {}) {
  const { silent = false } = options;

  try {
    const data = await apiGetMessagingStatus();
    if (data.status === "success" && data.messaging_status) {
      applyMessagingStatus(data.messaging_status);
      return true;
    }
  } catch (err) {
    console.warn("Load messaging status error:", err);
  }

  if (!silent) {
    applyMessagingStatus("OPEN");
  }

  return false;
}

async function handleAdminSetMessagingStatus(targetStatus) {
  if (!state.isAdmin) {
    showToast("請先以管理員身分登入", "warning");
    return;
  }

  const button = targetStatus === "OPEN" ? monitorEnableBtn : monitorDisableBtn;
  const loadingText = targetStatus === "OPEN" ? "正在開通留言…" : "正在關閉留言…";

  try {
    await runWithProgress(
      button,
      () => apiSetMessagingStatus(targetStatus),
      (data) => {
        if (data.status === "success") {
          applyMessagingStatus(data.messaging_status);
          showToast(
            data.message || (targetStatus === "OPEN" ? "留言功能已開通" : "留言功能已關閉"),
            "success"
          );
          return;
        }

        showToast(data.message || "設定失敗", "error");
      },
      loadingText,
      {
        useGlobalOverlay: false,
        buttonLoadingText: targetStatus === "OPEN" ? "開通中…" : "關閉中…"
      }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Set messaging status error:", err);
  }
}

function resetAdminState() {
  stopMonitorWatch();
  state.isAdmin = false;
  state.monitorMessages = [];
  state.monitorViewFilter = "all";
  setMonitorViewFilter("all");
  monitorList.innerHTML = renderEmptyState("目前沒有留言", "留言會即時顯示在這裡", "eye");
  monitorMessageCount.textContent = "0";
  monitorLastUpdated.textContent = "—";
}

function getMonitorRevision(messages = state.monitorMessages) {
  return messages
    .map((msg) => `${String(msg.message_id || "")}:${String(msg.status || "active")}`)
    .sort()
    .join("\u0001");
}

function normalizeMonitorMessage(msg) {
  const deletedAt = String(msg?.deleted_at || "").trim();
  let status = String(msg?.status || "").trim().toLowerCase();

  if (deletedAt || status === "deleted") {
    status = "deleted";
  } else if (!status) {
    status = "active";
  }

  const normalized = {
    ...msg,
    status,
    deleted_at: deletedAt
  };

  if (status === "deleted") {
    normalized.deleted_reason = msg.deleted_reason || ADMIN_DELETED_REASON;
  }

  return normalized;
}

function mergeMonitorMessages(apiMessages = []) {
  const mergedById = new Map();

  apiMessages.forEach((msg) => {
    mergedById.set(msg.message_id, msg);
  });

  state.monitorMessages.forEach((msg) => {
    if (isMessageDeleted(msg) && !mergedById.has(msg.message_id)) {
      mergedById.set(msg.message_id, msg);
    }
  });

  return Array.from(mergedById.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

function applyMonitorMessages(messages, options = {}) {
  const { highlightNew = true } = options;
  const normalized = (messages || []).map(normalizeMonitorMessage);
  const merged = mergeMonitorMessages(normalized);
  const previousIds = new Set(state.monitorMessages.map((msg) => msg.message_id));
  const newMessageIds = highlightNew
    ? new Set(
        merged
          .filter((msg) => !previousIds.has(msg.message_id))
          .map((msg) => msg.message_id)
      )
    : new Set();

  state.monitorMessages = merged;
  renderMonitorList(newMessageIds);
  updateMonitorMeta();
}

async function loadMonitorMessages(options = {}) {
  const { silent = false } = options;

  if (!state.isAdmin) return false;
  if (monitorLoading) return false;

  monitorLoading = true;

  try {
    const data = await apiAdminListMessages();

    if (data.status === "success") {
      applyMonitorMessages(data.messages || [], { highlightNew: !silent });
      return true;
    }

    if (data.message === "身份驗證失敗" || data.message === "密碼錯誤") {
      resetAdminState();
      showLogin();
    }

    if (!silent) {
      showToast(data.message || "載入監察留言失敗", "error");
    }

    return false;
  } catch (err) {
    if (!silent) {
      showToast(err.message || "載入監察留言失敗", "error");
    }
    console.warn("Load monitor messages error:", err);
    return false;
  } finally {
    monitorLoading = false;
  }
}

function getMonitorMessagesForView() {
  if (state.monitorViewFilter === "deleted") {
    return state.monitorMessages.filter(isMessageDeleted);
  }

  if (state.monitorViewFilter === "active") {
    return state.monitorMessages.filter((msg) => !isMessageDeleted(msg));
  }

  return state.monitorMessages;
}

function setMonitorViewFilter(filter) {
  if (!filter) return;
  state.monitorViewFilter = filter;

  document.querySelectorAll(".monitor-filter-btn[data-monitor-filter]").forEach((btn) => {
    const isActive = btn.dataset.monitorFilter === filter;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  renderMonitorList();
  updateMonitorMeta();
}

function updateMonitorMeta() {
  const all = state.monitorMessages;
  const deletedCount = all.filter(isMessageDeleted).length;
  const activeCount = all.length - deletedCount;
  const visible = getMonitorMessagesForView();

  if (state.monitorViewFilter === "all") {
    monitorMessageCount.textContent = deletedCount > 0
      ? `${all.length}（${activeCount} 已送出 · ${deletedCount} 已刪除）`
      : String(all.length);
  } else {
    monitorMessageCount.textContent = `${visible.length} / ${all.length}`;
  }
  monitorLastUpdated.textContent = new Date().toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}

function renderMonitorList(newMessageIds = new Set()) {
  const visibleMessages = getMonitorMessagesForView();

  if (state.monitorMessages.length === 0) {
    monitorList.innerHTML = renderEmptyState("目前沒有留言", "留言會即時顯示在這裡", "eye");
    return;
  }

  if (visibleMessages.length === 0) {
    const emptyText = {
      active: "目前沒有已送出的留言",
      deleted: "目前沒有已刪除的留言",
      all: "目前沒有留言"
    }[state.monitorViewFilter] || "目前沒有留言";

    monitorList.innerHTML = renderEmptyState(emptyText, "", state.monitorViewFilter === "deleted" ? "search" : "eye");
    return;
  }

  monitorList.innerHTML = visibleMessages.map((msg) => {
    const deleted = isMessageDeleted(msg);
    const deletedNotice = msg.deleted_reason || ADMIN_DELETED_REASON;

    return `
    <article class="message-card monitor-card ${deleted ? "deleted unsent" : ""} ${newMessageIds.has(msg.message_id) ? "monitor-card-new" : ""}" data-message-id="${escapeHtml(msg.message_id)}">
      <div class="message-card-header">
        <div class="monitor-meta">
          <span class="monitor-route">${escapeHtml(formatParticipantLabel(msg.sender_id))} → ${escapeHtml(formatParticipantLabel(msg.receiver_id))}</span>
          <span class="message-meta">${escapeHtml(msg.created_at || "未知時間")}</span>
          ${deleted ? '<span class="message-unsent-badge">已撤回</span>' : ""}
        </div>
        ${deleted ? "" : `
        <button
          type="button"
          class="btn btn-secondary monitor-delete-btn btn-progress"
          data-message-id="${escapeHtml(msg.message_id)}"
        ><span class="btn-text">刪除留言</span><span class="btn-progress-bar" aria-hidden="true"></span><span class="btn-progress-label" aria-hidden="true">0%</span></button>`}
      </div>
      ${deleted ? `
        <p class="message-deleted-notice">${escapeHtml(deletedNotice)}</p>
        ${msg.deleted_at ? `<p class="message-deleted-time">撤回時間：${escapeHtml(msg.deleted_at)}</p>` : ""}
      ` : ""}
      <p class="message-content ${deleted ? "is-deleted" : ""}">${escapeHtml(msg.content)}</p>
    </article>`;
  }).join("");

  monitorList.querySelectorAll(".monitor-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleAdminDeleteMessage(btn.dataset.messageId, btn));
  });
}

async function handleAdminDeleteMessage(messageId, button) {
  if (!state.isAdmin || !messageId) return;

  const confirmed = window.confirm("確定要刪除此留言嗎？發送者將會在「送出的留言」看到已被管理員刪除。");
  if (!confirmed) return;

  const deleteBtn = button;
  stopMonitorWatch();

  try {
    await runWithProgress(
      deleteBtn,
      () => apiAdminDeleteMessage(messageId),
      async (data) => {
        if (data.status === "success") {
          state.monitorMessages = state.monitorMessages.map((msg) => {
            if (msg.message_id !== messageId) return msg;

            return {
              ...msg,
              status: "deleted",
              deleted_at: new Date().toLocaleString("zh-TW", {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false
              }).replace(/\//g, "-"),
              deleted_reason: ADMIN_DELETED_REASON
            };
          });
          renderMonitorList();
          updateMonitorMeta();
          showToast("留言已撤回", "success");
          return;
        }

        showToast(data.message || "刪除失敗", "error");
      },
      "刪除中…",
      { useGlobalOverlay: false, buttonLoadingText: "刪除中…" }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Admin delete message error:", err);
  } finally {
    if (state.isAdmin && adminScreen && !adminScreen.classList.contains("hidden")) {
      startMonitorWatch();
    }
  }
}

function startMonitorWatch() {
  stopMonitorWatch();
  monitorWatchActive = true;
  runMonitorWatchLoop();
}

function stopMonitorWatch() {
  monitorWatchActive = false;
  if (monitorWatchController) {
    monitorWatchController.abort();
    monitorWatchController = null;
  }
}

async function runMonitorWatchLoop() {
  if (!monitorWatchActive || !state.isAdmin) {
    return;
  }

  if (adminScreen.classList.contains("hidden")) {
    return;
  }

  if (document.hidden) {
    return;
  }

  monitorWatchController = new AbortController();
  const revision = getMonitorRevision();

  try {
    const data = await apiAdminWatchMessages(revision, {
      signal: monitorWatchController.signal
    });

    if (!monitorWatchActive || !state.isAdmin) {
      return;
    }

    if (data.status === "success") {
      if (data.changed) {
        applyMonitorMessages(data.messages || []);
        runMonitorWatchLoop();
      } else {
        window.setTimeout(runMonitorWatchLoop, MONITOR_WATCH_INTERVAL);
      }
      return;
    }

    if (data.message === "身份驗證失敗" || data.message === "密碼錯誤") {
      resetAdminState();
      showLogin();
      return;
    }

    window.setTimeout(runMonitorWatchLoop, MONITOR_WATCH_RETRY_MS);
  } catch (err) {
    if (err.name === "AbortError") {
      return;
    }

    console.warn("Monitor watch error:", err);
    if (monitorWatchActive && state.isAdmin) {
      window.setTimeout(runMonitorWatchLoop, MONITOR_WATCH_RETRY_MS);
    }
  } finally {
    monitorWatchController = null;
  }
}

/* ==========================================
   UI: Login & Dashboard
   ========================================== */
function showLogin() {
  loginScreen.classList.remove("hidden");
  dashboardScreen.classList.add("hidden");
  adminScreen.classList.add("hidden");
  document.body.classList.remove("participant-active", "admin-active");
  stopMonitorWatch();
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  adminScreen.classList.add("hidden");
  document.body.classList.add("participant-active");
  document.body.classList.remove("admin-active");
  userBadge.innerHTML = `<span class="pill-badge pill-badge--purple">${svgIcon("smile", 14)} ${escapeHtml(formatParticipantLabel(state.participantId))}</span>`;
  renderComboboxPicker(receiverCombobox);
  renderSentMessages();
  updateInboxBadge();
  if (!state.messagingStatusLoaded) {
    loadMessagingStatus({ silent: true });
  }
}

function showAdminDashboard() {
  loginScreen.classList.add("hidden");
  dashboardScreen.classList.add("hidden");
  adminScreen.classList.remove("hidden");
  document.body.classList.add("admin-active");
  document.body.classList.remove("participant-active");
  loadMessagingStatus({ silent: true });
  startMonitorWatch();
  loadAdminTrophyData({ silent: true });
}

function getFilteredParticipants(filterText = "", excludeId = null) {
  const query = normalizeParticipantId(filterText).toLowerCase();
  let list = state.participants.filter(
    (id) =>
      !isSameParticipantId(id, excludeId) &&
      !isSameParticipantId(id, ADMIN_PARTICIPANT_ID)
  );

  if (!query) return list;

  return list.filter((id) => {
    const normalizedId = normalizeParticipantId(id).toLowerCase();
    const label = formatParticipantLabel(id).toLowerCase();
    return normalizedId.includes(query) || label.includes(query);
  });
}

function renderComboboxPicker(combobox, filterText = combobox.input.value) {
  if (combobox === participantCombobox && isAdminParticipantInput(filterText)) {
    combobox.list.innerHTML = "";
    combobox.count.textContent = "";
    return;
  }

  const filtered = getFilteredParticipants(filterText, combobox.getExcludeId());
  const currentId = normalizeParticipantId(combobox.input.value);

  combobox.list.innerHTML = "";

  if (filtered.length === 0) {
    combobox.list.innerHTML = `
      <p class="participant-picker-empty">
        ${state.participants.length === 0 ? getComboboxEmptyListMessage(combobox) : combobox.emptyNoMatch}
      </p>`;
    combobox.count.textContent = "";
    return;
  }

  combobox.count.textContent = `${filtered.length} 位`;

  filtered.forEach((id) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "participant-picker-item";
    item.dataset.id = id;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", id === currentId ? "true" : "false");
    if (id === currentId) item.classList.add("selected");
    item.innerHTML = `
      <span class="picker-id">${escapeHtml(id)}</span>
      <span>${escapeHtml(formatParticipantLabel(id))}</span>`;
    item.addEventListener("click", () => selectFromCombobox(combobox, id));
    combobox.list.appendChild(item);
  });
}

function setComboboxOpen(combobox, isOpen) {
  combobox.picker.classList.toggle("hidden", !isOpen);
  combobox.input.setAttribute("aria-expanded", String(isOpen));
  combobox.toggle.setAttribute("aria-expanded", String(isOpen));

  if (isOpen) {
    renderComboboxPicker(combobox);
  }
}

function openCombobox(combobox) {
  if (combobox.input.disabled) return;
  if (combobox === participantCombobox && isAdminParticipantInput(combobox.input.value)) return;
  closeAllComboboxes(combobox);
  setComboboxOpen(combobox, true);
}

function closeCombobox(combobox) {
  setComboboxOpen(combobox, false);
}

function closeAllComboboxes(except = null) {
  [participantCombobox, receiverCombobox].forEach((combobox) => {
    if (combobox !== except) {
      closeCombobox(combobox);
    }
  });
}

function toggleCombobox(combobox) {
  if (combobox === participantCombobox && isAdminParticipantInput(combobox.input.value)) return;
  if (combobox.picker.classList.contains("hidden")) {
    openCombobox(combobox);
  } else {
    closeCombobox(combobox);
  }
}

function updateComboboxClearButton(combobox) {
  const hasValue = combobox.input.value.trim().length > 0 && !combobox.input.disabled;
  combobox.clear.classList.toggle("hidden", !hasValue);
  combobox.root.classList.toggle("has-value", hasValue);
}

function clearComboboxInput(combobox) {
  combobox.input.value = "";
  closeCombobox(combobox);
  updateComboboxClearButton(combobox);
  if (combobox === participantCombobox) {
    updateParticipantAdminPickerUI();
  }
  combobox.onSelect();
  combobox.input.focus();
}

function selectFromCombobox(combobox, id) {
  combobox.input.value = id;
  closeCombobox(combobox);
  updateComboboxClearButton(combobox);
  combobox.input.focus();
  warmUpApi();
  combobox.onSelect(id);
}

function setupComboboxEvents(combobox) {
  combobox.input.addEventListener("input", () => {
    if (combobox === participantCombobox) {
      updateParticipantAdminPickerUI();
    }
    if (!combobox.picker.classList.contains("hidden")) {
      renderComboboxPicker(combobox);
    }
    updateComboboxClearButton(combobox);
    combobox.onSelect();
  });

  combobox.input.addEventListener("focus", () => {
    warmUpApi();
    if (combobox === participantCombobox && isAdminParticipantInput(combobox.input.value)) {
      return;
    }
    if (!combobox.input.disabled && (state.participants.length > 0 || !state.participantsLoaded)) {
      openCombobox(combobox);
    }
  });

  combobox.clear.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearComboboxInput(combobox);
  });

  combobox.toggle.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCombobox(combobox);
  });
}

function setParticipantInputReady(placeholder, hintText = "", hintWarning = false) {
  participantSelect.disabled = false;
  participantToggle.disabled = false;
  participantSelect.placeholder = placeholder;
  participantHint.textContent = hintText;
  participantHint.classList.toggle("hidden", !hintText);
  participantHint.classList.toggle("warning", hintWarning);
  updateComboboxClearButton(participantCombobox);
  updateParticipantAdminPickerUI();
}

async function loadBootstrap() {
  try {
    const data = await apiFetchBootstrap();
    if (data.status !== "success") return false;

    if (Array.isArray(data.participants)) {
      if (data.participants.length > 0) {
        applyParticipantsList(data.participants);
      } else {
        markParticipantsLoaded();
        setParticipantInputReady(
          "請手動輸入編號 (如 1A)",
          "Participants 工作表沒有 participant_id 資料",
          true
        );
      }
    } else {
      return false;
    }

    if (data.messaging_status) {
      applyMessagingStatus(data.messaging_status);
    }

    if (typeof data.api_version === "number") {
      state.apiVersion = data.api_version;
    } else if (typeof data.version === "number") {
      state.apiVersion = data.version;
    }

    return true;
  } catch (err) {
    console.warn("Bootstrap load failed:", err);
    return false;
  }
}

async function loadParticipants() {
  const cached = getParticipantsCache();

  if (cached && cached.length > 0) {
    applyParticipantsList(cached);
    refreshParticipantsInBackground();
    return;
  }

  setParticipantInputReady(
    "請選擇或輸入編號 (如 1A, 3C...)",
    "名單載入中，可先手動輸入編號"
  );
  closeAllComboboxes();

  try {
    const data = await apiFetchParticipants();

    if (data.status === "success" && Array.isArray(data.participants) && data.participants.length > 0) {
      applyParticipantsList(data.participants);
      return;
    }

    if (data.status === "success" && Array.isArray(data.participants) && data.participants.length === 0) {
      markParticipantsLoaded();
      setParticipantInputReady(
        "請手動輸入編號 (如 1A)",
        "Participants 工作表沒有 participant_id 資料",
        true
      );
      return;
    }

    markParticipantsLoaded();
    setParticipantInputReady(
      "請手動輸入編號 (如 1A)",
      "無法從 Sheet 載入名單，請手動輸入",
      true
    );
    showToast(data.message || "無法載入參加者名單", "warning");
  } catch (err) {
    markParticipantsLoaded();
    const isTimeout = err.name === "AbortError";
    setParticipantInputReady(
      "請手動輸入編號 (如 1A)",
      isTimeout ? "載入逾時，請手動輸入或重新整理" : "連線失敗，請手動輸入編號",
      true
    );
    showToast(isTimeout ? "載入名單逾時，可先手動輸入編號" : "無法載入參加者名單，請手動輸入", "warning");
    console.error("Load participants error:", err);
  }
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  if (tabName === "inbox") {
    markAllInboxAsRead();
  }

  if (tabName === "sent") {
    renderSentMessages();
    loadSentMessages({ silent: true });
  }

  if (tabName === "trophy") {
    loadTrophyBootstrap();
  }
}

function updateInboxBadge() {
  const readIds = getReadMessageIds();
  const unreadCount = state.inboxMessages.filter(
    (msg) => !readIds.includes(msg.message_id)
  ).length;

  if (unreadCount > 0) {
    inboxBadge.textContent = unreadCount;
    inboxBadge.classList.remove("hidden");
  } else {
    inboxBadge.classList.add("hidden");
  }
}

function markAllInboxAsRead() {
  state.inboxMessages.forEach((msg) => markMessageAsRead(msg.message_id));
  updateInboxBadge();
  renderInbox();
}

/* ==========================================
   UI: Message Validation
   ========================================== */
function validateMessageInput() {
  const content = messageContent.value;
  const length = content.length;
  const badWords = checkBadWords(content);
  const hasBadWords = badWords.length > 0;
  const receiver = normalizeParticipantId(receiverSelect.value);

  charCount.textContent = `${length} / ${MAX_CHARS}`;
  charCount.classList.toggle("near-limit", length >= 250 && length < MAX_CHARS);
  charCount.classList.toggle("at-limit", length >= MAX_CHARS);

  if (hasBadWords) {
    messageContent.classList.add("error");
    badWordWarning.classList.remove("hidden");
    badWordWarning.textContent = "偵測到不當用語，請修正後再發送";
  } else {
    messageContent.classList.remove("error");
    badWordWarning.classList.add("hidden");
  }

  const canSend = isMessagingOpen() && receiver && content.trim().length > 0 && !hasBadWords;
  sendBtn.disabled = !canSend;
}

/* ==========================================
   UI: Render Messages
   ========================================== */
function renderInbox() {
  const readIds = getReadMessageIds();

  if (state.inboxMessages.length === 0) {
    inboxList.innerHTML = renderEmptyState("目前沒有留言", "有新留言時會顯示在這裡", "inbox");
    return;
  }

  const sorted = [...state.inboxMessages].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  inboxList.innerHTML = sorted.map((msg) => {
    const isUnread = !readIds.includes(msg.message_id);
    return `
      <article class="message-card inbox-card ${isUnread ? "unread" : ""}">
        <div class="message-meta inbox-meta">
          <span>${escapeHtml(msg.created_at || "未知時間")}</span>
          ${isUnread ? '<span class="message-badge pill-badge--new"><span class="pill-badge-star" aria-hidden="true">✧</span> 新留言</span>' : ""}
        </div>
        <p class="message-content">${escapeHtml(msg.content)}</p>
      </article>`;
  }).join("");
}

function renderSentMessages() {
  if (state.sentMessages.length === 0) {
    sentList.innerHTML = state.sentLoaded
      ? renderEmptyState("尚未發送任何留言", "您送出的留言會顯示在這裡", "send")
      : renderLoadingState("載入送出的留言中…");
    return;
  }

  const sorted = [...state.sentMessages].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  sentList.innerHTML = sorted.map((msg) => {
    const deleted = isMessageDeleted(msg);
    const deletedNotice = msg.deleted_reason || ADMIN_DELETED_REASON;

    return `
    <article class="message-card sent-card ${deleted ? "deleted unsent" : ""}">
      <div class="message-card-header">
        <div class="sent-card-heading">
          <span class="message-receiver">接收對象：${escapeHtml(formatParticipantLabel(msg.receiver_id))}</span>
          ${deleted ? '<span class="message-unsent-badge">管理員已撤回</span>' : ""}
        </div>
        <span class="message-meta">${escapeHtml(msg.created_at || "未知時間")}</span>
      </div>
      ${deleted ? `
        <p class="message-deleted-notice">${escapeHtml(deletedNotice)}</p>
        ${msg.deleted_at ? `<p class="message-deleted-time">撤回時間：${escapeHtml(msg.deleted_at)}</p>` : ""}
      ` : ""}
      <p class="message-content ${deleted ? "is-deleted" : ""}">${escapeHtml(msg.content)}</p>
    </article>`;
  }).join("");
}

async function loadSentMessages(options = {}) {
  const { silent = true, showToastOnSuccess = false } = options;

  if (!state.participantId || !state.phoneNumber) return false;

  try {
    const data = await apiFetchMessages(state.participantId, state.phoneNumber, "sent");

    if (data.status === "success") {
      applySentFromApi(data);
      renderSentMessages();
      if (showToastOnSuccess) {
        showToast("送出的留言已更新", "success");
      }
      return true;
    }

    if (!silent) {
      showToast(data.message || "同步失敗", "error");
    }

    return false;
  } catch (err) {
    if (!silent) {
      showToast("連線失敗，請稍後再試", "error");
    }
    console.error("Load sent messages error:", err);
    return false;
  }
}

/* ==========================================
   Actions: Login
   ========================================== */
async function handleLogin(e) {
  e.preventDefault();

  const participantId = normalizeParticipantId(participantSelect.value);
  const phoneNumber = document.getElementById("phone-number").value.trim();

  if (!participantId) {
    showToast("請選擇您的參加者編號", "warning");
    return;
  }

  if (!phoneNumber) {
    showToast("請輸入電話號碼", "warning");
    return;
  }

  if (isAdminLogin(participantId, phoneNumber)) {
    try {
      await Promise.race([
        warmUpApi(),
        new Promise((resolve) => setTimeout(resolve, 200))
      ]);

      await runWithProgress(
        loginBtn,
        () => apiAdminLogin(participantId, phoneNumber),
        (data) => {
          if (data.status === "success" && data.role === "admin") {
            state.isAdmin = true;
            state.participantId = ADMIN_PARTICIPANT_ID;
            state.phoneNumber = ADMIN_PHONE;
            applyMonitorMessages(data.messages || [], { highlightNew: false });
            if (data.messaging_status) {
              applyMessagingStatus(data.messaging_status);
            }
            showAdminDashboard();
            showToast("歡迎，管理員", "success");
          } else {
            showToast(data.message || "管理員身份驗證失敗", "error");
          }
        },
        "正在驗證管理員…",
        { buttonLoadingText: "驗證中…" }
      );
    } catch (err) {
      showToast("連線失敗，請稍後再試", "error");
      console.error("Admin login error:", err);
    }
    return;
  }

  try {
    await Promise.race([
      warmUpApi(),
      new Promise((resolve) => setTimeout(resolve, 200))
    ]);

    await runWithProgress(
      loginBtn,
      () => apiFetchMessages(participantId, phoneNumber, "inbox"),
      (data) => {
        if (data.status === "success") {
          state.isAdmin = false;
          state.participantId = participantId;
          state.phoneNumber = phoneNumber;
          state.sentMessages = [];
          state.sentLoaded = false;
          applyInboxFromApi(data);
          saveInboxCache(participantId, state.inboxMessages);
          saveSession();
          showDashboard();
          renderInbox();
          showToast(`歡迎，${formatParticipantLabel(participantId)}`, "success");
        } else {
          showToast(data.message || "身份驗證失敗", "error");
        }
      },
      "正在驗證身分…",
      { buttonLoadingText: "驗證中…" }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Login error:", err);
  }
}

/* ==========================================
   Actions: Refresh
   ========================================== */
async function handleRefreshInbox() {
  try {
    await runWithProgress(
      refreshInboxBtn,
      () => apiFetchMessages(state.participantId, state.phoneNumber, "inbox"),
      (data) => {
        if (data.status === "success") {
          applyInboxFromApi(data);
          renderInbox();
          updateInboxBadge();
          saveInboxCache(state.participantId, state.inboxMessages);
          showToast("收件箱已更新", "success");
        } else {
          showToast(data.message || "同步失敗", "error");
        }
      },
      "正在同步收件箱…",
      { buttonLoadingText: "同步中…", useGlobalOverlay: false }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Refresh inbox error:", err);
  }
}

async function handleRefreshSent() {
  try {
    await runWithProgress(
      refreshSentBtn,
      () => loadSentMessages({ silent: true, showToastOnSuccess: false }),
      (success) => {
        if (success) {
          showToast("送出的留言已更新", "success");
        } else {
          showToast("同步失敗", "error");
        }
      },
      "正在同步已發送…",
      { buttonLoadingText: "同步中…", useGlobalOverlay: false }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Refresh sent error:", err);
  }
}

/* ==========================================
   Actions: Send Message
   ========================================== */
async function handleSendMessage(e) {
  e.preventDefault();

  if (!isMessagingOpen()) {
    showToast("留言功能目前已關閉，暫時無法發送留言", "warning");
    return;
  }

  const receiverId = normalizeParticipantId(receiverSelect.value);
  const content = messageContent.value.trim();

  if (!receiverId) {
    showToast("請選擇接收對象", "warning");
    return;
  }

  if (!content) {
    showToast("請輸入留言內容", "warning");
    return;
  }

  const badWords = checkBadWords(content);
  if (badWords.length > 0) {
    showToast("留言包含不當用語，請修正", "error");
    return;
  }

  try {
    await Promise.race([
      warmUpApi(),
      new Promise((resolve) => setTimeout(resolve, 200))
    ]);

    await runWithProgress(
      sendBtn,
      () => apiSendMessage(
        state.participantId,
        state.phoneNumber,
        receiverId,
        content
      ),
      async (data) => {
        if (data.status === "success") {
          messageContent.value = "";
          receiverSelect.value = "";
          updateComboboxClearButton(receiverCombobox);
          validateMessageInput();

          state.sentMessages.unshift({
            message_id: data.message_id || `MSG-${Date.now()}`,
            receiver_id: receiverId,
            content: content,
            created_at: data.created_at || new Date().toLocaleString("zh-TW", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false
            }).replace(/\//g, "-")
          });
          state.sentLoaded = true;

          renderSentMessages();
          switchTab("sent");
          showToast("留言已成功發送", "success");
        } else {
          if (data.messaging_status === "CLOSE" || (data.message && data.message.includes("關閉"))) {
            applyMessagingStatus("CLOSE");
          }
          showToast(data.message || "發送失敗", "error");
        }
      },
      "正在發送留言…",
      { buttonLoadingText: "發送中…", useGlobalOverlay: false }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Send error:", err);
  }

  validateMessageInput();
}

/* ==========================================
   Actions: Logout
   ========================================== */
function handleLogout() {
  if (state.isAdmin) {
    resetAdminState();
    state.participantId = null;
    state.phoneNumber = null;
    loginForm.reset();
    updateParticipantAdminPickerUI();
    showLogin();
    showToast("管理員已登出", "info");
    return;
  }

  const previousParticipantId = state.participantId;
  state.participantId = null;
  state.phoneNumber = null;
  state.isAdmin = false;
  state.inboxMessages = [];
  state.sentMessages = [];
  state.sentLoaded = false;
  state.messagingStatusLoaded = false;
  state.trophy = {
    loaded: false,
    votingStatus: "DRAFT",
    allowResubmit: false,
    submissionStatus: null,
    submittedAt: "",
    trophies: [],
    teammates: [],
    groupId: "",
    assignments: {},
    readonly: false
  };
  clearSession();
  clearInboxCache(previousParticipantId);
  closeAllComboboxes();
  loginForm.reset();
  sendForm.reset();
  updateComboboxClearButton(participantCombobox);
  updateComboboxClearButton(receiverCombobox);
  updateParticipantAdminPickerUI();
  validateMessageInput();
  showLogin();
  showToast("已成功登出", "info");
}

/* ==========================================
   Event Listeners
   ========================================== */
document.getElementById("phone-number").addEventListener("input", (e) => {
  e.target.value = normalizePhone(e.target.value);
});

document.getElementById("phone-number").addEventListener("focus", () => {
  warmUpApi();
});

loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", handleLogout);
adminLogoutBtn.addEventListener("click", handleLogout);
sendForm.addEventListener("submit", handleSendMessage);
refreshInboxBtn.addEventListener("click", handleRefreshInbox);
refreshSentBtn.addEventListener("click", handleRefreshSent);

messageContent.addEventListener("input", validateMessageInput);
messageContent.addEventListener("focus", () => {
  warmUpApi();
});

setupComboboxEvents(participantCombobox);
setupComboboxEvents(receiverCombobox);

document.addEventListener("click", (e) => {
  const insideCombobox = [participantCombobox, receiverCombobox].some(
    (combobox) => combobox.root.contains(e.target)
  );
  if (!insideCombobox) {
    closeAllComboboxes();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAllComboboxes();
  }
});

monitorEnableBtn.addEventListener("click", () => handleAdminSetMessagingStatus("OPEN"));
monitorDisableBtn.addEventListener("click", () => handleAdminSetMessagingStatus("CLOSE"));
document.querySelectorAll(".monitor-filter-btn[data-monitor-filter]").forEach((btn) => {
  btn.addEventListener("click", () => setMonitorViewFilter(btn.dataset.monitorFilter));
});

document.addEventListener("visibilitychange", () => {
  if (
    !document.hidden &&
    adminScreen &&
    !adminScreen.classList.contains("hidden") &&
    state.isAdmin
  ) {
    startMonitorWatch();
  } else if (document.hidden) {
    stopMonitorWatch();
  }
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

window.addEventListener("orientationchange", () => {
  closeAllComboboxes();
});

/* ==========================================
   Trophy Voting
   ========================================== */
function pairingsToAssignments(pairings) {
  const assignments = {};
  (pairings || []).forEach((p) => {
    const receiverId = normalizeParticipantId(p.receiver_id);
    const trophyId = String(p.trophy_id || "").trim();
    if (!receiverId || !trophyId) return;
    if (!assignments[receiverId]) assignments[receiverId] = [];
    if (!assignments[receiverId].includes(trophyId)) {
      assignments[receiverId].push(trophyId);
    }
  });
  return assignments;
}

function assignmentsToPairings(assignments) {
  const pairings = [];
  Object.keys(assignments || {}).forEach((receiverId) => {
    (assignments[receiverId] || []).forEach((trophyId) => {
      pairings.push({ receiver_id: receiverId, trophy_id: trophyId });
    });
  });
  return pairings;
}

function getTrophyName(trophyId) {
  const trophy = state.trophy.trophies.find((t) => String(t.trophy_id) === String(trophyId));
  return trophy ? trophy.trophy_name || `Trophy ${trophyId}` : `Trophy ${trophyId}`;
}

function getIncompleteTrophyReceivers() {
  return state.trophy.teammates.filter(
    (id) => !(state.trophy.assignments[id] && state.trophy.assignments[id].length > 0)
  );
}

function isTrophyReadonly() {
  if (state.trophy.submissionStatus === "submitted" && !state.trophy.allowResubmit) {
    return true;
  }
  if (state.trophy.votingStatus !== "VOTING_OPEN") {
    return true;
  }
  return state.trophy.readonly;
}

async function apiTrophyBootstrap() {
  const params = new URLSearchParams({
    action: "trophy_bootstrap",
    participant_id: normalizeParticipantId(state.participantId),
    phone_number: normalizePhone(state.phoneNumber)
  });
  const response = await fetchWithTimeout(`${API_URL}?${params.toString()}`, {}, LOGIN_FETCH_TIMEOUT);
  return parseJsonResponse(response);
}

async function apiTrophyPost(action, pairings) {
  const response = await fetchWithTimeout(
    API_URL,
    {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action,
        participant_id: state.participantId,
        phone_number: state.phoneNumber,
        pairings
      })
    },
    SEND_FETCH_TIMEOUT
  );
  return parseJsonResponse(response);
}

async function apiAdminTrophyGet(action, extra = {}) {
  const params = buildAdminApiParams({ action, ...extra });
  const response = await fetchWithTimeout(
    `${API_URL}?${new URLSearchParams(params).toString()}`,
    {},
    LOGIN_FETCH_TIMEOUT
  );
  return parseJsonResponse(response);
}

async function apiAdminTrophyPost(action, extra = {}) {
  return apiAdminTrophyGet(action, extra);
}

function applyTrophyBootstrap(data) {
  state.trophy.loaded = true;
  state.trophy.votingStatus = data.voting_status || "DRAFT";
  state.trophy.allowResubmit = Boolean(data.allow_resubmit);
  state.trophy.submissionStatus = data.submission_status || null;
  state.trophy.submittedAt = data.submitted_at || "";
  state.trophy.trophies = data.trophies || [];
  state.trophy.teammates = data.teammates || [];
  state.trophy.groupId = data.group_id || "";
  state.trophy.assignments = pairingsToAssignments(data.pairings || []);
  state.trophy.readonly = isTrophyReadonly();
}

async function loadTrophyBootstrap() {
  if (!state.participantId || !state.phoneNumber || state.isAdmin) return;

  try {
    const data = await apiTrophyBootstrap();
    if (data.status === "success") {
      applyTrophyBootstrap(data);
      renderTrophyUI();
      return;
    }
    showToast(data.message || "無法載入 Trophy 配對", "error");
  } catch (err) {
    showToast("無法載入 Trophy 配對", "error");
    console.error("Trophy bootstrap error:", err);
  }
}

function renderTrophyUI() {
  const votingStatus = state.trophy.votingStatus;
  const submitted = state.trophy.submissionStatus === "submitted";
  const readonly = isTrophyReadonly();
  const incomplete = getIncompleteTrophyReceivers();

  trophyStatusBanner.classList.remove("hidden", "is-open", "is-closed", "is-done");
  if (submitted && !state.trophy.allowResubmit) {
    trophyStatusBanner.textContent = "您已完成 Trophy 配對";
    trophyStatusBanner.classList.add("is-done");
  } else if (votingStatus === "VOTING_OPEN") {
    trophyStatusBanner.textContent = "投票進行中 — 請為每位組員配對 Trophy";
    trophyStatusBanner.classList.add("is-open");
  } else if (votingStatus === "VOTING_CLOSED" || votingStatus === "CALCULATED" || votingStatus === "PUBLISHED") {
    trophyStatusBanner.textContent = "投票已結束";
    trophyStatusBanner.classList.add("is-closed");
  } else {
    trophyStatusBanner.textContent = "投票尚未開放";
    trophyStatusBanner.classList.add("is-closed");
  }

  const total = state.trophy.teammates.length;
  const completed = total - incomplete.length;
  trophyProgress.classList.toggle("hidden", total === 0);
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  trophyProgressFill.style.width = `${pct}%`;
  trophyProgressText.textContent = total > 0
    ? `已完成 ${completed} / ${total} 位組員`
    : "沒有同組成員";

  if (incomplete.length > 0 && !readonly) {
    trophyIncompleteWarning.classList.remove("hidden");
    trophyIncompleteWarning.textContent = `尚有成員未完成 Trophy 配對：${incomplete.join("、")}`;
  } else {
    trophyIncompleteWarning.classList.add("hidden");
  }

  if (state.trophy.teammates.length === 0) {
    trophyMatchingList.innerHTML = renderEmptyState("沒有同組成員", "請確認 Participants 工作表 group 設定", "search");
    trophyActions.classList.add("hidden");
    return;
  }

  trophyMatchingList.innerHTML = state.trophy.teammates.map((teammateId) => {
    const assigned = state.trophy.assignments[teammateId] || [];
    const isIncomplete = assigned.length === 0;
    const chips = assigned.map((trophyId) => `
      <span class="trophy-chip">
        ${escapeHtml(getTrophyName(trophyId))}
        ${readonly ? "" : `<button type="button" class="trophy-chip-remove" data-receiver="${escapeHtml(teammateId)}" data-trophy="${escapeHtml(trophyId)}" aria-label="移除">×</button>`}
      </span>`).join("");

    const options = state.trophy.trophies.map((t) => `
      <option value="${escapeHtml(String(t.trophy_id))}">${escapeHtml(t.trophy_name || `Trophy ${t.trophy_id}`)}</option>`).join("");

    return `
      <article class="trophy-teammate-card ${isIncomplete && !readonly ? "is-incomplete" : ""}" data-receiver="${escapeHtml(teammateId)}">
        <div class="trophy-teammate-header">
          <span class="trophy-teammate-name">${escapeHtml(formatParticipantLabel(teammateId))}</span>
          ${isIncomplete ? '<span class="pill-badge pill-badge--sky">待配對</span>' : ""}
        </div>
        <div class="trophy-chip-list">${chips || '<span class="panel-desc">尚未配對</span>'}</div>
        ${readonly ? "" : `
        <div class="trophy-add-row">
          <select class="trophy-add-select" data-receiver="${escapeHtml(teammateId)}" aria-label="選擇 Trophy">
            <option value="">選擇 Trophy…</option>
            ${options}
          </select>
          <button type="button" class="trophy-add-btn" data-receiver="${escapeHtml(teammateId)}">新增 Trophy</button>
        </div>`}
      </article>`;
  }).join("");

  trophyActions.classList.toggle("hidden", readonly);
  trophySubmitBtn.disabled = incomplete.length > 0;
}

trophyMatchingList.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".trophy-add-btn");
  if (addBtn) {
    const row = addBtn.closest(".trophy-teammate-card");
    const select = row ? row.querySelector(".trophy-add-select") : null;
    if (!select || !select.value) {
      showToast("請先選擇 Trophy", "warning");
      return;
    }
    addTrophyAssignment(addBtn.dataset.receiver, select.value);
    select.value = "";
    return;
  }

  const removeBtn = e.target.closest(".trophy-chip-remove");
  if (removeBtn) {
    removeTrophyAssignment(removeBtn.dataset.receiver, removeBtn.dataset.trophy);
  }
});

function addTrophyAssignment(receiverId, trophyId) {
  const rid = normalizeParticipantId(receiverId);
  const tid = String(trophyId).trim();
  if (!state.trophy.assignments[rid]) state.trophy.assignments[rid] = [];
  if (state.trophy.assignments[rid].includes(tid)) {
    showToast("此 Trophy 已配對", "warning");
    return;
  }
  state.trophy.assignments[rid].push(tid);
  renderTrophyUI();
}

function removeTrophyAssignment(receiverId, trophyId) {
  const rid = normalizeParticipantId(receiverId);
  const tid = String(trophyId).trim();
  state.trophy.assignments[rid] = (state.trophy.assignments[rid] || []).filter((id) => id !== tid);
  renderTrophyUI();
}

async function handleTrophySaveDraft() {
  const pairings = assignmentsToPairings(state.trophy.assignments);
  try {
    await runWithProgress(
      trophySaveDraftBtn,
      () => apiTrophyPost("trophy_save_draft", pairings),
      (data) => {
        if (data.status === "success") {
          state.trophy.submissionStatus = "draft";
          showToast("草稿已儲存", "success");
          return;
        }
        if (data.incomplete_receivers && data.incomplete_receivers.length) {
          showToast(`${data.message}：${data.incomplete_receivers.join("、")}`, "warning");
        } else {
          showToast(data.message || "儲存失敗", "error");
        }
      },
      "正在儲存草稿…",
      { buttonLoadingText: "儲存中…", useGlobalOverlay: false }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
  }
}

async function handleTrophySubmit() {
  const incomplete = getIncompleteTrophyReceivers();
  if (incomplete.length > 0) {
    showToast(`尚有成員未完成 Trophy 配對：${incomplete.join("、")}`, "warning");
    return;
  }

  const pairings = assignmentsToPairings(state.trophy.assignments);
  try {
    await runWithProgress(
      trophySubmitBtn,
      () => apiTrophyPost("trophy_submit", pairings),
      (data) => {
        if (data.status === "success") {
          state.trophy.submissionStatus = "submitted";
          state.trophy.readonly = isTrophyReadonly();
          renderTrophyUI();
          showToast("Trophy 配對已提交", "success");
          return;
        }
        if (data.incomplete_receivers && data.incomplete_receivers.length) {
          showToast(`${data.message}：${data.incomplete_receivers.join("、")}`, "warning");
        } else {
          showToast(data.message || "提交失敗", "error");
        }
      },
      "正在提交配對…",
      { buttonLoadingText: "提交中…", useGlobalOverlay: false }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
  }
}

function setAdminMode(mode) {
  document.querySelectorAll(".admin-mode-btn").forEach((btn) => {
    const active = btn.dataset.adminMode === mode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  adminMessagesPanel.classList.toggle("hidden", mode !== "messages");
  adminMessagesPanel.classList.toggle("active", mode === "messages");
  adminTrophyPanel.classList.toggle("hidden", mode !== "trophy");
  if (mode === "trophy") {
    loadAdminTrophyData();
  }
}

function setTrophyAdminView(view) {
  state.adminTrophy.view = view;
  document.querySelectorAll("[data-trophy-view]").forEach((btn) => {
    const active = btn.dataset.trophyView === view;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  document.getElementById("trophy-admin-audit").classList.toggle("active", view === "audit");
  document.getElementById("trophy-admin-audit").classList.toggle("hidden", view !== "audit");
  document.getElementById("trophy-admin-profiles").classList.toggle("active", view === "profiles");
  document.getElementById("trophy-admin-profiles").classList.toggle("hidden", view !== "profiles");
  document.getElementById("trophy-admin-celebration").classList.toggle("active", view === "celebration");
  document.getElementById("trophy-admin-celebration").classList.toggle("hidden", view !== "celebration");
}

function renderAdminTrophySummary(overview) {
  if (!overview) return;
  const stats = overview.stats || {};
  const statusLabels = {
    DRAFT: "草稿",
    VOTING_OPEN: "投票進行中",
    VOTING_CLOSED: "投票已關閉",
    CALCULATED: "已計算",
    PUBLISHED: "已發布"
  };
  const status = overview.voting_status || "DRAFT";
  trophyAdminVotingStatus.innerHTML = `${statusDot(status === "VOTING_OPEN" ? "success" : "generating")}目前狀態：${statusLabels[status] || status}`;
  trophyStatCompleted.textContent = `${stats.completed_count || 0} / ${stats.total_participants || 0}`;
  trophyStatVotes.textContent = String(stats.total_votes || 0);
  trophyStatTrophyCount.textContent = String(stats.trophy_count || 0);

  const withTrophy = overview.participants_with_trophy;
  const total = stats.total_participants || 0;
  if (overview.results_ready && typeof withTrophy === "number") {
    trophyStatWithTrophy.textContent = `${withTrophy} / ${total}`;
  } else {
    trophyStatWithTrophy.textContent = "—";
  }

  const pending = stats.pending_participants || [];
  if (pending.length > 0) {
    trophyPendingList.classList.remove("hidden");
    trophyPendingList.innerHTML = `<strong>尚未完成：</strong> ${pending.map(escapeHtml).join("、")}`;
  } else {
    trophyPendingList.classList.add("hidden");
    trophyPendingList.innerHTML = "";
  }
}

function renderTrophyAuditTable(votes) {
  const search = (trophyAuditSearch.value || "").trim().toUpperCase();
  const trophyFilter = trophyAuditFilterTrophy.value;

  let filtered = votes || [];
  if (search) {
    filtered = filtered.filter(
      (v) => v.sender_id.includes(search) || v.receiver_id.includes(search)
    );
  }
  if (trophyFilter) {
    filtered = filtered.filter((v) => String(v.trophy_id) === trophyFilter);
  }

  if (filtered.length === 0) {
    trophyAuditTableWrap.innerHTML = renderEmptyState("沒有投票記錄", "", "search");
    return;
  }

  trophyAuditTableWrap.innerHTML = `
    <table class="trophy-table">
      <thead><tr><th>Sender</th><th>Receiver</th><th>Trophy</th></tr></thead>
      <tbody>
        ${filtered.map((v) => `
          <tr>
            <td>${escapeHtml(v.sender_id)}</td>
            <td>${escapeHtml(v.receiver_id)}</td>
            <td>${escapeHtml(v.trophy_name || v.trophy_id)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function renderTrophyProfiles(profiles) {
  if (!profiles || profiles.length === 0) {
    trophyProfilesList.innerHTML = renderEmptyState("尚未計算結果", "請先完成投票並計算結果", "search");
    return;
  }

  trophyProfilesList.innerHTML = profiles.map((profile) => `
    <article class="trophy-profile-card">
      <p class="trophy-profile-name">${escapeHtml(formatParticipantLabel(profile.participant_id))}</p>
      ${(profile.trophies || []).map((t) => `
        <p class="trophy-profile-trophy">Trophy ${escapeHtml(String(t.trophy_id))} — ${escapeHtml(t.trophy_name || "")}
          <span class="pill-badge pill-badge--lavender">${t.award_source === "fallback" ? "fallback" : "round1"}</span>
        </p>`).join("")}
    </article>`).join("");
}

function renderTrophyCelebration(profiles) {
  if (!profiles || profiles.length === 0) {
    trophyCelebrationGrid.innerHTML = renderEmptyState("尚未計算結果", "", "search");
    return;
  }

  trophyCelebrationGrid.innerHTML = profiles.map((profile) => `
    <article class="trophy-celebration-card">
      <p class="trophy-celebration-name">${escapeHtml(profile.participant_id)}</p>
      ${(profile.trophies || []).map((t) => `
        <p class="trophy-celebration-item">Trophy ${escapeHtml(String(t.trophy_id))}<br>${escapeHtml(t.trophy_name || "")}</p>`).join("")}
    </article>`).join("");
}

function populateTrophyAuditFilter(trophies) {
  const current = trophyAuditFilterTrophy.value;
  trophyAuditFilterTrophy.innerHTML = '<option value="">全部 Trophy</option>' +
    (trophies || []).map((t) => `
      <option value="${escapeHtml(String(t.trophy_id))}">${escapeHtml(t.trophy_name || `Trophy ${t.trophy_id}`)}</option>`).join("");
  if (current) trophyAuditFilterTrophy.value = current;
}

async function loadAdminTrophyData(options = {}) {
  if (!state.isAdmin) return;
  const { silent = false } = options;

  if (trophyAdminVotingStatus) {
    trophyAdminVotingStatus.innerHTML = `${statusDot("generating")}載入中…`;
  }

  try {
    const overview = await apiAdminTrophyGet("admin_trophy_overview");

    if (overview.status !== "success") {
      let msg = overview.message || "無法載入投票概覽";
      if (state.apiVersion !== null && state.apiVersion < REQUIRED_TROPHY_API_VERSION) {
        msg = `後端版本過舊（v${state.apiVersion}），請在 Google Apps Script 重新部署 Code.gs v${REQUIRED_TROPHY_API_VERSION}`;
      } else if (msg === "管理員身份驗證失敗") {
        msg = `後端尚未支援 Trophy 管理 API，請重新部署 Code.gs v${REQUIRED_TROPHY_API_VERSION}`;
      }
      if (trophyAdminVotingStatus) {
        trophyAdminVotingStatus.innerHTML = `${statusDot("notice")}${escapeHtml(msg)}`;
      }
      if (!silent) showToast(msg, "error");
      return;
    }

    state.adminTrophy.overview = overview;
    renderAdminTrophySummary(overview);

    const [audit, results] = await Promise.all([
      apiAdminTrophyGet("admin_trophy_audit"),
      apiAdminTrophyGet("admin_trophy_results")
    ]);

    if (audit.status === "success") {
      state.adminTrophy.auditVotes = audit.votes || [];
      const trophySet = new Map();
      (audit.votes || []).forEach((v) => {
        if (v.trophy_id) {
          trophySet.set(String(v.trophy_id), v.trophy_name || `Trophy ${v.trophy_id}`);
        }
      });
      populateTrophyAuditFilter(
        Array.from(trophySet.entries()).map(([id, name]) => ({ trophy_id: id, trophy_name: name }))
      );
      renderTrophyAuditTable(state.adminTrophy.auditVotes);
    } else if (!silent) {
      showToast(audit.message || "無法載入投票清單", "warning");
    }

    if (results.status === "success") {
      state.adminTrophy.profiles = results.profiles || [];
      renderTrophyProfiles(state.adminTrophy.profiles);
      renderTrophyCelebration(state.adminTrophy.profiles);
      if (typeof results.participants_with_trophy === "number" && trophyStatWithTrophy) {
        const total = results.total_participants || overview.stats?.total_participants || 0;
        trophyStatWithTrophy.textContent = `${results.participants_with_trophy} / ${total}`;
      }
    } else if (!silent) {
      showToast(results.message || "尚未有計算結果", "info");
    }
  } catch (err) {
    const msg = err.message || "無法載入 Trophy 管理資料";
    if (trophyAdminVotingStatus) {
      trophyAdminVotingStatus.innerHTML = `${statusDot("notice")}連線失敗，請確認後端已部署 v13`;
    }
    if (!silent) showToast(msg, "error");
    console.error("Admin trophy load error:", err);
  }
}

async function handleAdminSetVotingStatus(votingStatus) {
  const buttonMap = {
    VOTING_OPEN: trophyOpenVotingBtn,
    VOTING_CLOSED: trophyCloseVotingBtn,
    PUBLISHED: trophyPublishBtn
  };
  const button = buttonMap[votingStatus] || null;

  try {
    const data = button
      ? await runWithProgress(
          button,
          () => apiAdminTrophyGet("admin_set_voting_status", { voting_status: votingStatus }),
          null,
          "正在更新…",
          { buttonLoadingText: "處理中…", useGlobalOverlay: false }
        )
      : await apiAdminTrophyGet("admin_set_voting_status", { voting_status: votingStatus });

    if (data.status === "success") {
      showToast(data.message || "狀態已更新", "success");
      loadAdminTrophyData();
      return;
    }
    if (data.pending_participants) {
      showToast(`${data.message}：${data.pending_participants.join("、")}`, "warning");
    } else {
      showToast(data.message || "設定失敗", "error");
    }
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
  }
}

async function handleAdminCalculateTrophy() {
  try {
    const data = await runWithProgress(
      trophyCalculateBtn,
      () => apiAdminTrophyGet("admin_calculate_trophy_results"),
      null,
      "正在計算…",
      { buttonLoadingText: "計算中…", useGlobalOverlay: false }
    );

    if (data.status === "success") {
      showToast("Trophy 結果已計算", "success");
      loadAdminTrophyData();
      setTrophyAdminView("celebration");
      return;
    }
    if (data.pending_participants && data.pending_participants.length) {
      showToast(`投票未完成：${data.pending_participants.join("、")}`, "warning");
    } else {
      showToast(data.message || "計算失敗", "error");
    }
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
  }
}

trophySaveDraftBtn.addEventListener("click", handleTrophySaveDraft);
trophySubmitBtn.addEventListener("click", handleTrophySubmit);

document.querySelectorAll(".admin-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => setAdminMode(btn.dataset.adminMode));
});

document.querySelectorAll("[data-trophy-view]").forEach((btn) => {
  btn.addEventListener("click", () => setTrophyAdminView(btn.dataset.trophyView));
});

trophyOpenVotingBtn.addEventListener("click", () => handleAdminSetVotingStatus("VOTING_OPEN"));
trophyCloseVotingBtn.addEventListener("click", () => handleAdminSetVotingStatus("VOTING_CLOSED"));
trophyCalculateBtn.addEventListener("click", handleAdminCalculateTrophy);
trophyPublishBtn.addEventListener("click", () => handleAdminSetVotingStatus("PUBLISHED"));

trophyAuditSearch.addEventListener("input", () => {
  renderTrophyAuditTable(state.adminTrophy.auditVotes);
});
trophyAuditFilterTrophy.addEventListener("change", () => {
  renderTrophyAuditTable(state.adminTrophy.auditVotes);
});

/* ==========================================
   Init
   ========================================== */
async function initApp() {
  validateMessageInput();
  setParticipantInputReady("請選擇或輸入編號 (如 1A, 3C...)");
  warmUpApi();

  const bootstrapOk = await loadBootstrap();
  if (!bootstrapOk) {
    await Promise.all([
      loadParticipants(),
      loadMessagingStatus({ silent: true })
    ]);
  }
}

initApp();
