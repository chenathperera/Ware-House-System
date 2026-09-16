import { apiHandler } from '../../../../server/http/handler.js';
import { getUserById, updateUser, deleteUser } from '../../../../server/services/userService.js';

export const runtime = 'nodejs';
export const GET = apiHandler(getUserById, { auth: true });
export const PUT = apiHandler(updateUser, { auth: true, roles: ['admin'] });
export const DELETE = apiHandler(deleteUser, { auth: true, roles: ['admin'] });
