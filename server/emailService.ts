/**
 * Email sending service using Outlook/Microsoft Graph API
 * Sends emails from the Clean World Maintenance sender address.
 */
import { COMPANY_IDENTITY } from '../shared/companyIdentity';

import { Client } from '@microsoft/microsoft-graph-client';
import { EmailTemplate } from './emailTemplates';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  body: string;
  htmlBody?: string;
  attachments?: Array<{
    name: string;
    contentBytes: Buffer;
    contentType: string;
  }>;
  cc?: string[];
  bcc?: string[];
}

export class EmailService {
  private graphClient: Client;
  private senderEmail: string = COMPANY_IDENTITY.email;

  constructor(graphClient: Client) {
    this.graphClient = graphClient;
  }

  /**
   * Send an email using Outlook
   */
  async sendEmail(options: EmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const recipients = Array.isArray(options.to) ? options.to : [options.to];

      const message = {
        subject: options.subject,
        body: {
          contentType: 'HTML',
          content: options.htmlBody || this.plainTextToHtml(options.body),
        },
        toRecipients: recipients.map((email) => ({
          emailAddress: {
            address: email,
          },
        })),
        ccRecipients: (options.cc || []).map((email) => ({
          emailAddress: {
            address: email,
          },
        })),
        bccRecipients: (options.bcc || []).map((email) => ({
          emailAddress: {
            address: email,
          },
        })),
        attachments: (options.attachments || []).map((att) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.name,
          contentBytes: att.contentBytes.toString('base64'),
          contentType: att.contentType,
        })),
      };

      // Send the email
      await this.graphClient.api(`/users/${this.senderEmail}/sendMail`).post({
        message,
        saveToSentItems: true,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[EmailService] Failed to send email:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Send email from template
   */
  async sendTemplateEmail(
    template: EmailTemplate,
    to: string | string[],
    options?: Partial<EmailOptions>,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    return this.sendEmail({
      to,
      subject: template.subject,
      body: template.body,
      htmlBody: template.htmlBody,
      ...options,
    });
  }

  /**
   * Convert plain text to HTML with line breaks
   */
  private plainTextToHtml(text: string): string {
    return `<html><body><pre style="font-family: Arial, sans-serif; white-space: pre-wrap; word-wrap: break-word;">${text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>')}</pre></body></html>`;
  }
}

/**
 * Create email service instance with authenticated Graph client
 */
export function createEmailService(graphClient: Client): EmailService {
  return new EmailService(graphClient);
}
