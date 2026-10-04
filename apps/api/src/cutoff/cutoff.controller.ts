import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CutoffService } from './cutoff.service';
import { RunCutoffDto } from './dto/run-cutoff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('cutoff')
export class CutoffController {
  constructor(private readonly cutoffService: CutoffService) {}

  @RequirePermissions('order.update')
  @Post('run')
  async runCutoff(@Body() dto: RunCutoffDto) {
    return this.cutoffService.runCutoff(dto);
  }
}
