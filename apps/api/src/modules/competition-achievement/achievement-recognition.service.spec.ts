import { AchievementRecognitionService } from './achievement-recognition.service';

describe('AchievementRecognitionService', () => {
  it('generates expandable placeholder result when rule config is missing', () => {
    const service = new AchievementRecognitionService();

    const result = service.generatePlaceholder({
      achievementType: 'PAPER',
      levelCode: 'NATIONAL',
      projectId: 'PRJ-001',
    });

    expect(result.recognizedGrade).toBe('PENDING_RULE_CONFIG');
    expect(result.scoreMapping).toMatchObject({
      configured: false,
      ruleKey: 'PAPER:NATIONAL',
      score: null,
      projectId: 'PRJ-001',
    });
  });
});
