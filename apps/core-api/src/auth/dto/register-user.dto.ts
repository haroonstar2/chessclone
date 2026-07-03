import {
  IsEmail,
  IsStrongPassword,
  Length,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Username is required' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username may only contain letters, numbers, and underscores.',
  })
  @Length(3, 15)
  username: string;

  // For initial registration, the raw password must be sent from the client to the server
  // This would sent over HTTPS to be secure. The database only stores the hash.
  @ApiProperty()
  @IsNotEmpty()
  @IsStrongPassword()
  @Length(8, 64)
  password: string;
}
