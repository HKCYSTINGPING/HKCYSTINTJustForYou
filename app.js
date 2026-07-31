/* ==========================================
   Configuration
   ========================================== */
const API_URL = "https://script.google.com/macros/s/AKfycbzu1fly9MZY_OcuZug9oLqjZmkPtWK15QHUHN7bcfKSTz6xXh4QEF-tU3ApolWxDnPOlg/exec";

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
const ADMIN_DELETED_REASON = "此留言已被管理員撤回，未能送達接收者（管理員決定）";

const state = {
  participantId: null,
  phoneNumber: null,
  participants: [],
  inboxMessages: [],
  sentMessages: [],
  sentLoaded: false,
  messagingOpen: true,
  messagingStatusLoaded: false,
  monitorAuthenticated: false,
  adminPassword: null,
  monitorMessages: [],
  monitorViewFilter: "all"
};

/* ==========================================
   DOM Elements
   ========================================== */
const loginScreen = document.getElementById("login-screen");
const dashboardScreen = document.getElementById("dashboard-screen");
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
  emptyNoList: "尚無參加者名單",
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
  emptyNoList: "尚無接收對象名單",
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
const settingsBtn = document.getElementById("settings-btn");
const settingsModal = document.getElementById("settings-modal");
const settingsBackdrop = document.getElementById("settings-backdrop");
const settingsCloseModal = document.getElementById("settings-close-modal");
const settingsStatus = document.getElementById("settings-status");
const settingsPassword = document.getElementById("settings-password");
const settingsEnableBtn = document.getElementById("settings-enable-btn");
const settingsDisableBtn = document.getElementById("settings-disable-btn");
const messagingClosedBanner = document.getElementById("messaging-closed-banner");
const monitorBtn = document.getElementById("monitor-btn");
const monitorScreen = document.getElementById("monitor-screen");
const monitorAuthPanel = document.getElementById("monitor-auth-panel");
const monitorContent = document.getElementById("monitor-content");
const monitorPassword = document.getElementById("monitor-password");
const monitorLoginBtn = document.getElementById("monitor-login-btn");
const monitorCloseBtn = document.getElementById("monitor-close-btn");
const monitorList = document.getElementById("monitor-list");
const monitorLastUpdated = document.getElementById("monitor-last-updated");
const monitorMessageCount = document.getElementById("monitor-message-count");
const monitorStatusText = document.getElementById("monitor-status-text");

let monitorWatchActive = false;
let monitorWatchController = null;
let monitorLoading = false;

let loadingCount = 0;

/* ==========================================
   Utility Functions
   ========================================== */
function showToast(message, type = "info") {
  const icons = { success: "✅", error: "❌", warning: "⚠️", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = `${icons[type] || "ℹ️"} ${message}`;
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
    const label = button.querySelector(".btn-progress-label");
    if (bar) bar.style.width = `${percent}%`;
    if (label) {
      label.style.display = "inline";
      label.textContent = `${Math.round(percent)}%`;
    }
  }
  loadingOverlayPercent.textContent = `${Math.round(percent)}%`;
}

function resetProgressUI(button, useGlobalOverlay = true) {
  if (button) {
    const bar = button.querySelector(".btn-progress-bar");
    const label = button.querySelector(".btn-progress-label");
    button.classList.remove("loading");
    button.disabled = false;
    if (bar) bar.style.width = "0%";
    if (label) {
      label.style.display = "none";
      label.textContent = "0%";
    }
  }
  if (useGlobalOverlay) {
    setGlobalLoading(false);
  }
}

/**
 * Runs an async task with progress synced to the actual request.
 * Progress eases to 90% while waiting, hits 100% when done,
 * runs onComplete immediately at 100%, then cleans up.
 */
async function runWithProgress(button, taskFn, onComplete, loadingText = "⏳ 載入中...", options = {}) {
  const useGlobalOverlay = options.useGlobalOverlay !== false;

  if (useGlobalOverlay) {
    loadingOverlayText.textContent = loadingText;
  }
  if (button) {
    button.classList.add("loading");
    button.disabled = true;
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
    if (useGlobalOverlay) {
      updateProgressUI(button, progress);
    } else if (button) {
      const bar = button.querySelector(".btn-progress-bar");
      const label = button.querySelector(".btn-progress-label");
      if (bar) bar.style.width = `${progress}%`;
      if (label) {
        label.style.display = "inline";
        label.textContent = `${Math.round(progress)}%`;
      }
    }
  }, 40);

  try {
    const result = await taskFn();
    finished = true;
    clearInterval(timer);

    progress = 100;
    if (useGlobalOverlay) {
      updateProgressUI(button, 100);
    } else if (button) {
      const bar = button.querySelector(".btn-progress-bar");
      const label = button.querySelector(".btn-progress-label");
      if (bar) bar.style.width = "100%";
      if (label) {
        label.style.display = "inline";
        label.textContent = "100%";
      }
    }

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

function applyParticipantsList(participants) {
  state.participants = participants.map(normalizeParticipantId);
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
    participant_id: participantId,
    phone_number: phoneNumber,
    fetch_type: fetchType
  });

  const response = await fetchWithTimeout(`${API_URL}?${params.toString()}`, {}, LOGIN_FETCH_TIMEOUT);
  return parseJsonResponse(response);
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

async function apiSetMessagingStatus(password, messagingStatus) {
  return apiAdminRequest(
    {
      action: "set_messaging_status",
      password,
      messaging_status: messagingStatus
    },
    {
      action: "get_messaging_status",
      admin: "set_status",
      password,
      messaging_status: messagingStatus
    },
    (data) => data.status === "success" && !!data.messaging_status
  );
}

async function apiAdminListMessages(password) {
  const data = await apiAdminRequest(
    { action: "admin_list_messages", password },
    { action: "get_messaging_status", admin: "list_messages", password },
    (result) => result.status === "success" && Array.isArray(result.messages)
  );

  if (data.status === "success" && !Array.isArray(data.messages)) {
    return { status: "error", message: "BACKEND_OUTDATED" };
  }

  return data;
}

async function apiAdminWatchMessages(password, revision, options = {}) {
  const params = {
    action: "admin_watch_messages",
    password,
    revision: revision || ""
  };
  const fallbackParams = {
    action: "get_messaging_status",
    admin: "watch_messages",
    password,
    revision: revision || ""
  };
  const fetchOptions = options.signal ? { signal: options.signal } : {};

  let data = await apiAdminGet(params, MONITOR_WATCH_TIMEOUT, fetchOptions);
  const isValidWatch = (result) =>
    result.status === "success" && Array.isArray(result.messages) && typeof result.changed === "boolean";

  if (isValidWatch(data)) return data;

  if (isLegacyBackendError(data) || needsAdminFallback(data, isValidWatch)) {
    data = await apiAdminGet(fallbackParams, MONITOR_WATCH_TIMEOUT, fetchOptions);
    if (isValidWatch(data)) return data;
  }

  // 舊版後端：退回一次性載入，由前端比對 revision
  if (data.status !== "success" || typeof data.changed !== "boolean") {
    const listData = await apiAdminListMessages(password);
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

async function apiAdminDeleteMessage(password, messageId) {
  return apiAdminRequest(
    {
      action: "admin_delete_message",
      password,
      message_id: messageId
    },
    {
      action: "get_messaging_status",
      admin: "delete_message",
      password,
      message_id: messageId
    },
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
  return String(msg?.status || "").trim().toLowerCase() === "deleted";
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

  if (settingsStatus) {
    settingsStatus.textContent = open ? "目前狀態：✅ 開通留言" : "目前狀態：🚫 關閉留言";
    settingsStatus.classList.toggle("is-open", open);
    settingsStatus.classList.toggle("is-closed", !open);
  }

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

function openSettingsModal() {
  if (!isAdminAccessAllowed()) {
    showToast("管理員功能僅可在登入頁使用，請先登出", "warning");
    return;
  }

  settingsModal.classList.remove("hidden");
  settingsModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  settingsPassword.value = "";
  loadMessagingStatus({ silent: true });
  settingsPassword.focus();
}

function closeSettingsModal() {
  settingsModal.classList.add("hidden");
  settingsModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  settingsPassword.value = "";
}

async function handleSetMessagingStatus(targetStatus) {
  const password = settingsPassword.value.trim();

  if (!password) {
    showToast("請輸入管理員密碼", "warning");
    settingsPassword.focus();
    return;
  }

  const button = targetStatus === "OPEN" ? settingsEnableBtn : settingsDisableBtn;
  const loadingText = targetStatus === "OPEN" ? "✅ 開通留言中..." : "🚫 關閉留言中...";

  try {
    await runWithProgress(
      button,
      () => apiSetMessagingStatus(password, targetStatus),
      (data) => {
        if (data.status === "success") {
          applyMessagingStatus(data.messaging_status);
          settingsPassword.value = "";
          showToast(
            data.message || (targetStatus === "OPEN" ? "留言功能已開通" : "留言功能已關閉"),
            "success"
          );
          closeSettingsModal();
          return;
        }

        showToast(data.message || "設定失敗", "error");
      },
      loadingText
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Set messaging status error:", err);
  }
}

function isAdminAccessAllowed() {
  return loginScreen && !loginScreen.classList.contains("hidden");
}

function updateAdminButtonsVisibility() {
  const allowAdmin = isAdminAccessAllowed();
  monitorBtn.classList.toggle("hidden", !allowAdmin);
  settingsBtn.classList.toggle("hidden", !allowAdmin);
}

function clearAdminSession() {
  state.monitorAuthenticated = false;
  state.adminPassword = null;
  state.monitorMessages = [];
  state.monitorViewFilter = "all";
  stopMonitorWatch();
  monitorPassword.value = "";
  showMonitorAuth();
  setMonitorViewFilter("all");
  monitorList.innerHTML = `
    <div class="empty-state">
      <span class="empty-emoji">👁️</span>
      <p>目前沒有留言</p>
    </div>`;
  monitorMessageCount.textContent = "0";
  monitorLastUpdated.textContent = "—";
}

function openMonitorScreen() {
  if (!isAdminAccessAllowed()) {
    showToast("管理員監察僅可在登入頁使用，請先登出", "warning");
    return;
  }

  monitorScreen.classList.remove("hidden");
  monitorScreen.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");

  if (state.monitorAuthenticated) {
    showMonitorDashboard();
    startMonitorWatch();
  } else {
    showMonitorAuth();
  }
}

function closeMonitorScreen() {
  monitorScreen.classList.add("hidden");
  monitorScreen.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  clearAdminSession();
}

function showMonitorAuth() {
  monitorAuthPanel.classList.remove("hidden");
  monitorContent.classList.add("hidden");
  monitorStatusText.innerHTML = "請先完成管理員驗證";
  monitorPassword.focus();
}

function showMonitorDashboard() {
  monitorAuthPanel.classList.add("hidden");
  monitorContent.classList.remove("hidden");
  monitorStatusText.innerHTML = `
    <span class="monitor-live-badge">
      <span class="live-dot" aria-hidden="true"></span>
      偵測到新留言即時顯示（約 1 秒內）
    </span>`;
}

function getMonitorRevision(messages = state.monitorMessages) {
  return messages
    .map((msg) => `${String(msg.message_id || "")}:${String(msg.status || "active")}`)
    .sort()
    .join("\u0001");
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
  const merged = mergeMonitorMessages(messages || []);
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

async function handleMonitorLogin() {
  const password = monitorPassword.value.trim();

  if (!password) {
    showToast("請輸入管理員密碼", "warning");
    monitorPassword.focus();
    return;
  }

  try {
    await runWithProgress(
      monitorLoginBtn,
      () => apiAdminListMessages(password),
      (data) => {
        if (data.status === "success") {
          state.monitorAuthenticated = true;
          state.adminPassword = password;
          applyMonitorMessages(data.messages || [], { highlightNew: false });
          monitorPassword.value = "";
          showMonitorDashboard();
          startMonitorWatch();
          showToast("已进入管理員監察頁面", "success");
          return;
        }

        showToast(getAdminAuthErrorMessage(data), "error");
      },
      "🔐 驗證管理員中..."
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Monitor login error:", err);
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
  state.monitorViewFilter = filter;

  document.querySelectorAll(".monitor-filter-btn").forEach((btn) => {
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
    monitorList.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">👁️</span>
        <p>目前沒有留言</p>
      </div>`;
    return;
  }

  if (visibleMessages.length === 0) {
    const emptyText = {
      active: "目前沒有已送出的留言",
      deleted: "目前沒有已刪除的留言",
      all: "目前沒有留言"
    }[state.monitorViewFilter] || "目前沒有留言";

    monitorList.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">🔍</span>
        <p>${emptyText}</p>
      </div>`;
    return;
  }

  monitorList.innerHTML = visibleMessages.map((msg) => {
    const deleted = isMessageDeleted(msg);
    const deletedNotice = msg.deleted_reason || ADMIN_DELETED_REASON;

    return `
    <article class="message-card monitor-card ${deleted ? "deleted unsent" : ""} ${newMessageIds.has(msg.message_id) ? "monitor-card-new" : ""}" data-message-id="${escapeHtml(msg.message_id)}">
      <div class="message-card-header">
        <div class="monitor-meta">
          <span class="monitor-route">📤 ${escapeHtml(formatParticipantLabel(msg.sender_id))} → 🎯 ${escapeHtml(formatParticipantLabel(msg.receiver_id))}</span>
          <span class="message-meta">🕐 ${escapeHtml(msg.created_at || "未知時間")}</span>
          ${deleted ? '<span class="message-unsent-badge">已撤回</span>' : ""}
        </div>
        ${deleted ? "" : `
        <button
          type="button"
          class="btn btn-secondary monitor-delete-btn btn-progress"
          data-message-id="${escapeHtml(msg.message_id)}"
        ><span class="btn-text">🗑️ 刪除留言</span><span class="btn-progress-bar" aria-hidden="true"></span><span class="btn-progress-label" aria-hidden="true">0%</span></button>`}
      </div>
      ${deleted ? `
        <p class="message-deleted-notice">🚫 ${escapeHtml(deletedNotice)}</p>
        ${msg.deleted_at ? `<p class="message-deleted-time">撤回時間：${escapeHtml(msg.deleted_at)}</p>` : ""}
      ` : ""}
      <p class="message-content ${deleted ? "is-deleted" : ""}">${escapeHtml(msg.content)}</p>
    </article>`;
  }).join("");

  monitorList.querySelectorAll(".monitor-delete-btn").forEach((btn) => {
    btn.addEventListener("click", () => handleAdminDeleteMessage(btn.dataset.messageId, btn));
  });
}

async function loadMonitorMessages(options = {}) {
  const { silent = false } = options;

  if (!state.monitorAuthenticated || !state.adminPassword) return false;
  if (monitorLoading) return false;

  monitorLoading = true;

  try {
    const data = await apiAdminListMessages(state.adminPassword);

    if (data.status === "success") {
      applyMonitorMessages(data.messages || [], { highlightNew: !silent });
      return true;
    }

    if (data.message === "密碼錯誤") {
      state.monitorAuthenticated = false;
      state.adminPassword = null;
      stopMonitorWatch();
      showMonitorAuth();
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

async function handleAdminDeleteMessage(messageId, button) {
  if (!state.adminPassword || !messageId) return;

  const confirmed = window.confirm("確定要刪除此留言嗎？發送者將會在「送出的留言」看到已被管理員刪除。");
  if (!confirmed) return;

  const deleteBtn = button;
  stopMonitorWatch();

  try {
    await runWithProgress(
      deleteBtn,
      () => apiAdminDeleteMessage(state.adminPassword, messageId),
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

          if (state.participantId) {
            await loadSentMessages({ silent: true });
          }
          return;
        }

        showToast(data.message || "刪除失敗", "error");
      },
      "🗑️ 刪除留言中...",
      { useGlobalOverlay: false }
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試", "error");
    console.error("Admin delete message error:", err);
  } finally {
    if (
      state.monitorAuthenticated &&
      !monitorScreen.classList.contains("hidden")
    ) {
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
  if (!monitorWatchActive || !state.monitorAuthenticated || !state.adminPassword) {
    return;
  }

  if (monitorScreen.classList.contains("hidden")) {
    return;
  }

  if (document.hidden) {
    return;
  }

  monitorWatchController = new AbortController();
  const revision = getMonitorRevision();

  try {
    const data = await apiAdminWatchMessages(state.adminPassword, revision, {
      signal: monitorWatchController.signal
    });

    if (!monitorWatchActive || !state.monitorAuthenticated) {
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

    if (data.message === "密碼錯誤") {
      state.monitorAuthenticated = false;
      state.adminPassword = null;
      stopMonitorWatch();
      showMonitorAuth();
      return;
    }

    window.setTimeout(runMonitorWatchLoop, MONITOR_WATCH_RETRY_MS);
  } catch (err) {
    if (err.name === "AbortError") {
      return;
    }

    console.warn("Monitor watch error:", err);
    if (monitorWatchActive && state.monitorAuthenticated) {
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
  document.body.classList.remove("participant-active");
  closeMonitorScreen();
  closeSettingsModal();
  updateAdminButtonsVisibility();
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  document.body.classList.add("participant-active");
  closeMonitorScreen();
  closeSettingsModal();
  updateAdminButtonsVisibility();
  userBadge.textContent = `🎫 目前身分：${formatParticipantLabel(state.participantId)}`;
  renderComboboxPicker(receiverCombobox);
  renderSentMessages();
  updateInboxBadge();
  if (!state.messagingStatusLoaded) {
    loadMessagingStatus({ silent: true });
  }
}

function getFilteredParticipants(filterText = "", excludeId = null) {
  const query = normalizeParticipantId(filterText);
  let list = state.participants.filter(
    (id) => normalizeParticipantId(id) !== normalizeParticipantId(excludeId)
  );

  if (!query) return list;

  return list.filter((id) =>
    id.includes(query) || formatParticipantLabel(id).includes(query)
  );
}

function renderComboboxPicker(combobox, filterText = combobox.input.value) {
  const filtered = getFilteredParticipants(filterText, combobox.getExcludeId());
  const currentId = normalizeParticipantId(combobox.input.value);

  combobox.list.innerHTML = "";

  if (filtered.length === 0) {
    combobox.list.innerHTML = `
      <p class="participant-picker-empty">
        ${state.participants.length === 0 ? combobox.emptyNoList : combobox.emptyNoMatch}
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
    combobox.input.value = normalizeParticipantId(combobox.input.value);
    if (!combobox.picker.classList.contains("hidden")) {
      renderComboboxPicker(combobox);
    }
    updateComboboxClearButton(combobox);
    combobox.onSelect();
  });

  combobox.input.addEventListener("focus", () => {
    warmUpApi();
    if (!combobox.input.disabled && state.participants.length > 0) {
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
}

async function loadBootstrap() {
  try {
    const data = await apiFetchBootstrap();
    if (data.status !== "success") return false;

    if (Array.isArray(data.participants)) {
      if (data.participants.length > 0) {
        applyParticipantsList(data.participants);
      } else {
        setParticipantInputReady(
          "請手動輸入編號 (如 1A)",
          "⚠️ Participants 工作表沒有 participant_id 資料",
          true
        );
      }
    } else {
      return false;
    }

    if (data.messaging_status) {
      applyMessagingStatus(data.messaging_status);
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
    "⏳ 名單載入中，可先手動輸入編號"
  );
  closeAllComboboxes();

  try {
    const data = await apiFetchParticipants();

    if (data.status === "success" && Array.isArray(data.participants) && data.participants.length > 0) {
      applyParticipantsList(data.participants);
      return;
    }

    if (data.status === "success" && Array.isArray(data.participants) && data.participants.length === 0) {
      setParticipantInputReady(
        "請手動輸入編號 (如 1A)",
        "⚠️ Participants 工作表沒有 participant_id 資料",
        true
      );
      return;
    }

    setParticipantInputReady(
      "請手動輸入編號 (如 1A)",
      "⚠️ 無法從 Sheet 載入名單，請手動輸入",
      true
    );
    showToast(data.message || "無法載入參加者名單", "warning");
  } catch (err) {
    const isTimeout = err.name === "AbortError";
    setParticipantInputReady(
      "請手動輸入編號 (如 1A)",
      isTimeout ? "⚠️ 載入逾時，請手動輸入或重新整理" : "⚠️ 連線失敗，請手動輸入編號",
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
    badWordWarning.textContent = `⚠️ 偵測到不當用語，請修正後再發送`;
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
    inboxList.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">📭</span>
        <p>目前沒有留言</p>
      </div>`;
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
          <span>🕐 ${escapeHtml(msg.created_at || "未知時間")}</span>
          ${isUnread ? '<span class="message-badge">NEW</span>' : ""}
        </div>
        <p class="message-content">${escapeHtml(msg.content)}</p>
      </article>`;
  }).join("");
}

function renderSentMessages() {
  if (state.sentMessages.length === 0) {
    sentList.innerHTML = `
      <div class="empty-state">
        <span class="empty-emoji">${state.sentLoaded ? "📤" : "🔄"}</span>
        <p>${state.sentLoaded ? "尚未發送任何留言" : "載入送出的留言中..."}</p>
      </div>`;
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
          <span class="message-receiver">🎯 接收對象：${escapeHtml(formatParticipantLabel(msg.receiver_id))}</span>
          ${deleted ? '<span class="message-unsent-badge">管理員已撤回</span>' : ""}
        </div>
        <span class="message-meta">🕐 ${escapeHtml(msg.created_at || "未知時間")}</span>
      </div>
      ${deleted ? `
        <p class="message-deleted-notice">🚫 ${escapeHtml(deletedNotice)}</p>
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
        showToast("📤 送出的留言已更新！", "success");
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
          state.participantId = participantId;
          state.phoneNumber = phoneNumber;
          state.sentMessages = [];
          state.sentLoaded = false;
          applyInboxFromApi(data);
          saveInboxCache(participantId, state.inboxMessages);
          saveSession();
          showDashboard();
          renderInbox();
          showToast(`🎉 歡迎，${formatParticipantLabel(participantId)}！`, "success");
        } else {
          showToast(data.message || "身份驗證失敗", "error");
        }
      },
      "🔐 驗證身分中..."
    );
  } catch (err) {
    showToast("連線失敗，請稍後再試 🌐", "error");
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
          showToast("📥 收件箱已更新！", "success");
        } else {
          showToast(data.message || "同步失敗", "error");
        }
      },
      "📥 同步收件箱..."
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
          showToast("📤 送出的留言已更新！", "success");
        } else {
          showToast("同步失敗", "error");
        }
      },
      "📤 同步送出的留言..."
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
    showToast("留言包含不當用語，請修正 🚫", "error");
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
          showToast("📨 留言已成功發送！", "success");
        } else {
          if (data.messaging_status === "CLOSE" || (data.message && data.message.includes("關閉"))) {
            applyMessagingStatus("CLOSE");
          }
          showToast(data.message || "發送失敗", "error");
        }
      },
      "📨 發送留言中..."
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
  const previousParticipantId = state.participantId;
  state.participantId = null;
  state.phoneNumber = null;
  state.inboxMessages = [];
  state.sentMessages = [];
  state.sentLoaded = false;
  state.messagingStatusLoaded = false;
  clearSession();
  clearInboxCache(previousParticipantId);
  closeAllComboboxes();
  loginForm.reset();
  sendForm.reset();
  updateComboboxClearButton(participantCombobox);
  updateComboboxClearButton(receiverCombobox);
  validateMessageInput();
  showLogin();
  showToast("👋 已成功登出", "info");
}

/* ==========================================
   Event Listeners
   ========================================== */
document.getElementById("phone-number").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "");
});

document.getElementById("phone-number").addEventListener("focus", () => {
  warmUpApi();
});

loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", handleLogout);
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
    if (!settingsModal.classList.contains("hidden")) {
      closeSettingsModal();
    }
    if (!monitorScreen.classList.contains("hidden")) {
      closeMonitorScreen();
    }
  }
});

settingsBtn.addEventListener("click", openSettingsModal);
settingsBackdrop.addEventListener("click", closeSettingsModal);
settingsCloseModal.addEventListener("click", closeSettingsModal);
settingsEnableBtn.addEventListener("click", () => handleSetMessagingStatus("OPEN"));
settingsDisableBtn.addEventListener("click", () => handleSetMessagingStatus("CLOSE"));

monitorBtn.addEventListener("click", openMonitorScreen);
monitorCloseBtn.addEventListener("click", closeMonitorScreen);
monitorLoginBtn.addEventListener("click", handleMonitorLogin);
document.querySelectorAll(".monitor-filter-btn").forEach((btn) => {
  btn.addEventListener("click", () => setMonitorViewFilter(btn.dataset.monitorFilter));
});
monitorPassword.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    handleMonitorLogin();
  }
});

document.addEventListener("visibilitychange", () => {
  if (
    !document.hidden &&
    !monitorScreen.classList.contains("hidden") &&
    state.monitorAuthenticated
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
   Init
   ========================================== */
async function initApp() {
  validateMessageInput();
  updateAdminButtonsVisibility();
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
