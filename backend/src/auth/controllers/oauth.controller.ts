import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';

import { ConnectionsService } from '../../connections/connections.service';

import { JwtAuthQueryGuard } from '../guards/jwt-auth-query.guard';

@Controller('auth')
export class OAuthController {
  private readonly slackClientId: string | undefined;
  private readonly slackClientSecret: string | undefined;
  private readonly slackRedirectUri: string | undefined;
  private readonly slackConfigured: boolean;

  private readonly googleClientId: string | undefined;
  private readonly googleClientSecret: string | undefined;
  private readonly googleRedirectUri: string | undefined;
  private readonly googleConfigured: boolean;

  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly connectionsService: ConnectionsService,
  ) {
    this.slackClientId = this.configService.get<string>('SLACK_CLIENT_ID');
    this.slackClientSecret = this.configService.get<string>('SLACK_CLIENT_SECRET');
    this.slackRedirectUri = this.configService.get<string>('SLACK_REDIRECT_URI');

    this.googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleClientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    this.googleRedirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    // OAuth is now optional - app will start without it
    this.slackConfigured = !!(this.slackClientId && this.slackClientSecret && this.slackRedirectUri);
    this.googleConfigured = !!(this.googleClientId && this.googleClientSecret && this.googleRedirectUri);

    if (!this.slackConfigured) {
      console.warn('Slack OAuth not configured - Slack integration will be disabled');
    }
    if (!this.googleConfigured) {
      console.warn('Google OAuth not configured - Google integration will be disabled');
    }

    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  @Get('slack')
  @UseGuards(JwtAuthQueryGuard)
  async slackAuth(@Req() req: any, @Res() res: Response) {
    if (!this.slackConfigured) {
      return res.redirect(`${this.frontendUrl}/integrations?error=slack_not_configured`);
    }

    const userId = req.user?.id ?? req.user?.userId;

    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', this.slackClientId!);
    slackAuthUrl.searchParams.set('scope', 'chat:write,channels:read,channels:join');
    slackAuthUrl.searchParams.set('redirect_uri', this.slackRedirectUri!);
    slackAuthUrl.searchParams.set('state', userId);

    return res.redirect(slackAuthUrl.toString());
  }

  @Get('slack/callback')
  async slackCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    if (!this.slackConfigured) {
      return res.redirect(`${this.frontendUrl}/integrations?error=slack_not_configured`);
    }

    try {
      const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', null, {
        params: {
          client_id: this.slackClientId!,
          client_secret: this.slackClientSecret!,
          code,
          redirect_uri: this.slackRedirectUri!,
        },
      });

      const { access_token, team } = tokenResponse.data;

      await this.connectionsService.create(
        userId,
        'slack',
        { accessToken: access_token },
        { workspace: team?.name },
      );

      return res.redirect(`${this.frontendUrl}/integrations?success=slack`);
    } catch (error) {
      // Avoid leaking sensitive details
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Slack OAuth callback failed', errMsg);
      return res.redirect(`${this.frontendUrl}/integrations?error=slack`);
    }
  }

  @Get('google')
  @UseGuards(JwtAuthQueryGuard)
  async googleAuth(@Req() req: any, @Res() res: Response) {
    if (!this.googleConfigured) {
      return res.redirect(`${this.frontendUrl}/integrations?error=google_not_configured`);
    }

    const userId = req.user?.id ?? req.user?.userId;

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', this.googleClientId!);
    googleAuthUrl.searchParams.set('redirect_uri', this.googleRedirectUri!);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set(
      'scope',
      'https://mail.google.com/ https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/userinfo.email',
    );
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('state', userId);
    googleAuthUrl.searchParams.set('prompt', 'consent');

    return res.redirect(googleAuthUrl.toString());
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    if (!this.googleConfigured) {
      return res.redirect(`${this.frontendUrl}/integrations?error=google_not_configured`);
    }

    try {
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.googleClientId!,
        client_secret: this.googleClientSecret!,
        code,
        redirect_uri: this.googleRedirectUri!,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;

      let metadata: Record<string, any> = {};
      try {
        const profileResp = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (profileResp.data?.email) {
          metadata.email = profileResp.data.email;
        }
      } catch (profileError) {
        // Proceed without metadata if userinfo fails
        const errMsg =
          profileError instanceof Error ? profileError.message : String(profileError);
        console.warn('Google userinfo fetch failed:', errMsg);
      }

      await this.connectionsService.create(userId, 'google', {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      }, metadata);

      return res.redirect(`${this.frontendUrl}/integrations?success=google`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Google OAuth callback failed', errMsg);
      return res.redirect(`${this.frontendUrl}/integrations?error=google`);
    }
  }
}

