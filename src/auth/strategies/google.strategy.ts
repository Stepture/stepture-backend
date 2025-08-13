import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import googleOauthConfig from '../config/google-oauth.config';
import { ConfigType } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(googleOauthConfig.KEY)
    private googleConfiguration: ConfigType<typeof googleOauthConfig>,
    private authService: AuthService,
  ) {
    super({
      clientID: googleConfiguration.clientID,
      clientSecret: googleConfiguration.clientSecret,
      callbackURL: googleConfiguration.callBackURL,
      scope: ['email', 'profile', 'https://www.googleapis.com/auth/drive.file'],
      passReqToCallback: true,
    });
  }

  authorizationParams(): Record<string, string> {
    return {
      access_type: 'offline',
      prompt: 'consent',
    };
  }

  async validate(
    request: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const userDto = {
      email: profile.emails[0].value,
      name: profile.displayName,
      googleId: profile.id,
      image: profile.photos?.[0]?.value,
      accessToken: accessToken,
      refreshToken: refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000),
      googleDriveRootFolderId: undefined,
    };

    try {
      const user = await this.authService.validateGoogleUser(userDto);
      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }
}
