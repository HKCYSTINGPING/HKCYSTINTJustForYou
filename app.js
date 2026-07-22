// ==========================================================================
// CONFIGURATION
// ==========================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwBJwhEWVQnsr9Sq8I_8y3gYKAVVlbav-LijuFBYRtlG2VUO_q4LTMCNcrIt79mer-yhQ/exec";

// Global state
let currentUser = null;

// Default list of participants if currentUser isn't set yet
const ALL_PARTICIPANTS = ["1A", "2A", "3A", "1B", "2B", "3B", "1C", "2C", "3C"];

// ==========================================================================
// BAD WORDS DATABASE & DETECTION (Front-end Filter)
// ==========================================================================
const BAD_WORDS_LIST = [
  // Sentences & Phrases
  "小你老母", "吊你老母", "小你老味", "你老味", "你老母", "老.母", "老 母", "老母係街市賣鴨蛋",
  "含能", "臭化西", "臭西", "傻西", "凸你", "屌.你", "屌 你", "屌你", "吊你", "小你",
  "九兩菜", "收皮啦", "收皮", "把撚", "條撚", "賓周", "賓.周", "仆街", "仆.街", "卜街", "POP街",
  "diu 9", "sub 9", "sub9", "chi lan sin", "撚樣", "能樣", "柒頭", "笨七", "鳩登", "膠登",
  "契弟", "ass hole", "asshole", "A S S", "on lun 7 7", "臭爛袋", "挑那星", "陷家剷", "陷家",
  "吊夠", "吊 夠", "戇尻尻", "戇尻", "戇-尻", "戇 尻", "on 99", "ON 九", "on 9", "on.9", "on9",
  "ｏｎ ９９", "戇鳩", "戇.鳩", "撚屌鳩", "d i u", "DIU", "fxxk", "fuxk", "fxck", "suck", "bitch",
  
  // Single Characters & Special Unicode Matches
  "撚", "屌", "尻", "鳩", "柒", "仆", "𨳒", "𨳊", "𨳍", "𨳯", 
  "&#23628;", "&#x5C4C;", "&#x5C3B;", "&#23611;", "&#x649A;", "&#25754;"
];

/**
 * Checks if the text contains any bad words from the database.
 * @param {string} text - User input text.
 * @returns {Array} - Array of detected bad words.
 */
function detectBadWords(text) {
  const foundWords = [];
  const lowerText = text.toLowerCase();

  BAD_WORDS_LIST.forEach(word => {
    if (lowerText.includes(word.toLowerCase())) {
      if (!foundWords.includes(word)) {
        foundWords.push(word);
      }
    }
  });

  return foundWords;
}

// ==========================================================================
// INITIALIZATION
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initEventListeners();
  populateTargetDropdown(); // Ensure options are created immediately on load
  checkSavedSession();
});

function initEventListeners() {
  const loginForm = document.getElementById("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLogin);

  const sendForm = document.getElementById("send-msg-form");
  if (sendForm) sendForm.addEventListener("submit", handleSendMessage);
  
  const contentInput = document.getElementById("msg-content");
  if (contentInput) {
    contentInput.addEventListener("input", updateCharCount);
  }

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      switchTab(e.target.dataset.tab);
    });
  });

  // Refresh inbox
  const refreshBtn = document.getElementById("refresh-inbox-btn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", fetchMessages);
  }

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
  }
}

// ==========================================================================
// DROPDOWN POPULATION (FIXED & SAFEGUARDED)
// ==========================================================================
function populateTargetDropdown() {
  const select = document.getElementById("target-participant-id");
  if (!select) {
    console.error("❌ Target select element with ID 'target-participant-id' not found in DOM!");
    return;
  }

  select.innerHTML = '<option value="">-- 請選擇接收者 ID --</option>';

  ALL_PARTICIPANTS.forEach(id => {
    // Skip current logged-in user so they can't message themselves
    if (currentUser && id === currentUser.participant_id) return;

    const option = document.createElement("option");
    option.value = id;
    option.textContent = `參加者 ${id}`;
    select.appendChild(option);
  });

  console.log("✅ Participant dropdown populated successfully.");
}

// ==========================================================================
// AUTHENTICATION
// ==========================================================================
async function handleLogin(e) {
  e.preventDefault();

  const participantId = document.getElementById("login-id").value;
  const phoneNumber = document.getElementById("login-phone").value.trim();

  if (!participantId || !phoneNumber) {
    showToast("請選擇參加者 ID 並輸入電話號碼", "error");
    return;
  }

  setLoading("login-btn", true);

  try {
    const url = `${API_URL}?participant_id=${encodeURIComponent(participantId)}&phone_number=${encodeURIComponent(phoneNumber)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "success") {
      currentUser = {
        participant_id: participantId,
        phone_number: phoneNumber
      };

      // Save user session to localStorage
      localStorage.setItem("anonymous_app_user", JSON.stringify(currentUser));

      showToast("登入成功！", "success");
      showMainScreen();
      renderMessages(data.messages);
      populateTargetDropdown(); // Re-populate to exclude current user
    } else {
      showToast(data.message || "驗證失敗，請檢查輸入資料", "error");
    }
  } catch (err) {
    showToast("連線失敗，請檢查網路或 API 設定", "error");
    console.error(err);
  } finally {
    setLoading("login-btn", false);
  }
}

function checkSavedSession() {
  const saved = localStorage.getItem("anonymous_app_user");
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      showMainScreen();
      populateTargetDropdown();
      fetchMessages();
    } catch (e) {
      localStorage.removeItem("anonymous_app_user");
    }
  }
}

function handleLogout() {
  localStorage.removeItem("anonymous_app_user");
  currentUser = null;
  document.getElementById("main-screen").classList.add("hidden");
  document.getElementById("login-screen").classList.remove("hidden");
  populateTargetDropdown(); // Reset dropdown
  showToast("已成功登出", "success");
}

// ==========================================================================
// MESSAGES & SENDING WITH FRONT-END WARNING
// ==========================================================================
async function fetchMessages() {
  if (!currentUser) return;

  const refreshBtn = document.getElementById("refresh-inbox-btn");
  if (refreshBtn) refreshBtn.classList.add("spin");

  try {
    const url = `${API_URL}?participant_id=${encodeURIComponent(currentUser.participant_id)}&phone_number=${encodeURIComponent(currentUser.phone_number)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "success") {
      renderMessages(data.messages);
      showToast("收件箱已更新", "success");
    } else {
      showToast(data.message || "更新收件箱失敗", "error");
    }
  } catch (err) {
    showToast("無法連線至伺服器", "error");
    console.error(err);
  } finally {
    if (refreshBtn) refreshBtn.classList.remove("spin");
  }
}

async function handleSendMessage(e) {
  e.preventDefault();

  const targetId = document.getElementById("target-participant-id").value;
  const contentInput = document.getElementById("msg-content");
  const content = contentInput.value.trim();

  if (!targetId || !content) {
    showToast("請選擇接收者並輸入留言內容", "error");
    return;
  }

  // ⚠️ FRONT-END BAD WORD FILTER CHECK
  const detectedBadWords = detectBadWords(content);
  if (detectedBadWords.length > 0) {
    const warningMsg = `⚠️ 留言包含不適當字詞：[ ${detectedBadWords.join(", ")} ]，請修正後再試。`;
    showToast(warningMsg, "error");
    contentInput.focus();
    return; // Block submission completely
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
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status === "success") {
      showToast("留言已成功發送！", "success");
      document.getElementById("send-msg-form").reset();
      updateCharCount();
      switchTab("inbox");
      fetchMessages();
    } else {
      showToast(data.message || "發送失敗，請再試一次", "error");
    }
  } catch (err) {
    showToast("發送失敗，請確認網路連線", "error");
    console.error(err);
  } finally {
    setLoading("send-btn", false);
  }
}

// ==========================================================================
// UI & DISPLAY HELPERS
// ==========================================================================
function showMainScreen() {
  document.getElementById("login-screen").classList.add("hidden");
  document.getElementById("main-screen").classList.remove("hidden");
  
  const userEl = document.getElementById("user-display-id");
  if (userEl) userEl.textContent = currentUser.participant_id;
}

function renderMessages(messages) {
  const container = document.getElementById("messages-container");
  if (!container) return;
  
  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>📭 目前還沒有收到任何匿名留言</p>
      </div>
    `;
    return;
  }

  [...messages].reverse().forEach(msg => {
    const card = document.createElement("div");
    card.className = "message-card";
    card.innerHTML = `
      <div class="message-header">
        <span class="sender-tag">🔒 匿名留言</span>
        <span class="message-time">${msg.created_at || "剛剛"}</span>
      </div>
      <div class="message-body">${escapeHtml(msg.content)}</div>
    `;
    container.appendChild(card);
  });
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
  });

  document.querySelectorAll(".tab-content").forEach(content => {
    content.classList.toggle("hidden", content.id !== `${tabName}-tab`);
  });
}

function updateCharCount() {
  const contentInput = document.getElementById("msg-content");
  const countEl = document.getElementById("char-count");
  if (contentInput && countEl) {
    countEl.textContent = contentInput.value.length;
  }
}

function setLoading(buttonId, isLoading) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  btn.disabled = isLoading;
  const textEl = btn.querySelector(".btn-text");
  const spinnerEl = btn.querySelector(".btn-spinner");

  if (textEl) textEl.style.display = isLoading ? "none" : "inline";
  if (spinnerEl) spinnerEl.style.display = isLoading ? "inline-block" : "none";
}

function showToast(message, type = "info") {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.className = toast.className.replace("show", "");
  }, 4000);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
