// Vercel Catch-All Serverless Function for all /api/* routes
import masterHandler from './index.js';

export default async function handler(req, res) {
  return masterHandler(req, res);
}
