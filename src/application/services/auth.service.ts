import { AuthRepository } from '../ports/auth.repository';
import { hashPassword } from '../../utils/passwordUtils';
import { User } from '../../domain/entities/User';
import { UserMapper } from '../../domain/mappers/UserMapper';
import { AuthResponse } from '../../domain/responses/AuthResponse';

interface AuthParams {
  name?: string;
  email?: string;
  uid: string;
  accessToken?: string;
  provider?: 'conventional' | 'google';
}

enum Roles {
  Admin = 6,
  Doctor = 2,
  Enfermera = 3,
  Recepcionista = 4,
  Asistente = 5,
}

const buildError = (name: string, message: string) => {
  const error: any = new Error(message);
  error.name = name;
  return error;
};

const buildValidationError = (message: string) => {
  const error: any = new Error(message);
  error.name = 'validation_errors';
  error.errors = [{ msg: message }];
  return error;
};

export class AuthService {
  constructor(private readonly authRepo: AuthRepository) {}

  register = async (params: AuthParams): Promise<AuthResponse> => {
    const { name, email, uid, accessToken, provider } = params;

    if (!email) {
      throw buildValidationError('Email is required.');
    }

    const existingByUid = await this.authRepo.findByFirebaseId(uid);
    if (existingByUid) {
      throw buildError('duplicate_entry', 'User already exists.');
    }

    const existingByEmail = await this.authRepo.findByEmail(email);
    if (existingByEmail) {
      throw buildError('duplicate_entry', 'Email already registered.');
    }

    const normalizedProvider = provider === 'google' ? 'google' : 'conventional';
    const passwordHash = normalizedProvider === 'conventional'
      ? await hashPassword(uid)
      : undefined;

    const finalName = name?.trim() || (email.includes('@') ? email.split('@')[0] : email);

    const insertId = await this.authRepo.createUser({
      name: finalName,
      email,
      passwordHash,
      roleId: Roles.Admin,
      active: 1,
      firebaseId: uid,
      provider: normalizedProvider,
      accessToken: normalizedProvider === 'google' ? (accessToken ?? '') : undefined,
    });

    const newUser = await this.getUserData(insertId);
    return await UserMapper.toAuthResponse(newUser);
  };

  login = async (params: AuthParams): Promise<AuthResponse> => {
    const { uid } = params;
    const existingUser = await this.authRepo.findByFirebaseId(uid);

    if (!existingUser) {
      throw buildError('not_found_error', 'User not found.');
    }

    if (!existingUser.Activo) {
      throw buildError('inactive_user', 'User is inactive.');
    }

    return await UserMapper.toAuthResponse(existingUser);
  };

  checkToken = async (id: string) => {
    const user = await this.authRepo.findByFirebaseId(id);
    if (!user) {
      throw buildError('not_found_error', 'User not found.');
    }
    if (!user.Activo) {
      throw buildError('inactive_user', 'User is inactive.');
    }
    return await UserMapper.toAuthResponse(user);
  };

  private getUserData = async (identifier: number | string): Promise<User> => {
    const user = typeof identifier === 'number'
      ? await this.authRepo.findById(identifier)
      : await this.authRepo.findByEmail(identifier);

    if (!user) {
      throw buildError('not_found_error', 'User not found.');
    }

    return user;
  };
}
