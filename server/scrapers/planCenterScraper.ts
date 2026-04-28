/**
 * PlanCenter NW Scraper
 * Extracts bid opportunities from PlanCenter NW platform
 * https://plancenternw.com/
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface PlanCenterOpportunity {
  id: string;
  title: string;
  location: string;
  bidDueDate: Date;
  estimatedValue?: number;
  description: string;
  projectType: string;
  generalContractor?: string;
  architect?: string;
  source: 'plancenter';
  url: string;
  scrapedAt: Date;
}

export class PlanCenterScraper {
  private browser: Browser | null = null;
  private userId: string;
  private password: string;

  constructor(userId: string, password: string) {
    this.userId = userId;
    this.password = password;
  }

  /**
   * Initialize browser and login to PlanCenter
   */
  async initialize(): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await this.browser.newPage();
      await page.goto('https://plancenternw.com/login', { waitUntil: 'networkidle2' });

      // Login with user ID
      await page.type('input[name="user_id"]', this.userId);
      await page.type('input[name="password"]', this.password);
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      await page.close();
      console.log('[PlanCenter] Successfully logged in');
    } catch (error) {
      console.error('[PlanCenter] Login failed:', error);
      throw new Error('Failed to login to PlanCenter NW');
    }
  }

  /**
   * Scrape opportunities from project list
   */
  async scrapeOpportunities(): Promise<PlanCenterOpportunity[]> {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser!.newPage();
    const opportunities: PlanCenterOpportunity[] = [];

    try {
      await page.goto('https://plancenternw.com/projects', {
        waitUntil: 'networkidle2',
      });

      // Wait for project list to load
      await page.waitForSelector('[data-test="project-row"]', { timeout: 10000 });

      // Extract opportunities
      const projectData = await page.evaluate(() => {
        const rows = document.querySelectorAll('[data-test="project-row"]');
        const projects: any[] = [];

        rows.forEach((row) => {
          const nameEl = row.querySelector('[data-test="project-name"]');
          const locationEl = row.querySelector('[data-test="project-location"]');
          const dueDateEl = row.querySelector('[data-test="project-due-date"]');
          const budgetEl = row.querySelector('[data-test="project-budget"]');
          const descriptionEl = row.querySelector('[data-test="project-description"]');
          const gcEl = row.querySelector('[data-test="project-gc"]');
          const linkEl = row.querySelector('a');

          if (nameEl) {
            projects.push({
              title: nameEl.textContent?.trim() || '',
              location: locationEl?.textContent?.trim() || '',
              bidDueDate: dueDateEl?.textContent?.trim() || '',
              estimatedValue: budgetEl?.textContent?.trim() || '',
              description: descriptionEl?.textContent?.trim() || '',
              generalContractor: gcEl?.textContent?.trim() || '',
              url: linkEl?.getAttribute('href') || '',
            });
          }
        });

        return projects;
      });

      // Parse and format opportunities
      for (const proj of projectData) {
        try {
          opportunities.push({
            id: `pc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: proj.title,
            location: proj.location,
            bidDueDate: this.parseDate(proj.bidDueDate),
            estimatedValue: this.parseValue(proj.estimatedValue),
            description: proj.description,
            projectType: this.detectProjectType(proj.title, proj.description),
            generalContractor: proj.generalContractor,
            source: 'plancenter',
            url: proj.url,
            scrapedAt: new Date(),
          });
        } catch (error) {
          console.error('[PlanCenter] Failed to parse project:', error);
        }
      }

      console.log(`[PlanCenter] Scraped ${opportunities.length} opportunities`);
      return opportunities;
    } catch (error) {
      console.error('[PlanCenter] Scraping failed:', error);
      throw new Error('Failed to scrape PlanCenter opportunities');
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
 * Scrape PlanCenter opportunities
 */
export async function scrapePlanCenterOpportunities(
  userId: string,
  password: string
): Promise<PlanCenterOpportunity[]> {
  const scraper = new PlanCenterScraper(userId, password);

  try {
    await scraper.initialize();
    const opportunities = await scraper.scrapeOpportunities();
    return opportunities;
  } catch (error) {
    console.error('[PlanCenter] Scraping error:', error);
    throw error;
  } finally {
    await scraper.close();
  }
}
