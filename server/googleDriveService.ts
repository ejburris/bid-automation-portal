/**
 * Google Drive integration for automatic proposal uploads
 * Uploads generated PDFs to shared Google Drive folder
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

export interface GoogleDriveConfig {
  clientEmail: string;
  privateKey: string;
  folderId: string;
}

export class GoogleDriveService {
  private drive: any;
  private folderId: string;

  constructor(config: GoogleDriveConfig) {
    const auth = new google.auth.JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    this.drive = google.drive({ version: 'v3', auth });
    this.folderId = config.folderId;
  }

  /**
   * Upload PDF to Google Drive
   */
  async uploadProposalPDF(
    fileName: string,
    fileBuffer: Buffer,
    projectName: string,
  ): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const fileMetadata = {
        name: fileName,
        mimeType: 'application/pdf',
        parents: [this.folderId],
        description: `Bid Proposal for ${projectName}`,
      };

      const media = {
        mimeType: 'application/pdf',
        body: Readable.from(fileBuffer),
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: 'id, webViewLink, createdTime',
      });

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleDriveService] Failed to upload PDF:', errorMessage);
      throw new Error(`Failed to upload proposal PDF: ${errorMessage}`);
    }
  }

  /**
   * Create folder in Google Drive for organizing proposals
   */
  async createProjectFolder(projectName: string): Promise<string> {
    try {
      const fileMetadata = {
        name: projectName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [this.folderId],
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id',
      });

      return response.data.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleDriveService] Failed to create folder:', errorMessage);
      throw new Error(`Failed to create project folder: ${errorMessage}`);
    }
  }

  /**
   * List files in a folder
   */
  async listFilesInFolder(folderId: string): Promise<Array<{ id: string; name: string; createdTime: string }>> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        spaces: 'drive',
        fields: 'files(id, name, createdTime)',
        pageSize: 100,
      });

      return response.data.files || [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleDriveService] Failed to list files:', errorMessage);
      return [];
    }
  }

  /**
   * Share file with specific email
   */
  async shareFile(fileId: string, email: string, role: 'reader' | 'writer' = 'reader'): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role,
          type: 'user',
          emailAddress: email,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleDriveService] Failed to share file:', errorMessage);
      throw new Error(`Failed to share file: ${errorMessage}`);
    }
  }

  /**
   * Get file download link
   */
  async getDownloadLink(fileId: string): Promise<string> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: 'webContentLink',
      });

      return response.data.webContentLink;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GoogleDriveService] Failed to get download link:', errorMessage);
      throw new Error(`Failed to get download link: ${errorMessage}`);
    }
  }
}

/**
 * Create Google Drive service instance
 * Requires Google Drive API credentials and shared folder ID
 */
export function createGoogleDriveService(config: GoogleDriveConfig): GoogleDriveService {
  return new GoogleDriveService(config);
}
