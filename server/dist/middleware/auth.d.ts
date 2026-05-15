import { Request, Response, NextFunction } from 'express';
export interface AuthUser {
    id: string;
    email: string;
    name: string;
    roles: string[];
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
export declare function authMiddleware(req: Request, _res: Response, next: NextFunction): void;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
