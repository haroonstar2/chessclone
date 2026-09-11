import { IsString, IsNotEmpty } from 'class-validator';

export class SignInDto {
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @IsNotEmpty()
  @IsString()
  password: string;
}
