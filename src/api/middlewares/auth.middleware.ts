import { NextFunction, Request, Response } from 'express';
import { firebaseAdmin } from '../../config/firebase';

const getAuthToken = (req: Request): string | null => {
  const header = req.header('Authorization');
  if (header && header.startsWith('Bearer ')) {
    const token = header.replace('Bearer ', '').trim();
    if (token) return token;
  }

  const bodyToken = (req.body as { idToken?: string })?.idToken;
  if (typeof bodyToken === 'string' && bodyToken.trim()) {
    return bodyToken.trim();
  }

  return null;
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const token = getAuthToken(req);

  if (!token) {
    res.status(401).json({ message: 'Access denied. No token provided.' });
    return;
  }

  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);

    if (!decodedToken.uid) {
      res.status(403).json({ message: 'Invalid token: no UID found.' });
      return;
    }

    (req as any).user = decodedToken;
    next();
  } catch (err: any) {
    let errorMessage = 'Invalid token.';
    let statusCode = 401;

    if (err?.code === 'auth/id-token-expired') {
      errorMessage = 'Token expired. Please login again.';
      statusCode = 401;
    } else if (err?.code === 'auth/argument-error') {
      errorMessage = 'Invalid token format.';
      statusCode = 400;
    } else if (err?.code === 'auth/id-token-revoked') {
      errorMessage = 'Token has been revoked. Please login again.';
      statusCode = 403;
    }

    res.status(statusCode).json({ message: errorMessage });
  }
};
