import { jest } from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EmailService } from '../email/email.service.js';
import { UsersService } from '../users/users.service.js';
import * as bcrypt from 'bcrypt';

type queryUserResult = {
  uuid: string;
  username: string;
  email: string;
  password_hash: string;
  current_rating: number;
  created_at: Date;
};

describe('AuthService', () => {
  let authService: AuthService;

  // Service mocks used by AuthService
  const configServiceMock = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const jwtServiceMock = {
    signAsync: jest.fn<(payload: any) => Promise<string>>(),
    verifyAsync:
      jest.fn<(payload: any, options: any) => Promise<{ sub: string }>>(),
  };

  const emailServiceMock = {
    sendResetPasswordLink:
      jest.fn<(email: string, token: string) => Promise<void>>(),
  };

  const usersServiceMock = {
    findByEmail: jest.fn<(email: string) => Promise<queryUserResult | null>>(),
    findByUsername:
      jest.fn<(username: string) => Promise<queryUserResult | null>>(),

    createUser: jest.fn<(payload: any) => Promise<queryUserResult>>(),
    updateUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configServiceMock.get.mockReturnValue('test');
    configServiceMock.getOrThrow.mockReturnValue('mock-secret');
    jwtServiceMock.signAsync.mockResolvedValue('mock-access-token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: EmailService, useValue: emailServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('AuthService should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('AuthService.register() should call with correct email, username, and password', async () => {
    const dto = {
      email: 'user@gmail.com',
      username: 'user1',
      password: '123',
    };

    // Mock a failed database search (user not registered yet)
    usersServiceMock.findByEmail.mockResolvedValue(null);

    // Mock row addition in database
    usersServiceMock.createUser.mockResolvedValue({
      uuid: 'user-123',
      email: 'user@gmail.com',
      username: 'user1',
      password_hash: 'hashed-password',
      current_rating: 1200,
      created_at: new Date(),
    });

    // Mock token being signed
    jwtServiceMock.signAsync.mockResolvedValue('mock-token');

    // Call the register function
    const result = await authService.register(dto);

    // Expect row created in database
    expect(usersServiceMock.createUser).toHaveBeenCalledWith({
      email: dto.email,
      username: dto.username,
      password_hash: expect.any(String),
    });

    // Extract arguments to
    const createUserArg = usersServiceMock.createUser.mock.calls[0][0];

    expect(
      await bcrypt.compare(dto.password, createUserArg.password_hash),
    ).toBe(true);

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'user-123',
    });

    expect(result).toEqual({
      accessToken: 'mock-token',
    });
  });

  it('AuthService.register() should throw ConflictException if email is already registered', async () => {
    const dto = {
      email: 'user@gmail.com',
      username: 'user1',
      password: '123',
    };

    usersServiceMock.findByEmail.mockResolvedValue({
      uuid: 'existing-user-id',
      email: dto.email,
      username: dto.username,
      password_hash: 'hashed',
      current_rating: 1200,
      created_at: new Date(),
    });

    await expect(authService.register(dto)).rejects.toThrow(ConflictException);

    expect(usersServiceMock.createUser).not.toHaveBeenCalled();
  });

  it('AuthService.signIn() should call with correct username and password', async () => {
    const password = 'password123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Mock a correct database search
    usersServiceMock.findByUsername.mockResolvedValue({
      uuid: 'user-123',
      email: 'user@gmail.com',
      username: 'user1',
      password_hash: passwordHash,
      current_rating: 1200,
      created_at: new Date(),
    });

    jwtServiceMock.signAsync.mockResolvedValue('mock-token');

    // Call the signIn function with the correct username and password
    const result = await authService.signIn('user1', password);

    expect(usersServiceMock.findByUsername).toHaveBeenCalledWith('user1');

    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith({
      sub: 'user-123',
    });

    expect(result).toEqual({
      accessToken: 'mock-token',
    });
  });

  it('AuthService.signIn() should throw UnauthorizedException if user is not found', async () => {
    usersServiceMock.findByUsername.mockResolvedValue(null);

    await expect(authService.signIn('user1', 'password123')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it('AuthService.signIn() should throw UnauthorizedException if password is incorrect', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);

    usersServiceMock.findByUsername.mockResolvedValue({
      uuid: 'user-123',
      email: 'user@gmail.com',
      username: 'user1',
      password_hash: passwordHash,
      current_rating: 1200,
      created_at: new Date(),
    });

    await expect(authService.signIn('user1', 'wrong-password')).rejects.toThrow(
      UnauthorizedException,
    );

    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
  });

  it("AuthService.forgotPassword() should call with existing user's email address", async () => {
    // Mock database result
    const user: queryUserResult = {
      uuid: 'user-123',
      email: 'user@gmail.com',
      username: 'user1',
      password_hash: 'password-hash',
      current_rating: 1200,
      created_at: new Date(),
    };

    usersServiceMock.findByEmail.mockResolvedValue(user);

    // Call the function
    const result = await authService.forgotPassword(user.email);

    // Expect the user to have return from database
    expect(usersServiceMock.findByEmail).toHaveBeenCalledWith(user.email);

    // Expect the token to have been signed
    expect(jwtServiceMock.signAsync).toHaveBeenCalledWith(
      { sub: user.uuid },
      expect.objectContaining({
        secret: expect.any(String),
        expiresIn: expect.any(String),
      }),
    );

    // Expect the enviroment value to have been collected
    expect(configServiceMock.getOrThrow).toHaveBeenCalled();

    // Expect the password reset link function to be called
    expect(emailServiceMock.sendResetPasswordLink).toHaveBeenCalledWith(
      user.email,
      'mock-access-token',
    );

    // Expect the function to return a value
    expect(result).toEqual({
      message: 'If that email exists, a reset link has been sent.',
    });
  });

  it("AuthService.forgotPassword() should return default message if user's email is not found", async () => {
    // Mock a false database call
    usersServiceMock.findByEmail.mockResolvedValue(null);

    // Call the function
    const result = await authService.forgotPassword('wrong-email@gmail.com');

    // Check none of these functions were called because of early exit
    expect(jwtServiceMock.signAsync).not.toHaveBeenCalled();
    expect(configServiceMock.getOrThrow).not.toHaveBeenCalled();
    expect(emailServiceMock.sendResetPasswordLink).not.toHaveBeenCalled();

    // Expect generic result
    expect(result).toEqual({
      message: 'If that email exists, a reset link has been sent.',
    });
  });

  it('AuthService.resetPassword() should call with correct token and newPassword', async () => {
    // Mock the verify function
    jwtServiceMock.verifyAsync.mockResolvedValue({
      sub: 'correct-uuid',
    });

    // Call the resetPassword function
    const newPassword = 'new-password';

    const result = await authService.resetPassword(
      'mock-reset-token',
      newPassword,
    );

    // Expect the verify function has been called with the token and a secret
    // The token is 'mock-reset-token' because of the mock above
    expect(jwtServiceMock.verifyAsync).toHaveBeenCalledWith(
      'mock-reset-token',
      {
        secret: 'mock-secret',
      },
    );

    // Expect the update user function to have been called with the correct uuid and any hash
    expect(usersServiceMock.updateUser).toHaveBeenCalledWith({
      where: {
        uuid: 'correct-uuid',
      },
      data: {
        password_hash: expect.any(String),
      },
    });

    // Expect the hash of the newPassword was calculated correctly
    const updateArg = usersServiceMock.updateUser.mock.calls[0][0] as {
      data: { password_hash: string };
    };

    expect(
      await bcrypt.compare(newPassword, updateArg.data.password_hash),
    ).toBe(true);

    // Expect output is set correctly
    expect(result).toEqual({
      message: 'Password reset successfully',
    });
  });

  it('AuthService.resetPassword() should throw if the token is incorrect', async () => {
    // Mock a rejected value
    jwtServiceMock.verifyAsync.mockRejectedValue(new Error());

    // Expect that the unauthorized exception is called correctly
    await expect(
      authService.resetPassword('bad-token', 'new-password'),
    ).rejects.toThrow(UnauthorizedException);

    // Expect that this function is not called due to early exit
    expect(usersServiceMock.updateUser).not.toHaveBeenCalled();
  });
});
