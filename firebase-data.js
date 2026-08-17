/* ═══════════════════════════════════════════════════════════════════════════
   Firestore data layer.

   Replaces the Apps Script backend. Two things change the shape of the app:

   1. Reads are subscriptions, not polls. onSnapshot pushes updates over one
      open connection, so the interval and backoff machinery the old backend
      needed is gone along with the lag it caused.
   2. Writes land in the local cache first and sync in the background. The SDK
      retries on its own across reconnects, so the app no longer needs its own
      queue to keep the UI responsive.
   ═══════════════════════════════════════════════════════════════════════════ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteField,
  where,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js';

import { ADMIN_EMAIL, firebaseConfig, participantEmail } from './firebase-config.js?v=20260817v3';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Firestore caps a batch at 500 operations.
const BATCH_LIMIT = 450;

// ─── Authentication ─────────────────────────────────────────────────────────

export function isAdminId(participantId) {
  return String(participantId || '').trim().toUpperCase() === 'ADMIN';
}

export async function signIn(participantId, phone) {
  // Keep the Firebase session in this browser tab only: reload stays signed
  // in, closing the tab (or signing out) clears it.
  await setPersistence(auth, browserSessionPersistence);
  const email = isAdminId(participantId) ? ADMIN_EMAIL : participantEmail(participantId);
  const candidates = getAuthPasswordCandidates(participantId, phone);
  let lastErr = null;

  for (const password of candidates) {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential.user;
    } catch (err) {
      lastErr = err;
      const code = err && err.code;
      const isWrongPassword = code === 'auth/invalid-credential'
        || code === 'auth/invalid-login-credentials'
        || code === 'auth/wrong-password';
      if (!isWrongPassword) {
        throw err;
      }
    }
  }

  if (lastErr) {
    throw lastErr;
  }
}

/**
 * Firebase Auth requires passwords of at least 6 characters. Numbered seats
 * like "1A" are shorter, so we repeat the id until it meets the minimum.
 * The participant still types just their id; this expansion is internal.
 */
export function authPasswordForParticipantId(participantId, toUpper = true) {
  let id = String(participantId || '').trim();
  if (toUpper) id = id.toUpperCase();
  if (!id) return '';
  if (id.length >= 6) return id;
  let password = id;
  while (password.length < 6) password += id;
  return password;
}

/** Map what the user typed into the Auth password we actually stored. */
export function resolveAuthPassword(participantId, entered) {
  const raw = String(entered || '').trim();
  const id = String(participantId || '').trim();
  if (!raw) return '';
  const expandedId = authPasswordForParticipantId(id);
  if (id && (raw.toUpperCase() === id.toUpperCase() || raw.toUpperCase() === expandedId.toUpperCase())) {
    return expandedId;
  }
  if (raw.length < 6) {
    let expanded = raw.toUpperCase();
    while (expanded.length < 6) expanded += raw.toUpperCase();
    return expanded;
  }
  return raw;
}

/**
 * Returns clean candidate password(s) ensuring all candidates are valid (>= 6 chars)
 * and avoiding redundant calls to Firebase Auth.
 */
export function getAuthPasswordCandidates(participantId, entered) {
  const raw = String(entered || '').trim();
  const id = String(participantId || '').trim();
  if (!raw) return [];

  const candidates = [];
  const primary = resolveAuthPassword(id, raw);
  if (primary && primary.length >= 6) {
    candidates.push(primary);
  }

  // If user entered raw string with mixed/lower case >= 6 chars different from primary
  if (raw.length >= 6 && raw !== primary && !candidates.includes(raw)) {
    candidates.push(raw);
  }

  if (candidates.length === 0) {
    candidates.push(primary || raw);
  }

  return candidates;
}

export function signOutUser() {
  return signOut(auth);
}

/** Map a Firebase Auth user back to the app's participant id. */
export function identityFromUser(user) {
  if (!user || !user.email) return null;
  const email = String(user.email).trim().toLowerCase();
  if (email === ADMIN_EMAIL.toLowerCase()) {
    return { participantId: 'ADMIN', isAdmin: true };
  }
  const local = email.split('@')[0] || '';
  if (!local) return null;
  return { participantId: local.toUpperCase(), isAdmin: false };
}

/** Resolves once Firebase has restored (or ruled out) a previous session. */
export function waitForAuth() {
  return new Promise(resolve => {
    const stop = onAuthStateChanged(auth, user => {
      stop();
      resolve(user || null);
    });
  });
}

export function describeAuthError(err) {
  switch (err && err.code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return '參加者編號或密碼不正確';
    case 'auth/invalid-email':
      return '參加者編號格式不正確';
    case 'auth/user-disabled':
      return '此帳戶已被停用，請聯絡工作人員';
    case 'auth/too-many-requests':
      return '嘗試次數過多，請稍等一陣再試';
    case 'auth/network-request-failed':
      return '網絡連線失敗，請檢查你的網絡';
    default:
      return (err && err.message) || '登入失敗，請再試一次';
  }
}

/**
 * Map Firestore failures to short Chinese copy. Never surface the SDK’s raw
 * English "Missing or insufficient permissions." string in the UI.
 */
export function describeFirestoreError(err, fallback = '操作失敗，請再試一次') {
  const code = err && err.code;
  if (code === 'permission-denied') {
    return '目前無法完成此操作，請確認功能已開放或稍後再試';
  }
  if (code === 'unauthenticated') {
    return '登入已失效，請重新登入';
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return '網絡不穩，請稍後再試';
  }
  if (code === 'not-found') {
    return '找不到相關資料';
  }
  const msg = String((err && err.message) || '').trim();
  if (!msg) return fallback;
  if (/missing or insufficient permissions/i.test(msg)) {
    return '目前無法完成此操作，請確認功能已開放或稍後再試';
  }
  // Prefer the local fallback over Firebase’s English SDK phrasing.
  if (/^(FirebaseError|[A-Z][A-Z0-9_]+):/.test(msg) || /firestore/i.test(msg)) {
    return fallback;
  }
  return msg;
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

function toIso(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toDate === 'function') return value.toDate().toISOString();
  return '';
}

function newestFirst(a, b) {
  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
}

function messageFromDoc(snapshot) {
  // An estimated timestamp keeps a just-sent message in the right order while
  // the server value is still in flight.
  const data = snapshot.data({ serverTimestamps: 'estimate' }) || {};
  return {
    message_id: snapshot.id,
    pending: snapshot.metadata.hasPendingWrites,
    sender_id: data.sender_id || '',
    receiver_id: data.receiver_id || '',
    content: data.content || '',
    created_at: toIso(data.created_at),
    status: data.status || 'active',
    deleted_at: toIso(data.deleted_at),
    sender_group_id: data.sender_group_id || '',
    thread_group_id: data.thread_group_id || ''
  };
}

/** Runs a large set of writes as however many batches it takes. */
async function commitAll(operations) {
  for (let i = 0; i < operations.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    operations.slice(i, i + BATCH_LIMIT).forEach(apply => apply(batch));
    await batch.commit();
  }
}

// ─── Groups and teammates ───────────────────────────────────────────────────

export function isSeatParticipantId(participantId) {
  return /^[0-9][A-H]$/i.test(String(participantId || '').trim());
}

export function getTeammates(participantId, allParticipants) {
  const me = (allParticipants || []).find(p => p.participant_id === participantId);
  if (!me) return [];
  const group = String(me.group_id || '').trim();
  if (!group) return [];
  return allParticipants.filter(
    p => p.participant_id !== participantId
      && String(p.group_id || '').trim() === group
      && isSeatParticipantId(p.participant_id)
  );
}

// ─── Messages ───────────────────────────────────────────────────────────────

/**
 * Security rules allow reading a message only when the query filters on
 * receiver_id or sender_id, so each of these keeps its where() clause. Status
 * filtering and sorting happen here rather than in the query to avoid needing
 * a composite index.
 */
export function subscribeInbox(participantId, onData, onError) {
  const q = query(collection(db, 'messages'), where('receiver_id', '==', participantId));
  return onSnapshot(q, snapshot => {
    onData(snapshot.docs.map(messageFromDoc).filter(m => m.status === 'active').sort(newestFirst));
  }, onError);
}

export function subscribeSent(participantId, onData, onError) {
  const q = query(collection(db, 'messages'), where('sender_id', '==', participantId));
  return onSnapshot(q, snapshot => {
    onData(snapshot.docs.map(messageFromDoc).sort(newestFirst), snapshot.metadata.hasPendingWrites);
  }, onError);
}

export function subscribeAllMessages(onData, onError) {
  return onSnapshot(collection(db, 'messages'), snapshot => {
    onData(snapshot.docs.map(messageFromDoc).sort(newestFirst));
  }, onError);
}

export function sendMessage(senderId, receiverId, content, groupMeta = {}) {
  const ref = doc(collection(db, 'messages'));
  const senderGroupId = String(groupMeta.senderGroupId || '').trim();
  const receiverGroupId = String(groupMeta.receiverGroupId || '').trim();
  const threadGroupId = senderGroupId && senderGroupId === receiverGroupId
    ? senderGroupId
    : '';
  return setDoc(ref, {
    sender_id: senderId,
    receiver_id: receiverId,
    content,
    status: 'active',
    created_at: serverTimestamp(),
    deleted_at: '',
    sender_group_id: senderGroupId,
    thread_group_id: threadGroupId
  });
}

/** Intra-group messages for a Staff facilitator monitoring one group. */
export function subscribeGroupThreadMessages(groupId, onData, onError) {
  const q = query(
    collection(db, 'messages'),
    where('thread_group_id', '==', groupId)
  );
  return onSnapshot(q, snapshot => {
    onData(snapshot.docs.map(messageFromDoc).sort(newestFirst));
  }, onError);
}

export function retractMessage(messageId) {
  return updateDoc(doc(db, 'messages', messageId), {
    status: 'deleted',
    deleted_at: serverTimestamp()
  });
}

export function restoreMessage(messageId) {
  return updateDoc(doc(db, 'messages', messageId), {
    status: 'active',
    deleted_at: ''
  });
}

// ─── Configuration ──────────────────────────────────────────────────────────

export function subscribeMessagingStatus(onData, onError) {
  return onSnapshot(doc(db, 'config', 'messaging'), snapshot => {
    onData((snapshot.data() || {}).status === 'CLOSE' ? 'CLOSE' : 'OPEN');
  }, onError);
}

export function setMessagingStatus(status) {
  return setDoc(doc(db, 'config', 'messaging'), {
    status: status === 'CLOSE' ? 'CLOSE' : 'OPEN'
  }, { merge: true });
}

export async function fetchLoginLockout() {
  const snapshot = await getDoc(doc(db, 'config', 'login_lockout'));
  const data = snapshot.exists() ? (snapshot.data() || {}) : {};
  return {
    locked_until: toIso(data.locked_until),
    updated_at: toIso(data.updated_at)
  };
}

export function setLoginLockout(lockedUntil) {
  return setDoc(doc(db, 'config', 'login_lockout'), {
    locked_until: lockedUntil || '',
    updated_at: serverTimestamp()
  }, { merge: true });
}

function votingConfigFromData(data) {
  return {
    voting_status: data.voting_status || 'DRAFT',
    allow_resubmit: !!data.allow_resubmit,
    calculated_at: toIso(data.calculated_at),
    published_at: toIso(data.published_at)
  };
}

export function subscribeVotingConfig(onData, onError) {
  return onSnapshot(doc(db, 'config', 'voting'), snapshot => {
    onData(votingConfigFromData(snapshot.data() || {}));
  }, onError);
}

export async function setVotingStatus(votingStatus, allowResubmit) {
  // Clear group overrides first so nobody stays stuck on a stale staff override
  // while the new global status is already live.
  await clearAllGroupVotingOverrides();
  const patch = { voting_status: votingStatus };
  if (allowResubmit !== undefined) patch.allow_resubmit = !!allowResubmit;
  if (votingStatus === 'PUBLISHED') patch.published_at = serverTimestamp();
  // Reopening voting has to clear the published flag, otherwise participants
  // would keep seeing last round's results while voting again.
  if (votingStatus === 'VOTING_OPEN') {
    patch.published_at = '';
    patch.allow_resubmit = true;
  }
  if (votingStatus === 'CALCULATED') {
    patch.calculated_at = serverTimestamp();
    patch.fallback_activated = false;
  }
  await setDoc(doc(db, 'config', 'voting'), patch, { merge: true });
}

/** Remove every group's voting override so all groups follow the global config. */
export async function clearAllGroupVotingOverrides() {
  const snapshot = await getDocs(collection(db, 'groups'));
  const operations = [];
  snapshot.docs.forEach(d => {
    const raw = d.data() || {};
    if (
      !('voting_status' in raw)
      && !('allow_resubmit' in raw)
      && !('calculated_at' in raw)
      && !('published_at' in raw)
    ) {
      return;
    }
    operations.push(batch => batch.set(d.ref, {
      voting_status: deleteField(),
      allow_resubmit: deleteField(),
      calculated_at: deleteField(),
      published_at: deleteField()
    }, { merge: true }));
  });
  if (operations.length) await commitAll(operations);
}

/** Per-group display names and messaging / voting overrides. */
export function subscribeGroups(onData, onError) {
  return onSnapshot(collection(db, 'groups'), snapshot => {
    const map = {};
    snapshot.docs.forEach(d => {
      const raw = d.data() || {};
      map[d.id] = {
        group_id: raw.group_id || d.id,
        display_name: String(raw.display_name || '').trim(),
        messaging_status: raw.messaging_status === 'CLOSE' ? 'CLOSE' : 'OPEN',
        voting_status: raw.voting_status || '',
        allow_resubmit: !!raw.allow_resubmit,
        calculated_at: toIso(raw.calculated_at),
        published_at: toIso(raw.published_at)
      };
    });
    onData(map);
  }, onError);
}

export function setGroupDisplayName(groupId, displayName) {
  return setDoc(doc(db, 'groups', groupId), {
    group_id: groupId,
    display_name: String(displayName || '').trim()
  }, { merge: true });
}

export function setGroupMessagingStatus(groupId, status) {
  return setDoc(doc(db, 'groups', groupId), {
    group_id: groupId,
    messaging_status: status === 'CLOSE' ? 'CLOSE' : 'OPEN'
  }, { merge: true });
}

export async function setGroupVotingStatus(groupId, votingStatus, allowResubmit) {
  const patch = {
    group_id: groupId,
    voting_status: votingStatus
  };
  if (allowResubmit !== undefined) patch.allow_resubmit = !!allowResubmit;
  if (votingStatus === 'PUBLISHED') patch.published_at = serverTimestamp();
  if (votingStatus === 'VOTING_OPEN') {
    patch.published_at = '';
    patch.allow_resubmit = true;
  }
  if (votingStatus === 'CALCULATED') patch.calculated_at = serverTimestamp();
  await setDoc(doc(db, 'groups', groupId), patch, { merge: true });
}

/** Remove the group voting override so the group follows the global config again. */
export async function clearGroupVotingStatus(groupId) {
  await setDoc(doc(db, 'groups', groupId), {
    group_id: groupId,
    voting_status: deleteField(),
    allow_resubmit: deleteField(),
    calculated_at: deleteField(),
    published_at: deleteField()
  }, { merge: true });
}

/** Clear both voting and messaging overrides for a group. */
export async function clearGroupAllOverrides(groupId) {
  await setDoc(doc(db, 'groups', groupId), {
    group_id: groupId,
    voting_status: deleteField(),
    messaging_status: deleteField(),
    allow_resubmit: deleteField(),
    calculated_at: deleteField(),
    published_at: deleteField()
  }, { merge: true });
}

// ─── Trophies ───────────────────────────────────────────────────────────────

export async function fetchTrophies() {
  const snapshot = await getDocs(collection(db, 'trophies'));
  return snapshot.docs
    .map(d => ({
      trophy_id: (d.data() || {}).trophy_id || d.id,
      trophy_name: (d.data() || {}).trophy_name || d.id
    }))
    .sort((a, b) => a.trophy_id.localeCompare(b.trophy_id));
}

/** Rename a trophy and rewrite any stored result snapshots that still show the old label. */
export async function updateTrophyName(trophyId, trophyName) {
  const id = String(trophyId || '').trim();
  const name = String(trophyName || '').trim();
  if (!id) throw new Error('缺少獎項編號');
  if (!name) throw new Error('獎項名稱不可空白');
  if (name.length > 40) throw new Error('獎項名稱最多 40 字');

  await updateDoc(doc(db, 'trophies', id), {
    trophy_id: id,
    trophy_name: name
  });

  const snapshot = await getDocs(collection(db, 'results'));
  const operations = [];
  snapshot.docs.forEach(d => {
    const raw = d.data() || {};
    const awards = Array.isArray(raw.awards) ? raw.awards : [];
    let changed = false;
    const next = awards.map(award => {
      if (!award || award.trophy_id !== id || award.trophy_name === name) return award;
      changed = true;
      return { ...award, trophy_name: name };
    });
    if (!changed) return;
    operations.push(batch => batch.update(doc(db, 'results', d.id), { awards: next }));
  });
  if (operations.length) await commitAll(operations);
  return name;
}

function submissionFromDoc(snapshot) {
  const data = snapshot.data() || {};
  return {
    participant_id: data.participant_id || snapshot.id,
    status: data.status === 'submitted' ? 'submitted' : 'draft',
    pairings: Array.isArray(data.pairings) ? data.pairings : [],
    updated_at: toIso(data.updated_at),
    submitted_at: toIso(data.submitted_at)
  };
}

export function pairingsToAssignments(pairings) {
  const assignments = {};
  (pairings || []).forEach(pair => {
    if (!pair || !pair.receiver_id || !pair.trophy_id) return;
    if (!assignments[pair.receiver_id]) assignments[pair.receiver_id] = [];
    if (!assignments[pair.receiver_id].includes(pair.trophy_id)) {
      assignments[pair.receiver_id].push(pair.trophy_id);
    }
  });
  return assignments;
}

export function subscribeMySubmission(participantId, onData, onError) {
  return onSnapshot(doc(db, 'submissions', participantId), snapshot => {
    onData(snapshot.exists() ? submissionFromDoc(snapshot) : null);
  }, onError);
}

export function saveSubmission(participantId, pairings, submitted = true) {
  // Local picks stay in the browser until submit; we no longer persist drafts.
  if (!submitted) {
    return Promise.reject(new Error('草稿功能已移除，請直接提交投票'));
  }
  const payload = {
    participant_id: participantId,
    pairings: pairings || [],
    status: 'submitted',
    updated_at: serverTimestamp(),
    submitted_at: serverTimestamp()
  };
  // The whole ballot is one document, so two people voting at the same moment
  // can never overwrite each other the way appending rows to a sheet could.
  return setDoc(doc(db, 'submissions', participantId), payload, { merge: true });
}

export function clearMySubmission(participantId) {
  return deleteDoc(doc(db, 'submissions', participantId));
}

export function subscribeAllSubmissions(onData, onError) {
  return onSnapshot(collection(db, 'submissions'), snapshot => {
    onData(snapshot.docs.map(submissionFromDoc));
  }, onError);
}

// ─── Results ────────────────────────────────────────────────────────────────

function resultFromDoc(snapshot) {
  const data = snapshot.data() || {};
  return {
    participant_id: data.participant_id || snapshot.id,
    awards: Array.isArray(data.awards) ? data.awards : [],
    calculated_at: toIso(data.calculated_at)
  };
}

export function subscribeMyResult(participantId, onData, onError) {
  return onSnapshot(doc(db, 'results', participantId), snapshot => {
    onData(snapshot.exists() ? resultFromDoc(snapshot) : null);
  }, err => {
    // Before results are published the rules deny this read. That is the
    // system working, not a failure worth surfacing to the participant.
    if (err && err.code === 'permission-denied') {
      onData(null);
      return;
    }
    if (onError) onError(err);
  });
}

export function subscribeAllResults(onData, onError) {
  return onSnapshot(collection(db, 'results'), snapshot => {
    onData(snapshot.docs.map(resultFromDoc));
  }, onError);
}

/**
 * Tally awards per group: each trophy goes to whoever holds the highest vote
 * count inside their own group (ties included). No consolation / fallback awards.
 */
export function computeResults(participants, trophies, submissions) {
  const roster = (participants || []).filter(p => isSeatParticipantId(p.participant_id));
  const seatIds = new Set(roster.map(p => p.participant_id));
  const voteCounts = new Map();
  const key = (receiver, trophy) => receiver + '|' + trophy;

  submissions.forEach(submission => {
    if (!seatIds.has(submission.participant_id)) return;
    (submission.pairings || []).forEach(pair => {
      if (!pair || !pair.receiver_id || !pair.trophy_id) return;
      if (!seatIds.has(pair.receiver_id)) return;
      const k = key(pair.receiver_id, pair.trophy_id);
      voteCounts.set(k, (voteCounts.get(k) || 0) + 1);
    });
  });

  const countFor = (participantId, trophyId) => voteCounts.get(key(participantId, trophyId)) || 0;
  const awarded = new Map(roster.map(p => [p.participant_id, []]));

  const byGroup = new Map();
  roster.forEach(p => {
    const group = p.group_id || '未分組';
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push(p);
  });

  byGroup.forEach(members => {
    trophies.forEach(trophy => {
      let best = 0;
      members.forEach(p => {
        best = Math.max(best, countFor(p.participant_id, trophy.trophy_id));
      });
      if (best <= 0) return;
      members.forEach(p => {
        if (countFor(p.participant_id, trophy.trophy_id) !== best) return;
        awarded.get(p.participant_id).push({
          trophy_id: trophy.trophy_id,
          trophy_name: trophy.trophy_name,
          award_source: 'round1',
          vote_count: best
        });
      });
    });
  });

  const trophySummary = trophies.map(trophy => {
    const ranking = roster
      .map(p => ({ participant_id: p.participant_id, vote_count: countFor(p.participant_id, trophy.trophy_id) }))
      .filter(entry => entry.vote_count > 0)
      .sort((a, b) => b.vote_count - a.vote_count);
    const winners = roster
      .filter(p => awarded.get(p.participant_id).some(a => a.trophy_id === trophy.trophy_id))
      .map(p => ({ participant_id: p.participant_id, vote_count: countFor(p.participant_id, trophy.trophy_id) }));
    return {
      trophy_id: trophy.trophy_id,
      trophy_name: trophy.trophy_name,
      winners,
      is_tie: winners.length > 1,
      top_ranking: ranking
    };
  });

  const profiles = roster.map(p => ({
    participant_id: p.participant_id,
    trophies: awarded.get(p.participant_id),
    vote_count: awarded.get(p.participant_id).reduce((sum, a) => sum + (a.vote_count || 0), 0)
  }));

  return { awarded, profiles, trophySummary };
}

export async function writeResults(awarded, options = {}) {
  const operations = [];
  awarded.forEach((awards, participantId) => {
    operations.push(batch => batch.set(doc(db, 'results', participantId), {
      participant_id: participantId,
      awards,
      calculated_at: serverTimestamp()
    }));
  });
  await commitAll(operations);
  if (options.groupId) {
    await setGroupVotingStatus(options.groupId, 'CALCULATED');
    return;
  }
  await setVotingStatus('CALCULATED');
}

/** Listen to a small set of documents by id (Staff cannot query whole collections). */
function subscribeDocsByIds(collectionName, ids, fromDoc, onData, onError) {
  const unique = [...new Set((ids || []).filter(Boolean))];
  if (!unique.length) {
    onData([]);
    return () => {};
  }
  const cache = new Map();
  const unsubs = unique.map(id => onSnapshot(doc(db, collectionName, id), snapshot => {
    if (snapshot.exists()) cache.set(id, fromDoc(snapshot));
    else cache.delete(id);
    onData(unique.map(pid => cache.get(pid)).filter(Boolean));
  }, onError));
  return () => unsubs.forEach(stop => {
    try { stop(); } catch (_) { /* already closed */ }
  });
}

/** One-shot reads for Staff facilitators (collection listens are admin-only). */
export async function fetchSubmissionsForParticipants(participantIds) {
  const ids = [...new Set((participantIds || []).filter(Boolean))];
  const rows = await Promise.all(ids.map(async id => {
    const snapshot = await getDoc(doc(db, 'submissions', id));
    return snapshot.exists() ? submissionFromDoc(snapshot) : {
      participant_id: id,
      status: '',
      pairings: [],
      updated_at: '',
      submitted_at: ''
    };
  }));
  return rows;
}

export function subscribeSubmissionsForParticipants(participantIds, onData, onError) {
  return subscribeDocsByIds('submissions', participantIds, submissionFromDoc, onData, onError);
}

export async function fetchResultsForParticipants(participantIds) {
  const ids = [...new Set((participantIds || []).filter(Boolean))];
  const rows = await Promise.all(ids.map(async id => {
    const snapshot = await getDoc(doc(db, 'results', id));
    return snapshot.exists() ? resultFromDoc(snapshot) : null;
  }));
  return rows.filter(Boolean);
}

export function subscribeResultsForParticipants(participantIds, onData, onError) {
  return subscribeDocsByIds('results', participantIds, resultFromDoc, onData, onError);
}

function presenceFromDoc(snapshot) {
  const data = snapshot.data() || {};
  return {
    participant_id: data.participant_id || snapshot.id,
    online: data.online !== false,
    first_seen: toIso(data.first_seen),
    last_seen: toIso(data.last_seen)
  };
}

export function subscribePresenceForParticipants(participantIds, onData, onError) {
  return subscribeDocsByIds('presence', participantIds, presenceFromDoc, onData, onError);
}

export async function fetchPresenceForParticipants(participantIds) {
  const ids = [...new Set((participantIds || []).filter(Boolean))];
  const rows = await Promise.all(ids.map(async id => {
    const snapshot = await getDoc(doc(db, 'presence', id));
    return snapshot.exists() ? presenceFromDoc(snapshot) : null;
  }));
  return rows.filter(Boolean);
}

// ─── Admin: participants and contacts ───────────────────────────────────────

export function subscribeParticipants(onData, onError) {
  return onSnapshot(collection(db, 'participants'), snapshot => {
    onData(snapshot.docs.map(d => {
      const raw = d.data() || {};
      return {
        participant_id: raw.participant_id || d.id,
        group_id: raw.group_id || '',
        display_name: String(raw.display_name || '').trim(),
        force_logout_rev: Number(raw.force_logout_rev || 0) || 0
      };
    }).sort((a, b) => a.participant_id.localeCompare(b.participant_id)));
  }, onError);
}

export function updateParticipantDisplayName(participantId, displayName) {
  // Only touch display_name so security rules can require hasOnly(['display_name']).
  return updateDoc(doc(db, 'participants', participantId), {
    display_name: String(displayName || '').trim()
  });
}

export async function fetchContact(participantId) {
  try {
    const snapshot = await getDoc(doc(db, 'contacts', participantId));
    return snapshot.exists() ? (snapshot.data() || {}).phone_number || '' : '';
  } catch (err) {
    // Showing the phone number is a convenience. If the rules have not been
    // updated to grant it yet, the rest of the panel should still work.
    if (err && err.code === 'permission-denied') return '';
    throw err;
  }
}

export async function updateParticipantContact(participantId, newPassword) {
  const pid = String(participantId || '').trim().toUpperCase();
  if (!pid) return;
  const clean = String(newPassword || '').trim();
  await setDoc(doc(db, 'contacts', pid), {
    participant_id: pid,
    phone_number: clean
  }, { merge: true });

  const identity = identityFromUser(auth.currentUser);
  if (identity && identity.participantId === pid && clean.length >= 6) {
    try {
      await updatePassword(auth.currentUser, resolveAuthPassword(pid, clean));
    } catch (_) {}
  }
}

export async function updateMyPassword(newPassword) {
  if (!auth.currentUser) throw new Error('未登入');
  const clean = String(newPassword || '').trim();
  if (clean.length < 6) {
    throw new Error('密碼長度至少需要 6 個字元');
  }
  const identity = identityFromUser(auth.currentUser);
  const pid = identity ? identity.participantId : '';
  const authPwd = resolveAuthPassword(pid, clean);
  await updatePassword(auth.currentUser, authPwd);
  if (pid) {
    try {
      await setDoc(doc(db, 'contacts', pid), {
        participant_id: pid,
        phone_number: clean
      }, { merge: true });
    } catch (_) {}
  }
}

export function updateParticipantGroup(participantId, groupId) {
  return setDoc(doc(db, 'participants', participantId), {
    participant_id: participantId,
    group_id: groupId
  }, { merge: true });
}

export function forceLogoutParticipant(participantId) {
  const rev = Date.now();
  return Promise.all([
    setDoc(doc(db, 'participants', participantId), {
      participant_id: participantId,
      force_logout_rev: rev
    }, { merge: true }),
    deleteDoc(doc(db, 'presence', participantId)).catch(() => {})
  ]);
}

export async function forceLogoutParticipants(participantIds) {
  const ids = [...new Set((participantIds || []).filter(Boolean))];
  if (!ids.length) return 0;
  const rev = Date.now();
  const operations = ids.map(id => batch => batch.set(doc(db, 'participants', id), {
    participant_id: id,
    force_logout_rev: rev
  }, { merge: true }));
  await commitAll(operations);
  await Promise.all(ids.map(id => deleteDoc(doc(db, 'presence', id)).catch(() => {})));
  return ids.length;
}

// ─── Admin: clearing data ───────────────────────────────────────────────────

export async function clearParticipantRecords(participantId, options = {}) {
  const operations = [];

  if (options.deleteMessages !== false) {
    const snapshot = await getDocs(collection(db, 'messages'));
    snapshot.docs
      .filter(d => (d.data() || {}).sender_id === participantId)
      .forEach(d => operations.push(batch => batch.delete(d.ref)));
  }
  if (options.deleteTrophy !== false) {
    operations.push(batch => batch.delete(doc(db, 'submissions', participantId)));
  }
  if (options.deleteResults !== false) {
    operations.push(batch => batch.delete(doc(db, 'results', participantId)));
  }

  await commitAll(operations);
  return operations.length;
}

export async function clearAllRecords() {
  const operations = [];
  for (const name of ['messages', 'submissions', 'results']) {
    const snapshot = await getDocs(collection(db, name));
    snapshot.docs.forEach(d => operations.push(batch => batch.delete(d.ref)));
  }
  await commitAll(operations);
  await setDoc(doc(db, 'config', 'voting'), {
    voting_status: 'DRAFT',
    allow_resubmit: false,
    calculated_at: '',
    published_at: '',
    fallback_activated: false
  }, { merge: true });
  await clearAllGroupVotingOverrides();
  return operations.length;
}

/**
 * Clears every ballot and computed award, but leaves messages alone.
 * If the lifecycle had already moved past voting, step it back to
 * VOTING_CLOSED so admins can reopen or recalculate from a clean slate.
 */
export async function resetAllVotes() {
  const operations = [];
  for (const name of ['submissions', 'results']) {
    const snapshot = await getDocs(collection(db, name));
    snapshot.docs.forEach(d => operations.push(batch => batch.delete(d.ref)));
  }
  await commitAll(operations);

  const votingRef = doc(db, 'config', 'voting');
  const snap = await getDoc(votingRef);
  const status = ((snap.exists() && snap.data()) || {}).voting_status || 'DRAFT';
  const patch = {
    calculated_at: '',
    published_at: '',
    fallback_activated: false
  };
  if (status === 'CALCULATED' || status === 'PUBLISHED') {
    patch.voting_status = 'VOTING_CLOSED';
  }
  await setDoc(votingRef, patch, { merge: true });
  await clearAllGroupVotingOverrides();
  return operations.length;
}

export async function resetParticipantVote(participantId) {
  await commitAll([
    batch => batch.delete(doc(db, 'submissions', participantId)),
    batch => batch.delete(doc(db, 'results', participantId))
  ]);
}

// ─── Presence ───────────────────────────────────────────────────────────────

/**
 * Marks this participant as here. first_seen sticks for the whole event so the
 * admin dashboard can show who has logged in at least once; last_seen is
 * refreshed on a heartbeat so "currently online" stays meaningful.
 */
export async function touchPresence(participantId) {
  await setDoc(doc(db, 'presence', participantId), {
    participant_id: participantId,
    online: true,
    last_seen: serverTimestamp()
  }, { merge: true });
}

export function markPresenceOffline(participantId) {
  // Remove the presence doc so admin login status flips to「未登入」immediately.
  return deleteDoc(doc(db, 'presence', participantId)).catch(() =>
    setDoc(doc(db, 'presence', participantId), {
      participant_id: participantId,
      online: false,
      last_seen: serverTimestamp()
    }, { merge: true })
  );
}

export function subscribePresence(onData, onError) {
  return onSnapshot(collection(db, 'presence'), snapshot => {
    onData(snapshot.docs.map(presenceFromDoc));
  }, onError);
}

export async function fetchPresence() {
  const snapshot = await getDocs(collection(db, 'presence'));
  return snapshot.docs.map(presenceFromDoc);
}
