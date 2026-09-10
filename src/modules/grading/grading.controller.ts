import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import {
  createGradingScaleSchema,
  type CreateGradingScaleDto,
  type JwtPayload,
} from '../../schemas';
import { GradingService } from './grading.service';

@Controller('grading-scales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Get()
  findAll() {
    return this.gradingService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gradingService.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body(new ZodValidationPipe(createGradingScaleSchema))
    dto: CreateGradingScaleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.gradingService.create(dto, user);
  }
}
