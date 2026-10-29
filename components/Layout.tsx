
import React, { useState } from 'react';
import { NAV_ITEMS } from '../constants';
import { User, Language } from '../types';
import { LogOut, Menu, X } from 'lucide-react';
import { translations } from '../src/translations';

interface LayoutProps {
  children: React.ReactNode;
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const SCHOOL_LOGO = "https://i.postimg.cc/fRFnY6hv/LOGO_SRADHMMHD_3D.png";

const Layout: React.FC<LayoutProps> = ({ children, user, activeTab, setActiveTab, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const lang: Language = user.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';

  // Semakan Akses: Admin semua, Guru ikut permissions (default dashboard/settings sentiasa ada)
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (user.role === 'ADMIN') return true;
    if (['dashboard', 'settings'].includes(item.id || '')) return true;
    return user.permissions?.includes(item.id || '');
  });

  return (
    <div className={`flex flex-col md:flex-row min-h-screen bg-slate-50 ${isRTL ? 'font-arabic' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <img src={SCHOOL_LOGO} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-black text-slate-900 tracking-tighter uppercase text-sm">E-Panitia Arab</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-600">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-40 w-72 bg-white border-r transform transition-transform duration-500 ease-in-out md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col">
          <div className={`hidden md:flex items-center gap-4 px-8 py-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <img src={SCHOOL_LOGO} alt="Logo Sekolah" className="w-14 h-14 object-contain" />
            <div className={`flex flex-col ${isRTL ? 'items-end' : ''}`}>
              <span className="font-black text-slate-900 text-xl tracking-tighter leading-none">E-PANITIA</span>
              <span className="text-[10px] font-black text-sky-600 uppercase tracking-[0.3em] mt-1">Bahasa Arab</span>
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
            {filteredNavItems.map(item => (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id!); setIsSidebarOpen(false); }}
                className={`
                  w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 text-xs font-black uppercase tracking-widest
                  ${isRTL ? 'flex-row-reverse text-right' : ''}
                  ${activeTab === item.id 
                    ? 'bg-slate-900 text-white shadow-xl' 
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <span className={activeTab === item.id ? 'text-sky-400' : 'text-slate-300'}>
                  {item.icon}
                </span>
                {t[item.id!] || item.label}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t bg-slate-50/30">
            <div className={`flex items-center gap-4 mb-6 px-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700 font-black text-xl shadow-sm border border-sky-200">
                {user.name.charAt(0)}
              </div>
              <div className={`flex flex-col overflow-hidden ${isRTL ? 'items-end' : ''}`}>
                <span className="text-xs font-black text-slate-900 truncate uppercase">{user.name}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{user.role}</span>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className={`w-full flex items-center justify-center gap-3 py-4 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <LogOut size={18} /> {t.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col relative">
        <div className="max-w-7xl mx-auto p-6 md:p-12 flex-1 w-full">
          {children}
        </div>
        
        <footer className="mt-auto py-10 text-center border-t bg-white/50 no-print">
           <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-300">
             HAK CIPTA TERPELIHARA @USTAKMAL2026
           </p>
        </footer>
      </main>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-30 md:hidden backdrop-blur-sm transition-all"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;
