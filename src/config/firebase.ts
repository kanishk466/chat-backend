import fs from 'fs';
import path from 'path';
import admin, { ServiceAccount } from 'firebase-admin';
import { env } from './env';

function loadServiceAccount(): ServiceAccount {
  if (env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const absPath = path.resolve(process.cwd(), env.FIREBASE_SERVICE_ACCOUNT_PATH);
    if (!fs.existsSync(absPath)) {
      throw new Error(`Firebase service account file not found at: ${absPath}`);
    }
    const raw = fs.readFileSync(absPath, 'utf-8');
    return JSON.parse(raw) as ServiceAccount;
  }

  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    return {
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      // .env stores the key with literal \n sequences - convert them back to newlines
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
  }

  throw new Error(
    'Firebase credentials not configured. Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY'
  );
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(loadServiceAccount()),
  });
}

export const db = admin.firestore();
export { admin };
