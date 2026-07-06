import { jest } from '@jest/globals';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

const sendMailMock = jest.fn<() => Promise<unknown>>();

const createTransportMock = jest.fn(() => ({
  sendMail: sendMailMock,
}));

jest.unstable_mockModule('nodemailer', () => ({
  createTransport: createTransportMock,
}));

const { EmailService } = await import('./email.service.js');

type EmailServiceType = InstanceType<typeof EmailService>;

describe('EmailService', () => {
  let emailService: EmailServiceType;

  const configServiceMock = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });

    configServiceMock.getOrThrow.mockImplementation((key: unknown) => {
      const values: Record<string, string> = {
        EMAIL_HOST: 'smtp.example.com',
        EMAIL_PORT: '587',
        EMAIL_USER: 'user',
        EMAIL_PASS: 'pass',
      };

      return values[String(key)];
    });

    configServiceMock.get.mockImplementation((key: unknown) => {
      const values: Record<string, string> = {
        EMAIL_SECURE: 'false',
        EMAIL_RESET_PASSWORD_URL: 'https://example.com/reset-password',
      };

      return values[String(key)];
    });

    const testingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    emailService = testingModule.get(EmailService);
  });

  it('EmailService should be defined', () => {
    expect(emailService).toBeDefined();
  });

  it('sendResetPasswordLink() should send reset email', async () => {
    sendMailMock.mockResolvedValue({});

    await emailService.sendResetPasswordLink('user1@gmail.com', '12345');

    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'user',
        pass: 'pass',
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'from@example.com',
        to: 'user1@gmail.com',
        subject: 'Reset your password',
        html: expect.stringContaining(
          'https://example.com/reset-password?token=12345',
        ),
      }),
    );
  });

  it('sendResetPasswordLink() should throw UnauthorizedException when sending fails', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP failed'));

    await expect(
      emailService.sendResetPasswordLink('user1@gmail.com', '12345'),
    ).rejects.toThrow(UnauthorizedException);
  });
});
