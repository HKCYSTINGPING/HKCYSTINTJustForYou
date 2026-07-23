/* ==========================================
   Configuration
   ========================================== */
const API_URL = "https://script.google.com/macros/s/AKfycbzVoAPU3Ntlm6n_Z9XFVOJFo9Wy5wHUBWQSj6i1v6WPoQkS4sJJT9QHLhnjO5Ih5FxpqQ/exec";

const ALL_PARTICIPANTS = [
  "1A", "2A", "3A", "4A", "5A", "6A",
  "1B", "2B", "3B", "4B", "5B", "6B",
  "1C", "2C", "3C", "4C", "5C", "6C",
  "1D", "2D", "3D", "4D", "5D", "6D",
  "1E", "2E", "3E", "4E", "5E", "6E",
  "1F", "2F", "3F", "4F", "5F", "6F",
  "1G", "2G", "3G", "4G", "5G", "6G",
  "1H", "2H", "3H", "4H", "5H", "6H"
];

const MAX_CHARS = 300;

const BAD_WORDS_LIST = [
  "小你老母", "吊你老母", "小你老味", "你老味", "你老母", "老.母", "老 母", "老母係街市賣鴨蛋",
  "含能", "臭化西", "臭西", "傻西", "凸你", "屌.你", "屌 你", "屌你", "吊你", "小你",
  "九兩菜", "收皮啦", "收皮", "把撚", "條撚", "賓周", "賓.周", "仆街", "仆.街", "卜街", "POP街",
  "diu 9", "sub 9", "sub9", "chi lan sin", "撚樣", "能樣", "柒頭", "笨七", "鳩登", "膠登",
  "契弟", "ass hole", "asshole", "A S S", "on lun 7 7", "臭爛袋", "挑那星", "陷家剷", "陷家",
  "吊夠", "吊 夠", "戇尻尻", "戇尻", "戇-尻", "戇 尻", "on 99", "ON 九", "on 9", "on.9", "on9",
  "ｏｎ ９９", "戇鳩", "戇.鳩", "撚屌鳩", "d i u", "DIU", "fxxk", "fuxk", "fxck", "suck", "bitch",
  "撚", "屌", "尻", "鳩", "柒", "仆", "𨳒", "𨳊", "𨳍", "𨳯",
  "&#23628;", "&#x5C4C;", "&#x5C3B;", "&#23611;", "&#x649A;", "&#25754;"
];

/* ==========================================
   State
   ========================================== */
const state = {
  participantId: null,
  phoneNumber: null,
  inboxMessages: [],
  sentMessages: [],
  sentLoaded: false
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
const receiverSelect = document.getElementById("receiver-id");
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

    await new Promise((r) => setTimeout(r, 80));
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
}

function applySentFromApi(data) {
  state.sentMessages = data.sent_messages || [];
  state.sentLoaded = true;
}

function saveSession() {
  sessionStorage.setItem("ams_participant_id", state.participantId);
  sessionStorage.setItem("ams_phone_number", state.phoneNumber);
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
async function apiFetchMessages(participantId, phoneNumber, fetchType = "inbox") {
  const params = new URLSearchParams({
    participant_id: participantId,
    phone_number: phoneNumber,
    fetch_type: fetchType
  });

  const response = await fetch(`${API_URL}?${params.toString()}`);
  return response.json();
}

async function apiSendMessage(senderId, phoneNumber, receiverId, content) {
  const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify({
      sender_id: senderId,
      phone_number: phoneNumber,
      receiver_id: receiverId,
      content: content
    })
  });
  return response.json();
}

/* ==========================================
   UI: Login & Dashboard
   ========================================== */
function showLogin() {
  loginScreen.classList.remove("hidden");
  dashboardScreen.classList.add("hidden");
}

function showDashboard() {
  loginScreen.classList.add("hidden");
  dashboardScreen.classList.remove("hidden");
  userBadge.textContent = `🎫 目前身分：${formatParticipantLabel(state.participantId)}`;
  populateReceiverSelect();
  renderSentMessages();
  updateInboxBadge();
}

function populateReceiverSelect() {
  receiverSelect.innerHTML = '<option value="" disabled selected>請選擇接收者</option>';
  ALL_PARTICIPANTS.filter((id) => id !== state.participantId).forEach((id) => {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = formatParticipantLabel(id);
    receiverSelect.appendChild(option);
  });
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
  const receiver = receiverSelect.value;

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

  const canSend = receiver && content.trim().length > 0 && !hasBadWords;
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
      <article class="message-card ${isUnread ? "unread" : ""}">
        <div class="message-card-header">
          <div class="message-meta">
            <span>🕐 ${escapeHtml(msg.created_at || "未知時間")}</span>
            ${isUnread ? '<span class="message-badge">NEW</span>' : ""}
          </div>
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
        <p>${state.sentLoaded ? "尚未發送任何留言" : "按 🔄 重整 載入送出的留言"}</p>
      </div>`;
    return;
  }

  const sorted = [...state.sentMessages].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  sentList.innerHTML = sorted.map((msg) => `
    <article class="message-card">
      <div class="message-card-header">
        <span class="message-receiver">🎯 接收對象：${escapeHtml(formatParticipantLabel(msg.receiver_id))}</span>
        <span class="message-meta">🕐 ${escapeHtml(msg.created_at)}</span>
      </div>
      <p class="message-content">${escapeHtml(msg.content)}</p>
    </article>
  `).join("");
}

/* ==========================================
   Actions: Login
   ========================================== */
async function handleLogin(e) {
  e.preventDefault();

  const participantId = document.getElementById("participant-id").value;
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
      () => apiFetchMessages(state.participantId, state.phoneNumber, "sent"),
      (data) => {
        if (data.status === "success") {
          applySentFromApi(data);
          renderSentMessages();
          showToast("📤 送出的留言已更新！", "success");
        } else {
          showToast(data.message || "同步失敗", "error");
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

  const receiverId = receiverSelect.value;
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
          validateMessageInput();

          state.sentMessages.unshift({
            message_id: data.message_id || `MSG-${Date.now()}`,
            receiver_id: receiverId,
            content: content,
            created_at: new Date().toLocaleString("zh-TW", {
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
  state.participantId = null;
  state.phoneNumber = null;
  state.inboxMessages = [];
  state.sentMessages = [];
  state.sentLoaded = false;
  clearSession();
  loginForm.reset();
  sendForm.reset();
  validateMessageInput();
  showLogin();
  showToast("👋 已成功登出", "info");
}

/* ==========================================
   Session Restore
   ========================================== */
async function tryRestoreSession() {
  const participantId = sessionStorage.getItem("ams_participant_id");
  const phoneNumber = sessionStorage.getItem("ams_phone_number");

  if (!participantId || !phoneNumber) return;

  try {
    await runWithProgress(
      null,
      () => apiFetchMessages(participantId, phoneNumber, "inbox"),
      (data) => {
        if (data.status === "success") {
          state.participantId = participantId;
          state.phoneNumber = phoneNumber;
          state.sentMessages = [];
          state.sentLoaded = false;
          applyInboxFromApi(data);
          showDashboard();
          renderInbox();
        } else {
          clearSession();
        }
      },
      "🔄 恢復登入中..."
    );
  } catch {
    clearSession();
  }
}

/* ==========================================
   Event Listeners
   ========================================== */
document.getElementById("phone-number").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "");
});

loginForm.addEventListener("submit", handleLogin);
logoutBtn.addEventListener("click", handleLogout);
sendForm.addEventListener("submit", handleSendMessage);
refreshInboxBtn.addEventListener("click", handleRefreshInbox);
refreshSentBtn.addEventListener("click", handleRefreshSent);

messageContent.addEventListener("input", validateMessageInput);
receiverSelect.addEventListener("change", validateMessageInput);

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

/* ==========================================
   Init
   ========================================== */
validateMessageInput();
tryRestoreSession();
