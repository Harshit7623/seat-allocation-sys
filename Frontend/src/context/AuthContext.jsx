import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.post('/api/auth/login', { email, password });
      
      // Mock authentication
      const mockUser = { 
        id: 1, 
        name: 'John Doe', 
        email: email, 
        role: 'Admin' 
      };
      const mockToken = 'mock-jwt-token-' + Date.now();
      
      localStorage.setItem('token', mockToken);
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Login failed' };
    }
  };

  const signup = async (userData) => {
    try {
      // TODO: Replace with actual API call
      // const response = await axios.post('/api/auth/signup', userData);
      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
      return { success: false, error: 'Signup failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};