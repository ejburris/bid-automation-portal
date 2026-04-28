import { PublicClientApplication, ConfidentialClientApplication, AuthorizationCodeRequest, AuthorizationUrlRequest } from '@azure/msal-node';
import axios from 'axios';

/**
 * Outlook OAuth Configuration
 * In production, these should come from environment variables
 */
interface OutlookAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authority: string;
}

/**
 * Outlook authentication service for managing OAuth tokens
 */
export class OutlookAuthService {
  private msalClient: ConfidentialClientApplication;
  private config: OutlookAuthConfig;

  constructor(config: OutlookAuthConfig) {
    this.config = config;
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority: config.authority,
      },
    });
  }

  /**
   * Get authorization URL for user consent
   */
  async getAuthorizationUrl(state?: string): Promise<string> {
    const authCodeUrlParameters: AuthorizationUrlRequest = {
      scopes: ['Mail.Read', 'Mail.Read.Shared', 'Attachments.Read', 'offline_access'],
      redirectUri: this.config.redirectUri,
      state: state || Math.random().toString(36).substring(7),
    };

    return await this.msalClient.getAuthCodeUrl(authCodeUrlParameters);
  }

  /**
   * Exchange authorization code for access token
   */
  async getTokenFromCode(code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const tokenRequest: AuthorizationCodeRequest = {
      code,
      scopes: ['Mail.Read', 'Mail.Read.Shared', 'Attachments.Read', 'offline_access'],
      redirectUri: this.config.redirectUri,
    };

    try {
      const response = await this.msalClient.acquireTokenByCode(tokenRequest);
      return {
        accessToken: response.accessToken,
        refreshToken: (response as any).refreshToken || undefined,
        expiresIn: response.expiresOn ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) : 3600,
      };
    } catch (error) {
      console.error('[Outlook Auth] Failed to exchange code for token:', error);
      throw new Error('Failed to authenticate with Outlook');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
    try {
      const response = await this.msalClient.acquireTokenByRefreshToken({
        scopes: ['Mail.Read', 'Mail.Read.Shared', 'Attachments.Read', 'offline_access'],
        refreshToken,
      });

      if (!response) {
        throw new Error('No response from token refresh');
      }

      return {
        accessToken: response.accessToken,
        expiresIn: response.expiresOn ? Math.floor((response.expiresOn.getTime() - Date.now()) / 1000) : 3600,
      };
    } catch (error) {
      console.error('[Outlook Auth] Failed to refresh token:', error);
      throw new Error('Failed to refresh Outlook token');
    }
  }

  /**
   * Validate access token by making a test API call
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response?.status === 200;
    } catch (error) {
      console.error('[Outlook Auth] Token validation failed:', error);
      return false;
    }
  }
}

/**
 * Create Outlook auth service from environment variables
 */
export function createOutlookAuthService(): OutlookAuthService {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const clientSecret = process.env.OUTLOOK_CLIENT_SECRET;
  const redirectUri = process.env.OUTLOOK_REDIRECT_URI || 'http://localhost:3000/api/outlook/callback';

  if (!clientId || !clientSecret) {
    throw new Error('Missing Outlook OAuth credentials: OUTLOOK_CLIENT_ID and OUTLOOK_CLIENT_SECRET required');
  }

  return new OutlookAuthService({
    clientId,
    clientSecret,
    redirectUri,
    authority: 'https://login.microsoftonline.com/common',
  });
}
