import { Injectable } from '@nestjs/common';
import { CompilationService } from '../compilation/compilation.service';
import type { ResultStatistics } from '../../schemas';

@Injectable()
export class ReportingService {
  constructor(private readonly compilationService: CompilationService) {}

  /** Summary statistics for a course (PRD §4.7, §8.6). */
  async summary(courseId: string): Promise<ResultStatistics> {
    const compiled = await this.compilationService.compile(courseId);
    return compiled.statistics;
  }
}
