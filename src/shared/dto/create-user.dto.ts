import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateUserDTO {
  @ApiProperty({
    description: 'ID del usuario. Si no se envía, se genera automáticamente.',
    example: 'user-4',
    required: false,
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiProperty({ description: 'Nombre del usuario', example: 'Ana Gómez' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Email del usuario', example: 'ana@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Balance inicial en pesos', example: 50000 })
  @IsNumber()
  @Min(0)
  balance!: number;
}


