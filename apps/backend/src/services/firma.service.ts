/**
 * Firma E-Signature Service
 * Handles integration with Firma API for document signing
 * @see https://firma-2c386052.mintlify.app
 */

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

// Environment configuration
const FIRMA_API_KEY = process.env.FIRMA_API_KEY || '';
// Firma API base URL - the full path to the signing-request-api
const FIRMA_API_URL = process.env.FIRMA_API_URL || 'https://api.firma.dev/functions/v1/signing-request-api';
const FIRMA_WEBHOOK_SECRET = process.env.FIRMA_WEBHOOK_SECRET || '';

// Types
export interface FirmaRecipient {
  first_name: string;
  last_name: string;
  email: string;
  designation: 'Signer' | 'CC' | 'Approver';
  order?: number;
}

export interface FirmaField {
  type: 'signature' | 'text' | 'date' | 'checkbox' | 'dropdown' | 'initials' | 'image';
  page: number;
  x: number;  // Percentage 0-100
  y: number;  // Percentage 0-100
  width: number;  // Percentage
  height: number; // Percentage
  recipient_index: number;
  required?: boolean;
  label?: string;
}

export interface CreateTemplateResponse {
  id: string;
  name: string;
  page_count: number;
  status: string;
  created_at: string;
}

export interface CreateSigningRequestResponse {
  id: string;
  name: string;
  status: string;
  signing_url?: string;
  recipients: Array<{
    id: string;
    email: string;
    signing_url: string;
  }>;
  created_at: string;
}

export interface TemplateEditorTokenResponse {
  token: string;
  expires_at: string;
  jwt_record_id: string;
}

export interface SigningRequestEditorTokenResponse {
  jwt: string;
  jwt_id: string;
  expires_at: string;
  signing_request_id: string;
  created_at: string;
}

export interface SigningRequest {
  id: string;
  name: string;
  status: 'not_sent' | 'sent' | 'viewed' | 'signed' | 'completed' | 'cancelled' | 'expired';
  document_url?: string;
  signed_document_url?: string;
  recipients: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    signed_at?: string;
    viewed_at?: string;
  }>;
  created_at: string;
  updated_at: string;
  sent_at?: string;
  completed_at?: string;
}

export interface WebhookPayload {
  event_id: string;
  event_type: string;
  timestamp: string;
  company_id: string;
  workspace_id: string;
  data: {
    signing_request_id?: string;
    template_id?: string;
    user_id?: string;
    status?: string;
    document_url?: string;
    signed_document_url?: string;
    [key: string]: any;
  };
}

class FirmaService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: FIRMA_API_URL,
      headers: {
        'Authorization': `Bearer ${FIRMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    // Log requests in development
    if (process.env.NODE_ENV === 'development') {
      this.client.interceptors.request.use((config) => {
        console.log(`[Firma] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      });
    }
  }

  /**
   * Check if Firma is properly configured
   */
  isConfigured(): boolean {
    return !!FIRMA_API_KEY;
  }

  // ==========================================
  // Template Management
  // ==========================================

  /**
   * Create a new template from a PDF document
   * @param pdfBase64 Base64-encoded PDF content
   * @param name Template name
   * @param workspaceId Optional workspace ID
   */
  async createTemplate(
    pdfBase64: string,
    name: string,
    workspaceId?: string
  ): Promise<CreateTemplateResponse> {
    const response = await this.client.post('/templates', {
      name,
      document: pdfBase64,
      workspace_id: workspaceId,
    });
    return response.data;
  }

  /**
   * Get template details
   */
  async getTemplate(templateId: string): Promise<any> {
    const response = await this.client.get(`/templates/${templateId}`);
    return response.data;
  }

  /**
   * List all templates
   */
  async listTemplates(workspaceId?: string): Promise<any[]> {
    const params = workspaceId ? { workspace_id: workspaceId } : {};
    const response = await this.client.get('/templates', { params });
    return response.data.templates || response.data;
  }

  /**
   * Delete (archive) a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    await this.client.delete(`/templates/${templateId}`);
  }

  /**
   * Generate JWT token for embeddable template editor
   */
  async generateTemplateEditorToken(templateId: string): Promise<TemplateEditorTokenResponse> {
    const response = await this.client.post('/jwt/generate-template-token', {
      companies_workspaces_templates_id: templateId,
    });
    return response.data;
  }

  // ==========================================
  // Signing Request Management
  // ==========================================

  /**
   * Create a signing request from a template
   */
  async createSigningRequest(
    templateId: string,
    name: string,
    recipients: FirmaRecipient[],
    workspaceId?: string
  ): Promise<CreateSigningRequestResponse> {
    const response = await this.client.post('/signing-requests', {
      template_id: templateId,
      name,
      recipients,
      workspace_id: workspaceId,
    });
    return response.data;
  }

  /**
   * Create a signing request from a PDF document (not a template)
   */
  async createSigningRequestFromPdf(
    pdfBase64: string,
    name: string,
    recipients: FirmaRecipient[],
    fields?: FirmaField[],
    workspaceId?: string
  ): Promise<CreateSigningRequestResponse> {
    const response = await this.client.post('/signing-requests', {
      document: pdfBase64,
      name,
      recipients,
      fields,
      workspace_id: workspaceId,
      allow_editing_before_sending: true,
    });
    return response.data;
  }

  /**
   * Get signing request details
   */
  async getSigningRequest(signingRequestId: string): Promise<SigningRequest> {
    const response = await this.client.get(`/signing-requests/${signingRequestId}`);
    return response.data;
  }

  /**
   * List all signing requests
   */
  async listSigningRequests(params?: {
    status?: string;
    workspace_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<SigningRequest[]> {
    const response = await this.client.get('/signing-requests', { params });
    return response.data.signing_requests || response.data;
  }

  /**
   * Send a signing request (triggers email to recipients)
   */
  async sendSigningRequest(signingRequestId: string): Promise<void> {
    await this.client.post(`/signing-requests/${signingRequestId}/send`);
  }

  /**
   * Cancel a signing request
   */
  async cancelSigningRequest(signingRequestId: string): Promise<void> {
    await this.client.post(`/signing-requests/${signingRequestId}/cancel`);
  }

  /**
   * Generate JWT token for embeddable signing request editor
   */
  async generateSigningRequestEditorToken(signingRequestId: string): Promise<SigningRequestEditorTokenResponse> {
    const response = await this.client.post('/jwt/generate-signing-request', {
      companies_workspaces_signing_requests_id: signingRequestId,
    });
    return response.data;
  }

  /**
   * Get the signed document URL
   */
  async getSignedDocument(signingRequestId: string): Promise<{ url: string } | null> {
    try {
      const request = await this.getSigningRequest(signingRequestId);
      if (request.signed_document_url) {
        return { url: request.signed_document_url };
      }
      return null;
    } catch (error) {
      console.error('[Firma] Error getting signed document:', error);
      return null;
    }
  }

  /**
   * Download the signed document as a buffer
   */
  async downloadSignedDocument(signingRequestId: string): Promise<Buffer | null> {
    try {
      const docInfo = await this.getSignedDocument(signingRequestId);
      if (!docInfo?.url) {
        return null;
      }

      const response = await axios.get(docInfo.url, {
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      console.error('[Firma] Error downloading signed document:', error);
      return null;
    }
  }

  // ==========================================
  // Webhook Handling
  // ==========================================

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    signatureOld?: string
  ): boolean {
    if (!FIRMA_WEBHOOK_SECRET) {
      console.warn('[Firma] Webhook secret not configured, skipping signature verification');
      return true;
    }

    const computeSignature = (secret: string): string => {
      return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    };

    const expectedSignature = computeSignature(FIRMA_WEBHOOK_SECRET);

    // Check current signature
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return true;
    }

    // During secret rotation, also check old signature
    if (signatureOld) {
      const expectedOldSignature = computeSignature(FIRMA_WEBHOOK_SECRET);
      if (crypto.timingSafeEqual(Buffer.from(signatureOld), Buffer.from(expectedOldSignature))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parse webhook event type
   */
  parseWebhookEventType(eventType: string): {
    resource: 'signing_request' | 'template' | 'workspace';
    action: string;
  } {
    const [resource, action] = eventType.split('.');
    return {
      resource: resource as 'signing_request' | 'template' | 'workspace',
      action,
    };
  }

  // ==========================================
  // Workspace Management
  // ==========================================

  /**
   * Get workspace settings
   */
  async getWorkspaceSettings(workspaceId: string): Promise<any> {
    const response = await this.client.get(`/workspace/${workspaceId}/settings`);
    return response.data;
  }

  /**
   * Update workspace settings (email templates, timezone, etc.)
   */
  async updateWorkspaceSettings(
    workspaceId: string,
    settings: {
      email_header?: string;
      email_body?: string;
      team_email?: string;
      timezone?: string;
    }
  ): Promise<any> {
    const response = await this.client.put(`/workspace/${workspaceId}/settings`, settings);
    return response.data;
  }

  /**
   * List workspaces
   */
  async listWorkspaces(): Promise<any[]> {
    const response = await this.client.get('/workspaces');
    return response.data.workspaces || response.data;
  }
}

// Export singleton instance
export const firmaService = new FirmaService();

// Export types for use in routes
export type { FirmaService };
