import { Entity, Column, PrimaryColumn, Index } from 'typeorm';

export type TransactionStatus = 'pending' | 'confirmed' | 'rejected';

@Entity('transactions')
export class TransactionEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  @Index()
  originId: string;

  @Column()
  @Index()
  destinationId: string;

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'confirmed', 'rejected'],
    default: 'pending',
  })
  status: TransactionStatus;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}

