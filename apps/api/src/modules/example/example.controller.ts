import { Controller, Get, Query } from '@nestjs/common';

import { ExampleQueryDto } from './dto/example-query.dto';
import { ExampleService } from './example.service';

@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Get('members')
  listMembers(@Query() query: ExampleQueryDto) {
    return this.exampleService.listMembers(query);
  }
}
