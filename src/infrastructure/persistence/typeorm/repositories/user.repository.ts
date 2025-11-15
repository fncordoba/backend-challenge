import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { IUserRepository } from '../../../../domain/ports/user-repository.interface';
import { User } from '../../../../domain/entities/user.entity';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UserRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repository: Repository<UserEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const entity = await this.repository.findOne({ where: { id } });
    return entity ? this.toDomain(entity) : null;
  }

  async findByIdForUpdate(id: string, queryRunner: QueryRunner): Promise<User | null> {
    const entity = await queryRunner.manager.findOne(UserEntity, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    return entity ? this.toDomain(entity) : null;
  }

  async create(user: User, queryRunner?: QueryRunner): Promise<User> {
    const entity = this.toEntity(user);
    const manager = queryRunner ? queryRunner.manager : this.repository.manager;
    const saved = await manager.save(UserEntity, entity);
    return this.toDomain(saved);
  }

  async update(user: User, queryRunner?: QueryRunner): Promise<User> {
    const entity = this.toEntity(user);
    entity.updatedAt = new Date();
    const manager = queryRunner ? queryRunner.manager : this.repository.manager;
    const saved = await manager.save(UserEntity, entity);
    return this.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: UserEntity): User {
    return new User(entity.id, entity.name, entity.email, parseFloat(entity.balance.toString()), entity.version);
  }

  private toEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.id;
    entity.name = user.name;
    entity.email = user.email;
    entity.balance = user.balance;
    entity.version = user.version || 0;
    return entity;
  }
}

