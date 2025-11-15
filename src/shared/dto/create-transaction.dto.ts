import { IsString, IsNumber, IsPositive, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTransactionDTO {
  @ApiProperty({ example: 'user-1', description: 'ID del usuario origen' })
  @IsString()
  @IsNotEmpty()
  originId: string;

  @ApiProperty({ example: 'user-2', description: 'ID del usuario destino' })
  @IsString()
  @IsNotEmpty()
  destinationId: string;

  @ApiProperty({ example: 1000, description: 'Monto de la transacción' })
  @IsNumber()
  @IsPositive()
  amount: number;
}

