export type TransactionStatus = 'pending' | 'confirmed' | 'rejected';

import { randomUUID } from 'crypto';

export class Transaction {
  constructor(
    public id: string,
    public originId: string,
    public destinationId: string,
    public amount: number,
    public status: TransactionStatus,
    public createdAt: Date,
    public updatedAt?: Date,
  ) {}

  isPending(): boolean {
    return this.status === 'pending';
  }

  isConfirmed(): boolean {
    return this.status === 'confirmed';
  }

  canBeApproved(): boolean {
    return this.isPending();
  }

  canBeRejected(): boolean {
    return this.isPending();
  }

  requiresApproval(): boolean {
    return this.amount > 50000;
  }

  static createNew(
    originId: string,
    destinationId: string,
    amount: number,
    status: TransactionStatus,
  ): Transaction {
    return new Transaction(randomUUID(), originId, destinationId, amount, status, new Date());
  }
}

