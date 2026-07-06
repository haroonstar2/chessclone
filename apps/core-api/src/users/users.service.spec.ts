import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';

import { UsersService } from './users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, User } from '../../generated/prisma/client.js';
import { UUID } from 'crypto';

describe('UsersService', () => {
  let usersService: UsersService;

  const uuid: UUID = '17e01ef4-d648-42fb-9228-5959429c1ee4';

  const user: User = {
    uuid,
    username: 'user1',
    email: 'user@gmail.com',
    password_hash: 'password-hash',
    current_rating: 1200,
    created_at: new Date(),
  };

  const prismaServiceMock = {
    user: {
      findUnique: jest.fn<() => Promise<User | null>>(),
      findMany: jest.fn<() => Promise<User[]>>(),
      create: jest.fn<() => Promise<User>>(),
      update: jest.fn<() => Promise<User>>(),
      delete: jest.fn<() => Promise<User>>(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(usersService).toBeDefined();
  });

  it('findByUUID() should find user by uuid', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(user);

    const result = await usersService.findByUUID(uuid);

    expect(result).toEqual(user);
    expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
      where: { uuid: user.uuid },
    });
  });

  it('findByUsername() should find user by username', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(user);

    const result = await usersService.findByUsername(user.username);

    expect(result).toEqual(user);
    expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
      where: { username: user.username },
    });
  });

  it('findByEmail() should find user by email', async () => {
    prismaServiceMock.user.findUnique.mockResolvedValue(user);

    const result = await usersService.findByEmail(user.email);

    expect(result).toEqual(user);
    expect(prismaServiceMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: user.email },
    });
  });

  it('users() should find many users', async () => {
    const params = {
      skip: 1,
      take: 2,
      cursor: { uuid: user.uuid },
      where: { username: user.username },
      orderBy: { uuid: 'asc' },
    } satisfies {
      skip?: number;
      take?: number;
      cursor?: Prisma.UserWhereUniqueInput;
      where?: Prisma.UserWhereInput;
      orderBy?: Prisma.UserOrderByWithRelationInput;
    };

    prismaServiceMock.user.findMany.mockResolvedValue([user]);

    const result = await usersService.users(params);

    expect(result).toEqual([user]);
    expect(prismaServiceMock.user.findMany).toHaveBeenCalledWith({
      skip: 1,
      take: 2,
      cursor: { uuid: user.uuid },
      where: { username: user.username },
      orderBy: { uuid: 'asc' },
    });
  });

  it('createUser() should create a user with default settings', async () => {
    const data: Prisma.UserCreateInput = {
      username: user.username,
      email: user.email,
      password_hash: user.password_hash,
    };

    prismaServiceMock.user.create.mockResolvedValue(user);

    const result = await usersService.createUser(data);

    expect(result).toEqual(user);
    expect(prismaServiceMock.user.create).toHaveBeenCalledWith({
      data: {
        ...data,
        settings: {
          create: {},
        },
      },
    });
  });

  it('updateUser() should update a user', async () => {
    const params = {
      where: { uuid: user.uuid },
      data: { username: 'updatedUser' },
    };

    const updatedUser: User = {
      ...user,
      username: 'updatedUser',
    };

    prismaServiceMock.user.update.mockResolvedValue(updatedUser);

    const result = await usersService.updateUser(params);

    expect(result).toEqual(updatedUser);
    expect(prismaServiceMock.user.update).toHaveBeenCalledWith({
      where: { uuid: user.uuid },
      data: { username: 'updatedUser' },
    });
  });

  it('deleteUser() should delete a user', async () => {
    const where: Prisma.UserWhereUniqueInput = {
      uuid: user.uuid,
    };

    prismaServiceMock.user.delete.mockResolvedValue(user);

    const result = await usersService.deleteUser(where);

    expect(result).toEqual(user);
    expect(prismaServiceMock.user.delete).toHaveBeenCalledWith({
      where,
    });
  });
});
