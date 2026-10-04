import { Module } from '@nestjs/common';
import { CutoffService } from './cutoff.service';
import { CutoffController } from './cutoff.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CutoffController],
  providers: [CutoffService],
  exports: [CutoffService],
})
export class CutoffModule {}
