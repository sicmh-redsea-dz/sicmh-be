import admin from 'firebase-admin';

const parseServiceAccount = (): admin.ServiceAccount | null => {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;

  if (json && json.trim()) {
    try {
      return JSON.parse(json) as admin.ServiceAccount;
    } catch (err) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON');
    }
  }

  if (base64 && base64.trim()) {
    try {
      const decoded = Buffer.from(base64, 'base64').toString('utf-8');
      return JSON.parse(decoded) as admin.ServiceAccount;
    } catch (err) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64');
    }
  }

  return null;
};

const initFirebaseAdmin = () => {
  if (admin.apps.length) return admin;

  const serviceAccount = parseServiceAccount();
  const credential = serviceAccount
    ? admin.credential.cert(serviceAccount)
    : admin.credential.applicationDefault();

  admin.initializeApp({ credential });
  return admin;
};

export const firebaseAdmin = initFirebaseAdmin();
