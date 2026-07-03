import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { User, Prisma } from '../../generated/prisma/client.js';
import { UUID } from 'crypto';

@Injectable()
export class UsersService {
  // TODO: Remove this and replace it with a call to the PostgreSQL database
  constructor(private readonly prisma: PrismaService) {}
  /*
  Functions to interface with the database using Primsa ORM
  */

  findByUUID(uuid: UUID) {
    return this.prisma.user.findUnique({
      where: { uuid },
    });
  }

  // Look in the 'User' table and find one row using a unique field
  findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Find multiple users in `User` table. Optionally filter, sort, and paginate.
  async users(params: {
    skip?: number;
    take?: number;
    cursor?: Prisma.UserWhereUniqueInput;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<User[]> {
    const { skip, take, cursor, where, orderBy } = params;
    return this.prisma.user.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy,
    });
  }

  // Insert a new row into the `User` table.
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        ...data,
        settings: {
          create: {},
        },
      },
    });
  }

  // Update a row in the `User` table.
  async updateUser(params: {
    where: Prisma.UserWhereUniqueInput;
    data: Prisma.UserUpdateInput;
  }): Promise<User> {
    const { where, data } = params;
    return this.prisma.user.update({
      data,
      where,
    });
  }

  // Delete a row in the `User` table
  async deleteUser(where: Prisma.UserWhereUniqueInput): Promise<User> {
    return this.prisma.user.delete({
      where,
    });
  }
}
