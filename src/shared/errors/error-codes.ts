export type BusinessErrorCode =
  | 'INSUFFICIENT_FUNDS'
  | 'USER_NOT_FOUND'
  | 'TRANSACTION_NOT_FOUND'
  | 'INVALID_TRANSACTION_STATE'
  | 'SAME_ACCOUNT';

export type TechnicalErrorCode = 'TECHNICAL_ERROR';

export type ErrorCode = BusinessErrorCode | TechnicalErrorCode;

export interface ErrorMetadata {
  code: ErrorCode;
  status: number;
}

// Mapa por nombre de clase de excepción de dominio
export const DOMAIN_ERROR_MAP: Record<string, ErrorMetadata> = {
  InsufficientFundsException: {
    code: 'INSUFFICIENT_FUNDS',
    status: 400,
  },
  UserNotFoundException: {
    code: 'USER_NOT_FOUND',
    status: 404,
  },
  TransactionNotFoundException: {
    code: 'TRANSACTION_NOT_FOUND',
    status: 404,
  },
  InvalidTransactionStateException: {
    code: 'INVALID_TRANSACTION_STATE',
    status: 400,
  },
};


