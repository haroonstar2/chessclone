import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

const redisClientMock = {
  connect: jest.fn(),
  quit: jest.fn(),
};

const RedisMock = jest.fn(() => redisClientMock);

jest.unstable_mockModule('ioredis', () => ({
  Redis: RedisMock,
  default: RedisMock,
}));

const { RedisService } = await import('./redis.service.js');

describe('RedisService', () => {
  let redisService: InstanceType<typeof RedisService>;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    redisService = module.get<InstanceType<typeof RedisService>>(RedisService);
    await redisService.onModuleInit();
  });

  it('RedisService should be defined', () => {
    expect(redisService).toBeDefined();
  });

  it('getClient() should return a Redis client', () => {
    const client = redisService.getClient();
    expect(client).toBeDefined();
    expect(client).toHaveProperty('connect');
    expect(client).toHaveProperty('quit');
  });

  it('onModuleInit() should create a Redis client', () => {
    expect(RedisMock).toHaveBeenCalledWith({
      host: 'localhost',
      port: 6379,
    });
  });
});
