import axios from 'axios';
import { getAuthToken } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface PlacementCredit {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  splitPercentage: number;
  pro?: string;
  ipiNumber?: string;
  isPrimary: boolean;
  notes?: string;
}

export interface PlacementDocument {
  id: string;
  filename: string;
  originalName: string;
  category: string;
  description?: string;
  fileSize: number;
  uploadedAt: string;
}

export interface WorkSubmission {
  id: string;
  title: string;
  artist: string;
  albumName?: string;
  albumArtUrl?: string;
  albumArtHQUrl?: string;
  artistThumbUrl?: string;
  artistBio?: string;
  status: 'PENDING' | 'DOCUMENTS_REQUESTED' | 'APPROVED' | 'DENIED' | 'TRACKING' | 'COMPLETED';
  submittedAt?: string;
  reviewedAt?: string;
  denialReason?: string;
  documentsRequested?: string;
  caseNumber?: string;
  createdAt: string;
  spotifyTrackId?: string;
  platform?: string;
  releaseDate?: string;
  isrc?: string;
  streams?: number;
  estimatedStreams?: number;
  genre?: string;
  releaseYear?: string;
  label?: string;
  musicbrainzId?: string;
  audioDbArtistId?: string;
  audioDbAlbumId?: string;
  audioDbData?: any;
  metadata?: any;
  notes?: string;
  credits?: PlacementCredit[];
  documents?: PlacementDocument[];
}

export interface PendingSubmission extends WorkSubmission {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

class WorkRegistrationAPI {
  private getAuthHeaders() {
    const token = getAuthToken();
    return {
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  async getMySubmissions(): Promise<{ data: { submissions: WorkSubmission[] } }> {
    try {
      const response = await axios.get(`${API_URL}/api/work-registration/my-submissions`, {
        headers: this.getAuthHeaders(),
      });
      return { data: { submissions: response.data.submissions || [] } };
    } catch (error) {
      console.error('Get my submissions error:', error);
      throw error;
    }
  }

  async getPendingSubmissions(): Promise<{ data: { submissions: PendingSubmission[] } }> {
    try {
      const response = await axios.get(`${API_URL}/api/work-registration/pending`, {
        headers: this.getAuthHeaders(),
      });
      return { data: { submissions: response.data.pending || [] } };
    } catch (error) {
      console.error('Get pending submissions error:', error);
      throw error;
    }
  }

  async approve(
    submissionId: string,
    data: {
      dealTerms?: string;
      advanceAmount?: number;
      royaltyPercentage?: number;
      notes?: string;
    }
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${API_URL}/api/work-registration/${submissionId}/approve`,
        data,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Approve submission error:', error);
      throw error;
    }
  }

  async deny(submissionId: string, denialReason: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_URL}/api/work-registration/${submissionId}/deny`,
        { denialReason },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Deny submission error:', error);
      throw error;
    }
  }

  async requestDocuments(submissionId: string, documentsRequested: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_URL}/api/work-registration/${submissionId}/request-documents`,
        { documentsRequested },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Request documents error:', error);
      throw error;
    }
  }

  async resubmit(submissionId: string, notes?: string): Promise<any> {
    try {
      const response = await axios.post(
        `${API_URL}/api/work-registration/${submissionId}/resubmit`,
        { notes },
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Resubmit error:', error);
      throw error;
    }
  }

  async edit(
    submissionId: string,
    data: {
      title?: string;
      artist?: string;
      notes?: string;
      credits?: Array<{
        firstName: string;
        lastName: string;
        role: string;
        splitPercentage: number;
        pro?: string;
        ipiNumber?: string;
      }>;
    }
  ): Promise<any> {
    try {
      const response = await axios.put(
        `${API_URL}/api/work-registration/${submissionId}/edit`,
        data,
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error('Edit submission error:', error);
      throw error;
    }
  }
}

export const workRegistrationApi = new WorkRegistrationAPI();
