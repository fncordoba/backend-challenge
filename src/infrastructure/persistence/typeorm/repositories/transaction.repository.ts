import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { ITransactionRepository } from '../../../../domain/ports/transaction-repository.interface';
import { Transaction } from '../../../../domain/entities/transaction.entity';
import { TransactionEntity } from '../entities/transaction.entity';

@Injectable()
export class TransactionRepository implements ITransactionRepository {
  constructor(
    @InjectRepository(TransactionEntity)
    private readonly repository: Repository<TransactionEntity>,
  ) {}

  async findById(id: string): Promise<Transaction | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByUserId(userId: string): Promise<Transaction[]> {
    const entities = await this.repository.find({
      where: [{ originId: userId }, { destinationId: userId }],
      order: { createdAt: 'DESC' },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async create(transaction: Transaction, queryRunner?: QueryRunner): Promise<Transaction> {
    const entity = this.toEntity(transaction);
    const manager = queryRunner ? queryRunner.manager : this.repository.manager;
    const saved = await manager.save(TransactionEntity, entity);
    return this.toDomain(saved);
  }

  async update(transaction: Transaction, queryRunner?: QueryRunner): Promise<Transaction> {
    const entity = this.toEntity(transaction);
    entity.updatedAt = new Date();
    const manager = queryRunner ? queryRunner.manager : this.repository.manager;
    const saved = await manager.save(TransactionEntity, entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: TransactionEntity): Transaction {
    return new Transaction(
      entity.id,
      entity.originId,
      entity.destinationId,
      parseFloat(entity.amount.toString()),
      entity.status,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  private toEntity(transaction: Transaction): TransactionEntity {
    const entity = new TransactionEntity();
    entity.id = transaction.id;
    entity.originId = transaction.originId;
    entity.destinationId = transaction.destinationId;
    entity.amount = transaction.amount;
    entity.status = transaction.status;
    entity.createdAt = transaction.createdAt;
    entity.updatedAt = transaction.updatedAt;
    return entity;
  }
}

