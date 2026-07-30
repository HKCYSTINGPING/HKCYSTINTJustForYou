/**
 * HKCYSTINTJustForYou — Anonymous Messaging Web App
 * Google Sheets tabs:
 *   - Participants: participant_id, phone_number
 *   - Messages: message_id, sender_id, receiver_id, content, created_at, status, deleted_at
 *   - Open: A2 = OPEN or CLOSE
 */

const SCRIPT_VERSION = 3;

const PARTICIPANTS_SHEET_NAME = "Participants";
const MESSAGES_SHEET_NAME = "Messages";
const OPEN_SHEET_NAME = "Open";
const OPEN_CELL = "A2";
const ADMIN_PASSWORD = "TNIT23082026";

const MESSAGE_STATUS_ACTIVE = "active";
const MESSAGE_STATUS_DELETED = "deleted";

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

    if (data.action === "admin_list_messages") {
      return jsonResponse_(handleAdminListMessages_(data.password));
    }

    if (data.action === "admin_delete_message") {
      return jsonResponse_(handleAdminDeleteMessage_(data.password, data.message_id));
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

function getMessageSheetContext_() {
  const sheet = getSheetByName_(MESSAGES_SHEET_NAME);
  if (!sheet) return null;

  ensureMessageHeaders_(sheet);
  const headers = getHeaders_(sheet);

  return {
    sheet: sheet,
    headers: headers,
    cols: {
      messageId: getColumnIndex_(headers, "message_id"),
      senderId: getColumnIndex_(headers, "sender_id"),
      receiverId: getColumnIndex_(headers, "receiver_id"),
      content: getColumnIndex_(headers, "content"),
      createdAt: getColumnIndex_(headers, "created_at"),
      status: getColumnIndex_(headers, "status"),
      deletedAt: getColumnIndex_(headers, "deleted_at")
    }
  };
}

function getCell_(row, col) {
  return col > 0 ? row[col - 1] : "";
}

function isMessageDeleted_(row, cols) {
  if (cols.status > 0) {
    return String(getCell_(row, cols.status)).trim().toLowerCase() === MESSAGE_STATUS_DELETED;
  }
  return false;
}

function mapMessageRow_(row, cols, options) {
  const includeSender = options && options.includeSender;
  const message = {
    message_id: String(getCell_(row, cols.messageId) || ""),
    receiver_id: normalizeId_(getCell_(row, cols.receiverId)),
    content: String(getCell_(row, cols.content) || ""),
    created_at: cols.createdAt > 0 ? formatCellDateTime_(getCell_(row, cols.createdAt)) : "",
    status: cols.status > 0 ? String(getCell_(row, cols.status) || MESSAGE_STATUS_ACTIVE).trim().toLowerCase() : MESSAGE_STATUS_ACTIVE,
    deleted_at: cols.deletedAt > 0 ? formatCellDateTime_(getCell_(row, cols.deletedAt)) : ""
  };

  if (includeSender) {
    message.sender_id = normalizeId_(getCell_(row, cols.senderId));
  }

  if (message.status === MESSAGE_STATUS_DELETED) {
    message.deleted_reason = "此留言已被管理員刪除（管理員監察）";
  }

  return message;
}

function getInboxMessages_(participantId) {
  const ctx = getMessageSheetContext_();
  if (!ctx) return [];

  const cols = ctx.cols;
  if (cols.receiverId < 0 || cols.content < 0) return [];

  return getDataRows_(ctx.sheet)
    .filter((row) => normalizeId_(getCell_(row, cols.receiverId)) === participantId)
    .filter((row) => !isMessageDeleted_(row, cols))
    .map((row) => mapMessageRow_(row, cols))
    .filter((msg) => msg.content);
}

function getSentMessages_(participantId) {
  const ctx = getMessageSheetContext_();
  if (!ctx) return [];

  const cols = ctx.cols;
  if (cols.senderId < 0 || cols.receiverId < 0 || cols.content < 0) return [];

  return getDataRows_(ctx.sheet)
    .filter((row) => normalizeId_(getCell_(row, cols.senderId)) === participantId)
    .map((row) => mapMessageRow_(row, cols))
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

  const ctx = getMessageSheetContext_();
  if (!ctx) {
    return {
      status: "error",
      message: '找不到 "Messages" 工作表'
    };
  }

  const messageId = `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const createdAt = new Date();
  const rowValues = buildMessageRowValues_(ctx.cols, {
    message_id: messageId,
    sender_id: senderId,
    receiver_id: receiverId,
    content: content,
    created_at: createdAt,
    status: MESSAGE_STATUS_ACTIVE,
    deleted_at: ""
  });

  ctx.sheet.appendRow(rowValues);

  return {
    status: "success",
    message_id: messageId,
    created_at: formatDateTime_(createdAt)
  };
}

function handleAdminListMessages_(password) {
  if (!verifyAdminPassword_(password)) {
    return { status: "error", message: "密碼錯誤" };
  }

  const ctx = getMessageSheetContext_();
  if (!ctx) {
    return { status: "error", message: '找不到 "Messages" 工作表' };
  }

  const messages = getDataRows_(ctx.sheet)
    .filter((row) => !isMessageDeleted_(row, ctx.cols))
    .map((row) => mapMessageRow_(row, ctx.cols, { includeSender: true }))
    .filter((msg) => msg.content)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return {
    status: "success",
    messages: messages
  };
}

function handleAdminDeleteMessage_(password, messageId) {
  if (!verifyAdminPassword_(password)) {
    return { status: "error", message: "密碼錯誤" };
  }

  const normalizedId = String(messageId || "").trim();
  if (!normalizedId) {
    return { status: "error", message: "請提供 message_id" };
  }

  const ctx = getMessageSheetContext_();
  if (!ctx) {
    return { status: "error", message: '找不到 "Messages" 工作表' };
  }

  const cols = ctx.cols;
  if (cols.messageId < 0) {
    return { status: "error", message: "Messages 工作表缺少 message_id 欄位" };
  }

  const rows = getDataRows_(ctx.sheet);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (String(getCell_(row, cols.messageId)).trim() !== normalizedId) continue;

    if (isMessageDeleted_(row, cols)) {
      return { status: "error", message: "此留言已被刪除" };
    }

    const sheetRow = i + 2;
    if (cols.status > 0) {
      ctx.sheet.getRange(sheetRow, cols.status).setValue(MESSAGE_STATUS_DELETED);
    }
    if (cols.deletedAt > 0) {
      ctx.sheet.getRange(sheetRow, cols.deletedAt).setValue(new Date());
    }

    return {
      status: "success",
      message_id: normalizedId,
      message: "留言已刪除"
    };
  }

  return { status: "error", message: "找不到指定留言" };
}

function buildMessageRowValues_(cols, data) {
  const lastCol = Math.max(
    cols.messageId,
    cols.senderId,
    cols.receiverId,
    cols.content,
    cols.createdAt,
    cols.status,
    cols.deletedAt
  );

  const row = new Array(lastCol).fill("");

  if (cols.messageId > 0) row[cols.messageId - 1] = data.message_id;
  if (cols.senderId > 0) row[cols.senderId - 1] = data.sender_id;
  if (cols.receiverId > 0) row[cols.receiverId - 1] = data.receiver_id;
  if (cols.content > 0) row[cols.content - 1] = data.content;
  if (cols.createdAt > 0) row[cols.createdAt - 1] = data.created_at;
  if (cols.status > 0) row[cols.status - 1] = data.status;
  if (cols.deletedAt > 0) row[cols.deletedAt - 1] = data.deleted_at;

  return row;
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
  if (!verifyAdminPassword_(password)) {
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

function verifyAdminPassword_(password) {
  return String(password || "") === ADMIN_PASSWORD;
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
  const requiredHeaders = [
    "message_id",
    "sender_id",
    "receiver_id",
    "content",
    "created_at",
    "status",
    "deleted_at"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return;
  }

  const headers = getHeaders_(sheet);
  let lastCol = sheet.getLastColumn();

  requiredHeaders.forEach((header) => {
    if (getColumnIndex_(headers, header) < 0) {
      lastCol += 1;
      sheet.getRange(1, lastCol).setValue(header);
      headers.push(header);
    }
  });
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
