
import React, { useState, useMemo } from 'react';
import { Asset, AssetLog, User, Language } from '../types';
import { 
  Plus, Search, Package, ArrowUpRight, ArrowDownLeft, 
  History, Calendar, User as UserIcon, Trash2, X, AlertCircle, CheckCircle, Tag, Printer
} from 'lucide-react';
import { translations } from '../src/translations';

interface AssetManagementProps {
  assets: Asset[];
  assetLogs: AssetLog[];
  onUpdateAssets: (assets: Asset[]) => void;
  onDeleteAsset: (id: string) => void;
  onUpdateLogs: (logs: AssetLog[]) => void;
  onUpdateAssetsAndLogs: (assets: Asset[], logs: AssetLog[]) => void;
  user: User;
}

const AssetManagement: React.FC<AssetManagementProps> = ({ 
  assets, assetLogs, onUpdateAssets, onDeleteAsset, onUpdateLogs, onUpdateAssetsAndLogs, user 
}) => {
  const lang: Language = user.language || 'ms';
  const t = translations[lang];
  const isRTL = lang === 'ar';
  const [activeView, setActiveView] = useState<'INVENTORY' | 'HISTORY'>('INVENTORY');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'DESC' | 'ASC'>('DESC');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [logType, setLogType] = useState<'KELUAR' | 'MASUK'>('KELUAR');

  const [assetForm, setAssetForm] = useState<Omit<Asset, 'id'>>({
    name: '',
    category: '',
    totalQuantity: 1,
    currentQuantity: 1,
    location: 'Bilik Panitia',
    entryDate: ''
  });

  const [logForm, setLogForm] = useState({
    quantity: 1,
    person: user.name,
    notes: '',
    date: new Date().toISOString().slice(0, 16),
    status: 'PINJAM' as 'PINJAM' | 'PAKAI_TERUS'
  });

  const filteredAssets = useMemo(() => {
    return assets.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  // Derived existing categories for suggestions
  const existingCategories = useMemo(() => {
    const cats = new Set(['Alatan Mengajar', 'Peralatan Elektronik', 'Buku & Kamus', 'Stationary']);
    assets.forEach(a => cats.add(a.category));
    return Array.from(cats).sort();
  }, [assets]);

  const filteredLogs = useMemo(() => {
    let logs = [...assetLogs];

    // Filter by search term
    if (searchTerm) {
      logs = logs.filter(l => 
        l.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (l.notes || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by Month
    if (filterMonth) {
      logs = logs.filter(l => new Date(l.date).getMonth() + 1 === parseInt(filterMonth));
    }

    // Filter by Year
    if (filterYear) {
      logs = logs.filter(l => new Date(l.date).getFullYear() === parseInt(filterYear));
    }

    // Sort
    logs.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'DESC' ? dateB - dateA : dateA - dateB;
    });

    return logs;
  }, [assetLogs, searchTerm, filterMonth, filterYear, sortOrder]);

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const now = new Date().toISOString();
    
    if (editingAsset) {
      const updatedAssets = assets.map(a => a.id === editingAsset.id ? {
        ...a,
        ...assetForm,
        entryDate: assetForm.entryDate || a.entryDate || now
      } : a);
      
      const editLog: AssetLog = {
        id: Math.random().toString(36).substr(2, 9),
        assetId: editingAsset.id,
        assetName: assetForm.name,
        type: 'MASUK',
        quantity: assetForm.totalQuantity,
        person: user.name,
        date: now,
        status: 'PULANG',
        notes: `Kemaskini maklumat aset: ${assetForm.name}`
      };
      
      onUpdateAssetsAndLogs(updatedAssets, [editLog, ...assetLogs]);
    } else {
      const newAsset: Asset = {
        ...assetForm,
        id: Math.random().toString(36).substr(2, 9),
        currentQuantity: assetForm.totalQuantity,
        category: assetForm.category.trim() || 'Lain-lain',
        entryDate: assetForm.entryDate || now
      };
      
      const registerLog: AssetLog = {
        id: Math.random().toString(36).substr(2, 9),
        assetId: newAsset.id,
        assetName: newAsset.name,
        type: 'MASUK',
        quantity: newAsset.totalQuantity,
        person: user.name,
        date: now,
        status: 'PULANG',
        notes: `Pendaftaran aset baru: ${newAsset.name}`
      };
      
      onUpdateAssetsAndLogs([...assets, newAsset], [registerLog, ...assetLogs]);
    }
    
    setIsAssetModalOpen(false);
    setEditingAsset(null);
    setAssetForm({ name: '', category: '', totalQuantity: 1, currentQuantity: 1, location: 'Bilik Panitia', entryDate: '' });
  };

  const openEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setAssetForm({
      name: asset.name,
      category: asset.category,
      totalQuantity: asset.totalQuantity,
      currentQuantity: asset.currentQuantity,
      location: asset.location,
      entryDate: asset.entryDate ? new Date(asset.entryDate).toISOString().slice(0, 16) : ''
    });
    setIsAssetModalOpen(true);
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;

    if (logType === 'KELUAR' && logForm.quantity > selectedAsset.currentQuantity) {
      alert("Kuantiti keluar melebihi baki sedia ada!");
      return;
    }

    const newLog: AssetLog = {
      id: Math.random().toString(36).substr(2, 9),
      assetId: selectedAsset.id,
      assetName: selectedAsset.name,
      type: logType,
      quantity: logForm.quantity,
      person: logForm.person,
      date: logType === 'KELUAR' ? new Date(logForm.date).toISOString() : new Date().toISOString(),
      status: logType === 'KELUAR' ? logForm.status : 'PULANG',
      notes: logForm.notes
    };

    // Update asset current quantity
    const updatedAssets = assets.map(a => {
      if (a.id === selectedAsset.id) {
        const newQty = logType === 'KELUAR' 
          ? a.currentQuantity - logForm.quantity 
          : a.currentQuantity + logForm.quantity;
        return { ...a, currentQuantity: Math.min(Math.max(0, newQty), a.totalQuantity) };
      }
      return a;
    });

    onUpdateAssetsAndLogs(updatedAssets, [newLog, ...assetLogs]);
    setIsLogModalOpen(false);
    setLogForm({ 
      quantity: 1, 
      person: user.name, 
      notes: '', 
      date: new Date().toISOString().slice(0, 16),
      status: 'PINJAM'
    });
  };

  const handleDeleteAsset = (id: string) => {
    if (confirm("Padam aset ini dari inventori?")) {
      onDeleteAsset(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className={isRTL ? 'text-right' : ''}>
          <h2 className={`text-2xl font-bold text-slate-900 flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Package className="text-sky-600" /> {t.asset_management}
          </h2>
          <p className="text-slate-500">{t.asset_desc}</p>
        </div>
        <div className={`flex bg-white p-1 rounded-2xl border shadow-sm no-print ${isRTL ? 'flex-row-reverse' : ''}`}>
          <button 
            onClick={() => setActiveView('INVENTORY')} 
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${activeView === 'INVENTORY' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500'} ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Package size={16} /> {t.inventory}
          </button>
          <button 
            onClick={() => setActiveView('HISTORY')} 
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${activeView === 'HISTORY' ? 'bg-sky-600 text-white shadow-md' : 'text-slate-500'} ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <History size={16} /> {t.history}
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className={`flex flex-col md:flex-row gap-4 no-print ${isRTL ? 'md:flex-row-reverse' : ''}`}>
        <div className="flex-1 relative">
          <Search size={18} className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400`} />
          <input 
            type="text" 
            placeholder={t.search} 
            className={`w-full bg-white border rounded-xl ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'} py-2.5 outline-none focus:ring-2 focus:ring-sky-500 shadow-sm`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        {activeView === 'INVENTORY' && (
          <button 
            onClick={() => setIsAssetModalOpen(true)}
            className="bg-sky-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-700 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> {t.add_asset}
          </button>
        )}
      </div>

      {activeView === 'INVENTORY' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map(asset => (
            <div key={asset.id} className="bg-white rounded-3xl border shadow-sm p-6 hover:shadow-md transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-2xl ${asset.currentQuantity > 0 ? 'bg-sky-50 text-sky-600' : 'bg-red-50 text-red-600'}`}>
                  <Package size={24} />
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEditAsset(asset)} className="p-2 text-slate-300 hover:text-sky-600"><Plus size={16} className="rotate-45" /></button>
                  <button onClick={() => handleDeleteAsset(asset.id)} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              </div>

              <h3 className="font-bold text-slate-900 uppercase text-sm mb-1">{asset.name}</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center gap-1">
                <Tag size={10} className="text-sky-400" /> {asset.category} • {asset.location}
              </p>
              
              <div className="flex flex-col gap-1 mb-4">
                {asset.entryDate && (
                  <p className="text-[9px] text-emerald-600 font-bold uppercase flex items-center gap-1">
                    <ArrowDownLeft size={10} /> Masuk: {new Date(asset.entryDate).toLocaleDateString('ms-MY')}
                  </p>
                )}
              </div>

              <div className={`flex items-center justify-between p-4 bg-slate-50 rounded-2xl mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : ''}>
                  <p className="text-[10px] text-slate-400 font-black uppercase">{t.current_stock}</p>
                  <p className={`text-2xl font-black ${asset.currentQuantity <= 2 ? 'text-orange-500' : 'text-sky-600'}`}>{asset.currentQuantity}</p>
                </div>
                <div className={isRTL ? 'text-left' : 'text-right'}>
                  <p className="text-[10px] text-slate-400 font-black uppercase">{t.total_stock}</p>
                  <p className="text-sm font-bold text-slate-600">{asset.totalQuantity}</p>
                </div>
              </div>

              <div className={`grid grid-cols-2 gap-2 ${isRTL ? 'direction-rtl' : ''}`}>
                <button 
                  disabled={asset.currentQuantity === 0}
                  onClick={() => { setSelectedAsset(asset); setLogType('KELUAR'); setIsLogModalOpen(true); }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase hover:bg-indigo-100 disabled:opacity-50"
                >
                  <ArrowUpRight size={14} /> {t.out}
                </button>
                <button 
                  onClick={() => { setSelectedAsset(asset); setLogType('MASUK'); setIsLogModalOpen(true); }}
                  className="flex items-center justify-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-black uppercase hover:bg-emerald-100"
                >
                  <ArrowDownLeft size={14} /> {t.in}
                </button>
              </div>
            </div>
          ))}
          {filteredAssets.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white border-2 border-dashed rounded-[40px] text-slate-400">
              Tiada rekod aset ditemui.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b bg-slate-50/50 no-print gap-4">
            <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest">Laporan Pergerakan Aset</h3>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white border rounded-xl px-3 py-1.5 shadow-sm">
                <Calendar size={14} className="text-slate-400" />
                <select 
                  className="text-[10px] font-bold uppercase outline-none bg-transparent"
                  value={filterMonth}
                  onChange={e => setFilterMonth(e.target.value)}
                >
                  <option value="">Semua Bulan</option>
                  {Array.from({length: 12}, (_, i) => (
                    <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('ms-MY', {month: 'long'})}</option>
                  ))}
                </select>
                <select 
                  className="text-[10px] font-bold uppercase outline-none bg-transparent"
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                >
                  <option value="">Semua Tahun</option>
                  {[2024, 2025, 2026].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={() => setSortOrder(prev => prev === 'DESC' ? 'ASC' : 'DESC')}
                className="flex items-center gap-2 bg-white border px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                Susun: {sortOrder === 'DESC' ? 'Terbaru' : 'Terlama'}
              </button>

              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
              >
                <Printer size={14} /> Cetak Laporan
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b">
                <tr>
                  <th className="px-6 py-4">Tarikh & Masa</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4 text-center">Jenis</th>
                  <th className="px-6 py-4 text-center">Bil</th>
                  <th className="px-6 py-4">Guru / Staf</th>
                  <th className="px-6 py-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(log.date).toLocaleString('ms-MY')}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 uppercase text-xs">{log.assetName}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          log.type === 'KELUAR' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {log.type === 'KELUAR' ? 'Keluar' : 'Masuk'}
                        </span>
                        {log.type === 'KELUAR' && (
                          <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                            {log.status === 'PAKAI_TERUS' ? 'Pakai Terus' : 'Pinjam'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700">{log.quantity}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600 uppercase">
                        <UserIcon size={14} className="text-slate-400" />
                        {log.person}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 italic">{log.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="py-20 text-center text-slate-400 italic">Tiada sejarah pergerakan aset ditemui dengan tapisan ini.</div>
            )}
          </div>
        </div>
      )}

      {/* Modal Tambah Aset */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsAssetModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold uppercase italic">{editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}</h3>
              <button onClick={() => { setIsAssetModalOpen(false); setEditingAsset(null); }}><X /></button>
            </div>
            <form onSubmit={handleAssetSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Nama Aset</label>
                <input required className="w-full border rounded-xl px-4 py-3 text-sm font-bold uppercase" placeholder="Contoh: Flashcard Buah-buahan" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Kategori (Pilih/Taip)</label>
                  <input 
                    list="asset-categories" 
                    required 
                    className="w-full border rounded-xl px-4 py-3 text-sm font-bold bg-slate-50" 
                    placeholder="Taip kategori baru..."
                    value={assetForm.category} 
                    onChange={e => setAssetForm({...assetForm, category: e.target.value})} 
                  />
                  <datalist id="asset-categories">
                    {existingCategories.map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Jumlah Stok</label>
                  <input type="number" min="1" required className="w-full border rounded-xl px-4 py-3 text-sm font-bold" value={assetForm.totalQuantity} onChange={e => setAssetForm({...assetForm, totalQuantity: parseInt(e.target.value) || 1})} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Tarikh Masuk</label>
                  <input type="datetime-local" className="w-full border rounded-xl px-4 py-3 text-sm font-bold" value={assetForm.entryDate} onChange={e => setAssetForm({...assetForm, entryDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Lokasi Simpanan</label>
                <input className="w-full border rounded-xl px-4 py-3 text-sm font-bold uppercase" placeholder="Bilik Panitia / Rak A" value={assetForm.location} onChange={e => setAssetForm({...assetForm, location: e.target.value})} />
              </div>
              <button type="submit" className="w-full bg-sky-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-sky-500/20 hover:bg-sky-700 mt-4 transition-all">
                {editingAsset ? 'Simpan Perubahan' : 'Daftarkan Aset'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rekod Ambil/Pulang (Sedia Ada) */}
      {isLogModalOpen && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsLogModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 border-t-8 border-indigo-600">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold uppercase italic">{logType === 'KELUAR' ? 'Rekod Keluar' : 'Rekod Masuk'}</h3>
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{selectedAsset.name}</p>
              </div>
              <button onClick={() => setIsLogModalOpen(false)}><X /></button>
            </div>
            
            <form onSubmit={handleLogSubmit} className="space-y-4">
              <div className="p-4 bg-indigo-50 rounded-2xl flex gap-3 text-indigo-800 text-xs font-medium">
                <AlertCircle size={18} className="shrink-0" />
                <p>Baki tersedia: <b>{selectedAsset.currentQuantity}</b> unit</p>
              </div>

              {logType === 'KELUAR' && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Tarikh Dikeluarkan</label>
                    <input type="datetime-local" required className="w-full border rounded-xl px-4 py-3 text-sm font-bold" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Jenis Penggunaan</label>
                    <select className="w-full border rounded-xl px-4 py-3 text-sm font-bold" value={logForm.status} onChange={e => setLogForm({...logForm, status: e.target.value as any})}>
                      <option value="PINJAM">Pinjam</option>
                      <option value="PAKAI_TERUS">Pakai Terus</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Bilangan Item</label>
                  <input type="number" min="1" max={logType === 'KELUAR' ? selectedAsset.currentQuantity : selectedAsset.totalQuantity} required className="w-full border rounded-xl px-4 py-3 text-sm font-bold" value={logForm.quantity} onChange={e => setLogForm({...logForm, quantity: parseInt(e.target.value) || 1})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase">Peminjam / Pemulang</label>
                  <input required className="w-full border rounded-xl px-4 py-3 text-sm font-bold uppercase bg-slate-50" value={logForm.person} onChange={e => setLogForm({...logForm, person: e.target.value})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 uppercase">Catatan</label>
                <textarea rows={3} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Sebab ambil / keadaan item..." value={logForm.notes} onChange={e => setLogForm({...logForm, notes: e.target.value})} />
              </div>

              <button type="submit" className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all mt-4 text-white ${logType === 'KELUAR' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                Sahkan Rekod {logType === 'KELUAR' ? 'Keluar' : 'Masuk'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetManagement;
