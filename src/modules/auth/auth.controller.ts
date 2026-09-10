import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { Public } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import {
  loginSchema,
  registerSchema,
  type JwtPayload,
  type LoginDto,
  type RegisterDto,
} from '../../schemas';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
  ) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() req: Request,
  ) {
    return this.authService.login(dto, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return user;
  }
}
