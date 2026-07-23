// ==========================================
// CONFIG & CONSTANTS
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbwBJwhEWVQnsr9Sq8I_8y3gYKAVVlbav-LijuFBYRtlG2VUO_q4LTMCNcrIt79mer-yhQ/exec";

const LOCAL_BAD_WORDS = [
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

let currentUser = {
  participantId: null,
  phoneNumber: null
};

// ==========================================
// DOM ELEMENTS
// ==========================================
const loginSection = document.getElementById("login-section");
const dashboardSection = document.getElementById("dashboard-section");
const loginForm = document.getElementById("login-form");
const loginParticipantSelect = document.getElementById("login-participant");
const loginPhoneInput = document.getElementById("login-phone");
const loginBtn = document.getElementById("login-btn");
const loginProgress = document.getElementById("login-progress");

const currentUserBadge = document.getElementById("current-user-badge");
const logoutBtn = document.getElementById("logout-btn");
const tabBtns = document.querySelectorAll(".tab-btn");
const tabPanes = document.querySelectorAll(".tab-pane");

const receiverSelect = document.getElementById("receiver-select");
const messageContent = document.getElementById("message-content");
const sensitiveWarning = document.getElementById("sensitive-warning");
const charCount = document.getElementById("char-count");
const sendMsgForm = document.getElementById("send-msg-form");
const sendBtn = document.getElementById("send-btn");
const sendProgress = document.getElementById("send-progress");

const refreshInboxBtn = document.getElementById("refresh-inbox-btn");
const inboxList = document.getElementById("inbox-list");
const sentList = document.getElementById("sent-list");
const inboxUnreadBadge = document.getElementById("inbox-unread-count");

// ==========================================
// JSONP HELPER (Bypasses CORS entirely)
// ==========================================
function fetchJSONP(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_cb_' + Math.round(100000 * Math.random());
    window[callbackName] = function(data) {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };

    const script = document.createElement('script');
    script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
    script.onerror = function() {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error("JSONP Request Failed"));
    };
    document.body.appendChild(script);
  });
}

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  checkStoredSession();
  setupEventListeners();
});

function setupEventListeners() {
  loginForm.addEventListener("submit", handleLogin);
  logoutBtn.addEventListener("click", handleLogout);

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab).classList.add("active");
    });
  });

  messageContent.addEventListener("input", handleTextareaInput);
  sendMsgForm.addEventListener("submit", handleSendMessage);
  refreshInboxBtn.addEventListener("click", () => fetchInboxMessages(true));
}

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================
function checkStoredSession() {
  const savedId = localStorage.getItem("app_participant_id");
  const savedPhone = localStorage.getItem("app_phone_number");

  if (savedId && savedPhone) {
    currentUser.participantId = savedId;
    currentUser.phoneNumber = savedPhone;
    showDashboard();
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const pId = loginParticipantSelect.value;
  const phone = loginPhoneInput.value.trim();

  if (!pId || !phone) {
    showToast("請選擇編號並輸入電話號碼！", "error");
    return;
  }

  await animateProgress(loginProgress, loginBtn, "驗證中...");

  try {
    const url = `${API_URL}?participant_id=${encodeURIComponent(pId)}&phone_number=${encodeURIComponent(phone)}`;
    
    // 使用 JSONP 請求跳過跨網域問題
    const data = await fetchJSONP(url);

    if (data.status === "success") {
      currentUser.participantId = pId;
      currentUser.phoneNumber = phone;

      localStorage.setItem("app_participant_id", pId);
      localStorage.setItem("app_phone_number", phone);

      showToast("登入成功！歡迎回來 🎉", "success");
      showDashboard();
    } else {
      showToast(data.message || "驗證失敗：電話號碼或 ID 不正確", "error");
    }
  } catch (err) {
    console.error("Login Error:", err);
    showToast("連線失敗，請再試一次！", "error");
  } finally {
    resetButtonProgress(loginProgress, loginBtn, '<i class="fa-solid fa-right-to-bracket"></i> 驗證身份並登入');
  }
}

function handleLogout() {
  localStorage.removeItem("app_participant_id");
  localStorage.removeItem("app_phone_number");
  currentUser = { participantId: null, phoneNumber: null };
  
  dashboardSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
  showToast("已成功登出系統", "info");
}

function showDashboard() {
  loginSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  currentUserBadge.textContent = `參加者: ${currentUser.participantId}`;

  populateReceiverOptions();
  fetchInboxMessages();
  renderSentMessages();
}

function populateReceiverOptions() {
  receiverSelect.innerHTML = `<option value="" disabled selected>請選擇接收留言的對象...</option>`;
  const options = loginParticipantSelect.querySelectorAll("option");

  options.forEach(opt => {
    if (opt.value && opt.value !== currentUser.participantId) {
      const clone = opt.cloneNode(true);
      receiverSelect.appendChild(clone);
    }
  });
}

// ==========================================
// SENSITIVE WORD FILTER
// ==========================================
function handleTextareaInput() {
  const text = messageContent.value;
  charCount.textContent = text.length;

  const lowerText = text.toLowerCase();
  let containsBadWord = false;

  for (let word of LOCAL_BAD_WORDS) {
    if (lowerText.includes(word.toLowerCase())) {
      containsBadWord = true;
      break;
    }
  }

  if (containsBadWord) {
    messageContent.classList.add("input-error");
    sensitiveWarning.classList.remove("hidden");
    sendBtn.disabled = true;
  } else {
    messageContent.classList.remove("input-error");
    sensitiveWarning.classList.add("hidden");
    sendBtn.disabled = false;
  }
}

// ==========================================
// SEND MESSAGE LOGIC
// ==========================================
async function handleSendMessage(e) {
  e.preventDefault();
  const receiverId = receiverSelect.value;
  const content = messageContent.value.trim();

  if (!receiverId) { showToast("請選擇接收對象！", "error"); return; }
  if (!content) { showToast("留言內容不能為空！", "error"); return; }

  await animateProgress(sendProgress, sendBtn, "傳送中...");

  const payload = {
    sender_id: currentUser.participantId,
    phone_number: currentUser.phoneNumber,
    receiver_id: receiverId,
    content: content
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status === "success") {
      showToast("留言已成功送出！🚀", "success");
      
      saveSentMessageLocal({
        message_id: data.message_id || `MSG-${Date.now()}`,
        receiver_id: receiverId,
        content: content,
        created_at: new Date().toLocaleString()
      });

      messageContent.value = "";
      charCount.textContent = "0";
      receiverSelect.selectedIndex = 0;
      renderSentMessages();
    } else {
      showToast(data.message || "發送失敗！", "error");
    }
  } catch (err) {
    console.error("Send Message Error:", err);
    showToast("伺服器連線失敗，請稍後重試！", "error");
  } finally {
    resetButtonProgress(sendProgress, sendBtn, '<i class="fa-solid fa-paper-plane"></i> 傳送留言 🚀');
  }
}

// ==========================================
// INBOX & SENT MESSAGES RENDER
// ==========================================
async function fetchInboxMessages(manualRefresh = false) {
  if (manualRefresh) showToast("正在更新收件箱...", "info");

  try {
    const url = `${API_URL}?participant_id=${encodeURIComponent(currentUser.participantId)}&phone_number=${encodeURIComponent(currentUser.phoneNumber)}`;
    const data = await fetchJSONP(url);

    if (data.status === "success") {
      renderInboxMessages(data.messages || []);
      if (manualRefresh) showToast("收件箱已是最新狀態！", "success");
    }
  } catch (err) {
    console.error("Fetch Inbox Error:", err);
    showToast("讀取收件箱失敗", "error");
  }
}

function renderInboxMessages(messages) {
  inboxList.innerHTML = "";

  if (messages.length === 0) {
    inboxList.innerHTML = `<div class="empty-state">📭 尚無收到任何匿名留言</div>`;
    inboxUnreadBadge.classList.add("hidden");
    return;
  }

  let unreadCount = 0;

  messages.forEach(msg => {
    if (!msg.is_read) unreadCount++;

    const card = document.createElement("div");
    card.className = "message-card";
    card.innerHTML = `
      <div class="message-header">
        <span>來自：🕵️ 匿名參加者</span>
        <span>${msg.created_at || ''} ${!msg.is_read ? '<span class="badge-new">NEW</span>' : ''}</span>
      </div>
      <div class="message-body">${escapeHTML(msg.content)}</div>
    `;
    inboxList.appendChild(card);
  });

  if (unreadCount > 0) {
    inboxUnreadBadge.textContent = unreadCount;
    inboxUnreadBadge.classList.remove("hidden");
  } else {
    inboxUnreadBadge.classList.add("hidden");
  }
}

function saveSentMessageLocal(msgObj) {
  const key = `sent_msgs_${currentUser.participantId}`;
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.unshift(msgObj);
  localStorage.setItem(key, JSON.stringify(existing));
}

function renderSentMessages() {
  const key = `sent_msgs_${currentUser.participantId}`;
  const sentMessages = JSON.parse(localStorage.getItem(key) || "[]");

  sentList.innerHTML = "";

  if (sentMessages.length === 0) {
    sentList.innerHTML = `<div class="empty-state">📤 你尚未發送過任何留言</div>`;
    return;
  }

  sentMessages.forEach(msg => {
    const card = document.createElement("div");
    card.className = "message-card";
    card.innerHTML = `
      <div class="message-header">
        <span>發送給：<strong>參加者 ${msg.receiver_id}</strong></span>
        <span>${msg.created_at}</span>
      </div>
      <div class="message-body">${escapeHTML(msg.content)}</div>
    `;
    sentList.appendChild(card);
  });
}

// ==========================================
// UI HELPER FUNCTIONS
// ==========================================
function animateProgress(progressBarEl, buttonEl, loadingText) {
  return new Promise(resolve => {
    buttonEl.disabled = true;
    let width = 0;
    const btnText = buttonEl.querySelector(".btn-text");
    if (btnText) btnText.innerText = loadingText;

    const interval = setInterval(() => {
      width += 25;
      progressBarEl.style.width = `${width}%`;
      if (width >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 40);
  });
}

function resetButtonProgress(progressBarEl, buttonEl, originalHTML) {
  buttonEl.disabled = false;
  progressBarEl.style.width = "0%";
  const btnText = buttonEl.querySelector(".btn-text");
  if (btnText) btnText.innerHTML = originalHTML;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "ℹ️";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHTML(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => { toast.remove(); }, 3500);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
