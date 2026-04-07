import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ExampleController } from './example.controller';
import { ExampleService } from './example.service';

@Module({
  imports: [AuthModule],
  controllers: [ExampleController],
  providers: [ExampleService],
})
export class ExampleModule {}
