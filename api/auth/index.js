import loginHandler from './login.js';
import registerHandler from './register.js';
import pinLoginHandler from './pin-login.js';
import otpLoginHandler from './otp-login.js';
import switchUserHandler from './switch-user.js';
import setPinHandler from './set-pin.js';
import meHandler from './me.js';

export default async function handler(req, res) {
  const url = req.url || '';

  if (url.includes('/login') || url.endsWith('/login')) {
    return loginHandler(req, res);
  }
  if (url.includes('/register') || url.endsWith('/register')) {
    return registerHandler(req, res);
  }
  if (url.includes('/pin-login') || url.endsWith('/pin-login')) {
    return pinLoginHandler(req, res);
  }
  if (url.includes('/otp-login') || url.endsWith('/otp-login')) {
    return otpLoginHandler(req, res);
  }
  if (url.includes('/switch-user') || url.endsWith('/switch-user')) {
    return switchUserHandler(req, res);
  }
  if (url.includes('/set-pin') || url.endsWith('/set-pin')) {
    return setPinHandler(req, res);
  }
  if (url.includes('/me') || url.endsWith('/me')) {
    return meHandler(req, res);
  }

  // Fallback default
  if (req.method === 'POST') {
    return loginHandler(req, res);
  }
  return res.status(200).json({ success: true, message: 'VTU Topup Auth Service Active' });
}
