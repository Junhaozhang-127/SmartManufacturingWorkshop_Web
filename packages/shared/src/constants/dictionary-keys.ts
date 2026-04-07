export const DictionaryKeys = {
  userStatus: 'SYS_USER_STATUS',
  roleStatus: 'SYS_ROLE_STATUS',
  orgUnitType: 'ORG_UNIT_TYPE',
  memberStatus: 'MEMBER_STATUS',
  approvalStatus: 'APPROVAL_STATUS',
  achievementLevel: 'ACHIEVEMENT_LEVEL',
  achievementGrade: 'ACHIEVEMENT_GRADE',
  approvalNodeRole: 'APPROVAL_NODE_ROLE',
  notificationCategory: 'NOTIFICATION_CATEGORY',
} as const;

export type DictionaryKey = (typeof DictionaryKeys)[keyof typeof DictionaryKeys];
