import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface WorkSubmission {
  id: string;
  title: string;
  artist: string;
  albumName?: string;
  albumArtUrl?: string;
  status: 'PENDING' | 'DOCUMENTS_REQUESTED' | 'APPROVED' | 'DENIED' | 'TRACKING' | 'COMPLETED';
  submittedAt?: string;
  reviewedAt?: string;
  denialReason?: string;
  documentsRequested?: string;
  caseNumber?: string;
  createdAt: string;
}

export interface PendingSubmission extends WorkSubmission {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  genre?: string;
  releaseYear?: string;
  label?: string;
  isrc?: string;
  platform?: string;
}

class WorkRegistrationAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  async getMySubmissions(): Promise<WorkSubmission[]> {
    try {
      const response = await axios.get(`${API_URL}/api/work-registration/my-submissions`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.submissions || [];
    } catch (error) {
      console.error('Get my submissions error:', error);
      throw error;
    }
  }

  async getPendingSubmissions(): Promise<PendingSubmission[]> {
    try {
      const response = await axios.get(`${API_URL}/api/work-registration/pending`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.pending || [];
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
}

export const workRegistrationApi = new WorkRegistrationAPI();
