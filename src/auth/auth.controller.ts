import { Controller, Get, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { Public } from './decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  googleLogin() {}

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleLoginCallback(@Request() req, @Res({ passthrough: true }) res) {
    const user = req.user;
    if (!user) {
      return { message: 'No user from Google' };
    }
    const tokens = await this.authService.generateTokens(user.id || user.email);
    // Set HttpOnly cookies for access and refresh tokens
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.redirect('http://localhost:3000/auth/success');
  }

  @Public()
  @Get('session')
  async getMe(@Request() req) {
    const token = req.cookies['access_token'];
    if (!token) {
      return { message: 'No access token found' };
    }

    try {
      const decoded = this.jwtService.verify(token);
      return { user: decoded, isLoggedIn: true };
    } catch (error) {
      return { message: 'Invalid access token', isLoggedIn: false };
    }
  }

  @Get('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    res.json({ message: 'Logged out successfully' });
  }
}
