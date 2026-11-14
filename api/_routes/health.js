// Vercel Serverless Function - Firestore Connectivity Health Check
import {
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  fsRunQuery,
  isServiceAccountConfigured,
} from './_firestore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const serviceAccountConfigured = isServiceAccountConfigured();
  const publicQuery = await fsRunQuery('dataPlans', [], 1);

  return res.status(200).json({
    success: publicQuery.ok,
    firestoreConnected: publicQuery.ok,
    publicCatalogCount: publicQuery.documents.length,
    serviceAccountConfigured,
    projectId: FIREBASE_PROJECT_ID,
    databaseId: FIRESTORE_DATABASE_ID,
    ...(publicQuery.error ? { firestoreError: publicQuery.error } : {}),
  });
}
