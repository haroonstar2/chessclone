import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { ConfigService } from '@nestjs/config';

import { AuthGuard } from './auth.guard.js';
import { RegisterDto } from './dto/register-user.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';

// Define return types for mocked functions
type tokenResult = {
  accessToken: string;
};

type genericResult = {
  message: string;
};

describe('AuthController', () => {
  let authController: AuthController;

  // Extra mocks for functionality sake
  const configServiceMock = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const responseMock = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  };

  // Define main authService mock
  const authServiceMock = {
    register: jest
      .fn<(dto: RegisterDto) => Promise<tokenResult>>()
      .mockResolvedValue({
        accessToken: 'mock-access-token',
      }),

    signIn: jest
      .fn<(username: string, password: string) => Promise<tokenResult>>()
      .mockResolvedValue({
        accessToken: 'mock-access-token',
      }),

    signOut: jest.fn(),
    forgotPassword: jest
      .fn<(dto: ForgotPasswordDto) => Promise<genericResult>>()
      .mockResolvedValue({
        message: 'If that email exists, a reset link has been sent',
      }),

    resetPassword: jest
      .fn<(dto: ResetPasswordDto) => Promise<genericResult>>()
      .mockResolvedValue({
        message: 'Password reset successfully',
      }),
  };

  // Define the testing module
  // When the service is referenced, replace it with the mock
  beforeEach(async () => {
    jest.clearAllMocks();
    // Sending a secure cookie depends if NODE_ENV === 'production'
    // Mock the value here so tests assume enviroment is in development
    configServiceMock.get.mockReturnValue('test');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    })
      // Override the guards for the controller
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    authController = module.get<AuthController>(AuthController);
  });

  it('AuthController should be defined', () => {
    expect(authController).toBeDefined();
  });

  it('AuthService.register() should call', async () => {
    const dto = {
      email: 'user@gmail.com',
      username: 'user1',
      password: '123',
    };

    await authController.register(dto);

    expect(authServiceMock.register).toHaveBeenCalledWith(dto);
  });

  it('AuthService.signIn() should call  and update cookie', async () => {
    const dto = {
      username: 'user1',
      password: '123',
    };

    const result = await authController.signIn(dto, responseMock as any);

    expect(authServiceMock.signIn).toHaveBeenCalledWith(
      dto.username,
      dto.password,
    );

    expect(responseMock.cookie).toHaveBeenCalledWith(
      'access_token',
      'mock-access-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      }),
    );

    expect(result).toStrictEqual({ accessToken: 'mock-access-token' });
  });

  it('AuthService.signOut() should call and remove cookie', async () => {
    const result = await authController.signOut(responseMock as any);

    expect(responseMock.clearCookie).toHaveBeenCalledWith('access_token');

    expect(result).toEqual({
      message: 'Signed out',
    });
  });

  it('AuthService.forgotPassword() should call', async () => {
    const dto = {
      email: 'user1@gmail.com',
    };

    const result = await authController.forgotPassword(dto);

    expect(authServiceMock.forgotPassword).toHaveBeenCalledWith(dto.email);

    expect(result).toEqual({
      message: 'If that email exists, a reset link has been sent',
    });
  });

  it('AuthService.resetPassword() should call', async () => {
    const dto = {
      token: 'mock-reset-token',
      newPassword: 'mock-new-password',
    };

    const result = await authController.resetPassword(dto);

    expect(authServiceMock.resetPassword).toHaveBeenCalledWith(
      dto.token,
      dto.newPassword,
    );

    expect(result).toEqual({
      message: 'Password reset successfully',
    });
  });

  it('should set secure cookie in production', async () => {
    configServiceMock.get.mockReturnValue('production');

    const dto = {
      username: 'user1',
      password: '123',
    };

    await authController.signIn(dto, responseMock as any);

    expect(responseMock.cookie).toHaveBeenCalledWith(
      'access_token',
      'mock-access-token',
      expect.objectContaining({
        secure: true,
      }),
    );
  });
});
