import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { FileModule } from '../file/file.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PortalService } from './portal.service';
import { PortalAdminController } from './portal-admin.controller';
import { PortalFileService } from './portal-file.service';
import { PortalPublicController } from './portal-public.controller';

@Module({
  imports: [PrismaModule, AuthModule, FileModule],
  controllers: [PortalPublicController, PortalAdminController],
  providers: [PortalService, PortalFileService],
})
export class PortalModule {}
