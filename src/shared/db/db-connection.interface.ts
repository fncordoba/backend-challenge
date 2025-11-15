import { QueryRunner } from 'typeorm';

export interface IDbConnection {
  createQueryRunner(): Promise<QueryRunner>;
}

