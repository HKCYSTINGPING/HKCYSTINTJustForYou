/**
 * HKCYSTINTJustForYou — Anonymous Messaging Web App
 * Google Sheets tabs:
 *   - Participants: participant_id, phone_number
 *   - Messages: message_id, sender_id, receiver_id, content, created_at
 *   - Open: A2 = OPEN or CLOSE
 */

const SCRIPT_VERSION = 3;

const PARTICIPANTS_SHEET_NAME = "Participants";
const MESSAGES_SHEET_NAME = "Messages";
const OPEN_SHEET_NAME = "Open";
const OPEN_CELL = "A2";
const ADMIN_PASSWORD = "TNIT23082026";

/* ==========================================
   Entry Points
   ========================================== */

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = String(params.action || "").trim();

    if (action === "list_participants") {
      return jsonResponse_(listParticipants_());
    }

    if (action === "get_messaging_status") {
      return jsonResponse_(handleGetMessagingStatus_());
    }

    const participantId = normalizeId_(params.participant_id);
    const phoneNumber = normalizePhone_(params.phone_number);
    const fetchType = String(params.fetch_type || "inbox").trim().toLowerCase();

    if (!participantId || !phoneNumber) {
      return jsonResponse_({
        status: "error",
        message: "請提供 participant_id 與 phone_number"
      });
    }

    if (!verifyParticipant_(participantId, phoneNumber)) {
      return jsonResponse_({
        status: "error",
        message: "身份驗證失敗：電話號碼或參加者 ID 不正確"
      });
    }

    if (fetchType === "sent") {
      return jsonResponse_({
        status: "success",
        sent_messages: getSentMessages_(participantId)
      });
    }

    return jsonResponse_({
      status: "success",
      messages: getInboxMessages_(participantId)
    });
  } catch (err) {
    return jsonResponse_({
      status: "error",
      message: String(err.message || err)
    });
  }
}

function doPost(e) {
  try {
    const data = parsePostBody_(e);

    if (data.action === "set_messaging_status") {
      return jsonResponse_(handleSetMessagingStatus_(data.password, data.messaging_status));
    }

    return jsonResponse_(handleSendMessage_(data));
  } catch (err) {
    return jsonResponse_({
      status: "error",
      message: String(err.message || err)
    });
  }
}

/* ==========================================
   Participants
   ========================================== */

function listParticipants_() {
  const sheet = getSheetByName_(PARTICIPANTS_SHEET_NAME);
  if (!sheet) {
    return {
      status: "error",
      message: '找不到 "Participants" 工作表'
    };
  }

  const rows = getDataRows_(sheet);
  if (rows.length === 0) {
    return {
      status: "success",
      version: SCRIPT_VERSION,
      participants: []
    };
  }

  const headers = getHeaders_(sheet);
  const idCol = getColumnIndex_(headers, "participant_id");
  if (idCol < 0) {
    return {
      status: "error",
      message: "Participants 工作表沒有 participant_id 資料"
    };
  }

  const participants = rows
    .map((row) => normalizeId_(row[idCol - 1]))
    .filter(Boolean);

  const unique = [];
  const seen = {};
  participants.forEach((id) => {
    if (!seen[id]) {
      seen[id] = true;
      unique.push(id);
    }
  });

  return {
    status: "success",
    version: SCRIPT_VERSION,
    participants: unique
  };
}

function verifyParticipant_(participantId, phoneNumber) {
  const sheet = getSheetByName_(PARTICIPANTS_SHEET_NAME);
  if (!sheet) return false;

  const headers = getHeaders_(sheet);
  const idCol = getColumnIndex_(headers, "participant_id");
  const phoneCol = getColumnIndex_(headers, "phone_number");
  if (idCol < 0 || phoneCol < 0) return false;

  const rows = getDataRows_(sheet);
  return rows.some((row) =>
    normalizeId_(row[idCol - 1]) === participantId &&
    normalizePhone_(row[phoneCol - 1]) === phoneNumber
  );
}

function participantExists_(participantId) {
  const sheet = getSheetByName_(PARTICIPANTS_SHEET_NAME);
  if (!sheet) return false;

  const headers = getHeaders_(sheet);
  const idCol = getColumnIndex_(headers, "participant_id");
  if (idCol < 0) return false;

  return getDataRows_(sheet).some((row) =>
    normalizeId_(row[idCol - 1]) === participantId
  );
}

/* ==========================================
   Messages
   ========================================== */

function getInboxMessages_(participantId) {
  const sheet = getSheetByName_(MESSAGES_SHEET_NAME);
  if (!sheet) return [];

  const headers = getHeaders_(sheet);
  const receiverCol = getColumnIndex_(headers, "receiver_id");
  const contentCol = getColumnIndex_(headers, "content");
  const createdCol = getColumnIndex_(headers, "created_at");
  const messageIdCol = getColumnIndex_(headers, "message_id");

  if (receiverCol < 0 || contentCol < 0) return [];

  return getDataRows_(sheet)
    .filter((row) => normalizeId_(row[receiverCol - 1]) === participantId)
    .map((row) => ({
      message_id: messageIdCol > 0 ? String(row[messageIdCol - 1] || "") : "",
      content: String(row[contentCol - 1] || ""),
      created_at: createdCol > 0 ? formatCellDateTime_(row[createdCol - 1]) : ""
    }))
    .filter((msg) => msg.content);
}

function getSentMessages_(participantId) {
  const sheet = getSheetByName_(MESSAGES_SHEET_NAME);
  if (!sheet) return [];

  const headers = getHeaders_(sheet);
  const senderCol = getColumnIndex_(headers, "sender_id");
  const receiverCol = getColumnIndex_(headers, "receiver_id");
  const contentCol = getColumnIndex_(headers, "content");
  const createdCol = getColumnIndex_(headers, "created_at");
  const messageIdCol = getColumnIndex_(headers, "message_id");

  if (senderCol < 0 || receiverCol < 0 || contentCol < 0) return [];

  return getDataRows_(sheet)
    .filter((row) => normalizeId_(row[senderCol - 1]) === participantId)
    .map((row) => ({
      message_id: messageIdCol > 0 ? String(row[messageIdCol - 1] || "") : "",
      receiver_id: normalizeId_(row[receiverCol - 1]),
      content: String(row[contentCol - 1] || ""),
      created_at: createdCol > 0 ? formatCellDateTime_(row[createdCol - 1]) : ""
    }))
    .filter((msg) => msg.content);
}

function handleSendMessage_(data) {
  if (!isMessagingOpen_()) {
    return {
      status: "error",
      messaging_status: "CLOSE",
      message: "留言功能目前已關閉，暫時無法發送留言"
    };
  }

  const senderId = normalizeId_(data.sender_id);
  const phoneNumber = normalizePhone_(data.phone_number);
  const receiverId = normalizeId_(data.receiver_id);
  const content = String(data.content || "").trim();

  if (!senderId || !phoneNumber || !receiverId || !content) {
    return {
      status: "error",
      message: "請提供完整的留言資料"
    };
  }

  if (!verifyParticipant_(senderId, phoneNumber)) {
    return {
      status: "error",
      message: "身份驗證失敗：電話號碼或參加者 ID 不正確"
    };
  }

  if (!participantExists_(receiverId)) {
    return {
      status: "error",
      message: "接收對象不存在"
    };
  }

  if (senderId === receiverId) {
    return {
      status: "error",
      message: "不能發送留言給自己"
    };
  }

  const sheet = getSheetByName_(MESSAGES_SHEET_NAME);
  if (!sheet) {
    return {
      status: "error",
      message: '找不到 "Messages" 工作表'
    };
  }

  ensureMessageHeaders_(sheet);

  const messageId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date();

  sheet.appendRow([
    messageId,
    senderId,
    receiverId,
    content,
    createdAt
  ]);

  return {
    status: "success",
    message_id: messageId,
    created_at: formatDateTime_(createdAt)
  };
}

/* ==========================================
   Messaging Open / Close
   ========================================== */

function getOpenSheet_() {
  return getSheetByName_(OPEN_SHEET_NAME);
}

function getMessagingStatusValue_() {
  const sheet = getOpenSheet_();
  if (!sheet) return "OPEN";

  const value = String(sheet.getRange(OPEN_CELL).getValue() || "OPEN").trim().toUpperCase();
  return value === "CLOSE" ? "CLOSE" : "OPEN";
}

function isMessagingOpen_() {
  return getMessagingStatusValue_() === "OPEN";
}

function handleGetMessagingStatus_() {
  return {
    status: "success",
    messaging_status: getMessagingStatusValue_()
  };
}

function handleSetMessagingStatus_(password, messagingStatus) {
  if (String(password || "") !== ADMIN_PASSWORD) {
    return { status: "error", message: "密碼錯誤" };
  }

  const normalized = String(messagingStatus || "").trim().toUpperCase();
  if (normalized !== "OPEN" && normalized !== "CLOSE") {
    return { status: "error", message: "無效的狀態，請使用 OPEN 或 CLOSE" };
  }

  const sheet = getOpenSheet_();
  if (!sheet) {
    return { status: "error", message: '找不到 "Open" 工作表' };
  }

  sheet.getRange(OPEN_CELL).setValue(normalized);

  return {
    status: "success",
    messaging_status: normalized,
    message: normalized === "OPEN" ? "留言功能已開通" : "留言功能已關閉"
  };
}

/* ==========================================
   Helpers
   ========================================== */

function getSheetByName_(name) {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function getHeaders_(sheet) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0]
    .map((header) => String(header || "").trim().toLowerCase());
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const lastCol = Math.max(sheet.getLastColumn(), 1);
  return sheet.getRange(2, 1, lastRow, lastCol).getValues();
}

function getColumnIndex_(headers, columnName) {
  return headers.indexOf(String(columnName).trim().toLowerCase()) + 1;
}

function ensureMessageHeaders_(sheet) {
  if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) return;

  sheet.getRange(1, 1, 1, 5).setValues([[
    "message_id",
    "sender_id",
    "receiver_id",
    "content",
    "created_at"
  ]]);
}

function normalizeId_(value) {
  return String(value || "").trim().toUpperCase();
}

function normalizePhone_(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

function formatCellDateTime_(value) {
  if (value instanceof Date) {
    return formatDateTime_(value);
  }
  return String(value || "");
}

function parsePostBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("缺少 POST 資料");
  }
  return JSON.parse(e.postData.contents);
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
