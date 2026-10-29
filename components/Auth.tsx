
import React, { useState } from 'react';
import { db, DB_KEYS } from '../services/dbService';
import { User } from '../types';
import { ShieldCheck, LogIn, AlertCircle } from 'lucide-react';

interface AuthProps {
  onLogin: (user: User) => void;
}

const SCHOOL_LOGO = "https://i.postimg.cc/fRFnY6hv/LOGO_SRADHMMHD_3D.png";

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // FIX: handleLogin is now async to properly await the db.get response.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // FIX: Using await instead of nested setTimeout for cleaner async flow.
      await new Promise(resolve => setTimeout(resolve, 800));
      // FIX: Added await to correctly resolve the Promise<User[]> before calling .find()
      const users = await db.get<User[]>(DB_KEYS.USERS, []);
      const user = users.find(u => u.email === email && u.passwordHash === password);

      if (user) {
        onLogin(user);
        await db.log(user.id, user.name, 'Pengguna telah log masuk ke dalam sistem.');
      } else {
        setError('E-mel atau kata laluan tidak sah.');
      }
    } catch (err) {
      setError('Berlaku ralat sistem semasa log masuk.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 -left-10 w-72 h-72 bg-sky-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute -bottom-10 right-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />

      <div className="max-w-md w-full relative">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border">
          <div className="bg-sky-600 px-8 py-10 text-white text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-3xl mb-4 backdrop-blur-md shadow-lg p-2">
              <img src={SCHOOL_LOGO} alt="Logo Sekolah" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">E-Panitia Arab</h1>
            <p className="text-sky-100 font-medium">Sistem Pengurusan Akademik Sekolah</p>
          </div>
          
          <div className="p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 text-sm font-medium border border-red-100 animate-in shake duration-300">
                  <AlertCircle size={20} />
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Alamat E-mel</label>
                <input 
                  type="email" 
                  required
                  placeholder="admin@school.my"
                  className="w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 ml-1">Kata Laluan</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-sky-500 transition-all font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-sky-500/30 transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-70"
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={20} />
                    Log Masuk
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-widest">
                <ShieldCheck size={14} />
                Sistem Sekuriti Panitia
              </div>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Akses dihadkan kepada guru Panitia Bahasa Arab yang berdaftar sahaja. Sila hubungi Admin untuk bantuan pendaftaran akaun.
              </p>
            </div>
          </div>
        </div>
        
        <p className="mt-6 text-center text-slate-400 text-sm font-medium">
          Hak Cipta Terpelihara &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default Auth;
