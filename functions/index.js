/**
 * Cloud Functions: send FCM when a message arrives or trophy results publish.
 *
 * Deploy (Blaze plan + Firebase CLI):
 *   cd functions && npm install
 *   npx firebase-tools login
 *   npx firebase-tools deploy --only functions --project tnit-6c48d
 */
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');

initializeApp();
setGlobalOptions({ region: 'asia-east1' });

const db = getFirestore();
const messaging = getMessaging();

function isSeatId(id) {
  return /^[A-H]\d+$/i.test(String(id || '').trim());
}

async function tokensForParticipant(participantId) {
  const id = String(participantId || '').trim().toUpperCase();
  if (!id) return [];
  const snap = await db.collection('push_tokens').doc(id).get();
  if (!snap.exists) return [];
  const tokens = snap.data().tokens;
  return Array.isArray(tokens)
    ? [...new Set(tokens.map(t => String(t || '').trim()).filter(Boolean))]
    : [];
}

async function pruneInvalidTokens(participantId, invalidTokens) {
  if (!invalidTokens.length) return;
  const ref = db.collection('push_tokens').doc(String(participantId).toUpperCase());
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const current = Array.isArray(snap.data().tokens) ? snap.data().tokens : [];
    const bad = new Set(invalidTokens);
    tx.set(ref, {
      tokens: current.filter(t => !bad.has(t)),
      updated_at: new Date().toISOString()
    }, { merge: true });
  });
}

async function sendToParticipant(participantId, payload) {
  const tokens = await tokensForParticipant(participantId);
  if (!tokens.length) return { success: 0, failure: 0 };
  const res = await messaging.sendEachForMulticast({
    tokens,
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: {
      title: payload.title,
      body: payload.body,
      type: payload.type || '',
      url: payload.url || './',
      tag: payload.tag || 'tnit-push'
    },
    webpush: {
      fcmOptions: { link: payload.url || './' },
      notification: {
        icon: './assets/heart.png',
        badge: './assets/heart.png'
      }
    }
  });
  const invalid = [];
  res.responses.forEach((r, i) => {
    if (r.success) return;
    const code = r.error && r.error.code;
    if (
      code === 'messaging/registration-token-not-registered'
      || code === 'messaging/invalid-registration-token'
    ) {
      invalid.push(tokens[i]);
    }
  });
  if (invalid.length) await pruneInvalidTokens(participantId, invalid);
  return {
    success: res.successCount,
    failure: res.failureCount
  };
}

async function seatIdsInGroup(groupId) {
  const snap = await db.collection('participants')
    .where('group_id', '==', groupId)
    .get();
  return snap.docs
    .map(d => d.id)
    .filter(isSeatId);
}

async function allSeatIds() {
  const snap = await db.collection('participants').get();
  return snap.docs
    .map(d => d.id)
    .filter(isSeatId);
}

async function notifyResults(participantIds) {
  const ids = [...new Set((participantIds || []).map(id => String(id).toUpperCase()).filter(isSeatId))];
  let success = 0;
  for (const id of ids) {
    const resultSnap = await db.collection('results').doc(id).get();
    const awards = resultSnap.exists && Array.isArray(resultSnap.data().awards)
      ? resultSnap.data().awards.filter(a => a && a.award_source !== 'fallback')
      : [];
    const body = awards.length
      ? `你獲得：${awards.map(a => a.trophy_name || a.trophy_id).join('、')}`
      : '獎項結果已公布，入 App 睇詳情。';
    const sent = await sendToParticipant(id, {
      title: '獎項結果出咗喇',
      body,
      type: 'trophy_published',
      url: './#trophy',
      tag: 'tnit-trophy'
    });
    success += sent.success;
  }
  return success;
}

exports.onMessageCreated = onDocumentCreated('messages/{messageId}', async (event) => {
  const data = event.data && event.data.data();
  if (!data || data.status !== 'active') return;
  const receiverId = String(data.receiver_id || '').trim().toUpperCase();
  const senderId = String(data.sender_id || '').trim().toUpperCase();
  if (!receiverId || receiverId === senderId) return;

  await sendToParticipant(receiverId, {
    title: '你有新嘅匿名留言',
    body: '入 Inbox 睇下對方寫咗咩。',
    type: 'new_message',
    url: './#inbox',
    tag: 'tnit-message'
  });
});

exports.onGlobalVotingWritten = onDocumentWritten('config/voting', async (event) => {
  const before = event.data.before.exists ? event.data.before.data() : {};
  const after = event.data.after.exists ? event.data.after.data() : {};
  if ((before.voting_status || '') === 'PUBLISHED') return;
  if ((after.voting_status || '') !== 'PUBLISHED') return;
  const seats = await allSeatIds();
  await notifyResults(seats);
});

exports.onGroupWritten = onDocumentWritten('groups/{groupId}', async (event) => {
  const before = event.data.before.exists ? event.data.before.data() : {};
  const after = event.data.after.exists ? event.data.after.data() : {};
  if ((before.voting_status || '') === 'PUBLISHED') return;
  if ((after.voting_status || '') !== 'PUBLISHED') return;
  const groupId = event.params.groupId;
  const seats = await seatIdsInGroup(groupId);
  await notifyResults(seats);
});
