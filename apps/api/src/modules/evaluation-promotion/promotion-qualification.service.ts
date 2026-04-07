import { Injectable } from '@nestjs/common';

type QualificationRule = {
  targetPositionCode: string;
  targetRoleCode: string | null;
  minimumTotalScore: number;
  minimumResultCodes: string[];
  minimumAchievementCount: number;
  minimumProjectCount: number;
  minimumAchievementGrades: string[];
};

@Injectable()
export class PromotionQualificationService {
  private readonly ruleMap: Record<string, QualificationRule> = {
    MEMBER_TO_GROUP_LEADER: {
      targetPositionCode: 'GROUP_LEADER',
      targetRoleCode: 'GROUP_LEADER',
      minimumTotalScore: 85,
      minimumResultCodes: ['GOOD', 'EXCELLENT'],
      minimumAchievementCount: 1,
      minimumProjectCount: 1,
      minimumAchievementGrades: ['A', 'B', 'NATIONAL', 'PROVINCIAL'],
    },
    GROUP_LEADER_TO_MINISTER: {
      targetPositionCode: 'MINISTER',
      targetRoleCode: 'MINISTER',
      minimumTotalScore: 90,
      minimumResultCodes: ['GOOD', 'EXCELLENT'],
      minimumAchievementCount: 2,
      minimumProjectCount: 2,
      minimumAchievementGrades: ['A', 'NATIONAL', 'INTERNATIONAL'],
    },
  };

  deriveTargetPositionCode(currentPositionCode: string) {
    if (currentPositionCode === 'MEMBER') {
      return 'GROUP_LEADER';
    }

    if (currentPositionCode === 'GROUP_LEADER') {
      return 'MINISTER';
    }

    return 'GROUP_LEADER';
  }

  getRule(currentPositionCode: string, targetPositionCode: string) {
    const key = `${currentPositionCode}_TO_${targetPositionCode}`;
    return (
      this.ruleMap[key] ?? {
        targetPositionCode,
        targetRoleCode: targetPositionCode,
        minimumTotalScore: 80,
        minimumResultCodes: ['GOOD', 'EXCELLENT'],
        minimumAchievementCount: 1,
        minimumProjectCount: 1,
        minimumAchievementGrades: [],
      }
    );
  }
}
