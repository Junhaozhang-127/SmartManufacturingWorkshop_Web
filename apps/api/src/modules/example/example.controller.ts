import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { type DataScopeContext,PermissionCodes } from '@smw/shared';

import {
  DataScopeContextParam,
  RequireDataScope,
  RequirePermissions,
} from '../auth/auth.decorators';
import { AuthGuard } from '../auth/auth.guard';
import { DataScopeGuard } from '../auth/data-scope.guard';
import { PermissionGuard } from '../auth/permission.guard';
import { ExampleQueryDto } from './dto/example-query.dto';
import { ExampleService } from './example.service';

@Controller('examples')
@UseGuards(AuthGuard, PermissionGuard, DataScopeGuard)
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get('members')
  @RequirePermissions(PermissionCodes.memberListView)
  @RequireDataScope()
  listMembers(@Query() query: ExampleQueryDto, @DataScopeContextParam() dataScopeContext: DataScopeContext) {
    return this.exampleService.listMembers(query, dataScopeContext);
  }
}
