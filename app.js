// ==========================================================================
// CONFIGURATION & GLOBAL STATE
// ==========================================================================

// 已為您填入正式部署的 Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbwBJwhEWVQnsr9Sq8I_8y3gYKAVVlbav-LijuFBYRtlG2VUO_q4LTMCNcrIt79mer-yhQ/exec";

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const MEMBERS_PER_GROUP = 6;

let currentUser = {
  participant_id: null,
  phone_number: null
};

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  populateParticipantDropdowns();
  checkSession();
});

// Generate 48 participant IDs (1A through 6H)
function generateParticipantIDs() {
  const ids = [];
  GROUPS.forEach(group => {
    for (let i = 1; i <= MEMBERS_PER_GROUP; i++) {
      ids.push(`${i}${group}`);
    }
  });
  return ids;
}

// Populate login select dropdown
function populateParticipantDropdowns() {
  const loginSelect = document.getElementById("login-participant-id");
  const allIDs = generateParticipantIDs();

  allIDs.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `參加者 ${id}`;
    loginSelect.appendChild(opt);
  });
}

// Update target select dropdown (excluding current logged in user)
function updateTargetDropdown() {
  const targetSelect = document.getElementById("target-participant-id");
  targetSelect.innerHTML = '<option value="" disabled selected>選擇對象 (1A - 6H)</option>';

  const allIDs = generateParticipantIDs();
  allIDs.filter(id => id !== currentUser.participant_id).forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `參加者 ${id}`;
    targetSelect.appendChild(opt);
  });
}

// ==========================================================================
// AUTHENTICATION LOGIC
// ==========================================================================
async function handleLogin(e) {
  e.preventDefault();
  
  const pId = document.getElementById("login-participant-id").value;
  const phoneInput = document.getElementById("login-phone").value.trim();
  const errorDiv = document.getElementById("auth-error");

  errorDiv.classList.add("hidden");

  if (!pId || !phoneInput) {
    showAuthError("請填寫所有欄位");
    return;
  }

  setLoading("login-btn", true);

  try {
    // Verify user via doGet
    const queryUrl = `${API_URL}?participant_id=${encodeURIComponent(pId)}&phone_number=${encodeURIComponent(phoneInput)}`;
    const response = await fetch(queryUrl);
    const data = await response.json();

    if (data.status === "success") {
      // Save state
      currentUser.participant_id = pId;
      currentUser.phone_number = phoneInput;

      sessionStorage.setItem("app_user", JSON.stringify(currentUser));

      renderDashboard();
      renderInboxMessages(data.messages);
      showToast("登入成功！", "success");
    } else {
      showAuthError(data.message || "身份驗證失敗，請檢查號碼是否正確。");
    }
  } catch (err) {
    showAuthError("無法連接至伺服器，請稍後再試。");
    console.error(err);
  } finally {
    setLoading("login-btn", false);
  }
}

function checkSession() {
  const savedUser = sessionStorage.getItem("app_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    renderDashboard();
    fetchInboxMessages(false);
  }
}

function handleLogout() {
  sessionStorage.removeItem("app_user");
  currentUser = { participant_id: null, phone_number: null };
  
  document.getElementById("dashboard-screen").classList.add("hidden");
  document.getElementById("auth-screen").classList.remove("hidden");
  document.getElementById("login-form").reset();
  showToast("已安全退出系統", "success");
}

function showAuthError(msg) {
  const errorDiv = document.getElementById("auth-error");
  errorDiv.textContent = msg;
  errorDiv.classList.remove("hidden");
}

// ==========================================================================
// DASHBOARD & NAVIGATION
// ==========================================================================
function renderDashboard() {
  document.getElementById("auth-screen").classList.add("hidden");
  document.getElementById("dashboard-screen").classList.remove("hidden");
  document.getElementById("user-display-id").textContent = `ID: ${currentUser.participant_id}`;

  updateTargetDropdown();
  switchTab("send");
}

function switchTab(tabName) {
  const sendTab = document.getElementById("tab-send");
  const inboxTab = document.getElementById("tab-inbox");
  const sendBtn = document.getElementById("tab-btn-send");
  const inboxBtn = document.getElementById("tab-btn-inbox");

  if (tabName === "send") {
    sendTab.classList.add("active");
    inboxTab.classList.remove("active");
    sendBtn.classList.add("active");
    inboxBtn.classList.remove("active");
  } else {
    inboxTab.classList.add("active");
    sendTab.classList.remove("active");
    inboxBtn.classList.add("active");
    sendBtn.classList.remove("active");
    
    // Auto refresh when clicking inbox
    fetchInboxMessages(false);
  }
}

// ==========================================================================
// SEND MESSAGE LOGIC (doPost)
// ==========================================================================
async function handleSendMessage(e) {
  e.preventDefault();

  const targetId = document.getElementById("target-participant-id").value;
  const content = document.getElementById("msg-content").value.trim();

  if (!targetId || !content) {
    showToast("請填寫完整留言資訊", "error");
    return;
  }

  setLoading("send-btn", true);

  const payload = {
    sender_id: currentUser.participant_id,
    phone_number: currentUser.phone_number,
    receiver_id: targetId,
    content: content
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8" // Avoid Apps Script CORS preflight
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status === "success") {
      showToast("留言已成功送出！", "success");
      document.getElementById("send-msg-form").reset();
      updateCharCount();
      switchTab("inbox");
    } else {
      showToast(data.message || "傳送失敗，請再試一次", "error");
    }
  } catch (err) {
    showToast("發送失敗，請確認網路連線", "error");
    console.error(err);
  } finally {
    setLoading("send-btn", false);
  }
}

// Character counter
function updateCharCount() {
  const textarea = document.getElementById("msg-content");
  document.getElementById("char-num").textContent = textarea.value.length;
}

// ==========================================================================
// INBOX LOGIC (doGet)
// ==========================================================================
async function fetchInboxMessages(showToastOnSuccess = false) {
  const loadingState = document.getElementById("inbox-loading");
  const feed = document.getElementById("inbox-feed");
  const emptyState = document.getElementById("inbox-empty");

  loadingState.classList.remove("hidden");
  feed.innerHTML = "";
  emptyState.classList.add("hidden");

  try {
    const queryUrl = `${API_URL}?participant_id=${encodeURIComponent(currentUser.participant_id)}&phone_number=${encodeURIComponent(currentUser.phone_number)}`;
    const response = await fetch(queryUrl);
    const data = await response.json();

    if (data.status === "success") {
      renderInboxMessages(data.messages);
      if (showToastOnSuccess) showToast("已更新收件箱", "success");
    } else {
      showToast("無法載入留言: " + data.message, "error");
    }
  } catch (err) {
    showToast("讀取失敗，請確認網路連線", "error");
    console.error(err);
  } finally {
    loadingState.classList.add("hidden");
  }
}

function renderInboxMessages(messages = []) {
  const feed = document.getElementById("inbox-feed");
  const emptyState = document.getElementById("inbox-empty");
  const badge = document.getElementById("inbox-count-badge");

  feed.innerHTML = "";

  if (messages.length === 0) {
    emptyState.classList.remove("hidden");
    badge.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  badge.textContent = messages.length;
  badge.classList.remove("hidden");

  // Render messages (Sender ID is strictly excluded for anonymity)
  messages.reverse().forEach(msg => {
    const card = document.createElement("div");
    card.className = `message-card ${!msg.is_read ? 'unread' : ''}`;

    card.innerHTML = `
      <p class="message-body">${escapeHTML(msg.content)}</p>
      <div class="message-meta">
        <span class="timestamp">🕒 ${msg.created_at || '最近'}</span>
        ${!msg.is_read ? '<span class="tag-new">NEW</span>' : ''}
      </div>
    `;
    feed.appendChild(card);
  });
}

// ==========================================================================
// UTILITY FUNCTIONS
// ==========================================================================
function setLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  const text = btn.querySelector(".btn-text");
  const spinner = btn.querySelector(".spinner");

  btn.disabled = isLoading;
  if (isLoading) {
    text.classList.add("hidden");
    spinner.classList.remove("hidden");
  } else {
    text.classList.remove("hidden");
    spinner.classList.add("hidden");
  }
}

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.className = "toast hidden";
  }, 3000);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
