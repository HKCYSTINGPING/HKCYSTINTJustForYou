/**
 * HKCYSTINTJustForYou — Anonymous Messaging Web App
 * Google Sheets tabs:
 *   - Participants: participant_id, phone_number
 *   - Messages: message_id, sender_id, receiver_id, content, created_at, status, deleted_at
 *   - Open: A2 = OPEN or CLOSE
 *   - Trophy: Trophy_id, Trophy_name
 *   - Trophy_log: Tmessage_id, sender_id, receiver_id, Trophy_id
 *   - Trophy_draft: (same columns as Trophy_log)
 *   - Trophy_submissions: participant_id, submission_status, submitted_at, updated_at
 *   - Trophy_results: participant_id, Trophy_id, award_source, calculated_at
 *   - Voting: A2=status, B2=allow_resubmit, C2=calculated_at, D2=published_at
 *   - Participants optional column: group_id
 */

const SCRIPT_VERSION = 13;

const PARTICIPANTS_SHEET_NAME = "Participants";
const MESSAGES_SHEET_NAME = "Messages";
const OPEN_SHEET_NAME = "Open";
const OPEN_CELL = "A2";
const TROPHY_SHEET_NAME = "Trophy";
const TROPHY_LOG_SHEET_NAME = "Trophy_log";
const TROPHY_DRAFT_SHEET_NAME = "Trophy_draft";
const TROPHY_SUBMISSIONS_SHEET_NAME = "Trophy_submissions";
const TROPHY_RESULTS_SHEET_NAME = "Trophy_results";
const VOTING_SHEET_NAME = "Voting";
const VOTING_STATUS_CELL = "A2";
const VOTING_ALLOW_RESUBMIT_CELL = "B2";
const VOTING_CALCULATED_AT_CELL = "C2";
const VOTING_PUBLISHED_AT_CELL = "D2";
const SUBMISSION_DRAFT = "draft";
const SUBMISSION_SUBMITTED = "submitted";
const AWARD_ROUND1 = "round1";
const AWARD_FALLBACK = "fallback";
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

    if (action === "trophy_bootstrap") {
      const trophyPid = normalizeId_(params.participant_id);
      const trophyPhone = normalizePhone_(params.phone_number);
      if (!trophyPid || !trophyPhone) {
        return jsonResponse_({ status: "error", message: "請提供 participant_id 與 phone_number" });
      }
      if (!verifyParticipant_(trophyPid, trophyPhone)) {
        return jsonResponse_({ status: "error", message: "身份驗證失敗" });
      }
      return jsonResponse_(handleTrophyBootstrap_(trophyPid));
    }

    if (action === "admin_trophy_overview") {
      return jsonResponse_(handleAdminTrophyOverview_(params.participant_id, params.phone_number, params.password));
    }

    if (action === "admin_trophy_audit") {
      return jsonResponse_(handleAdminTrophyAudit_(params.participant_id, params.phone_number, params.password));
    }

    if (action === "admin_trophy_results") {
      return jsonResponse_(handleAdminTrophyResults_(params.participant_id, params.phone_number, params.password));
    }

    if (action === "admin_set_voting_status") {
      return jsonResponse_(handleAdminSetVotingStatus_(params));
    }

    if (action === "admin_calculate_trophy_results") {
      return jsonResponse_(handleAdminCalculateTrophyResults_(params));
    }

    if (action === "admin_reset_participant_vote") {
      return jsonResponse_(handleAdminResetParticipantVote_(params));
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
          messaging_status: getMessagingStatusValue_(),
          voting_status: getVotingStatusValue_(),
          allow_resubmit: getAllowResubmitValue_()
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

    if (data.action === "trophy_save_draft") {
      return jsonResponse_(handleTrophySaveDraft_(data));
    }

    if (data.action === "trophy_submit") {
      return jsonResponse_(handleTrophySubmit_(data));
    }

    if (data.action === "admin_set_voting_status") {
      return jsonResponse_(handleAdminSetVotingStatus_(data));
    }

    if (data.action === "admin_calculate_trophy_results") {
      return jsonResponse_(handleAdminCalculateTrophyResults_(data));
    }

    if (data.action === "admin_reset_participant_vote") {
      return jsonResponse_(handleAdminResetParticipantVote_(data));
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
  return String(password || "").trim().toUpperCase() === String(ADMIN_PASSWORD).toUpperCase();
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

/* ==========================================
   Trophy Voting System
   ========================================== */

function getVotingSheet_() {
  return getSheetByName_(VOTING_SHEET_NAME);
}

function ensureVotingSheet_() {
  let sheet = getVotingSheet_();
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet(VOTING_SHEET_NAME);
    sheet.getRange("A1").setValue("voting_status");
    sheet.getRange("B1").setValue("allow_resubmit");
    sheet.getRange("C1").setValue("calculated_at");
    sheet.getRange("D1").setValue("published_at");
    sheet.getRange(VOTING_STATUS_CELL).setValue("DRAFT");
    sheet.getRange(VOTING_ALLOW_RESUBMIT_CELL).setValue("FALSE");
  }
  return sheet;
}

function getVotingStatusValue_() {
  const sheet = getVotingSheet_();
  if (!sheet) return "DRAFT";
  const value = String(sheet.getRange(VOTING_STATUS_CELL).getValue() || "DRAFT").trim().toUpperCase();
  const allowed = ["DRAFT", "VOTING_OPEN", "VOTING_CLOSED", "CALCULATED", "PUBLISHED"];
  return allowed.indexOf(value) >= 0 ? value : "DRAFT";
}

function getAllowResubmitValue_() {
  const sheet = getVotingSheet_();
  if (!sheet) return false;
  const value = String(sheet.getRange(VOTING_ALLOW_RESUBMIT_CELL).getValue() || "").trim().toUpperCase();
  return value === "TRUE" || value === "YES" || value === "1";
}

function isVotingOpen_() {
  return getVotingStatusValue_() === "VOTING_OPEN";
}

function getParticipantsMeta_() {
  const sheet = getSheetByName_(PARTICIPANTS_SHEET_NAME);
  if (!sheet) return null;

  const headers = getHeaders_(sheet);
  const idCol = getColumnIndex_(headers, "participant_id");
  const phoneCol = getColumnIndex_(headers, "phone_number");
  const groupCol = getColumnIndex_(headers, "group_id");
  if (idCol < 1) return null;

  const rows = getDataRows_(sheet);
  const participants = [];

  rows.forEach((row) => {
    const id = normalizeId_(getCell_(row, idCol));
    if (!id || id === ADMIN_PARTICIPANT_ID) return;

    let groupId = groupCol > 0 ? normalizeId_(getCell_(row, groupCol)) : "";
    if (!groupId) {
      groupId = deriveGroupIdFromParticipantId_(id);
    }

    participants.push({
      participant_id: id,
      phone_number: phoneCol > 0 ? normalizePhone_(getCell_(row, phoneCol)) : "",
      group_id: groupId
    });
  });

  return { sheet: sheet, participants: participants };
}

function deriveGroupIdFromParticipantId_(participantId) {
  const id = normalizeId_(participantId);
  const match = id.match(/^\d+([A-Z]+)$/);
  if (match) return match[1];
  const letters = id.replace(/^\d+/, "");
  return letters || id;
}

function getParticipantRecord_(participantId) {
  const meta = getParticipantsMeta_();
  if (!meta) return null;
  return meta.participants.find((p) => p.participant_id === normalizeId_(participantId)) || null;
}

function getGroupTeammates_(participantId) {
  const record = getParticipantRecord_(participantId);
  if (!record) return [];

  const meta = getParticipantsMeta_();
  return meta.participants
    .filter((p) => p.group_id === record.group_id && p.participant_id !== normalizeId_(participantId))
    .map((p) => p.participant_id)
    .sort();
}

function getAllVotingParticipants_() {
  const meta = getParticipantsMeta_();
  if (!meta) return [];
  return meta.participants.map((p) => p.participant_id).sort();
}

function listTrophies_() {
  const sheet = getSheetByName_(TROPHY_SHEET_NAME);
  if (!sheet) {
    return { status: "error", message: '找不到 "Trophy" 工作表' };
  }

  const headers = getHeaders_(sheet);
  const idCol = getColumnIndex_(headers, "trophy_id");
  const nameCol = getColumnIndex_(headers, "trophy_name");
  if (idCol < 1) {
    return { status: "error", message: "Trophy 工作表缺少 Trophy_id 欄位" };
  }

  const trophies = getDataRows_(sheet)
    .map((row) => ({
      trophy_id: String(getCell_(row, idCol) || "").trim(),
      trophy_name: nameCol > 0 ? String(getCell_(row, nameCol) || "").trim() : ""
    }))
    .filter((t) => t.trophy_id)
    .sort((a, b) => String(a.trophy_id).localeCompare(String(b.trophy_id), undefined, { numeric: true }));

  return { status: "success", trophies: trophies };
}

function getValidTrophyIdSet_() {
  const result = listTrophies_();
  if (result.status !== "success") return null;
  const set = {};
  result.trophies.forEach((t) => {
    set[String(t.trophy_id).trim()] = true;
  });
  return set;
}

function getTrophyPairSheetContext_(sheetName) {
  ensureTrophyPairSheet_(sheetName);
  const sheet = getSheetByName_(sheetName);
  if (!sheet) return null;

  const headers = getHeaders_(sheet);
  return {
    sheet: sheet,
    cols: {
      messageId: getColumnIndex_(headers, "tmessage_id"),
      senderId: getColumnIndex_(headers, "sender_id"),
      receiverId: getColumnIndex_(headers, "receiver_id"),
      trophyId: getColumnIndex_(headers, "trophy_id")
    }
  };
}

function readTrophyPairRows_(sheetName, senderId) {
  const ctx = getTrophyPairSheetContext_(sheetName);
  if (!ctx) return [];

  const cols = ctx.cols;
  if (cols.senderId < 1 || cols.receiverId < 1 || cols.trophyId < 1) return [];

  const normalizedSender = normalizeId_(senderId);
  return getDataRows_(ctx.sheet)
    .filter((row) => normalizeId_(getCell_(row, cols.senderId)) === normalizedSender)
    .map((row) => ({
      receiver_id: normalizeId_(getCell_(row, cols.receiverId)),
      trophy_id: String(getCell_(row, cols.trophyId) || "").trim()
    }))
    .filter((p) => p.receiver_id && p.trophy_id);
}

function readAllTrophyPairRows_(sheetName) {
  const ctx = getTrophyPairSheetContext_(sheetName);
  if (!ctx) return [];

  const cols = ctx.cols;
  if (cols.senderId < 1 || cols.receiverId < 1 || cols.trophyId < 1) return [];

  return getDataRows_(ctx.sheet).map((row) => ({
    tmessage_id: cols.messageId > 0 ? String(getCell_(row, cols.messageId) || "").trim() : "",
    sender_id: normalizeId_(getCell_(row, cols.senderId)),
    receiver_id: normalizeId_(getCell_(row, cols.receiverId)),
    trophy_id: String(getCell_(row, cols.trophyId) || "").trim()
  })).filter((p) => p.sender_id && p.receiver_id && p.trophy_id);
}

function deleteTrophyPairRowsForSender_(sheetName, senderId) {
  const ctx = getTrophyPairSheetContext_(sheetName);
  if (!ctx) return;

  const cols = ctx.cols;
  if (cols.senderId < 1) return;

  const rows = getDataRows_(ctx.sheet);
  const normalizedSender = normalizeId_(senderId);

  for (let i = rows.length - 1; i >= 0; i--) {
    if (normalizeId_(getCell_(rows[i], cols.senderId)) === normalizedSender) {
      ctx.sheet.deleteRow(i + 2);
    }
  }
}

function appendTrophyPairRows_(sheetName, senderId, pairings) {
  const ctx = getTrophyPairSheetContext_(sheetName);
  if (!ctx) {
    throw new Error('找不到 "' + sheetName + '" 工作表');
  }

  const cols = ctx.cols;
  const lastCol = Math.max(cols.messageId, cols.senderId, cols.receiverId, cols.trophyId, 4);

  pairings.forEach((pairing) => {
    const row = new Array(lastCol).fill("");
    const messageId = "T-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
    if (cols.messageId > 0) row[cols.messageId - 1] = messageId;
    if (cols.senderId > 0) row[cols.senderId - 1] = normalizeId_(senderId);
    if (cols.receiverId > 0) row[cols.receiverId - 1] = normalizeId_(pairing.receiver_id);
    if (cols.trophyId > 0) row[cols.trophyId - 1] = String(pairing.trophy_id).trim();
    ctx.sheet.appendRow(row);
    Utilities.sleep(1);
  });
}

function normalizePairingsInput_(pairings) {
  if (!Array.isArray(pairings)) return [];

  const deduped = [];
  const seen = {};

  pairings.forEach((item) => {
    const receiverId = normalizeId_(item.receiver_id);
    const trophyId = String(item.trophy_id || "").trim();
    if (!receiverId || !trophyId) return;

    const key = receiverId + "\u0001" + trophyId;
    if (seen[key]) return;
    seen[key] = true;
    deduped.push({ receiver_id: receiverId, trophy_id: trophyId });
  });

  return deduped;
}

function validateTrophyPairingsPartial_(senderId, pairings, requireAllReceivers) {
  const normalizedSender = normalizeId_(senderId);
  const record = getParticipantRecord_(normalizedSender);
  if (!record) {
    return { ok: false, message: "找不到參加者資料" };
  }

  const trophySet = getValidTrophyIdSet_();
  if (!trophySet) {
    return { ok: false, message: "無法讀取 Trophy 清單" };
  }

  const teammates = getGroupTeammates_(normalizedSender);
  const teammateSet = {};
  teammates.forEach((id) => {
    teammateSet[id] = true;
  });

  const receiverCounts = {};
  teammates.forEach((id) => {
    receiverCounts[id] = 0;
  });

  for (let i = 0; i < pairings.length; i++) {
    const pairing = pairings[i];
    const receiverId = normalizeId_(pairing.receiver_id);
    const trophyId = String(pairing.trophy_id || "").trim();

    if (!receiverId || !trophyId) {
      return { ok: false, message: "不可以提交空白配對" };
    }

    if (receiverId === normalizedSender) {
      return { ok: false, message: "不能投票給自己" };
    }

    if (!participantExists_(receiverId)) {
      return { ok: false, message: "接收對象不存在：" + receiverId };
    }

    if (!teammateSet[receiverId]) {
      return { ok: false, message: "只能為同組成員配對 Trophy：" + receiverId };
    }

    if (!trophySet[trophyId]) {
      return { ok: false, message: "無效的 Trophy_id：" + trophyId };
    }

    receiverCounts[receiverId] = (receiverCounts[receiverId] || 0) + 1;
  }

  if (requireAllReceivers) {
    const incomplete = teammates.filter((id) => (receiverCounts[id] || 0) < 1);
    if (incomplete.length > 0) {
      return {
        ok: false,
        message: "尚有成員未完成 Trophy 配對",
        incomplete_receivers: incomplete
      };
    }
  }

  return { ok: true, teammates: teammates, receiver_counts: receiverCounts };
}

function validateTrophyPairings_(senderId, pairings) {
  return validateTrophyPairingsPartial_(senderId, pairings, true);
}

function ensureTrophyPairSheet_(sheetName) {
  let sheet = getSheetByName_(sheetName);
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, 4).setValues([["Tmessage_id", "sender_id", "receiver_id", "Trophy_id"]]);
  }
  return sheet;
}

function ensureSubmissionSheet_() {
  let sheet = getSheetByName_(TROPHY_SUBMISSIONS_SHEET_NAME);
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet(TROPHY_SUBMISSIONS_SHEET_NAME);
    sheet.getRange(1, 1, 1, 4).setValues([["participant_id", "submission_status", "submitted_at", "updated_at"]]);
  }
  return sheet;
}

function ensureResultsSheet_() {
  let sheet = getSheetByName_(TROPHY_RESULTS_SHEET_NAME);
  if (!sheet) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    sheet = ss.insertSheet(TROPHY_RESULTS_SHEET_NAME);
    sheet.getRange(1, 1, 1, 4).setValues([["participant_id", "Trophy_id", "award_source", "calculated_at"]]);
  }
  return sheet;
}

function getSubmissionSheetContext_() {
  ensureSubmissionSheet_();
  const sheet = getSheetByName_(TROPHY_SUBMISSIONS_SHEET_NAME);
  if (!sheet) return null;

  const headers = getHeaders_(sheet);
  return {
    sheet: sheet,
    cols: {
      participantId: getColumnIndex_(headers, "participant_id"),
      status: getColumnIndex_(headers, "submission_status"),
      submittedAt: getColumnIndex_(headers, "submitted_at"),
      updatedAt: getColumnIndex_(headers, "updated_at")
    }
  };
}

function getSubmissionStatus_(participantId) {
  const ctx = getSubmissionSheetContext_();
  if (!ctx || ctx.cols.participantId < 1 || ctx.cols.status < 1) {
    return null;
  }

  const rows = getDataRows_(ctx.sheet);
  const normalizedId = normalizeId_(participantId);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (normalizeId_(getCell_(row, ctx.cols.participantId)) !== normalizedId) continue;

    return {
      submission_status: String(getCell_(row, ctx.cols.status) || "").trim().toLowerCase(),
      submitted_at: ctx.cols.submittedAt > 0 ? formatCellDateTime_(getCell_(row, ctx.cols.submittedAt)) : "",
      updated_at: ctx.cols.updatedAt > 0 ? formatCellDateTime_(getCell_(row, ctx.cols.updatedAt)) : "",
      rowIndex: i + 2
    };
  }

  return null;
}

function upsertSubmissionStatus_(participantId, status) {
  const ctx = getSubmissionSheetContext_();
  if (!ctx) {
    throw new Error('找不到 "' + TROPHY_SUBMISSIONS_SHEET_NAME + '" 工作表');
  }

  const now = new Date();
  const existing = getSubmissionStatus_(participantId);
  const normalizedStatus = String(status || "").trim().toLowerCase();

  if (existing && existing.rowIndex) {
    ctx.sheet.getRange(existing.rowIndex, ctx.cols.status).setValue(normalizedStatus);
    ctx.sheet.getRange(existing.rowIndex, ctx.cols.updatedAt).setValue(now);
    if (normalizedStatus === SUBMISSION_SUBMITTED && ctx.cols.submittedAt > 0) {
      ctx.sheet.getRange(existing.rowIndex, ctx.cols.submittedAt).setValue(now);
    }
    return;
  }

  const row = new Array(Math.max(ctx.cols.participantId, ctx.cols.status, ctx.cols.submittedAt, ctx.cols.updatedAt, 4)).fill("");
  row[ctx.cols.participantId - 1] = normalizeId_(participantId);
  row[ctx.cols.status - 1] = normalizedStatus;
  if (ctx.cols.updatedAt > 0) row[ctx.cols.updatedAt - 1] = now;
  if (normalizedStatus === SUBMISSION_SUBMITTED && ctx.cols.submittedAt > 0) {
    row[ctx.cols.submittedAt - 1] = now;
  }
  ctx.sheet.appendRow(row);
}

function handleTrophyBootstrap_(participantId) {
  const trophiesResult = listTrophies_();
  if (trophiesResult.status !== "success") {
    return trophiesResult;
  }

  const record = getParticipantRecord_(participantId);
  if (!record) {
    return { status: "error", message: "找不到參加者資料" };
  }

  const submission = getSubmissionStatus_(participantId);
  const submissionStatus = submission ? submission.submission_status : null;
  let pairings = [];

  if (submissionStatus === SUBMISSION_SUBMITTED) {
    pairings = readTrophyPairRows_(TROPHY_LOG_SHEET_NAME, participantId);
  } else {
    pairings = readTrophyPairRows_(TROPHY_DRAFT_SHEET_NAME, participantId);
  }

  const teammates = getGroupTeammates_(participantId);
  const completedReceivers = {};
  pairings.forEach((p) => {
    completedReceivers[p.receiver_id] = true;
  });
  const completedCount = teammates.filter((id) => completedReceivers[id]).length;

  return {
    status: "success",
    version: SCRIPT_VERSION,
    voting_status: getVotingStatusValue_(),
    allow_resubmit: getAllowResubmitValue_(),
    trophies: trophiesResult.trophies,
    group_id: record.group_id,
    teammates: teammates,
    submission_status: submissionStatus,
    submitted_at: submission ? submission.submitted_at : "",
    pairings: pairings,
    progress: {
      completed_receivers: completedCount,
      total_receivers: teammates.length
    }
  };
}

function handleTrophySaveDraft_(data) {
  const senderId = normalizeId_(data.participant_id);
  const phoneNumber = normalizePhone_(data.phone_number);

  if (!verifyParticipant_(senderId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  if (!isVotingOpen_()) {
    return { status: "error", message: "投票尚未開放或已關閉" };
  }

  const submission = getSubmissionStatus_(senderId);
  if (submission && submission.submission_status === SUBMISSION_SUBMITTED && !getAllowResubmitValue_()) {
    return { status: "error", message: "您已完成投票，無法再修改" };
  }

  const pairings = normalizePairingsInput_(data.pairings || []);
  const validation = validateTrophyPairingsPartial_(senderId, pairings, false);
  if (!validation.ok) {
    return {
      status: "error",
      message: validation.message,
      incomplete_receivers: validation.incomplete_receivers || []
    };
  }

  if (!getTrophyPairSheetContext_(TROPHY_DRAFT_SHEET_NAME)) {
    return { status: "error", message: '找不到 "Trophy_draft" 工作表' };
  }

  deleteTrophyPairRowsForSender_(TROPHY_DRAFT_SHEET_NAME, senderId);
  if (pairings.length > 0) {
    appendTrophyPairRows_(TROPHY_DRAFT_SHEET_NAME, senderId, pairings);
  }

  upsertSubmissionStatus_(senderId, SUBMISSION_DRAFT);

  return {
    status: "success",
    message: "草稿已儲存",
    submission_status: SUBMISSION_DRAFT,
    pairings: pairings
  };
}

function handleTrophySubmit_(data) {
  const senderId = normalizeId_(data.participant_id);
  const phoneNumber = normalizePhone_(data.phone_number);

  if (!verifyParticipant_(senderId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  if (!isVotingOpen_()) {
    return { status: "error", message: "投票尚未開放或已關閉，無法提交" };
  }

  const submission = getSubmissionStatus_(senderId);
  if (submission && submission.submission_status === SUBMISSION_SUBMITTED && !getAllowResubmitValue_()) {
    return { status: "error", message: "您已完成投票，無法重複提交" };
  }

  const pairings = normalizePairingsInput_(data.pairings || []);
  const validation = validateTrophyPairings_(senderId, pairings);
  if (!validation.ok) {
    return {
      status: "error",
      message: validation.message,
      incomplete_receivers: validation.incomplete_receivers || []
    };
  }

  if (!getTrophyPairSheetContext_(TROPHY_LOG_SHEET_NAME)) {
    return { status: "error", message: '找不到 "Trophy_log" 工作表' };
  }

  deleteTrophyPairRowsForSender_(TROPHY_LOG_SHEET_NAME, senderId);
  deleteTrophyPairRowsForSender_(TROPHY_DRAFT_SHEET_NAME, senderId);

  if (pairings.length > 0) {
    appendTrophyPairRows_(TROPHY_LOG_SHEET_NAME, senderId, pairings);
  }

  upsertSubmissionStatus_(senderId, SUBMISSION_SUBMITTED);

  return {
    status: "success",
    message: "Trophy 配對已提交",
    submission_status: SUBMISSION_SUBMITTED,
    pairings: pairings
  };
}

function getVotingCompletionStats_() {
  const allParticipants = getAllVotingParticipants_();
  const submitted = [];
  const pending = [];

  allParticipants.forEach((participantId) => {
    const submission = getSubmissionStatus_(participantId);
    if (submission && submission.submission_status === SUBMISSION_SUBMITTED) {
      submitted.push(participantId);
    } else {
      pending.push(participantId);
    }
  });

  const logRows = readAllTrophyPairRows_(TROPHY_LOG_SHEET_NAME);

  return {
    total_participants: allParticipants.length,
    completed_count: submitted.length,
    pending_participants: pending,
    total_votes: logRows.length,
    trophy_count: (listTrophies_().trophies || []).length
  };
}

function handleAdminTrophyOverview_(participantId, phoneNumber, password) {
  if (!verifyAdminAccess_(password, participantId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const stats = getVotingCompletionStats_();
  const resultsCount = readTrophyResults_().length;
  const participantsWithTrophy = countParticipantsWithTrophy_(readTrophyResults_());

  return {
    status: "success",
    voting_status: getVotingStatusValue_(),
    allow_resubmit: getAllowResubmitValue_(),
    stats: stats,
    results_ready: getVotingStatusValue_() === "CALCULATED" || getVotingStatusValue_() === "PUBLISHED",
    participants_with_trophy: participantsWithTrophy,
    calculated_at: getVotingMetaValue_(VOTING_CALCULATED_AT_CELL),
    published_at: getVotingMetaValue_(VOTING_PUBLISHED_AT_CELL)
  };
}

function getVotingMetaValue_(cell) {
  const sheet = getVotingSheet_();
  if (!sheet) return "";
  return formatCellDateTime_(sheet.getRange(cell).getValue());
}

function handleAdminTrophyAudit_(participantId, phoneNumber, password) {
  if (!verifyAdminAccess_(password, participantId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const trophiesResult = listTrophies_();
  const trophyNameMap = {};
  if (trophiesResult.status === "success") {
    trophiesResult.trophies.forEach((t) => {
      trophyNameMap[String(t.trophy_id)] = t.trophy_name;
    });
  }

  const votes = readAllTrophyPairRows_(TROPHY_LOG_SHEET_NAME).map((row) => ({
    tmessage_id: row.tmessage_id,
    sender_id: row.sender_id,
    receiver_id: row.receiver_id,
    trophy_id: row.trophy_id,
    trophy_name: trophyNameMap[row.trophy_id] || ""
  }));

  return {
    status: "success",
    votes: votes,
    stats: getVotingCompletionStats_()
  };
}

function readTrophyResults_() {
  ensureResultsSheet_();
  const sheet = getSheetByName_(TROPHY_RESULTS_SHEET_NAME);
  if (!sheet) return [];

  const headers = getHeaders_(sheet);
  const participantCol = getColumnIndex_(headers, "participant_id");
  const trophyCol = getColumnIndex_(headers, "trophy_id");
  const sourceCol = getColumnIndex_(headers, "award_source");
  const calculatedCol = getColumnIndex_(headers, "calculated_at");

  if (participantCol < 1 || trophyCol < 1) return [];

  return getDataRows_(sheet).map((row) => ({
    participant_id: normalizeId_(getCell_(row, participantCol)),
    trophy_id: String(getCell_(row, trophyCol) || "").trim(),
    award_source: sourceCol > 0 ? String(getCell_(row, sourceCol) || "").trim().toLowerCase() : "",
    calculated_at: calculatedCol > 0 ? formatCellDateTime_(getCell_(row, calculatedCol)) : ""
  })).filter((r) => r.participant_id && r.trophy_id);
}

function countParticipantsWithTrophy_(results) {
  const set = {};
  results.forEach((r) => {
    set[r.participant_id] = true;
  });
  return Object.keys(set).length;
}

function clearTrophyResults_() {
  const sheet = getSheetByName_(TROPHY_RESULTS_SHEET_NAME);
  if (!sheet) return;

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
}

function writeTrophyResults_(results, calculatedAt) {
  ensureResultsSheet_();
  const sheet = getSheetByName_(TROPHY_RESULTS_SHEET_NAME);

  clearTrophyResults_();

  const headers = getHeaders_(sheet);
  const participantCol = getColumnIndex_(headers, "participant_id");
  const trophyCol = getColumnIndex_(headers, "trophy_id");
  const sourceCol = getColumnIndex_(headers, "award_source");
  const calculatedCol = getColumnIndex_(headers, "calculated_at");
  const lastCol = Math.max(participantCol, trophyCol, sourceCol, calculatedCol, 4);

  results.forEach((item) => {
    const row = new Array(lastCol).fill("");
    if (participantCol > 0) row[participantCol - 1] = item.participant_id;
    if (trophyCol > 0) row[trophyCol - 1] = item.trophy_id;
    if (sourceCol > 0) row[sourceCol - 1] = item.award_source;
    if (calculatedCol > 0) row[calculatedCol - 1] = calculatedAt;
    sheet.appendRow(row);
  });
}

function buildVoteCountMap_(logRows, trophyIds) {
  const votes = {};

  logRows.forEach((row) => {
    const receiverId = normalizeId_(row.receiver_id);
    const trophyId = String(row.trophy_id || "").trim();
    if (!receiverId || !trophyId) return;

    if (!votes[receiverId]) votes[receiverId] = {};
    if (!votes[receiverId][trophyId]) votes[receiverId][trophyId] = 0;
    votes[receiverId][trophyId]++;
  });

  return votes;
}

function getParticipantTrophyVoteCount_(votes, participantId, trophyId) {
  return (votes[participantId] && votes[participantId][trophyId]) || 0;
}

function buildTrophyAwardReason_(awardSource, voteCount) {
  if (awardSource === AWARD_ROUND1) {
    return "全組最高票 (" + voteCount + "票)";
  }
  return "個人最高特質 (" + voteCount + "票 - 保底配對)";
}

function pushTrophyAward_(awards, participantId, trophyId, awardSource, votes) {
  const voteCount = getParticipantTrophyVoteCount_(votes, participantId, trophyId);
  awards[participantId].push({
    trophy_id: trophyId,
    award_source: awardSource,
    votes: voteCount
  });
}

function calculateTrophyResults_() {
  const trophiesResult = listTrophies_();
  if (trophiesResult.status !== "success") {
    return trophiesResult;
  }

  const trophyIds = trophiesResult.trophies
    .map((t) => String(t.trophy_id).trim())
    .filter(Boolean)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

  const allParticipants = getAllVotingParticipants_();
  const logRows = readAllTrophyPairRows_(TROPHY_LOG_SHEET_NAME);
  const votes = buildVoteCountMap_(logRows, trophyIds);

  const awards = {};
  allParticipants.forEach((participantId) => {
    awards[participantId] = [];
  });

  let fallbackActivated = false;

  // Round 1: group-wide max votes per trophy (ties win together)
  trophyIds.forEach((trophyId) => {
    let maxCount = 0;
    allParticipants.forEach((participantId) => {
      const count = getParticipantTrophyVoteCount_(votes, participantId, trophyId);
      if (count > maxCount) maxCount = count;
    });

    if (maxCount <= 0) return;

    allParticipants.forEach((participantId) => {
      const count = getParticipantTrophyVoteCount_(votes, participantId, trophyId);
      if (count === maxCount) {
        pushTrophyAward_(awards, participantId, trophyId, AWARD_ROUND1, votes);
      }
    });
  });

  // Fallback: personal highest-vote trophy for participants with zero awards
  allParticipants.forEach((participantId) => {
    if (awards[participantId].length > 0) return;

    fallbackActivated = true;

    let maxReceived = 0;
    trophyIds.forEach((trophyId) => {
      const count = getParticipantTrophyVoteCount_(votes, participantId, trophyId);
      if (count > maxReceived) maxReceived = count;
    });

    let fallbackTrophyIds = trophyIds.filter((trophyId) =>
      getParticipantTrophyVoteCount_(votes, participantId, trophyId) === maxReceived
    );

    // If no votes at all, still guarantee one trophy for 人人有獎
    if (maxReceived === 0 && fallbackTrophyIds.length > 0) {
      fallbackTrophyIds = [fallbackTrophyIds[0]];
    }

    fallbackTrophyIds.forEach((trophyId) => {
      pushTrophyAward_(awards, participantId, trophyId, AWARD_FALLBACK, votes);
    });
  });

  // Safety net: every participant must have at least one trophy
  allParticipants.forEach((participantId) => {
    if (awards[participantId].length === 0 && trophyIds.length > 0) {
      fallbackActivated = true;
      pushTrophyAward_(awards, participantId, trophyIds[0], AWARD_FALLBACK, votes);
    }
  });

  const flatResults = [];
  allParticipants.forEach((participantId) => {
    awards[participantId].forEach((award) => {
      flatResults.push({
        participant_id: participantId,
        trophy_id: award.trophy_id,
        award_source: award.award_source,
        votes: award.votes
      });
    });
  });

  return {
    status: "success",
    results: flatResults,
    awards: awards,
    vote_counts: votes,
    fallback_activated: fallbackActivated
  };
}

function buildTrophyResultsPresentation_(storedResults) {
  const calc = calculateTrophyResults_();
  if (calc.status !== "success") {
    return calc;
  }

  const trophiesResult = listTrophies_();
  const trophyNameMap = {};
  if (trophiesResult.status === "success") {
    trophiesResult.trophies.forEach((t) => {
      trophyNameMap[String(t.trophy_id)] = t.trophy_name;
    });
  }

  const allParticipants = getAllVotingParticipants_();
  const votes = calc.vote_counts;
  const hasStoredResults = storedResults && storedResults.length > 0;
  const sourceResults = hasStoredResults ? storedResults : calc.results;

  const fallbackActivated = hasStoredResults
    ? storedResults.some((row) => row.award_source === AWARD_FALLBACK)
    : calc.fallback_activated;

  const enrichedResults = sourceResults.map((row) => {
    const voteCount = getParticipantTrophyVoteCount_(votes, row.participant_id, row.trophy_id);
    const awardSource = row.award_source || AWARD_ROUND1;
    return {
      participant_id: row.participant_id,
      trophy_id: row.trophy_id,
      trophy_name: trophyNameMap[row.trophy_id] || "",
      award_source: awardSource,
      votes: voteCount,
      reason: buildTrophyAwardReason_(awardSource, voteCount)
    };
  });

  const profileMap = {};
  allParticipants.forEach((participantId) => {
    profileMap[participantId] = {
      participant_id: participantId,
      trophies: []
    };
  });

  enrichedResults.forEach((row) => {
    if (!profileMap[row.participant_id]) {
      profileMap[row.participant_id] = {
        participant_id: row.participant_id,
        trophies: []
      };
    }
    profileMap[row.participant_id].trophies.push({
      trophy_id: row.trophy_id,
      trophy_name: row.trophy_name,
      award_source: row.award_source,
      votes: row.votes,
      reason: row.reason
    });
  });

  const profiles = Object.keys(profileMap)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((id) => profileMap[id]);

  const summaryMap = {};
  enrichedResults.forEach((row) => {
    const trophyId = row.trophy_id;
    if (!summaryMap[trophyId]) {
      summaryMap[trophyId] = {
        trophy_id: trophyId,
        trophy_name: row.trophy_name,
        winners: []
      };
    }
    summaryMap[trophyId].winners.push({
      participant_id: row.participant_id,
      votes: row.votes,
      award_source: row.award_source,
      reason: row.reason
    });
  });

  const trophySummary = Object.keys(summaryMap)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
    .map((id) => {
      const item = summaryMap[id];
      item.winners.sort((a, b) =>
        a.participant_id.localeCompare(b.participant_id, undefined, { numeric: true })
      );
      return item;
    });

  return {
    status: "success",
    results: enrichedResults,
    profiles: profiles,
    trophy_summary: trophySummary,
    fallback_activated: fallbackActivated,
    results_ready: hasStoredResults,
    participants_with_trophy: countParticipantsWithTrophy_(enrichedResults),
    total_participants: allParticipants.length
  };
}

function handleAdminCalculateTrophyResults_(data) {
  if (!verifyAdminAccess_(data.password, data.participant_id, data.phone_number)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const stats = getVotingCompletionStats_();
  if (stats.pending_participants.length > 0) {
    return {
      status: "error",
      message: "投票尚未全部完成，無法計算結果",
      pending_participants: stats.pending_participants,
      stats: stats
    };
  }

  if (stats.total_participants === 0) {
    return { status: "error", message: "沒有可計算的參加者" };
  }

  const calc = calculateTrophyResults_();
  if (calc.status !== "success") {
    return calc;
  }

  const calculatedAt = new Date();
  writeTrophyResults_(calc.results, calculatedAt);

  const sheet = ensureVotingSheet_();
  sheet.getRange(VOTING_STATUS_CELL).setValue("CALCULATED");
  sheet.getRange(VOTING_CALCULATED_AT_CELL).setValue(calculatedAt);

  return {
    status: "success",
    message: "Trophy 結果已計算",
    voting_status: "CALCULATED",
    results_count: calc.results.length,
    participants_with_trophy: countParticipantsWithTrophy_(calc.results),
    fallback_activated: calc.fallback_activated,
    stats: getVotingCompletionStats_()
  };
}

function handleAdminTrophyResults_(participantId, phoneNumber, password) {
  if (!verifyAdminAccess_(password, participantId, phoneNumber)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const storedResults = readTrophyResults_();
  const presentation = buildTrophyResultsPresentation_(storedResults);
  if (presentation.status !== "success") {
    return presentation;
  }

  return {
    status: "success",
    voting_status: getVotingStatusValue_(),
    results: presentation.results,
    profiles: presentation.profiles,
    trophy_summary: presentation.trophy_summary,
    fallback_activated: presentation.fallback_activated,
    results_ready: presentation.results_ready,
    stats: getVotingCompletionStats_(),
    participants_with_trophy: presentation.participants_with_trophy,
    total_participants: presentation.total_participants
  };
}

function handleAdminSetVotingStatus_(data) {
  if (!verifyAdminAccess_(data.password, data.participant_id, data.phone_number)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const targetStatus = String(data.voting_status || "").trim().toUpperCase();
  const allowed = ["DRAFT", "VOTING_OPEN", "VOTING_CLOSED", "CALCULATED", "PUBLISHED"];
  if (allowed.indexOf(targetStatus) < 0) {
    return { status: "error", message: "無效的 voting_status" };
  }

  const sheet = ensureVotingSheet_();
  sheet.getRange(VOTING_STATUS_CELL).setValue(targetStatus);

  if (typeof data.allow_resubmit !== "undefined") {
    const allow = data.allow_resubmit === true || String(data.allow_resubmit).toUpperCase() === "TRUE";
    sheet.getRange(VOTING_ALLOW_RESUBMIT_CELL).setValue(allow ? "TRUE" : "FALSE");
  }

  if (targetStatus === "PUBLISHED") {
    sheet.getRange(VOTING_PUBLISHED_AT_CELL).setValue(new Date());
  }

  return {
    status: "success",
    message: "投票狀態已更新",
    voting_status: targetStatus,
    allow_resubmit: getAllowResubmitValue_()
  };
}

function handleAdminResetParticipantVote_(data) {
  if (!verifyAdminAccess_(data.password, data.participant_id, data.phone_number)) {
    return { status: "error", message: "身份驗證失敗" };
  }

  const targetId = normalizeId_(data.target_participant_id);
  if (!targetId) {
    return { status: "error", message: "請提供 target_participant_id" };
  }

  deleteTrophyPairRowsForSender_(TROPHY_LOG_SHEET_NAME, targetId);
  deleteTrophyPairRowsForSender_(TROPHY_DRAFT_SHEET_NAME, targetId);

  const ctx = getSubmissionSheetContext_();
  if (ctx) {
    const existing = getSubmissionStatus_(targetId);
    if (existing && existing.rowIndex) {
      ctx.sheet.deleteRow(existing.rowIndex);
    }
  }

  return {
    status: "success",
    message: "已重置 " + targetId + " 的投票資料"
  };
}
