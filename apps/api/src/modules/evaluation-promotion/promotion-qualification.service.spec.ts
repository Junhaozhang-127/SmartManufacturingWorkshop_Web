import { PromotionQualificationService } from './promotion-qualification.service';

describe('PromotionQualificationService', () => {
  it('derives target position from current position', () => {
    const service = new PromotionQualificationService();

    expect(service.deriveTargetPositionCode('MEMBER')).toBe('GROUP_LEADER');
    expect(service.deriveTargetPositionCode('GROUP_LEADER')).toBe('MINISTER');
  });

  it('returns configured rule for member to group leader', () => {
    const service = new PromotionQualificationService();

    expect(service.getRule('MEMBER', 'GROUP_LEADER')).toMatchObject({
      targetPositionCode: 'GROUP_LEADER',
      targetRoleCode: 'GROUP_LEADER',
      minimumTotalScore: 85,
      minimumAchievementCount: 1,
      minimumProjectCount: 1,
    });
  });
});
