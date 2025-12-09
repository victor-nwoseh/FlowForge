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
  private readonly slackClientId: string;
  private readonly slackClientSecret: string;
  private readonly slackRedirectUri: string;

  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly googleRedirectUri: string;

  private readonly frontendUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly connectionsService: ConnectionsService,
  ) {
    const slackClientId = this.configService.get<string>('SLACK_CLIENT_ID');
    const slackClientSecret = this.configService.get<string>('SLACK_CLIENT_SECRET');
    const slackRedirectUri = this.configService.get<string>('SLACK_REDIRECT_URI');

    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const googleClientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const googleRedirectUri = this.configService.get<string>('GOOGLE_REDIRECT_URI');

    if (!slackClientId || !slackClientSecret || !slackRedirectUri) {
      throw new Error('Slack OAuth configuration is missing');
    }

    if (!googleClientId || !googleClientSecret || !googleRedirectUri) {
      throw new Error('Google OAuth configuration is missing');
    }

    this.slackClientId = slackClientId;
    this.slackClientSecret = slackClientSecret;
    this.slackRedirectUri = slackRedirectUri;

    this.googleClientId = googleClientId;
    this.googleClientSecret = googleClientSecret;
    this.googleRedirectUri = googleRedirectUri;

    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  @Get('slack')
  @UseGuards(JwtAuthQueryGuard)
  async slackAuth(@Req() req: any, @Res() res: Response) {
    const userId = req.user?.id ?? req.user?.userId;

    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', this.slackClientId);
    slackAuthUrl.searchParams.set('scope', 'chat:write,channels:read');
    slackAuthUrl.searchParams.set('redirect_uri', this.slackRedirectUri);
    slackAuthUrl.searchParams.set('state', userId);

    return res.redirect(slackAuthUrl.toString());
  }

  @Get('slack/callback')
  async slackCallback(
    @Query('code') code: string,
    @Query('state') userId: string,
    @Res() res: Response,
  ) {
    try {
      const tokenResponse = await axios.post('https://slack.com/api/oauth.v2.access', null, {
        params: {
          client_id: this.slackClientId,
          client_secret: this.slackClientSecret,
          code,
          redirect_uri: this.slackRedirectUri,
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
    const userId = req.user?.id ?? req.user?.userId;

    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', this.googleClientId);
    googleAuthUrl.searchParams.set('redirect_uri', this.googleRedirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set(
      'scope',
      'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/spreadsheets',
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
    try {
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: this.googleClientId,
        client_secret: this.googleClientSecret,
        code,
        redirect_uri: this.googleRedirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : undefined;

      await this.connectionsService.create(userId, 'google', {
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
      });

      return res.redirect(`${this.frontendUrl}/integrations?success=google`);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Google OAuth callback failed', errMsg);
      return res.redirect(`${this.frontendUrl}/integrations?error=google`);
    }
  }
}

