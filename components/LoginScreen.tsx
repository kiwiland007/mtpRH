import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Pour une démo sans Auth Supabase complet (magic link/password), 
      // on vérifie seulement si le profil existe
      const { data, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', credentials.email.trim())
        .single();

      if (dbError || !data) {
        throw new Error("Utilisateur non trouvé ou accès refusé.");
      }

      if (data.is_active === false) {
        throw new Error("Ce compte a été archivé. Contactez l'administrateur.");
      }

      const user: User = {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        role: data.role as UserRole,
        department: data.department || '',
        hireDate: data.hire_date,
        managerId: data.manager_id,
        is_active: data.is_active,
        balance_adjustment: data.balance_adjustment,
        preferences: data.preferences
      };

      onLogin(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-8">
            <span className="text-2xl font-black text-white">M</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            MOUMEN <span className="text-rose-600">RH</span>
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Gestion des Ressources Humaines
          </p>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold animate-in">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-black text-slate-700 block mb-2">
                Email professionnel
              </label>
              <input
                type="email"
                required
                value={credentials.email}
                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                placeholder="votre.email@mtp.ma"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="text-sm font-black text-slate-700 block mb-2">
                Mot de passe
              </label>
              <input
                type="password"
                required
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                placeholder="••••••••"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold focus:border-indigo-500 outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm shadow-xl hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>


        </div>

        <div className="text-center">
          <p className="text-xs text-slate-400">
            Système de gestion RH conforme au Code du Travail Marocain
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;

