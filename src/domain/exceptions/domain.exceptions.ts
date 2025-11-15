export class DomainException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainException';
  }
}

export class InsufficientFundsException extends DomainException {
  constructor() {
    super('Insufficient funds');
  }
}

export class TransactionNotFoundException extends DomainException {
  constructor(id: string) {
    super(`Transaction ${id} not found`);
  }
}

export class UserNotFoundException extends DomainException {
  constructor(id: string) {
    super(`User ${id} not found`);
  }
}

export class InvalidTransactionStateException extends DomainException {
  constructor(message: string) {
    super(message);
  }
}

