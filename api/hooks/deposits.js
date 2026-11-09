import { handleUnityBillsWebhookRequest } from '../_webhook_handler.js';

export default async function handler(req, res) {
  return handleUnityBillsWebhookRequest(req, res);
}
