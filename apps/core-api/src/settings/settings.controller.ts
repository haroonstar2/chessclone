import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get('me')
  findAllSettings() {
    return this.settingsService.findAllSettings();
  }

  // TODO: Finish the service layer for this
  // @Patch('me')
  // updateSettings(@Body() updateSettingsDto: UpdateSettingsDto) {
  //   return this.settingsService.updateSettings(updateSettingsDto);
  // }
}
