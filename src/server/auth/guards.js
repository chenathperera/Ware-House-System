import 'server-only';
import User from '../models/User.js';
import { verifyToken } from './token.js';

export async function protect(req, res) {
  let token;
  if (req.headers.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token provided');
  }
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) throw new Error('User unavailable');
    req.user = user;
  } catch {
    res.status(401);
    throw new Error('Not authorized, token invalid or expired');
  }
}

export function authorize(req, res, ...roles) {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authorized');
  }
  if (!roles.includes(req.user.role)) {
    res.status(403);
    throw new Error(`Role '${req.user.role}' is not authorized for this action`);
  }
}
