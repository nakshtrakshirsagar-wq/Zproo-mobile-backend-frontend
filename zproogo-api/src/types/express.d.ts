import type { UserRow } from '../types';

declare global {
  namespace Express {
    interface Request {
      installId?: string;
      sessionId?: string;
      user?: UserRow;
    }
  }
}
export {};
