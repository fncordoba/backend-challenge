import { User } from '../entities/user.entity';
import { QueryRunner } from 'typeorm';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByIdForUpdate(id: string, queryRunner: QueryRunner): Promise<User | null>;
  create(user: User, queryRunner?: QueryRunner): Promise<User>;
  update(user: User, queryRunner?: QueryRunner): Promise<User>;
  delete(id: string): Promise<void>;
}

