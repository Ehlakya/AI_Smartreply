import axios from 'axios';

const API_URL = 'http://localhost:5000/api/settings';
axios.defaults.withCredentials = true;

const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  };
};

export const settingsService = {
  getSettings: async () => {
    try {
      const response = await axios.get(API_URL, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get Settings Error:', error);
      throw error;
    }
  },

  updateSettings: async (settingsData) => {
    try {
      const response = await axios.put(API_URL, settingsData, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Update Settings Error:', error);
      throw error;
    }
  }
};
