import { Entity, Column, PrimaryGeneratedColumn, Index } from 'typeorm';

@Entity('outbox')
export class OutboxEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  aggregateId: string;

  @Column()
  type: string;

  @Column('text')
  payload: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'processed', 'failed'],
    default: 'pending',
  })
  @Index()
  status: 'pending' | 'processed' | 'failed';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  @Column('text', { nullable: true })
  error?: string;
}

