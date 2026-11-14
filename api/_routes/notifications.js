import { extractBearerToken, fsPatchDoc, fsRunQuery } from './_firestore.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const url = (req.url || '').split('?')[0];
  const userToken = extractBearerToken(req);
  const userId = req.headers['x-user-id'];

  if (req.method === 'POST' && url.includes('/read')) {
    const match = url.match(/notifications\/([^/]+)\/read/);
    const notifId = match?.[1] ? decodeURIComponent(match[1]) : null;
    if (!notifId) {
      return res.status(400).json({ success: false, error: 'Notification ID is required' });
    }
    const patchRes = await fsPatchDoc(
      `notifications/${notifId}`,
      { read: true, readAt: new Date().toISOString() },
      ['read', 'readAt'],
      userToken
    ).catch(() => null);
    if (patchRes && !patchRes.ok && patchRes.status !== 404) {
      return res.status(503).json({ success: false, error: patchRes.error || 'Failed to update notification' });
    }
    return res.status(200).json({ success: true });
  }

  if (!userId && !userToken) {
    return res.status(200).json({ success: true, notifications: [] });
  }

  try {
    const filters = userId ? [{ field: 'userId', value: String(userId) }] : [];
    const qRes = await fsRunQuery('notifications', filters, 100, userToken);
    if (qRes.ok && Array.isArray(qRes.documents)) {
      const notifications = qRes.documents.sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      return res.status(200).json({ success: true, notifications });
    }
  } catch (err) {
    console.warn('Error fetching notifications from Firestore:', err);
  }

  return res.status(200).json({ success: true, notifications: [] });
}

