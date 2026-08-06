// Firebase client configuration for HKCYS TINT Just For You.
//
// These values are meant to be public: they identify the project, they do not
// grant access to it. What actually protects the data is firestore.rules plus
// each participant needing to sign in. Never put the service account key here.

export const firebaseConfig = {
  apiKey: 'AIzaSyBIQrLARWje_fe7TX7f2u0Wk7xjFDAyNcs',
  authDomain: 'tnit-6c48d.firebaseapp.com',
  projectId: 'tnit-6c48d',
  storageBucket: 'tnit-6c48d.firebasestorage.app',
  messagingSenderId: '649245917670',
  appId: '1:649245917670:web:dce565a213bade09fc1627',
};

// Participants log in as 1A / 98765432, which maps to 1a@tnit.local with the
// phone number as the password. Keeping the mapping in one place means the
// login form, the migration script and the security rules stay in agreement.
export const EMAIL_DOMAIN = 'tnit.local';
export const ADMIN_EMAIL = `admin@${EMAIL_DOMAIN}`;

export function participantEmail(participantId) {
  return `${String(participantId || '').trim().toLowerCase()}@${EMAIL_DOMAIN}`;
}
