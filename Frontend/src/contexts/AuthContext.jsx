import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// Configure axios interceptor for sending cookies automatically
axios.defaults.withCredentials = true;
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true
});

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Intercept requests to attach token
    const requestInterceptor = api.interceptors.request.use(
      (config) => {
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Intercept responses to handle token refresh
    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const res = await axios.post('http://localhost:5000/api/auth/refresh', {}, { withCredentials: true });
            const newAccessToken = res.data.data.accessToken;
            setAccessToken(newAccessToken);
            localStorage.setItem('accessToken', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            setUser(null);
            setAccessToken(null);
            localStorage.removeItem('accessToken');
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken]);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await axios.post('http://localhost:5000/api/auth/refresh', {}, { withCredentials: true });
        
        if (res.data.data.isAuthenticated === false) {
          setUser(null);
          localStorage.removeItem('accessToken');
          setLoading(false);
          return;
        }

        setAccessToken(res.data.data.accessToken);
        localStorage.setItem('accessToken', res.data.data.accessToken);
        
        // Fetch user profile
        const userRes = await axios.get('http://localhost:5000/api/auth/me', {
          headers: { Authorization: `Bearer ${res.data.data.accessToken}` }
        });
        setUser(userRes.data.data.user);
      } catch (error) {
        setUser(null);
        localStorage.removeItem('accessToken');
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:5000/api/auth/google';
  };

  const devLogin = () => {
    window.location.href = 'http://localhost:5000/api/auth/dev-login';
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      localStorage.removeItem('accessToken');
    }
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, loginWithGoogle, devLogin, logout, api }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
