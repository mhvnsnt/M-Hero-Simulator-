import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import config from "../../firebase-applet-config.json";

const app = initializeApp({
  projectId: config.projectId,
  appId: config.appId,
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  measurementId: config.measurementId,
});

export const db = getFirestore(app);
// Use the custom database ID from the config
export const customDb = getFirestore(app, config.firestoreDatabaseId);

export const auth = getAuth(app);
