import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import {
  scalingRuleSchema,
  type JwtPayload,
  type ScalingRule,
} from '../../schemas';
import { ScalingService } from './scaling.service';

@Controller('courses/:courseId/scaling')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScalingController {
  constructor(private readonly scalingService: ScalingService) {}

  /** Preview a scaling rule's effect before committing (PRD §8.5). */
  @Post('preview')
  preview(
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(scalingRuleSchema)) rule: ScalingRule,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scalingService.preview(courseId, rule, user);
  }

  /** Apply a scaling rule (requires an approval reference) and recompile. */
  @Post('apply')
  apply(
    @Param('courseId') courseId: string,
    @Body(new ZodValidationPipe(scalingRuleSchema)) rule: ScalingRule,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scalingService.apply(courseId, rule, user);
  }
}
