import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + t } });
      if (res.ok) {
        const u = await res.json();
        setUser(u);
      } else {
        logout();
      }
    } catch (e) {
      logout();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onExpired = () => { logout(); window.location.hash = '#/login'; };
    window.addEventListener('auth-expired', onExpired);
    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  useEffect(() => {
    if (token) { fetchMe(token); }
    else { setLoading(false); }
  }, [token]);

  const login = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const getAuthHeaders = () => {
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export { AuthContext };