import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FileModule } from '../file/file.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CreationService } from './creation.service';
import { CreationContentController } from './creation-content.controller';
import { CreationReviewController } from './creation-review.controller';
import { KnowledgeController } from './knowledge.controller';

@Module({
  imports: [PrismaModule, AuthModule, FileModule],
  controllers: [CreationContentController, CreationReviewController, KnowledgeController],
  providers: [CreationService],
})
export class CreationModule {}

