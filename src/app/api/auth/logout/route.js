import { apiHandler } from '../../../../server/http/handler.js';
import { logout } from '../../../../server/services/authService.js';

export const runtime = 'nodejs';
export const POST = apiHandler(logout, { auth: true, authLimit: true });
