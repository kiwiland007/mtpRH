import React, { useState } from 'react';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulation de connexion (remplacer par vraie logique d'authentification)
    setTimeout(() => {
      const mockUser: User = {
        id: '00000000-0000-0000-0000-000000000001',
        email: credentials.email || 'ahmed.mansouri@mtp.ma',
        fullName: 'Ahmed Mansouri',
        role: UserRole.ADMIN,
        department: 'Direction Générale',
        hireDate: '2020-03-10',
        managerId: 'admin-root'
      };

      onLogin(mockUser);
      setIsLoading(false);
    }, 1500);
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

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="text-center text-xs text-slate-500">
              <p className="font-bold mb-2">Démo - Utilisateur de test :</p>
              <p>Email: demo@mtp.ma</p>
              <p>Mot de passe: demo123</p>
            </div>
          </div>
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

