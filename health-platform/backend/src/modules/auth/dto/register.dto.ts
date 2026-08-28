import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Passwort muss mindestens 8 Zeichen haben.' })
  password!: string;

  @IsOptional()
  @IsString()
  firstName?: string;
}
