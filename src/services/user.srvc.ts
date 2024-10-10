import { User } from '../models/user.model';
import { pool } from '../config/database';
import { Pool } from 'mysql2/promise';

export class UserService {
  private pool: Pool;

  constructor() { this.pool = pool }

  public async findAll(): Promise<User[]> {
    // Aquí realizarías la consulta a la base de datos
    const [rows] = await this.pool.query('select * from Personal');
    return [{ id: 1, name: 'John Doe', email: 'john@example.com' }]; // Ejemplo
  }
}
