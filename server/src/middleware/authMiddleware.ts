import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { AuthRequest, UserRole } from '../types';

interface DecodedToken {
  id: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  let token: string | undefined;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized to access this route. No token provided.' });
    return;
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'civiclens_super_secret_jwt_key_2026_sih'
    ) as DecodedToken;

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Not authorized. Token verification failed.' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `User role '${req.user?.role}' is not authorized to access this route. Required roles: [${roles.join(', ')}]`,
      });
      return;
    }
    next();
  };
};
