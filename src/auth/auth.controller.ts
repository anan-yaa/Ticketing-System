import { Controller, Post, Body, HttpCode, HttpStatus, Get, UseGuards, Request, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: any) {
    // Note: Add class-validator DTOs later for robust validation
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: any) {
    return this.authService.login(loginDto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(@Request() req, @Body() body: any) {
    return this.authService.changePassword(req.user.id, body);
  }

  @Get('seed')
  async seed() {
    const prisma = this.authService['prisma'];
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'superadmin@ticketing.internal' },
      update: { mustChangePassword: false },
      create: {
        email: 'superadmin@ticketing.internal',
        passwordHash,
        name: 'System Admin',
        systemRole: 'SUPER_ADMIN',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    });

    const customerUser = await prisma.user.upsert({
      where: { email: 'user1@example.com' },
      update: {
        passwordHash: await bcrypt.hash('Password123', 10),
        status: 'ACTIVE',
      },
      create: {
        email: 'user1@example.com',
        passwordHash: await bcrypt.hash('Password123', 10),
        name: 'User One',
        systemRole: 'CUSTOMER',
        status: 'ACTIVE',
        mustChangePassword: false,
      },
    });

    return {
      success: true,
      message: 'Testing credentials for admin and customer accounts cleanly synchronized',
      accounts: {
        admin: user.email,
        customer: customerUser.email
      }
    };
  }
}
