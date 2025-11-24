// src/users/users.controller.ts
import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

class Me {
  id: number;
}

@ApiTags('Users')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me/settings')
  async getMySettings(@CurrentUser() user: Me) {
    return this.usersService.getSettingsByUserId(user.id);
  }

  @Put('me/settings')
  async updateMySettings(
    @CurrentUser() user: Me,
    @Body() dto: UpdateUserSettingsDto,
  ) {
    return this.usersService.updateSettings(user.id, dto);
  }
}