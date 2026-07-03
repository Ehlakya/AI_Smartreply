import axios from 'axios';

const API_URL = 'http://localhost:5000/api/ai';

// Configure axios to send cookies
axios.defaults.withCredentials = true;

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

export const aiService = {
  summarizeEmail: async (emailContent) => {
    try {
      const response = await axios.post(`${API_URL}/summarize`, { emailContent }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('AI Summarize Error:', error);
      throw error;
    }
  },

  generateReply: async (emailContent, tone = 'Professional') => {
    try {
      const response = await axios.post(`${API_URL}/reply`, { emailContent, tone }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('AI Generate Reply Error:', error);
      throw error;
    }
  },

  generateSuggestions: async (emailContent) => {
    try {
      const response = await axios.post(`${API_URL}/suggestions`, { emailContent }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('AI Generate Suggestions Error:', error);
      throw error;
    }
  }
};
