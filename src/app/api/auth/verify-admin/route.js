import { apiHandler } from '../../../../server/http/handler.js';
import { verifyAdmin } from '../../../../server/services/authService.js';

export const runtime = 'nodejs';
export const POST = apiHandler(verifyAdmin, { auth: true, authLimit: true });
