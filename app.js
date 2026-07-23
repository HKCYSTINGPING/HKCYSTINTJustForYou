// ==========================================
// SENSITIVITY FILTER & BAD WORDS LIST
// ==========================================
const SENSITIVE_WORDS = [
  // Sentences & Phrases
  "小你老母", "吊你老母", "小你老味", "你老味", "你老母", "老.母", "老 母", "老母係街市賣鴨蛋",
  "含能", "臭化西", "臭西", "傻西", "凸你", "屌.你", "屌 你", "屌你", "吊你", "小你",
  "九兩菜", "收皮啦", "收皮", "把撚", "條撚", "賓周", "賓.周", "仆街", "仆.街", "卜街", "POP街",
  "diu 9", "sub 9", "sub9", "chi lan sin", "撚樣", "能樣", "柒頭", "笨七", "鳩登", "膠登",
  "契弟", "ass hole", "asshole", "A S S", "on lun 7 7", "臭爛袋", "挑那星", "陷家剷", "陷家",
  "吊夠", "吊 夠", "戇尻尻", "戇尻", "戇-尻", "戇 尻", "on 99", "ON 九", "on 9", "on.9", "on9",
  "ｏｎ ９９", "戇鳩", "戇.鳩", "撚屌鳩", "d i u", "DIU", "fxxk", "fuxk", "fxck", "suck", "bitch", "fuck", "f u c k", "dllm", "D l l m", "DLLM',
  "仆街", "onL9", "ass", "shit", "shitting", "C8", 
  
  // Single Characters & Special Unicode Matches
  "撚", "屌", "尻", "鳩", "柒", "仆", "𨳒", "𨳊", "𨳍", "𨳯", 
  "&#23628;", "&#x5C4C;", "&#x5C3B;", "&#23611;", "&#x649A;", "&#25754;"
];

// All 48 Participants Hardcoded Range (1A to 6H)
const ALL_PARTICIPANTS = [];
const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
GROUPS.forEach(group => {
  for (let i = 1; i <= 6; i++) {
    ALL_PARTICIPANTS.push(`${i}${group}`);
  }
});

// App State
let currentUser = {
  participantId: null,
  phoneNumber: null
};
let apiUrl = localStorage.getItem("app_script_url") || "";

// ==========================================
// DOM ELEMENTS
// ==========================================
const loginSection = document.getElementById("login-section");
const appDashboard = document.getElementById("app-dashboard");
const loginForm = document.getElementById("login-form");
const loginParticipantSelect = document.getElementById("login-participant-id");
const loginPhoneInput = document.getElementById("login-phone");
const apiUrlInput = document.getElementById("api-url-input");
const loginBtn = document.getElementById("login-btn");
const loginProgress = document.getElementById("login-progress");

const userDisplayId = document.getElementById("user-display-id");
const logoutBtn = document.getElementById("logout-btn");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const sendMsgForm = document.getElementById("send-msg-form");
const receiverSelect = document.getElementById("receiver-select");
const messageInput = document.getElementById("message-input");
const charRemaining = document.getElementById("char-remaining");
const sensitivityWarning = document.getElementById("sensitivity-warning");
const sendMsgBtn = document.getElementById("send-msg-btn");
const sendProgress = document.getElementById("send-progress");

const inboxList = document.getElementById("inbox-list");
const inboxCountBadge = document.getElementById("inbox-count-badge");
const refreshInboxBtn = document.getElementById("refresh-inbox-btn");
const sentList = document.getElementById("sent-list");
const toastContainer = document.getElementById("toast-container");

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  if (apiUrl) {
    apiUrlInput.value = apiUrl;
  }

  // Restore Local User Session
  const savedUser = localStorage.getItem("current_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    initializeDashboard();
  }

  setupEventListeners();
});

function setupEventListeners() {
  // Login Submit
  loginForm.addEventListener("submit", handleLogin);

  // Logout Click
  logoutBtn.addEventListener("click", handleLogout);

  // Tab Navigation Switch
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Message Character Count & Sensitivity Filter
  messageInput.addEventListener("input", handleMessageInput);

  // Emoji Picker Clicks
  document.querySelectorAll(".emoji-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      messageInput.value += btn.textContent;
      handleMessageInput();
    });
  });

  // Send Message Submit
  sendMsgForm.addEventListener("submit", handleSendMessage);

  // Refresh Inbox Click
  refreshInboxBtn.addEventListener("click", fetchInboxMessages);
}

// ==========================================
// AUTHENTICATION (LOGIN / LOGOUT)
// ==========================================
async function handleLogin(e) {
  e.preventDefault();
  const participantId = loginParticipantSelect.value;
  const phone = loginPhoneInput.value.trim();
  const url = apiUrlInput.value.trim();

  if (!participantId || !phone || !url) {
    showToast("請填寫所有欄位與 API Endpoint", "error");
    return;
  }

  // Save API URL to Local Storage
  apiUrl = url;
  localStorage.setItem("app_script_url", apiUrl);

  // Animate Button Progress Tracker
  await animateProgressBar(loginBtn, loginProgress, 100, 1000);

  try {
    // API GET Call for Login Verification
    const fetchUrl = `${apiUrl}?participant_id=${encodeURIComponent(participantId)}&phone_number=${encodeURIComponent(phone)}`;
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (data.status === "success") {
      currentUser.participantId = participantId;
      currentUser.phoneNumber = phone;
      localStorage.setItem("current_user", JSON.stringify(currentUser));

      showToast("雙重驗證成功！歡迎進入系統 🔒", "success");
      initializeDashboard();
    } else {
      showToast(data.message || "驗證失敗，請檢查電話號碼或 ID", "error");
    }
  } catch (err) {
    console.error("Login Error:", err);
    showToast("連線至後端失敗，請確認 API URL 是否正確", "error");
  } finally {
    resetProgressBar(loginBtn, loginProgress);
  }
}

function handleLogout() {
  localStorage.removeItem("current_user");
  currentUser = { participantId: null, phoneNumber: null };
  loginSection.classList.remove("hidden");
  appDashboard.classList.add("hidden");
  showToast("已成功登出系統", "success");
}

function initializeDashboard() {
  loginSection.classList.add("hidden");
  appDashboard.classList.remove("hidden");
  userDisplayId.textContent = `參加者 ${currentUser.participantId}`;

  populateReceiverOptions();
  fetchInboxMessages();
  loadSentMessages();
}

// Populate Receiver Options Exclude Self
function populateReceiverOptions() {
  receiverSelect.innerHTML = `<option value="" disabled selected>請選擇接收對象...</option>`;
  ALL_PARTICIPANTS.forEach(id => {
    if (id !== currentUser.participantId) {
      const option = document.createElement("option");
      option.value = id;
      option.textContent = `參加者 ${id}`;
      receiverSelect.appendChild(option);
    }
  });
}

// ==========================================
// TAB NAVIGATION
// ==========================================
function switchTab(targetTabId) {
  tabBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === targetTabId);
  });
  tabContents.forEach(content => {
    content.classList.toggle("active", content.id === targetTabId);
  });
}

// ==========================================
// REAL-TIME SENSITIVITY FILTER & CHAR COUNT
// ==========================================
function handleMessageInput() {
  const text = messageInput.value;
  const remaining = 300 - text.length;
  charRemaining.textContent = remaining;

  const hasBadWord = checkBadWords(text);

  if (hasBadWord) {
    messageInput.classList.add("input-error");
    sensitivityWarning.classList.remove("hidden");
  } else {
    messageInput.classList.remove("input-error");
    sensitivityWarning.classList.add("hidden");
  }
}

function checkBadWords(text) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return SENSITIVE_WORDS.some(word => lowerText.includes(word.toLowerCase()));
}

// ==========================================
// SEND MESSAGE
// ==========================================
async function handleSendMessage(e) {
  e.preventDefault();

  const receiverId = receiverSelect.value;
  const content = messageInput.value.trim();

  if (!receiverId || !content) {
    showToast("請選擇接收對象並輸入留言", "error");
    return;
  }

  if (checkBadWords(content)) {
    showToast("留言包含不當用語，請修正後再試！", "error");
    return;
  }

  // Animate Progress Bar inside button
  await animateProgressBar(sendMsgBtn, sendProgress, 100, 1200);

  const payload = {
    sender_id: currentUser.participantId,
    phone_number: currentUser.phoneNumber,
    receiver_id: receiverId,
    content: content
  };

  try {
    // API POST Call using no-cors or JSON String Content
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status === "success") {
      showToast("留言已成功送出！✨", "success");

      // Local Backup for Sent Messages
      saveSentMessageLocally({
        message_id: data.message_id || `MSG-${Date.now()}`,
        receiver_id: receiverId,
        content: content,
        created_at: new Date().toLocaleString()
      });

      // Reset Form
      sendMsgForm.reset();
      handleMessageInput();
      loadSentMessages();
    } else {
      showToast(data.message || "發送失敗", "error");
    }
  } catch (err) {
    console.error("Send Message Error:", err);
    showToast("網路錯誤或後端回應異常，留言已備份至本地端", "error");

    // Local Fallback Backup
    saveSentMessageLocally({
      message_id: `MSG-LOCAL-${Date.now()}`,
      receiver_id: receiverId,
      content: content,
      created_at: new Date().toLocaleString()
    });
    sendMsgForm.reset();
    handleMessageInput();
    loadSentMessages();
  } finally {
    resetProgressBar(sendMsgBtn, sendProgress);
  }
}

// ==========================================
// INBOX & SENT MESSAGES RENDERING
// ==========================================
async function fetchInboxMessages() {
  inboxList.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i> 載入最新留言中...</div>`;

  try {
    const fetchUrl = `${apiUrl}?participant_id=${encodeURIComponent(currentUser.participantId)}&phone_number=${encodeURIComponent(currentUser.phoneNumber)}`;
    const response = await fetch(fetchUrl);
    const data = await response.json();

    if (data.status === "success") {
      renderInbox(data.messages || []);
    } else {
      inboxList.innerHTML = `<div class="empty-state">無法載入留言：${data.message}</div>`;
    }
  } catch (err) {
    console.error("Fetch Inbox Error:", err);
    inboxList.innerHTML = `<div class="empty-state">網絡連線失敗，請點擊重整再試。</div>`;
  }
}

function renderInbox(messages) {
  inboxCountBadge.textContent = messages.length;

  if (messages.length === 0) {
    inboxList.innerHTML = `<div class="empty-state">📥 目前收件箱內沒有留言。</div>`;
    return;
  }

  inboxList.innerHTML = "";
  messages.reverse().forEach(msg => {
    const isNew = !msg.is_read;
    const card = document.createElement("div");
    card.className = "msg-card";
    card.innerHTML = `
      <div class="msg-header">
        <span><i class="fa-solid fa-user-secret"></i> 匿名留言</span>
        <div>
          ${isNew ? '<span class="tag-new">NEW</span>' : ''}
          <span style="margin-left:6px;">${msg.created_at}</span>
        </div>
      </div>
      <div class="msg-body">${escapeHTML(msg.content)}</div>
    `;
    inboxList.appendChild(card);
  });
}

function saveSentMessageLocally(sentObj) {
  const localKey = `sent_msgs_${currentUser.participantId}`;
  const existing = JSON.parse(localStorage.getItem(localKey) || "[]");
  existing.unshift(sentObj);
  localStorage.setItem(localKey, JSON.stringify(existing));
}

function loadSentMessages() {
  const localKey = `sent_msgs_${currentUser.participantId}`;
  const sentMsgs = JSON.parse(localStorage.getItem(localKey) || "[]");

  if (sentMsgs.length === 0) {
    sentList.innerHTML = `<div class="empty-state">📤 你尚未發送過任何留言。</div>`;
    return;
  }

  sentList.innerHTML = "";
  sentMsgs.forEach(msg => {
    const card = document.createElement("div");
    card.className = "msg-card";
    card.innerHTML = `
      <div class="msg-header">
        <span><i class="fa-solid fa-paper-plane"></i> 發送給：<strong>參加者 ${msg.receiver_id}</strong></span>
        <span>${msg.created_at}</span>
      </div>
      <div class="msg-body">${escapeHTML(msg.content)}</div>
    `;
    sentList.appendChild(card);
  });
}

// ==========================================
// UX HELPERS (PROGRESS BAR & TOAST)
// ==========================================
function animateProgressBar(btn, progressEl, targetPercent, duration) {
  return new Promise(resolve => {
    btn.disabled = true;
    let start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const currentPercent = Math.floor(progress * targetPercent);
      
      progressEl.style.width = `${currentPercent}%`;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

function resetProgressBar(btn, progressEl) {
  btn.disabled = false;
  progressEl.style.width = "0%";
}

function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  const icon = type === "error" ? "fa-circle-xmark" : "fa-circle-check";
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHTML(message)}</span>`;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
