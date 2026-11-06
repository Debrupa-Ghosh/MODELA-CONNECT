import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, initializeFirestore, setLogLevel } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

setLogLevel('silent');

const app = initializeApp(firebaseConfig);
let firestoreDb;
try {
  firestoreDb = initializeFirestore(
    app,
    { experimentalAutoDetectLongPolling: true },
    firebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
}
export const db = firestoreDb;
export const auth = getAuth(app);
