// Vercel Serverless Function: Manual Funding Config
const FIRESTORE_BASE = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0376919977/databases/ai-studio-naeemdatasub-8bb16184-21be-4bcb-bf84-6a9163fbd9db/documents';
const FIRESTORE_KEY = 'AIzaSyBqaJeymaKiXVij6eypZQJFgK2dOH5CoTA';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).json({ success: true });

  const defaultConfig = {
    bankName: 'Opay Digital Services',
    accountNumber: '8069417241',
    accountName: 'NAIM UMMADAU HARUNA',
    instruction: 'Transfer the exact amount to the account above and enter your sender name and payment reference for instant manual approval.',
    isEnabled: true,
  };

  try {
    const fsRes = await fetch(`${FIRESTORE_BASE}/systemSettings/manual_funding_config?key=${FIRESTORE_KEY}`);
    if (fsRes.ok) {
      const data = await fsRes.json();
      if (data.fields) {
        defaultConfig.bankName = data.fields.bankName?.stringValue || defaultConfig.bankName;
        defaultConfig.accountNumber = data.fields.accountNumber?.stringValue || defaultConfig.accountNumber;
        defaultConfig.accountName = data.fields.accountName?.stringValue || defaultConfig.accountName;
        defaultConfig.instruction = data.fields.instruction?.stringValue || defaultConfig.instruction;
      }
    }
  } catch {}

  return res.status(200).json({ success: true, config: defaultConfig });
}
