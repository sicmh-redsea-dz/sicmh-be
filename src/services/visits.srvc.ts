import { Pool } from "mysql2/promise";


export class VisitsService {
  constructor(private pool: Pool) {}
}