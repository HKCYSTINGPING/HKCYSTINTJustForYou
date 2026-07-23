// ==========================================================================
// CONFIGURATION & GLOBAL STATE
// ==========================================================================

const API_URL = "https://script.google.com/macros/s/AKfycbwBJwhEWVQnsr9Sq8I_8y3gYKAVVlbav-LijuFBYRtlG2VUO_q4LTMCNcrIt79mer-yhQ/exec";

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const MEMBERS_PER_GROUP = 6;

// Prohibited / Bad words list (English & Cantonese/Chinese)
const PROHIBITED_WORDS = [
  // Sentences & Phrases
  "小你老母", "吊你老母", "小你老味", "你老味", "你老母", "老.母", "老 母", "老母係街市賣鴨蛋",
  "含能", "臭化西", "臭西", "傻西", "凸你", "屌.你", "屌 你", "屌你", "吊你", "小你",
  "九兩菜", "收皮啦", "收皮", "把撚", "條撚", "賓周", "賓.周", "仆街", "仆.街", "卜街", "POP街",
  "diu 9", "sub 9", "sub9", "chi lan sin", "撚樣", "能樣", "柒頭", "笨七", "鳩登", "膠登",
  "契弟", "ass hole", "asshole", "A S S", "on lun 7 7", "臭爛袋", "挑那星", "陷家剷", "陷家",
  "吊夠", "吊 夠", "戇尻尻", "戇尻", "戇-尻", "戇 尻", "on 99", "ON 九", "on 9", "on.9", "on9",
  "ｏｎ ９９", "戇鳩", "戇.鳩", "撚屌鳩", "d i u", "DIU", "fxxk", "fuxk", "fxck", "suck", "bitch", "fuck", "f u c k", "dllm", "dklm", "DKLM",
  
  // Single Characters & Special Unicode Matches
  "撚", "屌", "尻", "鳩", "柒", "仆", "𨳒", "𨳊", "𨳍", "𨳯", 
  "&#23628;", "&#x5C4C;", "&#x5C3B;", "&#23611;", "&#x649A;", "&#25754;"
];

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

function generateParticipantIDs() {
  const ids = [];
  GROUPS.forEach(group => {
    for (let i = 1; i <= MEMBERS_PER_GROUP; i++) {
      ids.push(`${i}${group}`);
    }
  });
  return ids;
}

function populateParticipantDropdowns() {
  const loginSelect = document.getElementById("login-participant-id");
  if (!loginSelect) return;
  loginSelect.innerHTML = '<option value="" disabled selected>請選擇編號 (如 1A, 3C...)</option>';

  const allIDs = generateParticipantIDs();
  allIDs.forEach(id => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `參加者 ${id}`;
    loginSelect.appendChild(opt);
  });
}

function updateTargetDropdown() {
  const targetSelect = document.getElementById("target-participant-id");
  if (!targetSelect) return;
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
// PROGRESS TRACKER CONTROLLER
// ==========================================================================

function createProgressTracker(textElement) {
  let progress = 0;
  let interval = null;

  return {
    start: () => {
      progress = 0;
      textElement.textContent = "0%";

      interval = setInterval(() => {
        if (progress < 95) {
          progress += Math.floor(Math.random() * 5) + 3;
          if (progress > 95) progress = 95;
          textElement.textContent = `${progress}%`;
        }
      }, 150);
    },
    finish: () => {
      clearInterval(interval);
      textElement.textContent = "100%";
    },
    reset: () => {
      clearInterval(interval);
      progress = 0;
      textElement.textContent = "0%";
    }
  };
}

// ==========================================================================
// BAD WORDS FILTERING
// ==========================================================================

function containsBadWords(text) {
  const normalizedText = text.toLowerCase().replace(/\s+/g, '');
  return PROHIBITED_WORDS.some(word => normalizedText.includes(word.toLowerCase()));
}

function updateCharCount() {
  const textarea = document.getElementById("msg-content");
  const countSpan = document.getElementById("char-num");
  if (!textarea || !countSpan) return;

  const val = textarea.value;
  countSpan.textContent = val.length;

  if (containsBadWords(val)) {
    textarea.style.borderColor = "var(--danger-color)";
  } else {
    textarea.style.borderColor = "var(--border-color)";
  }
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

  const btn = document.getElementById("login-btn");
  const btnText = btn.querySelector(".btn-text");
  const progressWrapper = document.getElementById("login-btn-progress");
  const text = progressWrapper.querySelector(".spinner-text");

  const tracker = createProgressTracker(text);

  btn.disabled = true;
  btnText.classList.add("hidden");
  progressWrapper.classList.remove("hidden");
  tracker.start();

  try {
    const queryUrl = `${API_URL}?participant_id=${encodeURIComponent(pId)}&phone_number=${encodeURIComponent(phoneInput)}`;
    const response = await fetch(queryUrl);
    const data = await response.json();

    tracker.finish();
    await new Promise(r => setTimeout(r, 200));

    if (data.status === "success") {
      currentUser.participant_id = pId;
      currentUser.phone_number = phoneInput;

      sessionStorage.setItem("app_user", JSON.stringify(currentUser));

      renderDashboard();
      renderInboxMessages(data.messages);
      fetchSentMessagesFromAPI(false);
      showToast("登入成功！", "success");
    } else {
      showAuthError(data.message || "身份驗證失敗，請檢查號碼是否正確。");
    }
  } catch (err) {
    showAuthError("無法連接至伺服器，請稍後再試。");
    console.error(err);
  } finally {
    tracker.reset();
    btn.disabled = false;
    btnText.classList.remove("hidden");
    progressWrapper.classList.add("hidden");
  }
}

function checkSession() {
  const savedUser = sessionStorage.getItem("app_user");
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    renderDashboard();
    fetchInboxMessages(false);
    fetchSentMessagesFromAPI(false);
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
  const sentTab = document.getElementById("tab-sent");

  const sendBtn = document.getElementById("tab-btn-send");
  const inboxBtn = document.getElementById("tab-btn-inbox");
  const sentBtn = document.getElementById("tab-btn-sent");

  // Deactivate all
  [sendTab, inboxTab, sentTab].forEach(t => t.classList.remove("active"));
  [sendBtn, inboxBtn, sentBtn].forEach(b => b.classList.remove("active"));

  if (tabName === "send") {
    sendTab.classList.add("active");
    sendBtn.classList.add("active");
  } else if (tabName === "inbox") {
    inboxTab.classList.add("active");
    inboxBtn.classList.add("active");
    fetchInboxMessages(false);
  } else if (tabName === "sent") {
    sentTab.classList.add("active");
    sentBtn.classList.add("active");
    fetchSentMessagesFromAPI(false);
  }
}

// ==========================================================================
// SEND MESSAGE LOGIC
// ==========================================================================

async function handleSendMessage(e) {
  e.preventDefault();

  const targetId = document.getElementById("target-participant-id").value;
  const content = document.getElementById("msg-content").value.trim();

  if (!targetId || !content) {
    showToast("請填寫完整留言資訊", "error");
    return;
  }

  if (containsBadWords(content)) {
    showToast("⚠️ 留言包含不當用語，請修正後再試。", "error");
    return;
  }

  const btn = document.getElementById("send-btn");
  const btnText = btn.querySelector(".btn-text");
  const progressWrapper = document.getElementById("send-btn-progress");
  const text = progressWrapper.querySelector(".spinner-text");

  const tracker = createProgressTracker(text);

  btn.disabled = true;
  btnText.classList.add("hidden");
  progressWrapper.classList.remove("hidden");
  tracker.start();

  const payload = {
    sender_id: currentUser.participant_id,
    phone_number: currentUser.phone_number,
    receiver_id: targetId,
    content: content
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    tracker.finish();
    await new Promise(r => setTimeout(r, 200));

    if (data.status === "success") {
      saveSentMessageLocally({
        receiver_id: targetId,
        content: content,
        created_at: new Date().toLocaleString("zh-HK", { hour12: false })
      });

      showToast("留言已成功送出！", "success");
      document.getElementById("send-msg-form").reset();
      updateCharCount();
      
      // 🔑 Refetch sent items from API and switch tab
      await fetchSentMessagesFromAPI(false);
      switchTab("sent");
    } else {
      showToast(data.message || "傳送失敗，請再試一次", "error");
    }
  } catch (err) {
    showToast("發送失敗，請確認網路連線", "error");
    console.error(err);
  } finally {
    tracker.reset();
    btn.disabled = false;
    btnText.classList.remove("hidden");
    progressWrapper.classList.add("hidden");
  }
}

// ==========================================================================
// SENT MESSAGES LOGIC (API FETCH + LOCAL BACKUP)
// ==========================================================================

async function fetchSentMessagesFromAPI(showToastOnSuccess = false) {
  if (!currentUser.participant_id) return;

  const feed = document.getElementById("sent-feed");
  const emptyState = document.getElementById("sent-empty");
  const badge = document.getElementById("sent-count-badge");

  try {
    const queryUrl = `${API_URL}?action=getSentMessages&participant_id=${encodeURIComponent(currentUser.participant_id)}&phone_number=${encodeURIComponent(currentUser.phone_number)}`;
    const response = await fetch(queryUrl);
    const data = await response.json();

    if (data.status === "success" && Array.isArray(data.messages)) {
      renderSentMessages(data.messages);
      if (showToastOnSuccess) showToast("已更新送出紀錄", "success");
    } else {
      loadSentMessagesFromLocalStorage();
    }
  } catch (err) {
    console.warn("Unable to fetch sent messages from API, falling back to local storage.", err);
    loadSentMessagesFromLocalStorage();
  }
}

function getSentStorageKey() {
  return `sent_msgs_${currentUser.participant_id}`;
}

function saveSentMessageLocally(msg) {
  if (!currentUser.participant_id) return;
  const key = getSentStorageKey();
  const existing = JSON.parse(localStorage.getItem(key) || "[]");
  existing.push(msg);
  localStorage.setItem(key, JSON.stringify(existing));
}

function loadSentMessagesFromLocalStorage() {
  if (!currentUser.participant_id) return;

  const key = getSentStorageKey();
  const messages = JSON.parse(localStorage.getItem(key) || "[]");
  renderSentMessages(messages);
}

function renderSentMessages(messages = []) {
  const feed = document.getElementById("sent-feed");
  const emptyState = document.getElementById("sent-empty");
  const badge = document.getElementById("sent-count-badge");

  feed.innerHTML = "";

  if (messages.length === 0) {
    emptyState.classList.remove("hidden");
    badge.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  badge.textContent = messages.length;
  badge.classList.remove("hidden");

  // Render reverse order (newest first)
  messages.slice().reverse().forEach(msg => {
    const card = document.createElement("div");
    card.className = "message-card sent-card";

    card.innerHTML = `
      <div class="message-recipient">發送給：<strong>參加者 ${escapeHTML(msg.receiver_id || msg.target_id || '')}</strong></div>
      <p class="message-body">${escapeHTML(msg.content)}</p>
      <div class="message-meta">
        <span class="timestamp">🕒 ${msg.created_at || '最近'}</span>
        <span class="tag-sent">已送出</span>
      </div>
    `;
    feed.appendChild(card);
  });
}

// ==========================================================================
// INBOX LOGIC
// ==========================================================================

async function fetchInboxMessages(showToastOnSuccess = false) {
  const loadingState = document.getElementById("inbox-loading");
  const feed = document.getElementById("inbox-feed");
  const emptyState = document.getElementById("inbox-empty");

  const text = document.getElementById("inbox-progress-text");
  const tracker = createProgressTracker(text);

  loadingState.classList.remove("hidden");
  feed.innerHTML = "";
  emptyState.classList.add("hidden");
  tracker.start();

  try {
    const queryUrl = `${API_URL}?participant_id=${encodeURIComponent(currentUser.participant_id)}&phone_number=${encodeURIComponent(currentUser.phone_number)}`;
    const response = await fetch(queryUrl);
    const data = await response.json();

    tracker.finish();
    await new Promise(r => setTimeout(r, 200));

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
    tracker.reset();
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

  messages.slice().reverse().forEach(msg => {
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

function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;

  setTimeout(() => {
    toast.className = "toast hidden";
  }, 3000);
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
