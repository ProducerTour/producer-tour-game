import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000';

export interface CollaboratorSuggestion {
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  ipiNumber?: string;
  frequency: number;
  lastCollaborated: string; // ISO date string
}

class CreditSuggestionsAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: token ? `Bearer ${token}` : '',
    };
  }

  /**
   * Search for collaborators by name
   */
  async searchCollaborators(query: string): Promise<CollaboratorSuggestion[]> {
    try {
      const response = await axios.get(`${API_URL}/api/credit-suggestions`, {
        headers: this.getAuthHeaders(),
        params: { q: query },
      });
      return response.data.suggestions || [];
    } catch (error) {
      console.error('Search collaborators error:', error);
      throw error;
    }
  }

  /**
   * Get user's most frequent collaborators
   */
  async getFrequentCollaborators(limit: number = 10): Promise<CollaboratorSuggestion[]> {
    try {
      const response = await axios.get(`${API_URL}/api/credit-suggestions/frequent`, {
        headers: this.getAuthHeaders(),
        params: { limit },
      });
      return response.data.suggestions || [];
    } catch (error) {
      console.error('Get frequent collaborators error:', error);
      throw error;
    }
  }

  /**
   * Get user's recent collaborators
   */
  async getRecentCollaborators(limit: number = 10): Promise<CollaboratorSuggestion[]> {
    try {
      const response = await axios.get(`${API_URL}/api/credit-suggestions/recent`, {
        headers: this.getAuthHeaders(),
        params: { limit },
      });
      return response.data.suggestions || [];
    } catch (error) {
      console.error('Get recent collaborators error:', error);
      throw error;
    }
  }

  /**
   * Clear cache for current user
   */
  async clearCache(): Promise<void> {
    try {
      await axios.post(
        `${API_URL}/api/credit-suggestions/clear-cache`,
        {},
        { headers: this.getAuthHeaders() }
      );
    } catch (error) {
      console.error('Clear cache error:', error);
      throw error;
    }
  }
}

export const creditSuggestionsApi = new CreditSuggestionsAPI();
