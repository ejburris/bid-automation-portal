/**
 * Email templates for bid automation.
 */
import { COMPANY_IDENTITY, COMPANY_SIGNATURE } from '../shared/companyIdentity';

export interface EmailTemplate {
  subject: string;
  body: string;
  htmlBody?: string;
}

export const emailTemplates = {
  /**
   * Addendum acknowledgment email
   * Sent when an addendum is received for a bid project
   */
  addendumAcknowledgment: (): EmailTemplate => ({
    subject: 'RE: Clarification(s) and/or Addendum(s) Acknowledgment',
    body: `Hello,

We already submitted our Bid Proposal for this project. However, we wanted to acknowledge Clarification(s) and/ or Addendum(s): 

Final Cleaning pricing is based on a standard post-construction clean. Any re-cleaning required due to ongoing work, material changes, or post-clean activities will be treated as additional service.

Hope you have a great and safe day.

Sincerely,

Eric Burris | Senior Estimator
${COMPANY_SIGNATURE}`,
  }),

  /**
   * Bid proposal submission email
   * Sent with the PDF proposal attached
   */
  bidProposalSubmission: (projectName: string): EmailTemplate => ({
    subject: `Bid Proposal for ${projectName}`,
    body: `Hello,

I hope that you are doing well. Please see attached our Bid Proposal for the following project: ${projectName}

We hope to work with you on this project. Our OMWBE Certification Number is: ${COMPANY_IDENTITY.omwbeCertificationNumber}. Please let us know if you have any questions.

Sincerely,

Eric Burris | Senior Estimator
${COMPANY_SIGNATURE}`,
  }),

  /**
   * One-month follow-up email
   * Sent 1 month after proposal submission to check on award status
   */
  oneMonthFollowUp: (projectName: string): EmailTemplate => ({
    subject: `Follow-up: Final Construction Cleaning Bid for ${projectName}`,
    body: `Good morning,

I hope that you are doing well. I was just doing a follow up to see if Clean World Maintenance had been awarded the Final Construction cleaning for ${projectName}. Hope to talk to you soon.

Sincerely,

Eric Burris | Senior Estimator
${COMPANY_SIGNATURE}`,
  }),

  /**
   * Three-week follow-up email
   * Sent 3 weeks after initial follow-up for non-awarded projects
   */
  threeWeekFollowUp: (projectName: string): EmailTemplate => ({
    subject: `Follow-up: Final Construction Cleaning Bid for ${projectName}`,
    body: `Good morning,

I hope that you are doing well. I was just doing another follow up to see if Clean World Maintenance had been awarded the Final Construction cleaning for ${projectName}. We would love to work with you on this project. Please let me know if you have any questions or need any additional information.

Sincerely,

Eric Burris | Senior Estimator
${COMPANY_SIGNATURE}`,
  }),

  /**
   * Change order request email
   * Sent when additional work is performed after the initial bid
   */
  changeOrderRequest: (projectName: string): EmailTemplate => ({
    subject: `Change Order Request for ${projectName}`,
    body: `Hello,

Please see attached a Change Order request for additional work that was performed.

Sincerely,

Eric Burris | Senior Estimator
${COMPANY_SIGNATURE}`,
  }),

  /**
   * Internal employee notification
   * Sent to team members when a project is awarded
   */
  awardedProjectNotification: (projectName: string, clientName: string, contactEmail: string): EmailTemplate => ({
    subject: `🎉 Project Awarded: ${projectName}`,
    body: `Hello Team,

Great news! Clean World Maintenance has been awarded the Final Construction cleaning for ${projectName}.

**Project Details:**
- Client: ${clientName}
- Contact: ${contactEmail}
- Project Name: ${projectName}

Please log in to the Bid Automation Portal for full project details and scheduling information.

Sincerely,

${COMPANY_SIGNATURE}`,
  }),
};

/**
 * Generate email template with dynamic values
 */
export function generateEmailTemplate(
  templateType: keyof typeof emailTemplates,
  ...args: string[]
): EmailTemplate {
  const template = emailTemplates[templateType];
  if (typeof template === 'function') {
    return (template as any)(...args);
  }
  return template as EmailTemplate;
}
