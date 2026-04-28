import { OutlookMessage } from './outlookEmailService';

export interface DetectedBidOpportunity {
  messageId: string;
  subject: string;
  sender: string;
  receivedDate: Date;
  projectName?: string;
  location?: string;
  squareFootage?: number;
  dueDate?: Date;
  bidKeywords: string[];
  confidence: number; // 0-1
  rawContent: string;
}

/**
 * Keywords that indicate a bid opportunity
 */
const BID_KEYWORDS = [
  'bid',
  'proposal',
  'quote',
  'estimate',
  'rfq',
  'request for quote',
  'project',
  'cleaning',
  'construction',
  'tender',
  'opportunity',
  'contract',
  'subcontractor',
  'general contractor',
];

/**
 * Common bid-related terms to look for
 */
const BID_INDICATORS = [
  'due date',
  'deadline',
  'square feet',
  'sq ft',
  'square footage',
  'scope of work',
  'specifications',
  'drawings',
  'plans',
  'location',
  'address',
  'project site',
];

/**
 * Detect bid opportunities from email content
 */
export class BidOpportunityDetector {
  /**
   * Analyze email to detect if it contains a bid opportunity
   */
  static analyzeEmail(message: OutlookMessage): DetectedBidOpportunity | null {
    const subject = message.subject.toLowerCase();
    const bodyPreview = message.bodyPreview.toLowerCase();
    const fullContent = `${subject} ${bodyPreview}`;

    // Check for bid keywords
    const foundKeywords = BID_KEYWORDS.filter((keyword) => fullContent.includes(keyword));

    if (foundKeywords.length === 0) {
      return null;
    }

    // Calculate confidence based on keyword matches and indicators
    const keywordScore = Math.min(foundKeywords.length / 3, 1); // Normalize to 0-1
    const indicatorMatches = BID_INDICATORS.filter((indicator) => fullContent.includes(indicator)).length;
    const indicatorScore = Math.min(indicatorMatches / 5, 1);

    const confidence = (keywordScore * 0.6 + indicatorScore * 0.4) * 100; // Weighted average

    // Extract project details
    const projectName = this.extractProjectName(subject);
    const location = this.extractLocation(fullContent);
    const squareFootage = this.extractSquareFootage(fullContent);
    const dueDate = this.extractDueDate(fullContent);

    return {
      messageId: message.id,
      subject: message.subject,
      sender: message.from.emailAddress.address,
      receivedDate: new Date(message.receivedDateTime),
      projectName,
      location,
      squareFootage,
      dueDate,
      bidKeywords: foundKeywords,
      confidence: Math.min(confidence, 100),
      rawContent: fullContent,
    };
  }

  /**
   * Extract project name from subject line
   */
  private static extractProjectName(subject: string): string | undefined {
    // Look for patterns like "Project: XYZ" or "Bid: XYZ"
    const patterns = [
      /project[:\s]+([^-\n]+)/i,
      /bid[:\s]+([^-\n]+)/i,
      /quote[:\s]+([^-\n]+)/i,
      /proposal[:\s]+([^-\n]+)/i,
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    // Fallback: use first part of subject
    return subject.split('-')[0]?.trim();
  }

  /**
   * Extract location from content
   */
  private static extractLocation(content: string): string | undefined {
    // Look for common location patterns
    const patterns = [
      /(?:location|address|site|project site)[:\s]+([^,\n]+)/i,
      /([A-Z]{2})\s+\d{5}/, // State + ZIP
      /(\w+),\s*([A-Z]{2})/i, // City, State
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  /**
   * Extract square footage from content
   */
  private static extractSquareFootage(content: string): number | undefined {
    const patterns = [
      /(\d+(?:,\d{3})*)\s*(?:sq\.?\s*ft|square\s*feet|sf)/i,
      /square\s*footage[:\s]+(\d+(?:,\d{3})*)/i,
      /(\d+(?:,\d{3})*)\s*sqft/i,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        return parseInt(match[1].replace(/,/g, ''), 10);
      }
    }

    return undefined;
  }

  /**
   * Extract due date from content
   */
  private static extractDueDate(content: string): Date | undefined {
    const patterns = [
      /due\s*(?:date)?[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /deadline[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /([A-Za-z]+\s+\d{1,2},?\s+\d{4})/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const date = new Date(match[1]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }

    return undefined;
  }

  /**
   * Filter opportunities by confidence threshold
   */
  static filterByConfidence(opportunities: (DetectedBidOpportunity | null)[], threshold: number = 50): DetectedBidOpportunity[] {
    return opportunities.filter((opp): opp is DetectedBidOpportunity => opp !== null && opp.confidence >= threshold);
  }
}
