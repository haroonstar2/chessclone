import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class SettingsService {
  private mySettings = {
    type: 'my settings',
    uuid: randomUUID(),
    boardTheme: 'classic',
    pieceTheme: 'standard',
    sound: true,
    autoQueen: false,
    createdAt: Date,
    updatedAt: Date,
  };

  findAllSettings() {
    return this.mySettings;
  }

  // TODO: Fix the weird date type constructor thing
  // updateSettings(body: UpdateSettingsDto) {
  //   this.mySettings = {
  //     ...this.mySettings,
  //     ...body,
  //   };

  //   return this.mySettings;
  // }
}
