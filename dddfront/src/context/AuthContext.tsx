/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios, { AxiosInstance } from 'axios';
import { API_BASE_URL } from '@/lib/utils'; 
import { useNavigate } from 'react-router-dom'; 

interface User {
  id: number;
  name: string;
  email: string;
  role: { id: number; name: string };
  role_id?: number;
  is_active?: boolean;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_name: string;
  nom_entreprise: string;
  adresse: string;
  telephone: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isResponsableMarche: boolean;
  isFournisseur: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  loading: boolean;
  isReady: boolean;
  api: AxiosInstance;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const parseUserPayload = (payload: unknown): User => {
  if (typeof payload === 'string') {
    return JSON.parse(payload) as User;
  }
  return payload as User;
};

const getApiErrorMessage = (error: unknown): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === 'string'
  ) {
    return (error as { response?: { data?: { message?: string } } }).response?.data?.message as string;
  }
  if (error instanceof Error) return error.message;
  return 'Erreur inconnue';
};

// Configuration Axios globale
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

type RetryableConfig = {
  __retryCount?: number;
};

// Intercepteur pour ajouter le token XSRF
api.interceptors.request.use(
  (config) => {
    const cookies = document.cookie.split('; ');
    const xsrfCookie = cookies.find(cookie => cookie.startsWith('XSRF-TOKEN='));
    
    if (xsrfCookie) {
      const xsrfToken = decodeURIComponent(xsrfCookie.split('=')[1]);
      config.headers['X-XSRF-TOKEN'] = xsrfToken;
    }
    
    // Si c'est un FormData, ne pas définir Content-Type (Axios le fera automatiquement avec le bon boundary)
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = (error?.config || {}) as RetryableConfig & { headers?: Record<string, string> };

    if (status === 429) {
      const retryCount = config.__retryCount ?? 0;
      if (retryCount < 1) {
        config.__retryCount = retryCount + 1;
        const retryAfterHeader = error?.response?.headers?.['retry-after'];
        const retryAfterMs = Number(retryAfterHeader) > 0 ? Number(retryAfterHeader) * 1000 : 1200;
        await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
        return api.request(config);
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  // ✅ SOLUTION : State explicite pour isAuthenticated
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const navigate = useNavigate();

  // Calculer les rôles basés sur user
  const isAdmin = user?.role?.name === 'ADMIN';
  const isResponsableMarche = user?.role?.name === 'RESPONSABLE_MARCHE';
  const isFournisseur = user?.role?.name === 'FOURNISSEUR';

  // Ajouter le token Bearer si disponible
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const loadUser = async () => {
      const storedToken = localStorage.getItem('access_token');
      
      console.log('🔄 loadUser - storedToken:', storedToken ? 'EXISTS' : 'NULL');
      
      if (storedToken) {
        setToken(storedToken);
        
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          const response = await api.get('/api/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          });
          
          console.log('👤 RAW response.data:', response.data);
          console.log('👤 typeof response.data:', typeof response.data);
          
          // ✅ SOLUTION : Parser si c'est une string
          const userData = parseUserPayload(response.data);
          
          console.log('👤 User après parsing:', userData);
          console.log('👤 userData.role:', userData.role);

          setUser(userData);
          setIsAuthenticated(true); // ✅ Explicite
          
        } catch (error: unknown) {
          console.error("❌ Erreur chargement user:", getApiErrorMessage(error));
          localStorage.removeItem('access_token');
          setToken(null);
          setUser(null);
          setIsAuthenticated(false); // ✅ Explicite
        } finally {
          setIsReady(true);
          setLoading(false);
        }
      } else {
        console.log('⚠️ Pas de token dans localStorage');
        setIsAuthenticated(false);
        setIsReady(true);
        setLoading(false);
      }
    };

    loadUser();
  }, []); // ← Pas de dépendances pour éviter les boucles

  const login = async (email: string, password: string): Promise<User> => {
    // Ne pas mettre loading à true ici pour éviter le double chargement
    // Le dashboard affichera son propre chargement
    try {
      console.log('📡 Récupération du cookie CSRF...');
      await api.get('/sanctum/csrf-cookie');
      await new Promise(resolve => setTimeout(resolve, 200));
  
      const hasCookie = document.cookie.includes('XSRF-TOKEN');
      console.log('🍪 Cookie XSRF-TOKEN présent:', hasCookie);
  
      if (!hasCookie) {
        throw new Error("Le cookie CSRF n'a pas été défini correctement");
      }
  
      console.log('🔐 Tentative de connexion...');
      const response = await api.post('/api/login', { email, password });
      
      console.log('✅ RÉPONSE LOGIN:', response.data);
      
      const { access_token, user: loggedInUser } = response.data || {};
      
      console.log('🔓 access_token:', access_token);
      console.log('👥 loggedInUser:', loggedInUser);
  
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      localStorage.setItem('access_token', access_token);
      setToken(access_token);
  
      if (loggedInUser) {
        console.log('✅ User défini via response.data.user');
        console.log('👤 typeof loggedInUser:', typeof loggedInUser);
  
      // ✅ Parser si c'est une string
      const userData = parseUserPayload(loggedInUser);

      console.log('👤 userData après parsing:', userData);
      setUser(userData);
      setIsAuthenticated(true); // ✅ Explicite
      setIsReady(true);
      return userData;
    }
  
      console.log('⚠️ Pas de user dans response.data, appel à /api/me...');
      const me = await api.get('/api/me', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      
      console.log('👤 User récupéré via /api/me:', me.data);
      console.log('👤 typeof me.data:', typeof me.data);

      // ✅ Parser si c'est une string
      const userData = parseUserPayload(me.data);
      
      setUser(userData);
      setIsAuthenticated(true); // ✅ Explicite
      setIsReady(true);
      return userData;
    } catch (error: unknown) {
      console.error('❌ Erreur de connexion:', getApiErrorMessage(error));
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterPayload): Promise<User> => {
    setLoading(true);
    try {
      await api.get('/sanctum/csrf-cookie');
      await new Promise(resolve => setTimeout(resolve, 200));
  
      const response = await api.post('/api/register', data);
      const { access_token, user: registeredUser } = response.data;
  
      if (registeredUser?.is_active === false) {
        localStorage.removeItem('access_token');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
        return registeredUser;
      }
  
      localStorage.setItem('access_token', access_token);
      setToken(access_token);
      setUser(registeredUser);
      setIsAuthenticated(true); // ✅ Explicite
  
      return registeredUser;
    } catch (error: unknown) {
      console.error('Erreur d\'enregistrement:', getApiErrorMessage(error));
      setIsAuthenticated(false);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/api/me');
      const userData = response.data;
      setUser(userData);
      console.log('✅ Utilisateur rafraîchi:', userData);
    } catch (error: unknown) {
      console.error('❌ Erreur lors du rafraîchissement de l\'utilisateur:', getApiErrorMessage(error));
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.get('/sanctum/csrf-cookie');
      await new Promise(resolve => setTimeout(resolve, 200));
      await api.post('/api/logout');
      
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false); // ✅ Explicite
      navigate('/connexion');
    } catch (error: unknown) {
      console.error('Erreur de déconnexion:', getApiErrorMessage(error));
      localStorage.removeItem('access_token');
      setToken(null);
      setUser(null);
      setIsAuthenticated(false); // ✅ Explicite
      navigate('/connexion');
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    token,
    isAuthenticated,
    isAdmin,
    isResponsableMarche,
    isFournisseur,
    login,
    register,  
    logout,
    refreshUser,
    loading,
    isReady,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};