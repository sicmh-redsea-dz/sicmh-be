import { NextFunction, Request, Response } from "express";
import { AuthService } from "../../application/services/auth.service";
import { ServiceContainer } from "../../infrastructure/container/service.container";

const throwValidationError = (message: string) => {
  const error: any = new Error(message);
  error.name = 'validation_errors';
  error.errors = [{ msg: message }];
  throw error;
};

const resolveProvider = (decoded: any): 'google' | 'conventional' => {
  return decoded?.firebase?.sign_in_provider === 'google.com' ? 'google' : 'conventional';
};

export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    this.authService = ServiceContainer.getAuthService();
  }

  register = async (req: Request, res: Response, next: NextFunction) => {
    const body = req.body ?? {};
    try {
      const decoded = (req as any).user;
      if (!decoded?.uid) {
        throwValidationError('Invalid token payload.');
      }

      const email = decoded.email;
      if (!email) {
        throwValidationError('Email not found in token.');
      }

      const name =
        body.name ||
        decoded.name ||
        (email.includes('@') ? email.split('@')[0] : email) ||
        'User';

      const provider = resolveProvider(decoded);
      const accessToken = body.accessToken;

      const registeredUser = await this.authService.register({
        name,
        email,
        uid: decoded.uid,
        provider,
        accessToken,
      });

      res.status(202).json({ user: registeredUser });
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const decoded = (req as any).user;
      if (!decoded?.uid) {
        throwValidationError('Invalid token payload.');
      }

      const loggedUser = await this.authService.login({
        uid: decoded.uid,
        email: decoded.email,
      });

      res.status(202).json({ user: loggedUser });
    } catch (err) {
      next(err);
    }
  };

  checkToken = async (req: Request, res: Response, next: NextFunction) => {
    const { uid: id } = (req as any).user;
    try {
      const currentUser = await this.authService.checkToken(id);
      res.status(200).json({ user: currentUser });
    } catch (err) {
      next(err);
    }
  };
}
