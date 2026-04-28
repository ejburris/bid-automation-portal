/**
 * Procore Integration
 * Extracts bid opportunities from Procore platform via API
 * https://login.procore.com/
 */

import axios, { AxiosInstance } from 'axios';

export interface ProcoreOpportunity {
  id: string;
  title: string;
  location: string;
  bidDueDate: Date;
  estimatedValue?: number;
  description: string;
  projectType: string;
  generalContractor?: string;
  architect?: string;
  source: 'procore';
  url: string;
  scrapedAt: Date;
}

export class ProcoreIntegration {
  private client: AxiosInstance;
  private email: string;
  private password: string;
  private accessToken: string | null = null;

  constructor(email: string, password: string) {
    this.email = email;
    this.password = password;
    this.client = axios.create({
      baseURL: 'https://api.procore.com/rest/v1.0',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Authenticate with Procore API
   */
  async authenticate(): Promise<void> {
    try {
      // Note: Procore uses OAuth 2.0. This is a simplified login flow.
      // In production, implement full OAuth 2.0 flow with refresh tokens.
      const response = await axios.post('https://login.procore.com/oauth/token', {
        grant_type: 'password',
        username: this.email,
        password: this.password,
        client_id: process.env.PROCORE_CLIENT_ID,
        client_secret: process.env.PROCORE_CLIENT_SECRET,
      });

      this.accessToken = response.data.access_token;
      this.client.defaults.headers.common['Authorization'] = `Bearer ${this.accessToken}`;

      console.log('[Procore] Successfully authenticated');
    } catch (error) {
      console.error('[Procore] Authentication failed:', error);
      throw new Error('Failed to authenticate with Procore');
    }
  }

  /**
   * Fetch projects from Procore
   */
  async fetchProjects(): Promise<any[]> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await this.client.get('/projects', {
        params: {
          status: 'active',
          per_page: 100,
        },
      });

      return response.data;
    } catch (error) {
      console.error('[Procore] Failed to fetch projects:', error);
      throw error;
    }
  }

  /**
   * Fetch opportunities (RFQs) from Procore
   */
  async fetchOpportunities(): Promise<ProcoreOpportunity[]> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const projects = await this.fetchProjects();
      const opportunities: ProcoreOpportunity[] = [];

      // For each project, fetch RFQs
      for (const project of projects) {
        try {
          const rfqResponse = await this.client.get(`/projects/${project.id}/rfqs`, {
            params: {
              status: 'open',
            },
          });

          for (const rfq of rfqResponse.data) {
            opportunities.push({
              id: `procore-${rfq.id}`,
              title: rfq.title || `RFQ for ${project.name}`,
              location: project.location || '',
              bidDueDate: rfq.due_date ? new Date(rfq.due_date) : new Date(),
              estimatedValue: rfq.estimated_value,
              description: rfq.description || '',
              projectType: this.detectProjectType(rfq.title, rfq.description),
              generalContractor: project.owner_name,
              source: 'procore',
              url: `https://app.procore.com/projects/${project.id}/rfqs/${rfq.id}`,
              scrapedAt: new Date(),
            });
          }
        } catch (error) {
          console.error(`[Procore] Failed to fetch RFQs for project ${project.id}:`, error);
        }
      }

      console.log(`[Procore] Fetched ${opportunities.length} opportunities`);
      return opportunities;
    } catch (error) {
      console.error('[Procore] Failed to fetch opportunities:', error);
      throw error;
    }
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
}

/**
 * Fetch Procore opportunities
 */
export async function fetchProcoreOpportunities(
  email: string,
  password: string
): Promise<ProcoreOpportunity[]> {
  const integration = new ProcoreIntegration(email, password);

  try {
    await integration.authenticate();
    const opportunities = await integration.fetchOpportunities();
    return opportunities;
  } catch (error) {
    console.error('[Procore] Integration error:', error);
    throw error;
  }
}
