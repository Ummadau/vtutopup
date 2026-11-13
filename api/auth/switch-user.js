import { findUserByIdentifier } from './_auth_helpers.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const actorId = req.headers['x-user-id'];
  if (!actorId) {
    return res.status(403).json({ error: 'Administrator authentication required' });
  }
  const actor = await findUserByIdentifier(actorId);
  if (!actor || actor.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator privileges required to switch accounts' });
  }

  return res.status(403).json({
    error: 'Account switching is restricted in production deployments.',
  });
}
