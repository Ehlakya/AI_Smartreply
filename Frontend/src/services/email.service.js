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

  getInbox: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/inbox?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Inbox Error:', error);
      throw error;
    }
  },

  getSent: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/sent?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Sent Error:', error);
      throw error;
    }
  },

  getPriority: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/priority?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Priority Error:', error);
      throw error;
    }
  },

  getTeam: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/team?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Team Error:', error);
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
  },

  getDrafts: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/drafts?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Drafts Error:', error);
      throw error;
    }
  },

  getTrash: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/trash?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Trash Error:', error);
      throw error;
    }
  },

  getStarred: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/starred?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Starred Error:', error);
      throw error;
    }
  },

  getSpam: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/spam?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Spam Error:', error);
      throw error;
    }
  },

  getArchive: async (page = 1, limit = 20, search = '') => {
    try {
      const response = await axios.get(`${API_URL}/archive?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Archive Error:', error);
      throw error;
    }
  },

  toggleStar: async (id, isStarred) => {
    try {
      const response = await axios.put(`${API_URL}/${id}/star`, { isStarred }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Toggle Star Error:', error);
      throw error;
    }
  },

  moveToTrash: async (id) => {
    try {
      const response = await axios.put(`${API_URL}/${id}/trash`, {}, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Move To Trash Error:', error);
      throw error;
    }
  },

  restoreFromTrash: async (id) => {
    try {
      const response = await axios.put(`${API_URL}/${id}/restore`, {}, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Restore Error:', error);
      throw error;
    }
  },

  permanentlyDelete: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Permanent Delete Error:', error);
      throw error;
    }
  },

  updateDraft: async (id, to, subject, body) => {
    try {
      const response = await axios.put(`${API_URL}/${id}/draft`, { to, subject, body }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Update Draft Error:', error);
      throw error;
    }
  },

  sendDraft: async (id) => {
    try {
      const response = await axios.post(`${API_URL}/${id}/send-draft`, {}, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Send Draft Error:', error);
      throw error;
    }
  },

  deleteDraft: async (id) => {
    try {
      const response = await axios.delete(`${API_URL}/${id}/draft`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Delete Draft Error:', error);
      throw error;
    }
  },

  bulkAction: async (ids, action) => {
    try {
      const response = await axios.post(`${API_URL}/bulk-action`, { ids, action }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Bulk Action Error:', error);
      throw error;
    }
  },

  bulkDelete: async (ids) => {
    try {
      const response = await axios.post(`${API_URL}/bulk-delete`, { ids }, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Bulk Delete Error:', error);
      throw error;
    }
  }
};
