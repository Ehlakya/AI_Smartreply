import axios from 'axios';

const API_URL = 'http://localhost:5000/api/emails';

// Configure axios to send cookies (JWT refresh token) automatically
axios.defaults.withCredentials = true;

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

export const emailService = {
  syncEmails: async () => {
    try {
      const response = await axios.post(`${API_URL}/sync`, {}, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Email Sync Error:', error);
      throw error;
    }
  },

  getInbox: async (page = 1, limit = 20) => {
    try {
      const response = await axios.get(`${API_URL}/inbox?page=${page}&limit=${limit}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Inbox Error:', error);
      throw error;
    }
  },

  getEmailById: async (id) => {
    try {
      const response = await axios.get(`${API_URL}/${id}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Email Details Error:', error);
      throw error;
    }
  },

  sendReply: async (emailId, replyBody, subject) => {
    try {
      const response = await axios.post(`${API_URL}/reply`, { emailId, replyBody, subject }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Send Reply Error:', error);
      throw error;
    }
  }
};
