/**
 * Anvil PDF Service
 * Handles PDF template filling for corporate documents
 * @see https://www.useanvil.com/docs/api/fill-pdf/
 */

import Anvil from '@anvilco/anvil';

// Corporate document template IDs (to be set up in Anvil dashboard)
export const TEMPLATE_IDS = {
  // Formation Documents
  ARTICLES_OF_INCORPORATION: process.env.ANVIL_TEMPLATE_ARTICLES_INC || '',
  ARTICLES_OF_ORGANIZATION: process.env.ANVIL_TEMPLATE_ARTICLES_ORG || '',

  // Governance Documents
  CORPORATE_BYLAWS: process.env.ANVIL_TEMPLATE_BYLAWS || '',
  LLC_OPERATING_AGREEMENT: process.env.ANVIL_TEMPLATE_OPERATING_AGREEMENT || '',
  SHAREHOLDER_AGREEMENT: process.env.ANVIL_TEMPLATE_SHAREHOLDER_AGREEMENT || '',

  // Organizational Documents
  ORGANIZATIONAL_MINUTES: process.env.ANVIL_TEMPLATE_ORG_MINUTES || '',
  BOARD_RESOLUTION: process.env.ANVIL_TEMPLATE_BOARD_RESOLUTION || '',
  BANKING_RESOLUTION: process.env.ANVIL_TEMPLATE_BANKING_RESOLUTION || '',

  // Ownership Documents
  STOCK_CERTIFICATE: process.env.ANVIL_TEMPLATE_STOCK_CERTIFICATE || '',
  STOCK_LEDGER: process.env.ANVIL_TEMPLATE_STOCK_LEDGER || '',
  MEMBERSHIP_CERTIFICATE: process.env.ANVIL_TEMPLATE_MEMBERSHIP_CERT || '',

  // Tax Documents
  SS4_APPLICATION: process.env.ANVIL_TEMPLATE_SS4 || '',

  // Music Publishing Specific
  PUBLISHING_AGREEMENT: process.env.ANVIL_TEMPLATE_PUBLISHING_AGREEMENT || '',
  SYNC_LICENSE: process.env.ANVIL_TEMPLATE_SYNC_LICENSE || '',
  WRITER_AGREEMENT: process.env.ANVIL_TEMPLATE_WRITER_AGREEMENT || '',
  SPLIT_SHEET: process.env.ANVIL_TEMPLATE_SPLIT_SHEET || '',

  // Intercompany Documents
  IP_LICENSE_AGREEMENT: process.env.ANVIL_TEMPLATE_IP_LICENSE || '',
  SERVICES_AGREEMENT: process.env.ANVIL_TEMPLATE_SERVICES_AGREEMENT || '',
  MANAGEMENT_AGREEMENT: process.env.ANVIL_TEMPLATE_MANAGEMENT_AGREEMENT || '',
};

// Template field mappings - map quest data to PDF field IDs
export interface TemplateFieldMapping {
  templateId: string;
  fields: Record<string, string>; // Maps our field names to Anvil field IDs
}

// Entity data for filling templates
export interface EntityFormData {
  entityName: string;
  entityType: 'C_CORP' | 'LLC';
  jurisdiction: string;
  registeredAgent?: string;
  principalAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  mailingAddress?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  incorporator?: {
    name: string;
    title?: string;
    signature?: string;
  };
  directors?: {
    name: string;
    address?: string;
  }[];
  officers?: {
    name: string;
    title: string;
  }[];
  shareholders?: {
    name: string;
    shares: number;
    class?: string;
    percentage?: number;
  }[];
  authorizedShares?: number;
  parValue?: string;
  ein?: string;
  stateFileNumber?: string;
  formationDate?: string;
}

// Music publishing specific form data
export interface MusicFormData {
  songTitle: string;
  artistName: string;
  writerNames: string[];
  producerName?: string;
  publisherName?: string;
  iswc?: string;
  isrc?: string;
  splits?: {
    party: string;
    percentage: number;
    role: string;
  }[];
  advance?: number;
  royaltyRate?: number;
  territory?: string;
  term?: string;
}

class AnvilService {
  private client: Anvil | null = null;
  private enabled: boolean;

  constructor() {
    const apiKey = process.env.ANVIL_API_KEY;
    this.enabled = Boolean(apiKey);

    if (!this.enabled) {
      console.warn(
        'AnvilService: ANVIL_API_KEY was not found. ' +
        'PDF template filling will be disabled until this environment variable is set.'
      );
    } else {
      this.client = new Anvil({ apiKey });
      console.log('✅ Anvil PDF service initialized');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private assertEnabled(): void {
    if (!this.enabled || !this.client) {
      throw new Error('Anvil PDF service is disabled. Set ANVIL_API_KEY to enable PDF filling.');
    }
  }

  /**
   * Fill a PDF template with the provided data
   * @param templateId - Anvil PDF template ID
   * @param data - Data to fill in the PDF
   * @returns PDF as a Buffer
   */
  async fillPDF(templateId: string, data: Record<string, unknown>): Promise<Buffer> {
    this.assertEnabled();

    if (!templateId) {
      throw new Error('Template ID is required');
    }

    const { statusCode, data: pdfBuffer } = await this.client!.fillPDF(templateId, {
      title: `Filled Document - ${new Date().toISOString()}`,
      fontSize: 10,
      data,
    });

    if (statusCode !== 200) {
      throw new Error(`Anvil API returned status ${statusCode}`);
    }

    return pdfBuffer as Buffer;
  }

  /**
   * Fill Articles of Incorporation for a C-Corp
   */
  async fillArticlesOfIncorporation(entityData: EntityFormData): Promise<Buffer> {
    const templateId = TEMPLATE_IDS.ARTICLES_OF_INCORPORATION;
    if (!templateId) {
      throw new Error('Articles of Incorporation template not configured');
    }

    const data = {
      corporationName: entityData.entityName,
      state: entityData.jurisdiction,
      registeredAgent: entityData.registeredAgent,
      principalStreet: entityData.principalAddress?.street,
      principalCity: entityData.principalAddress?.city,
      principalState: entityData.principalAddress?.state,
      principalZip: entityData.principalAddress?.zip,
      authorizedShares: entityData.authorizedShares?.toString(),
      parValue: entityData.parValue,
      incorporatorName: entityData.incorporator?.name,
      incorporatorTitle: entityData.incorporator?.title,
      effectiveDate: entityData.formationDate || new Date().toISOString().split('T')[0],
    };

    return this.fillPDF(templateId, data);
  }

  /**
   * Fill Articles of Organization for an LLC
   */
  async fillArticlesOfOrganization(entityData: EntityFormData): Promise<Buffer> {
    const templateId = TEMPLATE_IDS.ARTICLES_OF_ORGANIZATION;
    if (!templateId) {
      throw new Error('Articles of Organization template not configured');
    }

    const data = {
      llcName: entityData.entityName,
      state: entityData.jurisdiction,
      registeredAgent: entityData.registeredAgent,
      principalStreet: entityData.principalAddress?.street,
      principalCity: entityData.principalAddress?.city,
      principalState: entityData.principalAddress?.state,
      principalZip: entityData.principalAddress?.zip,
      organizerName: entityData.incorporator?.name,
      effectiveDate: entityData.formationDate || new Date().toISOString().split('T')[0],
    };

    return this.fillPDF(templateId, data);
  }

  /**
   * Fill Corporate Bylaws
   */
  async fillCorporateBylaws(entityData: EntityFormData): Promise<Buffer> {
    const templateId = TEMPLATE_IDS.CORPORATE_BYLAWS;
    if (!templateId) {
      throw new Error('Corporate Bylaws template not configured');
    }

    const data = {
      corporationName: entityData.entityName,
      stateOfIncorporation: entityData.jurisdiction,
      principalAddress: entityData.principalAddress
        ? `${entityData.principalAddress.street}, ${entityData.principalAddress.city}, ${entityData.principalAddress.state} ${entityData.principalAddress.zip}`
        : '',
      directors: entityData.directors?.map(d => d.name).join(', '),
      numberOfDirectors: entityData.directors?.length.toString(),
      officers: entityData.officers?.map(o => `${o.name} - ${o.title}`).join('; '),
      adoptedDate: new Date().toISOString().split('T')[0],
    };

    return this.fillPDF(templateId, data);
  }

  /**
   * Fill LLC Operating Agreement
   */
  async fillOperatingAgreement(entityData: EntityFormData): Promise<Buffer> {
    const templateId = TEMPLATE_IDS.LLC_OPERATING_AGREEMENT;
    if (!templateId) {
      throw new Error('Operating Agreement template not configured');
    }

    const data = {
      llcName: entityData.entityName,
      stateOfFormation: entityData.jurisdiction,
      principalAddress: entityData.principalAddress
        ? `${entityData.principalAddress.street}, ${entityData.principalAddress.city}, ${entityData.principalAddress.state} ${entityData.principalAddress.zip}`
        : '',
      members: entityData.shareholders?.map(s => ({
        name: s.name,
        percentage: s.percentage,
      })),
      effectiveDate: entityData.formationDate || new Date().toISOString().split('T')[0],
    };

    return this.fillPDF(templateId, data);
  }

  /**
   * Fill Stock Certificate
   */
  async fillStockCertificate(
    entityData: EntityFormData,
    shareholderIndex: number
  ): Promise<Buffer> {
    const templateId = TEMPLATE_IDS.STOCK_CERTIFICATE;
    if (!templateId) {
      throw new Error('Stock Certificate template not configured');
    }

    const shareholder = entityData.shareholders?.[shareholderIndex];
    if (!shareholder) {
      throw new Error(`Shareholder at index ${shareholderIndex} not found`);
    }

    const data = {
      corporationName: entityData.entityName,
      stateOfIncorporation: entityData.jurisdiction,
      certificateNumber: `CERT-${String(shareholderIndex + 1).padStart(4, '0')}`,
      shareholderName: shareholder.name,
      numberOfShares: shareholder.shares.toString(),
      shareClass: shareholder.class || 'Common',
      issueDate: new Date().toISOString().split('T')[0],
    };

    return this.fillPDF(templateId, data);
  }

  /**
   * Fill a Split Sheet for music publishing
   */
  async fillSplitSheet(musicData: MusicFormData): Promise<Buffer> {
    const templateId = TEMPLATE_IDS.SPLIT_SHEET;
    if (!templateId) {
      throw new Error('Split Sheet template not configured');
    }

    const data = {
      songTitle: musicData.songTitle,
      artistName: musicData.artistName,
      writers: musicData.writerNames.join(', '),
      producer: musicData.producerName,
      iswc: musicData.iswc,
      isrc: musicData.isrc,
      splits: musicData.splits?.map(s => ({
        party: s.party,
        percentage: s.percentage,
        role: s.role,
      })),
      date: new Date().toISOString().split('T')[0],
    };

    return this.fillPDF(templateId, data);
  }

  /**
   * Get available templates and their field information
   * Useful for admin to see what fields need to be filled
   */
  async getTemplateInfo(): Promise<Record<string, { name: string; id: string; configured: boolean }>> {
    return {
      articlesOfIncorporation: {
        name: 'Articles of Incorporation',
        id: TEMPLATE_IDS.ARTICLES_OF_INCORPORATION,
        configured: Boolean(TEMPLATE_IDS.ARTICLES_OF_INCORPORATION),
      },
      articlesOfOrganization: {
        name: 'Articles of Organization',
        id: TEMPLATE_IDS.ARTICLES_OF_ORGANIZATION,
        configured: Boolean(TEMPLATE_IDS.ARTICLES_OF_ORGANIZATION),
      },
      corporateBylaws: {
        name: 'Corporate Bylaws',
        id: TEMPLATE_IDS.CORPORATE_BYLAWS,
        configured: Boolean(TEMPLATE_IDS.CORPORATE_BYLAWS),
      },
      operatingAgreement: {
        name: 'LLC Operating Agreement',
        id: TEMPLATE_IDS.LLC_OPERATING_AGREEMENT,
        configured: Boolean(TEMPLATE_IDS.LLC_OPERATING_AGREEMENT),
      },
      shareholderAgreement: {
        name: 'Shareholder Agreement',
        id: TEMPLATE_IDS.SHAREHOLDER_AGREEMENT,
        configured: Boolean(TEMPLATE_IDS.SHAREHOLDER_AGREEMENT),
      },
      organizationalMinutes: {
        name: 'Organizational Minutes',
        id: TEMPLATE_IDS.ORGANIZATIONAL_MINUTES,
        configured: Boolean(TEMPLATE_IDS.ORGANIZATIONAL_MINUTES),
      },
      boardResolution: {
        name: 'Board Resolution',
        id: TEMPLATE_IDS.BOARD_RESOLUTION,
        configured: Boolean(TEMPLATE_IDS.BOARD_RESOLUTION),
      },
      bankingResolution: {
        name: 'Banking Resolution',
        id: TEMPLATE_IDS.BANKING_RESOLUTION,
        configured: Boolean(TEMPLATE_IDS.BANKING_RESOLUTION),
      },
      stockCertificate: {
        name: 'Stock Certificate',
        id: TEMPLATE_IDS.STOCK_CERTIFICATE,
        configured: Boolean(TEMPLATE_IDS.STOCK_CERTIFICATE),
      },
      stockLedger: {
        name: 'Stock Ledger',
        id: TEMPLATE_IDS.STOCK_LEDGER,
        configured: Boolean(TEMPLATE_IDS.STOCK_LEDGER),
      },
      ss4Application: {
        name: 'IRS Form SS-4 (EIN Application)',
        id: TEMPLATE_IDS.SS4_APPLICATION,
        configured: Boolean(TEMPLATE_IDS.SS4_APPLICATION),
      },
      splitSheet: {
        name: 'Split Sheet',
        id: TEMPLATE_IDS.SPLIT_SHEET,
        configured: Boolean(TEMPLATE_IDS.SPLIT_SHEET),
      },
      publishingAgreement: {
        name: 'Publishing Agreement',
        id: TEMPLATE_IDS.PUBLISHING_AGREEMENT,
        configured: Boolean(TEMPLATE_IDS.PUBLISHING_AGREEMENT),
      },
      syncLicense: {
        name: 'Sync License',
        id: TEMPLATE_IDS.SYNC_LICENSE,
        configured: Boolean(TEMPLATE_IDS.SYNC_LICENSE),
      },
    };
  }
}

// Export singleton instance
export const anvilService = new AnvilService();
