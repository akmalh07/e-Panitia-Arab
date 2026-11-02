import React from 'react';
import { X, Printer, FileText, Sliders, CheckSquare, Square } from 'lucide-react';
import { translations } from '../src/translations';

interface ColumnOption {
  key: string;
  label: string;
}

interface PrintOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  columns: ColumnOption[];
  selectedColumns: string[];
  onToggleColumn: (key: string) => void;
  onSelectAll: (select: boolean) => void;
  fontSize: 'text-xs' | 'text-sm' | 'text-base' | 'text-lg';
  onChangeFontSize: (size: 'text-xs' | 'text-sm' | 'text-base' | 'text-lg') => void;
  forcePageBreak: boolean;
  onChangeForcePageBreak: (val: boolean) => void;
  onPrint: () => void;
  lang?: string;
}

export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
  isOpen,
  onClose,
  title = 'Pilihan Cetakan & PDF',
  columns,
  selectedColumns,
  onToggleColumn,
  onSelectAll,
  fontSize,
  onChangeFontSize,
  forcePageBreak,
  onChangeForcePageBreak,
  onPrint,
  lang = 'ms'
}) => {
  if (!isOpen) return null;

  const allSelected = columns.every(col => selectedColumns.includes(col.key));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Printer className="w-5 h-5" />
            <h3 className="font-bold text-base">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Column Toggles */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-sky-600" />
                Pilih Kolom Untuk Dipaparkan & Dicetak
              </label>
              <button
                type="button"
                onClick={() => onSelectAll(!allSelected)}
                className="text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline"
              >
                {allSelected ? 'Nyahpilih Semua' : 'Pilih Semua'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              {columns.map(col => {
                const isChecked = selectedColumns.includes(col.key);
                return (
                  <button
                    type="button"
                    key={col.key}
                    onClick={() => onToggleColumn(col.key)}
                    className={`flex items-center gap-2.5 p-2 rounded-lg text-left text-xs font-medium transition-all ${
                      isChecked ? 'bg-sky-50 text-sky-900 border border-sky-200 shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isChecked ? (
                      <CheckSquare className="w-4 h-4 text-sky-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="truncate">{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Font Size Settings */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Saiz Tulisan Dokumen (Font Size)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'text-xs', label: 'Kecil (XS)' },
                { id: 'text-sm', label: 'Biasa (SM)' },
                { id: 'text-base', label: 'Sederhana (MD)' },
                { id: 'text-lg', label: 'Besar (LG)' }
              ].map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => onChangeFontSize(item.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    fontSize === item.id
                      ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Page Break Control */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Pecah Halaman Tersuai (Custom Page Break)</p>
                <p className="text-[11px] text-slate-500">Pisahkan mukasurat untuk setiap bahagian/kumpulan ketika cetakan.</p>
              </div>
              <input
                type="checkbox"
                checked={forcePageBreak}
                onChange={(e) => onChangeForcePageBreak(e.target.checked)}
                className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onPrint();
            }}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-sky-500/20 hover:from-sky-700 hover:to-indigo-700 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak / Muat Turun PDF
          </button>
        </div>
      </div>
    </div>
  );
};
