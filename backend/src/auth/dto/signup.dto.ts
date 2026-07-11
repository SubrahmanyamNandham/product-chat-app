import { IsEmail, IsIn, IsString, MinLength } from 'class-validator';
import type { UserRole } from '../../users/schemas/user.schema';

export class SignupDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsIn(['customer', 'agent'])
  role: UserRole;
}
