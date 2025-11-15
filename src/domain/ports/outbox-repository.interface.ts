import { QueryRunner } from 'typeorm';

export interface OutboxEvent {
  id?: string;
  aggregateId: string;
  type: string;
  payload: string;
  status: 'pending' | 'processed' | 'failed';
  createdAt?: Date;
  processedAt?: Date;
}

export interface IOutboxRepository {
  insert(event: OutboxEvent, queryRunner?: QueryRunner): Promise<OutboxEvent>;
  fetchPending(limit: number): Promise<OutboxEvent[]>;
  markProcessed(id: string): Promise<void>;
  markFailed(id: string, error: string): Promise<void>;
}

