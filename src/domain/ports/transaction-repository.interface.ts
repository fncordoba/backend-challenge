import { Transaction } from '../entities/transaction.entity';
import { QueryRunner } from 'typeorm';

export interface ITransactionRepository {
  findById(id: string): Promise<Transaction | null>;
  findByUserId(userId: string): Promise<Transaction[]>;
  create(transaction: Transaction, queryRunner?: QueryRunner): Promise<Transaction>;
  update(transaction: Transaction, queryRunner?: QueryRunner): Promise<Transaction>;
}

