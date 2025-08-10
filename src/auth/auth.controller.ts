import { Controller, Get, UseGuards, Request, Res, Post } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { Public } from './decorators/public.decorator';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { Auth } from './decorators/auth.decorator';
import { RefreshAuth } from './decorators/refresh-auth.decorator';
import { Users } from '../../generated/prisma';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { time } from 'console';

@ApiTags('auth')
@Controller('auth')
@ApiExtraModels(CreateUserDto)
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
  async googleLoginCallback(
    @Request() req: import('express').Request & { user?: Users },
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = req.user;
    if (!user) {
      return { message: 'No user from Google' };
    }
    const tokens = await this.authService.generateTokens(
      user.id,
      user.name ?? '',
    );
    // Set HttpOnly cookies for access and refresh tokens
    console.log(process.env.NODE_ENV);
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60,
    });
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    res.redirect(
      process.env.GOOGLE_AUTH_SUCCESS_REDIRECT ??
        'http://localhost:3000/auth/success',
    );
  }

  @Auth()
  @Post('logout')
  async logout(
    @Request() req: import('express').Request,
    @Res() res: Response,
  ) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    });
    res.json({ message: 'Logged out successfully' });
  }

  @RefreshAuth()
  @Post('refresh-token')
  async refreshToken(
    @Request()
    req: import('express').Request & { cookies: Record<string, string> },
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refresh_token'] || req.body.refreshToken;
    if (!refreshToken) {
      console.log('No refresh token found');
      return { message: 'No refresh token found' };
    }
    try {
      const tokens = await this.authService.refreshTokens(refreshToken);
      res.cookie('access_token', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60,
      });
      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24 * 7,
      });
      return { ...tokens, message: 'Tokens refreshed' };
    } catch {
      return { message: 'Invalid or expired refresh token' };
    }
  }

  @Auth()
  @Get('me')
  async getProfile(
    @Request() req: import('express').Request & { user?: Users },
  ) {
    return {
      user: req.user,
      message: 'User profile retrieved successfully',
      isLoggedIn: true,
    };
  }

  @Public()
  @Get('debug/cookies')
  async debugCookies(
    @Request() req: import('express').Request & { cookies: Record<string, string> },
  ) {
    return {
      cookies: req.cookies,
      headers: {
        cookie: req.headers.cookie,
        origin: req.headers.origin,
        referer: req.headers.referer,
        'user-agent': req.headers['user-agent'],
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        CORS_ORIGIN: process.env.CORS_ORIGIN,
        FRONTENDURL: process.env.FRONTENDURL,
      },
    };
  }

  @Public()
  @Get('debug/env')
  async debugEnv() {
    return {
      NODE_ENV: process.env.NODE_ENV,
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      CORS_CHROME_EXTENSION_ORIGIN: process.env.CORS_CHROME_EXTENSION_ORIGIN,
      FRONTENDURL: process.env.FRONTENDURL,
      GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
      PORT: process.env.PORT,
    };
  }
}
