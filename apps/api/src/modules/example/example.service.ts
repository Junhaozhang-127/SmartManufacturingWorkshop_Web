import { PrismaService } from '@api/modules/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { type DataScopeContext,normalizePagination } from '@smw/shared';

import { buildMemberProfileWhere } from '../auth/data-scope-prisma';
import type { ExampleQueryDto } from './dto/example-query.dto';

@Injectable()
export class ExampleService {
  constructor(private readonly prisma: PrismaService) {}

  async listMembers(query: ExampleQueryDto, dataScopeContext: DataScopeContext) {
    const pagination = normalizePagination(query);
    const scopeWhere = buildMemberProfileWhere(dataScopeContext);
    const keywordWhere = pagination.keyword
      ? {
          OR: [
            { user: { displayName: { contains: pagination.keyword } } },
            { user: { username: { contains: pagination.keyword } } },
            { orgUnit: { unitName: { contains: pagination.keyword } } },
          ],
        }
      : undefined;

    const whereClauses = [scopeWhere, keywordWhere].filter(
      (value): value is NonNullable<typeof value> => Boolean(value),
    );
    const where = whereClauses.length ? { AND: whereClauses } : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.memberProfile.findMany({
        where,
        include: {
          user: {
            include: {
              userRoles: {
                include: {
                  role: true,
                },
                orderBy: {
                  role: {
                    sortNo: 'asc',
                  },
                },
              },
            },
          },
          orgUnit: true,
          mentor: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (pagination.page - 1) * pagination.pageSize,
        take: pagination.pageSize,
      }),
      this.prisma.memberProfile.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: String(item.id),
        displayName: item.user.displayName,
        username: item.user.username,
        positionCode: item.positionCode,
        memberStatus: item.memberStatus,
        orgUnitName: item.orgUnit.unitName,
        mentorName: item.mentor?.displayName ?? '未分配',
        joinDate: item.joinDate.toISOString().slice(0, 10),
        roles: item.user.userRoles.map((relation) => relation.role.roleName),
        skillTags: typeof item.skillTags === 'string' ? item.skillTags.split(',') : [],
      })),
      meta: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
      },
    };
  }
}
