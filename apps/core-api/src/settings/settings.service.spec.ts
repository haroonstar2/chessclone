import { jest } from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from './settings.service.js';

describe('SettingsService', () => {
  let settingsService: SettingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SettingsService],
    }).compile();

    settingsService = module.get<SettingsService>(SettingsService);
  });

  it('should be defined', () => {
    expect(settingsService).toBeDefined();
  });
});
