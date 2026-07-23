// ====================================================
// CONFIGURATION & GLOBAL STATE
// ====================================================
// 請替換為您發布的 Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbzpzS9O-G8-X4fV-83M9_EXAMPLE/exec"; 

// 敏感字詞庫 (與後端對齊，實現即時前端雙重防護)
const BAD_WORDS_LIST = [
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

// ====================================================
// INITIALIZATION
// ====================================================
document.addEventListener("DOMContentLoaded", () => {
  // 檢查是否有 Session 登入紀錄
  const savedUser = localStorage.getItem("anonymous_app_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    showDashboard();
  }

  // 綁定輸入即時過濾檢測與計數器
  const textarea = document.getElementById("messageContent");
  textarea.addEventListener("input", handleContentInput);
});

// ====================================================
// 1. AUTHENTICATION (身分驗證)
// ====================================================
async function handleLogin(e) {
  e.preventDefault();

  const participantId = document.getElementById("loginParticipantId").value;
  const phoneNumber = document.getElementById("loginPhoneNumber").value.trim();

  if (!participantId || !phoneNumber) {
    showToast("請填寫所有欄位！", "warning");
    return;
  }

  const btnLogin = document.getElementById("btnLogin");
  const progressBar = document.getElementById("loginProgress");

  // 開始動態進度條動畫
  await animateProgress(progressBar, btnLogin, "驗證中...", 0, 85, 300);

  try {
    // 發送 GET 請求驗證身分
    const url = `${API_URL}?participant_id=${encodeURIComponent(participantId)}&phone_number=${encodeURIComponent(phoneNumber)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "success") {
      await animateProgress(progressBar, btnLogin, "驗證成功！", 85, 100, 100);

      currentUser.participantId = participantId;
      currentUser.phoneNumber = phoneNumber;

      // 保存至 LocalStorage
      localStorage.setItem("anonymous_app_user", JSON.stringify(currentUser));

      showToast(`歡迎回來，參加者 ${participantId}！`, "success");
      
      setTimeout(() => {
        resetButtonProgress(progressBar, btnLogin, "驗證並進入系統 🚀");
        showDashboard();
      }, 500);

    } else {
      resetButtonProgress(progressBar, btnLogin, "驗證並進入系統 🚀");
      showToast(data.message || "身分驗證失敗，請檢查電話號碼", "error");
    }
  } catch (err) {
    resetButtonProgress(progressBar, btnLogin, "驗證並進入系統 🚀");
    // 若因 CORS 或離線導致，模擬離線或提示錯誤
    showToast("無法連接至伺服器，請稍後再試！", "error");
    console.error("Login Error:", err);
  }
}

function handleLogout() {
  localStorage.removeItem("anonymous_app_user");
  currentUser = { participantId: null, phoneNumber: null };
  document.getElementById("dashboardView").classList.add("hidden");
  document.getElementById("loginView").classList.add("active");
  document.getElementById("loginForm").reset();
  showToast("您已成功登出 👋", "success");
}

// ====================================================
// 2. DASHBOARD & TABS NAV
// ====================================================
function showDashboard() {
  document.getElementById("loginView").classList.remove("active");
  document.getElementById("dashboardView").classList.remove("hidden");
  document.getElementById("dashboardView").classList.add("active");

  document.getElementById("currentUserDisplay").innerText = `參加者 ${currentUser.participantId}`;

  // 動態渲染發送對象選單 (自動排除自己)
  populateReceiverDropdown();

  // 預設載入收件箱與送出紀錄
  fetchInboxMessages();
  renderSentMessages();
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.toggle("active", content.id === tabId);
  });

  if (tabId === "tabInbox") {
    fetchInboxMessages();
  } else if (tabId === "tabSent") {
    renderSentMessages();
  }
}

// 動態排重選單，產生 1A-6H (47個選項，排除自己)
function populateReceiverDropdown() {
  const receiverSelect = document.getElementById("receiverId");
  receiverSelect.innerHTML = `<option value="" disabled selected>請選擇接收對象...</option>`;

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  
  groups.forEach(group => {
    for (let i = 1; i <= 6; i++) {
      const id = `${i}${group}`;
      if (id !== currentUser.participantId) {
        const option = document.createElement("option");
        option.value = id;
        option.textContent = `參加者 ${id}`;
        receiverSelect.appendChild(option);
      }
    }
  });
}

// ====================================================
// 3. SENSITIVITY FILTER & EMOJI
// ====================================================
function handleContentInput() {
  const textarea = document.getElementById("messageContent");
  const counter = document.getElementById("charCounter");
  const warning = document.getElementById("filterWarning");
  const val = textarea.value;

  // 1. 字數倒數
  const remaining = 300 - val.length;
  counter.innerText = `剩餘 ${remaining} 字`;

  // 2. 敏感字偵測
  const hasBadWord = checkSensitivity(val);
  if (hasBadWord) {
    textarea.classList.add("is-invalid");
    warning.classList.remove("hidden");
  } else {
    textarea.classList.remove("is-invalid");
    warning.classList.add("hidden");
  }
}

function checkSensitivity(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BAD_WORDS_LIST.some(word => lower.includes(word.toLowerCase()));
}

function insertEmoji(emoji) {
  const textarea = document.getElementById("messageContent");
  textarea.value += emoji;
  textarea.focus();
  handleContentInput();
}

// ====================================================
// 4. SEND MESSAGE (POST)
// ====================================================
async function handleSendMessage(e) {
  e.preventDefault();

  const receiverId = document.getElementById("receiverId").value;
  const content = document.getElementById("messageContent").value.trim();

  if (!receiverId) {
    showToast("請選擇訊息接收對象！", "warning");
    return;
  }

  if (checkSensitivity(content)) {
    showToast("訊息包含不當字詞，請修訂後再發送！", "error");
    return;
  }

  const btnSend = document.getElementById("btnSend");
  const progressBar = document.getElementById("sendProgress");

  await animateProgress(progressBar, btnSend, "傳送中...", 0, 80, 200);

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
      await animateProgress(progressBar, btnSend, "發送成功！ 🎉", 80, 100, 100);

      // 儲存至本地端備份 (LocalStorage)
      saveSentMessageToLocal({
        message_id: data.message_id || `MSG-${Date.now()}`,
        receiver_id: receiverId,
        content: content,
        created_at: new Date().toLocaleString()
      });

      showToast("留言已成功送出！", "success");

      // 清空表單
      document.getElementById("messageContent").value = "";
      document.getElementById("receiverId").selectedIndex = 0;
      document.getElementById("charCounter").innerText = "剩餘 300 字";

      setTimeout(() => {
        resetButtonProgress(progressBar, btnSend, "匿名傳送訊息 💌");
      }, 500);

    } else {
      resetButtonProgress(progressBar, btnSend, "匿名傳送訊息 💌");
      showToast(data.message || "發送失敗，請重試", "error");
    }

  } catch (err) {
    resetButtonProgress(progressBar, btnSend, "匿名傳送訊息 💌");
    // 如果網絡請求失敗，仍進行 Local Storage 備份提示
    console.error("Send Error:", err);
    showToast("網路異常，請確認後端部署連結！", "error");
  }
}

// 本地端備份 sent messages
function saveSentMessageToLocal(msgObj) {
  const key = `sent_msgs_${currentUser.participantId}`;
  const localData = JSON.parse(localStorage.getItem(key) || "[]");
  localData.unshift(msgObj);
  localStorage.setItem(key, JSON.stringify(localData));
}

// ====================================================
// 5. INBOX & SENT RENDERING
// ====================================================
async function fetchInboxMessages(isManual = false) {
  const inboxList = document.getElementById("inboxList");
  if (isManual) showToast("正在重整收件箱...", "info");

  try {
    const url = `${API_URL}?participant_id=${encodeURIComponent(currentUser.participantId)}&phone_number=${encodeURIComponent(currentUser.phoneNumber)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "success") {
      renderInboxMessages(data.messages);
      if (isManual) showToast("收件箱已更新！", "success");
    } else {
      inboxList.innerHTML = `<div class="empty-state">${data.message}</div>`;
    }
  } catch (err) {
    inboxList.innerHTML = `<div class="empty-state">無法連線取得最新訊息，請稍後再試。</div>`;
  }
}

function renderInboxMessages(messages) {
  const inboxList = document.getElementById("inboxList");
  const badge = document.getElementById("unreadBadge");

  if (!messages || messages.length === 0) {
    inboxList.innerHTML = `<div class="empty-state">📪 目前還沒有收到任何匿名留言喔！</div>`;
    badge.classList.add("hidden");
    return;
  }

  let unreadCount = 0;
  inboxList.innerHTML = "";

  messages.forEach(msg => {
    const isNew = !msg.is_read;
    if (isNew) unreadCount++;

    const card = document.createElement("div");
    card.className = `msg-card ${isNew ? 'unread' : ''}`;
    card.innerHTML = `
      <div class="msg-header">
        <span class="msg-title">💌 來自匿名的神秘朋友 ${isNew ? '<span class="badge-new">NEW</span>' : ''}</span>
        <span class="msg-time">${msg.created_at || '剛剛'}</span>
      </div>
      <div class="msg-body">${escapeHtml(msg.content)}</div>
    `;
    inboxList.appendChild(card);
  });

  if (unreadCount > 0) {
    badge.innerText = unreadCount;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function renderSentMessages() {
  const sentList = document.getElementById("sentList");
  const key = `sent_msgs_${currentUser.participantId}`;
  const localMessages = JSON.parse(localStorage.getItem(key) || "[]");

  if (localMessages.length === 0) {
    sentList.innerHTML = `<div class="empty-state">📤 您尚未發送過任何匿名留言。</div>`;
    return;
  }

  sentList.innerHTML = "";
  localMessages.forEach(msg => {
    const card = document.createElement("div");
    card.className = "msg-card";
    card.innerHTML = `
      <div class="msg-header">
        <span class="msg-title" style="color: var(--secondary);">🎯 發送給：參加者 ${msg.receiver_id}</span>
        <span class="msg-time">${msg.created_at}</span>
      </div>
      <div class="msg-body">${escapeHtml(msg.content)}</div>
    `;
    sentList.appendChild(card);
  });
}

// ====================================================
// UTILITIES (Progress Bar & Toast & Helpers)
// ====================================================
function animateProgress(progressBar, btnElement, text, startPct, endPct, duration) {
  return new Promise(resolve => {
    let current = startPct;
    const btnText = btnElement.querySelector(".btn-text");
    if (btnText) btnText.innerText = `${text} ${current}%`;

    const stepTime = duration / (endPct - startPct);
    const timer = setInterval(() => {
      current++;
      progressBar.style.width = `${current}%`;
      if (btnText) btnText.innerText = `${text} ${current}%`;

      if (current >= endPct) {
        clearInterval(timer);
        resolve();
      }
    }, stepTime);
  });
}

function resetButtonProgress(progressBar, btnElement, originalText) {
  progressBar.style.width = "0%";
  const btnText = btnElement.querySelector(".btn-text");
  if (btnText) btnText.innerText = originalText;
}

function showToast(message, type = "info") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;

  let icon = "🔔";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";
  if (type === "warning") icon = "⚠️";

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}
