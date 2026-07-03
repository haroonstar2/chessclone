import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly nodemailerTransport: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.nodemailerTransport = createTransport({
      host: this.configService.getOrThrow<string>('EMAIL_HOST'),
      port: Number(this.configService.getOrThrow<string>('EMAIL_PORT')),
      secure: this.configService.get<string>('EMAIL_SECURE') === 'true',
      auth: {
        user: this.configService.getOrThrow<string>('EMAIL_USER'),
        pass: this.configService.getOrThrow<string>('EMAIL_PASS'),
      },
    });
  }

  public async sendResetPasswordLink(
    email: string,
    token: string,
  ): Promise<void> {
    const url = `${this.configService.get<string>('EMAIL_RESET_PASSWORD_URL')}?token=${token}`;

    return this.nodemailerTransport.sendMail({
      // from: this.configService.get<string>('EMAIL_FROM'),
      from: 'from@example.com',
      to: email,
      subject: 'Reset your password',
      html: `
            <p>You requested a password reset.</p>
            <p><a href="${url}">Click here to reset your password</a></p>
      `,
    });
  }
}
