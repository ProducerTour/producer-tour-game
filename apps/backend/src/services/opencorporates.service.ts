/**
 * OpenCorporates Reconciliation API Service
 *
 * Provides entity verification against state corporate registries.
 * Uses the OpenCorporates Reconciliation API to search and verify
 * that corporate entities are properly formed and active.
 *
 * API Documentation: https://api.opencorporates.com/documentation/reconciliation_api
 */

import axios from 'axios';

// ============================================================================
// Types
// ============================================================================

export interface ReconciliationQuery {
  query: string;
  limit?: number;
}

export interface ReconciliationResult {
  id: string;
  name: string;
  type: string[];
  score: number;
  match: boolean;
}

export interface ReconciliationResponse {
  result: ReconciliationResult[];
}

export interface EntityVerificationResult {
  verified: boolean;
  confidence: 'high' | 'medium' | 'low' | 'none';
  matchedEntity?: {
    id: string;
    name: string;
    score: number;
    opencorporatesUrl: string;
  };
  suggestedMatches?: Array<{
    id: string;
    name: string;
    score: number;
    opencorporatesUrl: string;
  }>;
  message: string;
}

export interface CompanyDetails {
  name: string;
  companyNumber: string;
  jurisdictionCode: string;
  incorporationDate?: string;
  companyType?: string;
  currentStatus?: string;
  registeredAddress?: {
    streetAddress?: string;
    locality?: string;
    region?: string;
    postalCode?: string;
    country?: string;
  };
  opencorporatesUrl: string;
}

// Jurisdiction mapping for US states
const US_JURISDICTION_CODES: Record<string, string> = {
  alabama: 'us_al',
  alaska: 'us_ak',
  arizona: 'us_az',
  arkansas: 'us_ar',
  california: 'us_ca',
  colorado: 'us_co',
  connecticut: 'us_ct',
  delaware: 'us_de',
  florida: 'us_fl',
  georgia: 'us_ga',
  hawaii: 'us_hi',
  idaho: 'us_id',
  illinois: 'us_il',
  indiana: 'us_in',
  iowa: 'us_ia',
  kansas: 'us_ks',
  kentucky: 'us_ky',
  louisiana: 'us_la',
  maine: 'us_me',
  maryland: 'us_md',
  massachusetts: 'us_ma',
  michigan: 'us_mi',
  minnesota: 'us_mn',
  mississippi: 'us_ms',
  missouri: 'us_mo',
  montana: 'us_mt',
  nebraska: 'us_ne',
  nevada: 'us_nv',
  'new hampshire': 'us_nh',
  'new jersey': 'us_nj',
  'new mexico': 'us_nm',
  'new york': 'us_ny',
  'north carolina': 'us_nc',
  'north dakota': 'us_nd',
  ohio: 'us_oh',
  oklahoma: 'us_ok',
  oregon: 'us_or',
  pennsylvania: 'us_pa',
  'rhode island': 'us_ri',
  'south carolina': 'us_sc',
  'south dakota': 'us_sd',
  tennessee: 'us_tn',
  texas: 'us_tx',
  utah: 'us_ut',
  vermont: 'us_vt',
  virginia: 'us_va',
  washington: 'us_wa',
  'west virginia': 'us_wv',
  wisconsin: 'us_wi',
  wyoming: 'us_wy',
  'district of columbia': 'us_dc',
  dc: 'us_dc',
};

// ============================================================================
// Service Class
// ============================================================================

class OpenCorporatesService {
  private baseUrl = 'https://api.opencorporates.com';
  private reconcileBaseUrl = 'https://opencorporates.com/reconcile';
  private apiToken?: string;

  constructor() {
    this.apiToken = process.env.OPENCORPORATES_API_TOKEN;
  }

  /**
   * Get the jurisdiction code for a US state
   */
  getJurisdictionCode(state: string): string | null {
    const normalized = state.toLowerCase().trim();
    return US_JURISDICTION_CODES[normalized] || null;
  }

  /**
   * Search for companies using the Reconciliation API
   * This is the primary method for verifying entity existence
   */
  async reconcile(
    jurisdictionCode: string,
    query: string,
    limit: number = 5
  ): Promise<ReconciliationResponse> {
    try {
      const url = `${this.reconcileBaseUrl}/${jurisdictionCode}`;
      const params: Record<string, string> = {
        query,
        limit: limit.toString(),
      };

      if (this.apiToken) {
        params.api_token = this.apiToken;
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error) {
      console.error('OpenCorporates reconcile error:', error);
      throw new Error('Failed to search OpenCorporates registry');
    }
  }

  /**
   * Verify an entity exists in the specified jurisdiction
   * Returns verification result with confidence score
   */
  async verifyEntity(
    entityName: string,
    jurisdiction: string
  ): Promise<EntityVerificationResult> {
    const jurisdictionCode = this.getJurisdictionCode(jurisdiction);

    if (!jurisdictionCode) {
      return {
        verified: false,
        confidence: 'none',
        message: `Unknown jurisdiction: ${jurisdiction}. Supported: US states only.`,
      };
    }

    try {
      const response = await this.reconcile(jurisdictionCode, entityName, 5);
      const results = response.result || [];

      if (results.length === 0) {
        return {
          verified: false,
          confidence: 'none',
          message: `No matching entities found for "${entityName}" in ${jurisdiction}.`,
        };
      }

      // Check for high-confidence match (score >= 80)
      const topMatch = results[0];
      const highConfidenceMatch = results.find((r) => r.score >= 80 && r.match);

      if (highConfidenceMatch) {
        return {
          verified: true,
          confidence: 'high',
          matchedEntity: {
            id: highConfidenceMatch.id,
            name: highConfidenceMatch.name,
            score: highConfidenceMatch.score,
            opencorporatesUrl: `https://opencorporates.com/companies/${highConfidenceMatch.id}`,
          },
          message: `Entity verified with high confidence (${highConfidenceMatch.score}% match).`,
        };
      }

      // Check for medium confidence (score 60-79)
      if (topMatch.score >= 60) {
        return {
          verified: true,
          confidence: 'medium',
          matchedEntity: {
            id: topMatch.id,
            name: topMatch.name,
            score: topMatch.score,
            opencorporatesUrl: `https://opencorporates.com/companies/${topMatch.id}`,
          },
          suggestedMatches: results.slice(1).map((r) => ({
            id: r.id,
            name: r.name,
            score: r.score,
            opencorporatesUrl: `https://opencorporates.com/companies/${r.id}`,
          })),
          message: `Likely match found (${topMatch.score}% confidence). Please verify this is your entity.`,
        };
      }

      // Low confidence - provide suggestions
      return {
        verified: false,
        confidence: 'low',
        suggestedMatches: results.map((r) => ({
          id: r.id,
          name: r.name,
          score: r.score,
          opencorporatesUrl: `https://opencorporates.com/companies/${r.id}`,
        })),
        message: `No confident match found. Here are possible matches for "${entityName}".`,
      };
    } catch (error) {
      console.error('Entity verification error:', error);
      return {
        verified: false,
        confidence: 'none',
        message: 'Failed to verify entity. Please try again later.',
      };
    }
  }

  /**
   * Get detailed company information from OpenCorporates
   * Requires the company ID from reconciliation results
   */
  async getCompanyDetails(companyId: string): Promise<CompanyDetails | null> {
    try {
      const url = `${this.baseUrl}/v0.4/companies/${companyId}`;
      const params: Record<string, string> = {};

      if (this.apiToken) {
        params.api_token = this.apiToken;
      }

      const response = await axios.get(url, { params });
      const company = response.data?.results?.company;

      if (!company) {
        return null;
      }

      return {
        name: company.name,
        companyNumber: company.company_number,
        jurisdictionCode: company.jurisdiction_code,
        incorporationDate: company.incorporation_date,
        companyType: company.company_type,
        currentStatus: company.current_status,
        registeredAddress: company.registered_address
          ? {
              streetAddress: company.registered_address.street_address,
              locality: company.registered_address.locality,
              region: company.registered_address.region,
              postalCode: company.registered_address.postal_code,
              country: company.registered_address.country,
            }
          : undefined,
        opencorporatesUrl: company.opencorporates_url,
      };
    } catch (error) {
      console.error('Get company details error:', error);
      return null;
    }
  }

  /**
   * Search for companies with autocomplete-style results
   * Useful for entity name search during quest steps
   */
  async searchCompanies(
    query: string,
    jurisdiction?: string,
    limit: number = 10
  ): Promise<ReconciliationResult[]> {
    if (jurisdiction) {
      const jurisdictionCode = this.getJurisdictionCode(jurisdiction);
      if (jurisdictionCode) {
        const response = await this.reconcile(jurisdictionCode, query, limit);
        return response.result || [];
      }
    }

    // If no jurisdiction, search Delaware (most common for corporations)
    const response = await this.reconcile('us_de', query, limit);
    return response.result || [];
  }

  /**
   * Verify Producer Tour entities specifically
   * Pre-configured for the 5 PT entities
   */
  async verifyProducerTourEntity(
    entityShortName: string
  ): Promise<EntityVerificationResult> {
    const entityConfig: Record<
      string,
      { fullName: string; jurisdiction: string }
    > = {
      holdings: {
        fullName: 'Producer Tour Holdings, Inc.',
        jurisdiction: 'Delaware',
      },
      ip: {
        fullName: 'Producer Tour IP, LLC',
        jurisdiction: 'Delaware',
      },
      publishing: {
        fullName: 'Producer Tour Publishing, LLC',
        jurisdiction: 'Florida',
      },
      operations: {
        fullName: 'Producer Tour Operations, LLC',
        jurisdiction: 'Florida',
      },
      finance: {
        fullName: 'Producer Tour Finance, LLC',
        jurisdiction: 'Delaware',
      },
    };

    const config = entityConfig[entityShortName.toLowerCase()];
    if (!config) {
      return {
        verified: false,
        confidence: 'none',
        message: `Unknown Producer Tour entity: ${entityShortName}`,
      };
    }

    return this.verifyEntity(config.fullName, config.jurisdiction);
  }

  /**
   * Check service status
   */
  async checkStatus(): Promise<{
    available: boolean;
    hasApiToken: boolean;
    message: string;
  }> {
    try {
      // Test with a simple Delaware search
      await this.reconcile('us_de', 'test', 1);
      return {
        available: true,
        hasApiToken: !!this.apiToken,
        message: this.apiToken
          ? 'OpenCorporates service available with API token'
          : 'OpenCorporates service available (rate-limited without API token)',
      };
    } catch (error) {
      return {
        available: false,
        hasApiToken: !!this.apiToken,
        message: 'OpenCorporates service unavailable',
      };
    }
  }
}

export const openCorporatesService = new OpenCorporatesService();
