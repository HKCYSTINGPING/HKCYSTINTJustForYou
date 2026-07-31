/**
 * HKCYSTINTJustForYou — Anonymous Messaging Web App
 * Google Sheets tabs:
 *   - Participants: participant_id, phone_number
 *   - Messages: message_id, sender_id, receiver_id, content, created_at, status, deleted_at
 *   - Open: A2 = OPEN or CLOSE
 */

const SCRIPT_VERSION = 11;

const PARTICIPANTS_SHEET_NAME = "Participants";
const MESSAGES_SHEET_NAME = "Messages";
const OPEN_SHEET_NAME = "Open";
const OPEN_CELL = "A2";
const ADMIN_PASSWORD = "TNIT23082026";
const ADMIN_PARTICIPANT_ID = "ADMIN";
const ADMIN_PHONE = "23082026";

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

    if (action === "bootstrap") {
      return jsonResponse_(handleBootstrap_());
    }

    if (action === "get_messaging_status") {
      return jsonResponse_(handleGetMessagingStatus_(params));
    }

    if (action === "admin_list_messages") {
      return jsonResponse_(handleAdminListMessages_(params.password, params.participant_id, params.phone_number));
    }

    if (action === "admin_watch_messages") {
      return jsonResponse_(handleAdminWatchMessages_(params.password, params.participant_id, params.phone_number, params.revision));
    }

    if (action === "admin_delete_message") {
      return jsonResponse_(handleAdminDeleteMessage_(params.password, params.participant_id, params.phone_number, params.message_id));
    }

    if (action === "set_messaging_status") {
      return jsonResponse_(handleSetMessagingStatus_(params.password, params.participant_id, params.phone_number, params.messaging_status));
    }

    const participantId = normalizeId_(params.participant_id);
    const phoneNumber = normalizePhone_(params.phone_number);
    const fetchType = String(params.fetch_type || "inbox").trim().toLowerCase();

    if (isAdminCredentials_(participantId, phoneNumber)) {
      if (fetchType === "admin") {
        const messages = getAdminAllMessages_();
        if (!messages) {
          return jsonResponse_({
            status: "error",
            message: '找不到 "Messages" 工作表'
          });
        }

        return jsonResponse_({
          status: "success",
          role: "admin",
          messages: messages,
          revision: getAdminMessagesRevision_(messages),
          messaging_status: getMessagingStatusValue_()
        });
      }

      return jsonResponse_({
        status: "error",
        message: "管理員身份驗證失敗"
      });
    }

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
        sent_messages: getSentMessages_(participantId),
        messaging_status: getMessagingStatusValue_()
      });
    }

    return jsonResponse_({
      status: "success",
      messages: getInboxMessages_(participantId),
      messaging_status: getMessagingStatusValue_()
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
      return jsonResponse_(handleSetMessagingStatus_(data.password, data.participant_id, data.phone_number, data.messaging_status));
    }

    if (data.action === "admin_list_messages") {
      return jsonResponse_(handleAdminListMessages_(data.password, data.participant_id, data.phone_number));
    }

    if (data.action === "admin_watch_messages") {
      return jsonResponse_(handleAdminWatchMessages_(data.password, data.participant_id, data.phone_number, data.revision));
    }

    if (data.action === "admin_delete_message") {
      return jsonResponse_(handleAdminDeleteMessage_(data.password, data.participant_id, data.phone_number, data.message_id));
    }

    if (data.action) {
      return jsonResponse_({
        status: "error",
        message: "不支援的操作"
      });
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
      api_version: SCRIPT_VERSION,
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
    api_version: SCRIPT_VERSION,
    participants: unique
  };
}

function handleBootstrap_() {
  const participantsResult = listParticipants_();
  if (participantsResult.status === "error") {
    return participantsResult;
  }

  return {
    status: "success",
    version: SCRIPT_VERSION,
    api_version: SCRIPT_VERSION,
    participants: participantsResult.participants || [],
    messaging_status: getMessagingStatusValue_()
  };
}

function validateSendParticipants_(senderId, phoneNumber, receiverId) {
  const sheet = getSheetByName_(PARTICIPANTS_SHEET_NAME);
  if (!sheet) {
    return { ok: false, message: '找不到 "Participants" 工作表' };
  }

  const headers = getHeaders_(sheet);
  const idCol = getColumnIndex_(headers, "participant_id");
  const phoneCol = getColumnIndex_(headers, "phone_number");
  if (idCol < 1 || phoneCol < 1) {
    return { ok: false, message: "Participants 工作表格式不正確" };
  }

  const rows = getDataRows_(sheet);
  let senderOk = false;
  let receiverOk = false;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const id = normalizeId_(row[idCol - 1]);
    if (id === senderId && normalizePhone_(row[phoneCol - 1]) === phoneNumber) {
      senderOk = true;
    }
    if (id === receiverId) {
      receiverOk = true;
    }
    if (senderOk && receiverOk) {
      break;
    }
  }

  if (!senderOk) {
    return { ok: false, message: "身份驗證失敗：電話號碼或參加者 ID 不正確" };
  }

  if (!receiverOk) {
    return { ok: false, message: "接收對象不存在" };
  }

  return { ok: true };
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
    const status = String(getCell_(row, cols.status)).trim().toLowerCase();
    if (status === MESSAGE_STATUS_DELETED) {
      return true;
    }
  }

  if (cols.deletedAt > 0) {
    return String(getCell_(row, cols.deletedAt)).trim() !== "";
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

  if (message.deleted_at) {
    message.status = MESSAGE_STATUS_DELETED;
  }

  if (message.status === MESSAGE_STATUS_DELETED) {
    message.deleted_reason = "此留言已被管理員撤回，未能送達接收者（管理員決定）";
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

  const participantCheck = validateSendParticipants_(senderId, phoneNumber, receiverId);
  if (!participantCheck.ok) {
    return {
      status: "error",
      message: participantCheck.message
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

function getAdminAllMessages_() {
  const ctx = getMessageSheetContext_();
  if (!ctx) {
    return null;
  }

  return getDataRows_(ctx.sheet)
    .map((row) => mapMessageRow_(row, ctx.cols, { includeSender: true }))
    .filter((msg) => msg.content)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
}

function getAdminMessagesRevision_(messages) {
  return messages
    .map(function (msg) {
      return String(msg.message_id || "") + ":" + String(msg.status || MESSAGE_STATUS_ACTIVE);
    })
    .sort()
    .join("\u0001");
}

function handleAdminListMessages_(password, participantId, phoneNumber) {
  if (!verifyAdminAccess_(password, participantId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const messages = getAdminAllMessages_();
  if (!messages) {
    return { status: "error", message: '找不到 "Messages" 工作表' };
  }

  return {
    status: "success",
    messages: messages,
    revision: getAdminMessagesRevision_(messages)
  };
}

function handleAdminWatchMessages_(password, participantId, phoneNumber, clientRevision) {
  if (!verifyAdminAccess_(password, participantId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const messages = getAdminAllMessages_();
  if (!messages) {
    return { status: "error", message: '找不到 "Messages" 工作表' };
  }

  const revision = getAdminMessagesRevision_(messages);
  const normalizedRevision = String(clientRevision || "").trim();

  return {
    status: "success",
    changed: !normalizedRevision || normalizedRevision !== revision,
    revision: revision,
    messages: messages
  };
}

function handleAdminDeleteMessage_(password, participantId, phoneNumber, messageId) {
  if (!verifyAdminAccess_(password, participantId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
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
  if (cols.messageId < 1) {
    return { status: "error", message: "Messages 工作表缺少 message_id 欄位" };
  }

  if (cols.status < 1) {
    return { status: "error", message: "Messages 工作表缺少 status 欄位，無法刪除留言" };
  }

  const rows = getDataRows_(ctx.sheet);
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (String(getCell_(row, cols.messageId)).trim() !== normalizedId) continue;

    if (isMessageDeleted_(row, cols)) {
      return { status: "error", message: "此留言已被刪除" };
    }

    const sheetRow = i + 2;
    ctx.sheet.getRange(sheetRow, cols.status).setValue(MESSAGE_STATUS_DELETED);
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

function handleGetMessagingStatus_(params) {
  params = params || {};
  const admin = String(params.admin || "").trim();

  if (admin === "list_messages") {
    return handleAdminListMessages_(params.password, params.participant_id, params.phone_number);
  }

  if (admin === "watch_messages") {
    return handleAdminWatchMessages_(params.password, params.participant_id, params.phone_number, params.revision);
  }

  if (admin === "delete_message") {
    return handleAdminDeleteMessage_(params.password, params.participant_id, params.phone_number, params.message_id);
  }

  if (admin === "set_status") {
    return handleSetMessagingStatus_(params.password, params.participant_id, params.phone_number, params.messaging_status);
  }

  return {
    status: "success",
    messaging_status: getMessagingStatusValue_(),
    api_version: SCRIPT_VERSION
  };
}

function handleSetMessagingStatus_(password, participantId, phoneNumber, messagingStatus) {
  if (!verifyAdminAccess_(password, participantId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
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

function isAdminCredentials_(participantId, phoneNumber) {
  return normalizeId_(participantId) === ADMIN_PARTICIPANT_ID &&
    normalizePhone_(phoneNumber) === ADMIN_PHONE;
}

function verifyAdminAccess_(password, participantId, phoneNumber) {
  if (isAdminCredentials_(participantId, phoneNumber)) {
    return true;
  }
  return verifyAdminPassword_(password);
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
