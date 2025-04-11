import React, { createContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import axios from 'axios';

// Create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  
  // Check if user is already logged in
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      setUser({ token: storedToken });
    }
    setLoading(false);
  }, []);
  
  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Create form data for the login
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      
      // Make direct Axios call with the proper content type
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/auth/login`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser({ token: access_token });
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to login';
      setError(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Signup function
  const signup = async (email, password, confirmPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/signup', {
        email,
        password,
        confirm_password: confirmPassword
      });
      
      // Check if verification is required
      if (response.data.requires_verification) {
        // Navigate to verification page with email
        navigate('/verify-email', { state: { email } });
      } else {
        // Auto login after signup (old behavior, should not happen with new flow)
        await login(email, password);
      }
    } catch (err) {
      console.error('Signup error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to sign up';
      setError(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
      setLoading(false);
    }
  };
  
  // Verify email function
  const verifyEmail = async (email, token) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.post('/auth/verify', {
        email,
        token
      });
      
      const { access_token } = response.data;
      
      // Store token and set up authentication
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setUser({ token: access_token });
      
      // Navigate to dashboard after successful verification
      navigate('/dashboard');
    } catch (err) {
      console.error('Verification error:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to verify email';
      setError(typeof errorMessage === 'object' ? JSON.stringify(errorMessage) : errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    navigate('/login');
  };
  
  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        error,
        login,
        signup,
        verifyEmail,
        logout,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 