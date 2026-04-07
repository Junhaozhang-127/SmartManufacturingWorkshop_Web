import type { Prisma } from '@prisma/client';
import { DataScope, type DataScopeContext } from '@smw/shared';

export function buildMemberProfileWhere(dataScopeContext: DataScopeContext): Prisma.MemberProfileWhereInput | undefined {
  switch (dataScopeContext.scope) {
    case DataScope.ALL:
      return undefined;
    case DataScope.DEPT_PROJECT:
      return dataScopeContext.departmentAndDescendantIds.length
        ? {
            orgUnitId: {
              in: dataScopeContext.departmentAndDescendantIds.map((id) => BigInt(id)),
            },
          }
        : { userId: BigInt(dataScopeContext.userId) };
    case DataScope.GROUP_PROJECT:
      return dataScopeContext.groupId
        ? {
            orgUnitId: BigInt(dataScopeContext.groupId),
          }
        : { userId: BigInt(dataScopeContext.userId) };
    case DataScope.SELF_PARTICIPATE:
      return {
        userId: {
          in: [...new Set([...dataScopeContext.selfUserIds, ...dataScopeContext.participatingUserIds])].map((id) =>
            BigInt(id),
          ),
        },
      };
    default:
      return { userId: BigInt(dataScopeContext.userId) };
  }
}
