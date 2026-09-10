import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { ZodValidationPipe } from '../../common/zod/zod-validation.pipe';
import {
  editScoreSchema,
  uploadScoresSchema,
  type EditScoreDto,
  type JwtPayload,
  type UploadScoresDto,
} from '../../schemas';
import { ScoresService } from './scores.service';

/** Multer's file shape (kept local to avoid a hard dependency on the type). */
interface UploadedExcel {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/octet-stream', // some browsers send this for .xlsx
]);

@Controller('courses/:courseId/scores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ScoresController {
  constructor(private readonly scoresService: ScoresService) {}

  /**
   * Upload a score table (PRD §8.3). Defaults to a dry run (audit + match
   * preview); pass `?commit=true` to import. The audit report lists every
   * duplicate and validation issue found.
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('courseId') courseId: string,
    @Query(new ZodValidationPipe(uploadScoresSchema))
    query: UploadScoresDto,
    @UploadedFile() file: UploadedExcel | undefined,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded (field name: "file")');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Upload an .xlsx, .xls or .csv file.`,
      );
    }

    return this.scoresService.upload({
      courseId,
      assessmentType: query.assessmentType,
      commit: query.commit,
      file,
      user,
    });
  }

  /** Edit a single compiled score with a mandatory reason (PRD §4.9). */
  @Patch(':scoreId')
  editScore(
    @Param('scoreId') scoreId: string,
    @Body(new ZodValidationPipe(editScoreSchema)) dto: EditScoreDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.scoresService.editScore(scoreId, dto, user);
  }
}
