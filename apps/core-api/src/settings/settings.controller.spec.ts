import { jest } from '@jest/globals';

import { Test, TestingModule } from '@nestjs/testing';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';

describe('SettingsController', () => {
  let settingsController: SettingsController;

  const settingsServiceMock = {
    findAllSettings: jest.fn(() => 'Hello World!'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: settingsServiceMock }],
    }).compile();

    settingsController = module.get<SettingsController>(SettingsController);
  });

  it('should be defined', () => {
    expect(settingsController).toBeDefined();
  });
});
