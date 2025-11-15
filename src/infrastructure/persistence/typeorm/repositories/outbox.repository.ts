import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner } from 'typeorm';
import { IOutboxRepository, OutboxEvent } from '../../../../domain/ports/outbox-repository.interface';
import { OutboxEntity } from '../entities/outbox.entity';

@Injectable()
export class OutboxRepository implements IOutboxRepository {
  constructor(
    @InjectRepository(OutboxEntity)
    private readonly repository: Repository<OutboxEntity>,
  ) {}

  async insert(event: OutboxEvent, queryRunner?: QueryRunner): Promise<OutboxEvent> {
    const entity = new OutboxEntity();
    entity.aggregateId = event.aggregateId;
    entity.type = event.type;
    entity.payload = event.payload;
    entity.status = event.status || 'pending';
    entity.createdAt = event.createdAt || new Date();

    const manager = queryRunner ? queryRunner.manager : this.repository.manager;
    const saved = await manager.save(OutboxEntity, entity);

    return {
      id: saved.id,
      aggregateId: saved.aggregateId,
      type: saved.type,
      payload: saved.payload,
      status: saved.status,
      createdAt: saved.createdAt,
      processedAt: saved.processedAt,
    };
  }

  async fetchPending(limit: number): Promise<OutboxEvent[]> {
    const entities = await this.repository.find({
      where: { status: 'pending' },
      take: limit,
      order: { createdAt: 'ASC' },
    });

    return entities.map((e) => ({
      id: e.id,
      aggregateId: e.aggregateId,
      type: e.type,
      payload: e.payload,
      status: e.status,
      createdAt: e.createdAt,
      processedAt: e.processedAt,
    }));
  }

  async markProcessed(id: string): Promise<void> {
    await this.repository.update(id, {
      status: 'processed',
      processedAt: new Date(),
    });
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.repository.update(id, {
      status: 'failed',
      processedAt: new Date(),
      error,
    });
  }
}

