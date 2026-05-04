import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Move up to the project root where the JSON is located (backend/serviceAccountKey.json)
const serviceAccountPath = path.resolve(__dirname, '../../serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'it-support-esg-392d3.firebasestorage.app'
});

const db = admin.firestore();
const auth = admin.auth();

// Set setting for Timestamps
db.settings({ ignoreUndefinedProperties: true });

const FieldValue = admin.firestore.FieldValue;

console.log('Firebase Admin SDK initialized');

const bucket = admin.storage().bucket();

export { db, auth, FieldValue, bucket };
export default db;
