import { Processor, WorkerHost } from '@nestjs/bullmq';
import { PrismaService } from '../../../myfilm-tracking-starter/api/src/prisma/prisma.service';
@Processor('analytics')
export class AnalyticsProcessor extends WorkerHost {
  constructor(private prisma: PrismaService) {
    super();
  }
  async process(job: any) {
    await this.prisma.event.create({ data: job.data });
    return true;
  }
}
