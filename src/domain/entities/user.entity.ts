export class User {
  constructor(
    public id: string,
    public name: string,
    public email: string,
    public balance: number,
    public version?: number,
  ) {}

  hasSufficientBalance(amount: number): boolean {
    return this.balance >= amount;
  }

  debit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    if (!this.hasSufficientBalance(amount)) {
      throw new Error('Insufficient funds');
    }
    this.balance -= amount;
  }

  credit(amount: number): void {
    if (amount <= 0) {
      throw new Error('Amount must be positive');
    }
    this.balance += amount;
  }
}

