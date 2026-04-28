import { describe, it, expect } from 'vitest';
import { BidOpportunityDetector } from './bidOpportunityDetector';
import { OutlookMessage } from './outlookEmailService';

const createMockMessage = (overrides?: Partial<OutlookMessage>): OutlookMessage => ({
  id: 'msg-123',
  subject: 'Bid Opportunity - Office Cleaning Project',
  from: {
    emailAddress: {
      address: 'sender@example.com',
      name: 'John Doe',
    },
  },
  receivedDateTime: new Date().toISOString(),
  bodyPreview: 'We have a cleaning project available. Please submit your quote.',
  body: {
    contentType: 'text',
    content: 'We have a cleaning project available. Please submit your quote.',
  },
  hasAttachments: false,
  isRead: false,
  ...overrides,
});

describe('BidOpportunityDetector', () => {
  describe('analyzeEmail', () => {
    it('should detect bid opportunity with high confidence', () => {
      const message = createMockMessage({
        subject: 'Bid Request - Office Cleaning Project',
        bodyPreview: 'We need a quote for cleaning services. Project location: Portland, OR. Square footage: 5000 sq ft. Due date: May 15, 2026',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThan(50);
      expect(result?.bidKeywords).toContain('bid');
      expect(result?.bidKeywords).toContain('cleaning');
    });

    it('should extract project name from subject', () => {
      const message = createMockMessage({
        subject: 'Project: Downtown Office Building - Cleaning Bid',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result?.projectName).toBeDefined();
      expect(result?.projectName?.toLowerCase()).toContain('downtown');
    });

    it('should extract location from content', () => {
      const message = createMockMessage({
        bodyPreview: 'Location: Portland, OR 97201. We need cleaning services.',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result?.location).toBeDefined();
      expect(result?.location?.toLowerCase()).toContain('portland');
    });

    it('should extract square footage', () => {
      const message = createMockMessage({
        bodyPreview: 'The building is 15,000 square feet and needs cleaning.',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result?.squareFootage).toBe(15000);
    });

    it('should extract due date', () => {
      const message = createMockMessage({
        bodyPreview: 'Due date: May 15, 2026. Please submit your bid by then.',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result?.dueDate).toBeDefined();
      expect(result?.dueDate?.getMonth()).toBe(4); // May is month 4 (0-indexed)
    });

    it('should return null for non-bid emails', () => {
      const message = createMockMessage({
        subject: 'Meeting Notes',
        bodyPreview: 'Here are the notes from our meeting today.',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result).toBeNull();
    });

    it('should detect multiple bid keywords', () => {
      const message = createMockMessage({
        subject: 'RFQ - Construction Cleaning Proposal',
        bodyPreview: 'We are requesting a quote for our construction project.',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result?.bidKeywords.length).toBeGreaterThan(2);
    });

    it('should handle emails with various date formats', () => {
      const message = createMockMessage({
        bodyPreview: 'Deadline: 05/15/2026. Please submit your proposal.',
      });

      const result = BidOpportunityDetector.analyzeEmail(message);

      expect(result?.dueDate).toBeDefined();
    });
  });

  describe('filterByConfidence', () => {
    it('should filter opportunities by confidence threshold', () => {
      const messages = [
        createMockMessage({
          subject: 'Bid - Cleaning Project',
          bodyPreview: 'We need cleaning services for our office.',
        }),
        createMockMessage({
          subject: 'Meeting Notes',
          bodyPreview: 'Here are the notes from today.',
        }),
        createMockMessage({
          subject: 'RFQ - Construction Cleaning',
          bodyPreview: 'Request for quote on construction cleaning project.',
        }),
      ];

      const opportunities = messages.map((msg) => BidOpportunityDetector.analyzeEmail(msg));
      const filtered = BidOpportunityDetector.filterByConfidence(opportunities, 40);

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every((opp) => opp.confidence >= 40)).toBe(true);
    });

    it('should return empty array when no opportunities meet threshold', () => {
      const messages = [
        createMockMessage({
          subject: 'Hello',
          bodyPreview: 'Just saying hi.',
        }),
      ];

      const opportunities = messages.map((msg) => BidOpportunityDetector.analyzeEmail(msg));
      const filtered = BidOpportunityDetector.filterByConfidence(opportunities, 80);

      expect(filtered.length).toBe(0);
    });
  });
});
