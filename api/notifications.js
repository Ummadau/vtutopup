export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  return res.status(200).json({
    success: true,
    notifications: [
      {
        id: 'notif_welcome',
        title: 'Welcome to NPay',
        message: 'Fast, automated VTU & digital services are active on your account.',
        type: 'info',
        read: false,
        createdAt: new Date().toISOString(),
      },
    ],
  });
}
