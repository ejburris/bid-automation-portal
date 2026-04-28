/**
 * BuildingConnected Scraper
 * Extracts bid opportunities from BuildingConnected platform
 * https://app.buildingconnected.com/opportunities/pipeline
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface BuildingConnectedOpportunity {
  id: string;
  title: string;
  location: string;
  bidDueDate: Date;
  estimatedValue?: number;
  description: string;
  projectType: string;
  generalContractor?: string;
  architect?: string;
  source: 'buildingconnected';
  url: string;
  scrapedAt: Date;
}

export class BuildingConnectedScraper {
  private browser: Browser | null = null;
  private email: string;
  private password: string;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
  }

  /**
   * Initialize browser and login to BuildingConnected
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await this.browser.newPage();
      await page.goto('https://app.buildingconnected.com/login', { waitUntil: 'networkidle2' });

      // Login
      await page.type('input[name="email"]', this.email);
      await page.type('input[name="password"]', this.password);
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      await page.close();
      console.log('[BuildingConnected] Successfully logged in');
    } catch (error) {
      console.error('[BuildingConnected] Login failed:', error);
      throw new Error('Failed to login to BuildingConnected');
    }
  }

  /**
   * Scrape opportunities from pipeline
   */
  async scrapeOpportunities(): Promise<BuildingConnectedOpportunity[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    const opportunities: BuildingConnectedOpportunity[] = [];

    try {
      await page.goto('https://app.buildingconnected.com/opportunities/pipeline', {
        waitUntil: 'networkidle2',
      });

      // Wait for opportunity list to load
      await page.waitForSelector('[data-test="opportunity-card"]', { timeout: 10000 });

      // Extract opportunities
      const opportunityData = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-test="opportunity-card"]');
        const opportunities: any[] = [];

        cards.forEach((card) => {
          const titleEl = card.querySelector('[data-test="opportunity-title"]');
          const locationEl = card.querySelector('[data-test="opportunity-location"]');
          const dueDateEl = card.querySelector('[data-test="opportunity-due-date"]');
          const valueEl = card.querySelector('[data-test="opportunity-value"]');
          const descriptionEl = card.querySelector('[data-test="opportunity-description"]');
          const gcEl = card.querySelector('[data-test="opportunity-gc"]');
          const linkEl = card.querySelector('a');

          if (titleEl) {
            opportunities.push({
              title: titleEl.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              bidDueDate: dueDateEl?.textContent?.trim() || '',
              estimatedValue: valueEl?.textContent?.trim() || '',
              description: descriptionEl?.textContent?.trim() || '',
              generalContractor: gcEl?.textContent?.trim() || '',
              url: linkEl?.getAttribute('href') || '',
            });
          }
        });

        return opportunities;
      });

      // Parse and format opportunities
      for (const opp of opportunityData) {
        try {
          opportunities.push({
            id: `bc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: opp.title,
            location: opp.location,
            bidDueDate: this.parseDate(opp.bidDueDate),
            estimatedValue: this.parseValue(opp.estimatedValue),
            description: opp.description,
            projectType: this.detectProjectType(opp.title, opp.description),
            generalContractor: opp.generalContractor,
            source: 'buildingconnected',
            url: opp.url,
            scrapedAt: new Date(),
          });
        } catch (error) {
          console.error('[BuildingConnected] Failed to parse opportunity:', error);
        }
      }

      console.log(`[BuildingConnected] Scraped ${opportunities.length} opportunities`);
      return opportunities;
    } catch (error) {
      console.error('[BuildingConnected] Scraping failed:', error);
      throw new Error('Failed to scrape BuildingConnected opportunities');
    } finally {
      await page.close();
    }
  }

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string): Date {
    try {
      return new Date(dateStr);
    } catch {
      return new Date();
    }
  }

  /**
   * Parse estimated value string to number
   */
  private parseValue(valueStr: string): number | undefined {
    try {
      const match = valueStr.match(/[\d,]+/);
      if (match) {
        return parseInt(match[0].replace(/,/g, ''), 10);
      }
    } catch {
      // Return undefined if parsing fails
    }
    return undefined;
  }

  /**
   * Detect project type from title and description
   */
  private detectProjectType(title: string, description: string): string {
    const text = `${title} ${description}`.toLowerCase();

    if (text.includes('construction') || text.includes('general contracting')) {
      return 'construction';
    }
    if (text.includes('cleaning') || text.includes('janitorial')) {
      return 'cleaning';
    }
    if (text.includes('renovation') || text.includes('remodel')) {
      return 'renovation';
    }
    if (text.includes('demolition')) {
      return 'demolition';
    }

    return 'general';
  }

  /**
   * Close browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

/**
 * Scrape BuildingConnected opportunities
 */
export async function scrapeBuildingConnectedOpportunities(
  email: string,
  password: string
): Promise<BuildingConnectedOpportunity[]> {
  const scraper = new BuildingConnectedScraper(email, password);

  try {
    await scraper.initialize();
    const opportunities = await scraper.scrapeOpportunities();
    return opportunities;
  } catch (error) {
    console.error('[BuildingConnected] Scraping error:', error);
    throw error;
  } finally {
    await scraper.close();
  }
}
