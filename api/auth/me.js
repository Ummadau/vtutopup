import { findUserByIdentifier, sanitizeUser } from './_auth_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const user = await findUserByIdentifier(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  return res.status(200).json({ success: true, user: sanitizeUser(user) });
}
