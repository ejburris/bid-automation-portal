import axios, { AxiosInstance } from 'axios';

export interface OutlookMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  receivedDateTime: string;
  bodyPreview: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  hasAttachments: boolean;
  isRead: boolean;
}

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

/**
 * Service for accessing Outlook emails via Microsoft Graph API
 */
export class OutlookEmailService {
  private graphClient: AxiosInstance;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get unread messages from inbox
   */
  async getUnreadMessages(limit: number = 10): Promise<OutlookMessage[]> {
    try {
      const response = await this.graphClient.get('/me/mailFolders/inbox/messages', {
        params: {
          $filter: 'isRead eq false',
          $top: limit,
          $orderby: 'receivedDateTime desc',
          $select: 'id,subject,from,receivedDateTime,bodyPreview,body,hasAttachments,isRead',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('[Outlook Email] Failed to fetch unread messages:', error);
      throw new Error('Failed to fetch unread messages from Outlook');
    }
  }

  /**
   * Get messages from specific sender
   */
  async getMessagesBySender(senderEmail: string, limit: number = 10): Promise<OutlookMessage[]> {
    try {
      const response = await this.graphClient.get('/me/mailFolders/inbox/messages', {
        params: {
          $filter: `from/emailAddress/address eq '${senderEmail}'`,
          $top: limit,
          $orderby: 'receivedDateTime desc',
          $select: 'id,subject,from,receivedDateTime,bodyPreview,body,hasAttachments,isRead',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('[Outlook Email] Failed to fetch messages from sender:', error);
      throw new Error(`Failed to fetch messages from ${senderEmail}`);
    }
  }

  /**
   * Get messages with specific keywords in subject
   */
  async getMessagesBySubject(keywords: string[], limit: number = 10): Promise<OutlookMessage[]> {
    try {
      // Build filter for multiple keywords
      const filters = keywords.map((keyword) => `contains(subject, '${keyword}')`).join(' or ');

      const response = await this.graphClient.get('/me/mailFolders/inbox/messages', {
        params: {
          $filter: filters,
          $top: limit,
          $orderby: 'receivedDateTime desc',
          $select: 'id,subject,from,receivedDateTime,bodyPreview,body,hasAttachments,isRead',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('[Outlook Email] Failed to fetch messages by subject:', error);
      throw new Error('Failed to fetch messages by subject');
    }
  }

  /**
   * Get message attachments
   */
  async getMessageAttachments(messageId: string): Promise<OutlookAttachment[]> {
    try {
      const response = await this.graphClient.get(`/me/messages/${messageId}/attachments`, {
        params: {
          $select: 'id,name,contentType,size,isInline',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('[Outlook Email] Failed to fetch attachments:', error);
      throw new Error('Failed to fetch message attachments');
    }
  }

  /**
   * Download attachment content
   */
  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    try {
      const response = await this.graphClient.get(`/me/messages/${messageId}/attachments/${attachmentId}/$value`, {
        responseType: 'arraybuffer',
      });

      return Buffer.from(response.data);
    } catch (error) {
      console.error('[Outlook Email] Failed to download attachment:', error);
      throw new Error('Failed to download attachment');
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      await this.graphClient.patch(`/me/messages/${messageId}`, {
        isRead: true,
      });
    } catch (error) {
      console.error('[Outlook Email] Failed to mark message as read:', error);
      throw new Error('Failed to mark message as read');
    }
  }

  /**
   * Move message to folder
   */
  async moveMessage(messageId: string, folderName: string): Promise<void> {
    try {
      await this.graphClient.post(`/me/messages/${messageId}/move`, {
        destinationId: folderName,
      });
    } catch (error) {
      console.error('[Outlook Email] Failed to move message:', error);
      throw new Error('Failed to move message');
    }
  }

  /**
   * Get full message content
   */
  async getFullMessage(messageId: string): Promise<OutlookMessage> {
    try {
      const response = await this.graphClient.get(`/me/messages/${messageId}`, {
        params: {
          $select: 'id,subject,from,receivedDateTime,bodyPreview,body,hasAttachments,isRead',
        },
      });

      return response.data;
    } catch (error) {
      console.error('[Outlook Email] Failed to fetch full message:', error);
      throw new Error('Failed to fetch full message');
    }
  }
}
