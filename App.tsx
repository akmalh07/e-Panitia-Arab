
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Student, Exam, Result, FocusPoint, ActivityLog, FocusAction, Asset, AssetLog } from './types';
import { db, DB_KEYS } from './services/dbService';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import Assessment from './components/Assessment';
import Analytics from './components/Analytics';
import FocusMarks from './components/FocusMarks';
import StaffManagement from './components/StaffManagement';
import AssetManagement from './components/AssetManagement';
import Intervention from './src/components/Intervention';
import { AnnualReportManager } from './src/components/AnnualReportManager';
import PBDTransit from './components/PBDTransit';
import Settings from './components/Settings';
import { AlertCircle, CheckCircle2, CloudSync, History, Loader2 } from 'lucide-react';
import { CLASSES, YEARS } from './constants';
import { GradeConfig, InterventionAction, PBDSkill, PBDRecord } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [focusPoints, setFocusPoints] = useState<FocusPoint[]>([]);
  const [focusActions, setFocusActions] = useState<FocusAction[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetLogs, setAssetLogs] = useState<AssetLog[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [gradeConfigs, setGradeConfigs] = useState<GradeConfig[]>([]);
  const [interventionActions, setInterventionActions] = useState<InterventionAction[]>([]);
  const [pbdSkills, setPbdSkills] = useState<PBDSkill[]>([]);
  const [pbdRecords, setPbdRecords] = useState<PBDRecord[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [notification, setNotification] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const resultHistory = useRef<Result[][]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    await db.set(DB_KEYS.SESSION, null);
    setUser(null);
  }, []);

  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (user) {
      timeoutRef.current = setTimeout(() => {
        handleLogout();
        notify('Sesi tamat kerana tiada aktiviti selama 5 minit. Anda telah log keluar secara automatik.', 'error');
      }, 300000); // 5 minit
    }
  }, [user, handleLogout]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    if (user) {
      resetTimer();
      events.forEach(event => window.addEventListener(event, resetTimer));
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [user, resetTimer]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [s, e, r, f, fa, as, al, l, u, c, y, sess, gc, ia, ps, pr] = await Promise.all([
        db.get<Student[]>(DB_KEYS.STUDENTS, []),
        db.get<Exam[]>(DB_KEYS.EXAMS, []),
        db.get<Result[]>(DB_KEYS.RESULTS, []),
        db.get<FocusPoint[]>(DB_KEYS.FOCUS, []),
        db.get<FocusAction[]>(DB_KEYS.FOCUS_ACTIONS, []),
        db.get<Asset[]>(DB_KEYS.ASSETS, []),
        db.get<AssetLog[]>(DB_KEYS.ASSET_LOGS, []),
        db.get<ActivityLog[]>(DB_KEYS.LOGS, []),
        db.get<User[]>(DB_KEYS.USERS, []),
        db.get<string[]>(DB_KEYS.CLASSES, CLASSES),
        db.get<number[]>(DB_KEYS.YEARS, YEARS),
        db.get<User | null>(DB_KEYS.SESSION, null),
        db.get<GradeConfig[]>(DB_KEYS.GRADES, []),
        db.get<InterventionAction[]>(DB_KEYS.INTERVENTION, []),
        db.get<PBDSkill[]>(DB_KEYS.PBD_SKILLS, []),
        db.get<PBDRecord[]>(DB_KEYS.PBD_RECORDS, [])
      ]);

      setStudents(s);
      setExams(e);
      setResults(r);
      setFocusPoints(f);
      setFocusActions(fa);
      setAssets(as);
      setAssetLogs(al);
      setLogs(l);
      setUsers(u);
      
      // Ensure unique and sorted classes
      const uniqueClasses = Array.from(new Set(c && c.length > 0 ? c : CLASSES)).sort((a, b) => a.localeCompare(b));
      setClasses(uniqueClasses);
      
      setYears(y && y.length > 0 ? y : YEARS);
      setGradeConfigs(gc);
      setInterventionActions(ia);
      setPbdSkills(ps);
      setPbdRecords(pr);
      if (sess) setUser(sess);
    } catch (err) {
      notify('Ralat memuatkan data', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('storage_sync', loadData);
    return () => window.removeEventListener('storage_sync', loadData);
  }, [loadData]);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const syncToCloud = async (fn: () => Promise<void>) => {
    setSyncing(true);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      notify('Gagal menyegerak ke Cloud', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateAssets = async (newAssets: Asset[]) => {
    setAssets(newAssets);
    await syncToCloud(() => db.set(DB_KEYS.ASSETS, newAssets));
  };

  const handleUpdateAssetLogs = async (newLogs: AssetLog[]) => {
    setAssetLogs(newLogs);
    await syncToCloud(() => db.set(DB_KEYS.ASSET_LOGS, newLogs));
  };

  const handleUpdateAssetsAndLogs = async (newAssets: Asset[], newLogs: AssetLog[]) => {
    setAssets(newAssets);
    setAssetLogs(newLogs);
    await syncToCloud(async () => {
      await db.set(DB_KEYS.ASSETS, newAssets);
      await db.set(DB_KEYS.ASSET_LOGS, newLogs);
    });
  };

  const handleDeleteAsset = async (id: string) => {
    const target = assets.find(a => a.id === id);
    const newList = assets.filter(a => a.id !== id);
    setAssets(newList);
    
    const deleteLog: AssetLog = {
      id: Math.random().toString(36).substr(2, 9),
      assetId: id,
      assetName: target?.name || id,
      type: 'KELUAR',
      quantity: target?.totalQuantity || 0,
      person: user!.name,
      date: new Date().toISOString(),
      status: 'PAKAI_TERUS',
      notes: `Aset dipadam dari inventori: ${target?.name || id}`
    };
    
    const newLogs = [deleteLog, ...assetLogs];
    setAssetLogs(newLogs);
    
    await syncToCloud(async () => {
      await db.delete(DB_KEYS.ASSETS, id, newList);
      await db.set(DB_KEYS.ASSET_LOGS, newLogs);
    });
    
    notify('Aset berjaya dipadam', 'success');
  };

  const handleDeleteStudent = async (id: string) => {
    const target = students.find(s => s.id === id);
    const newList = students.filter(s => s.id !== id);
    setStudents(newList);
    await syncToCloud(() => db.delete(DB_KEYS.STUDENTS, id, newList));
    await db.log(user!.id, user!.name, `Memadam murid: ${target?.name || id}`);
    notify('Murid dipadam', 'success');
  };

  const handleBulkDeleteStudents = async (ids: string[]) => {
    const newList = students.filter(s => !ids.includes(s.id));
    setStudents(newList);
    await syncToCloud(() => db.deleteBulk(DB_KEYS.STUDENTS, ids, newList));
    await db.log(user!.id, user!.name, `Memadam ${ids.length} murid secara pukal`);
    notify('Pemadaman pukal berjaya', 'success');
  };

  const handleUpdateResult = async (data: Omit<Result, 'id'>) => {
    resultHistory.current.push([...results]);
    const existingIndex = results.findIndex(r => r.studentId === data.studentId && r.examId === data.examId);
    let newList;
    if (existingIndex > -1) {
      newList = [...results];
      newList[existingIndex] = { ...newList[existingIndex], ...data };
    } else {
      newList = [...results, { ...data, id: Math.random().toString(36).substr(2, 9) }];
    }
    setResults(newList);
    await syncToCloud(() => db.set(DB_KEYS.RESULTS, newList));
  };

  const handleUpdateExam = async (updatedExam: Exam) => {
    const newList = exams.map(e => e.id === updatedExam.id ? updatedExam : e);
    setExams(newList);
    await syncToCloud(() => db.set(DB_KEYS.EXAMS, newList));
    notify('Struktur ujian berjaya dikemas kini');
  };

  const handleUpdatePBDRecord = async (data: Omit<PBDRecord, 'id'>) => {
    const existingIndex = pbdRecords.findIndex(r => r.studentId === data.studentId && r.skillId === data.skillId);
    let newList;
    if (existingIndex > -1) {
      newList = [...pbdRecords];
      newList[existingIndex] = { ...newList[existingIndex], ...data };
    } else {
      newList = [...pbdRecords, { ...data, id: Math.random().toString(36).substr(2, 9) }];
    }
    setPbdRecords(newList);
    await syncToCloud(() => db.set(DB_KEYS.PBD_RECORDS, newList));
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-sky-600">
        <Loader2 className="animate-spin mb-4" size={48} />
        <p className="font-bold">Memuatkan Sistem...</p>
      </div>
    );
  }

  if (!user) return <Auth onLogin={(u) => { setUser(u); db.set(DB_KEYS.SESSION, u); }} />;

  return (
    <Layout user={user} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}>
      <div className="fixed bottom-4 right-4 z-[60] no-print">
        <div className="bg-white/90 backdrop-blur border px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 text-[10px] font-bold uppercase">
          {syncing ? (
            <><Loader2 size={12} className="animate-spin text-sky-600" /> <span className="text-sky-600">Syncing...</span></>
          ) : (
            <><CloudSync size={12} className="text-emerald-500" /> <span className="text-emerald-500">Cloud Online</span></>
          )}
        </div>
      </div>

      {notification && (
        <div className={`fixed top-4 right-4 z-[100] p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 no-print ${
          notification.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold">{notification.msg}</span>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <Dashboard 
          students={students} 
          exams={exams} 
          results={results} 
          focusPoints={focusPoints} 
          pbdRecords={pbdRecords}
          user={user} 
        />
      )}
      
      {activeTab === 'students' && (
        <StudentList 
          students={students} classes={classes} years={years}
          onAdd={async (data) => {
            const newStudent = { ...data, id: Math.random().toString(36).substr(2, 9) };
            const newList = [...students, newStudent];
            setStudents(newList);
            await syncToCloud(() => db.set(DB_KEYS.STUDENTS, newList));
            notify('Murid ditambah');
          }} 
          onBulkAdd={async (dataArray) => {
            const newStudents = dataArray.map(data => ({ ...data, id: Math.random().toString(36).substr(2, 9) }));
            const newList = [...students, ...newStudents];
            setStudents(newList);
            await syncToCloud(() => db.set(DB_KEYS.STUDENTS, newList));
            notify(`${newStudents.length} murid ditambah`);
          }}
          onUpdate={async (s) => {
            const newList = students.map(st => st.id === s.id ? s : st);
            setStudents(newList);
            await syncToCloud(() => db.set(DB_KEYS.STUDENTS, newList));
          }} 
          onDelete={handleDeleteStudent} 
          onBulkDelete={handleBulkDeleteStudents} 
          onUpdateClasses={(c) => { setClasses(c); syncToCloud(() => db.set(DB_KEYS.CLASSES, c)); }}
          isAdmin={user.role === 'ADMIN'}
          user={user}
        />
      )}

      {activeTab === 'assessments' && (
        <Assessment 
          students={students} exams={exams} results={results} 
          gradeConfigs={gradeConfigs}
          onAddExam={(e) => {
            const newList = [...exams, {...e, id: Math.random().toString(36).substr(2, 9)}];
            setExams(newList);
            syncToCloud(() => db.set(DB_KEYS.EXAMS, newList));
          }} 
          onUpdateExam={handleUpdateExam}
          onDeleteExam={(id) => {
            const newList = exams.filter(ex => ex.id !== id);
            setExams(newList);
            syncToCloud(() => db.delete(DB_KEYS.EXAMS, id, newList));
          }}
          onUpdateResult={handleUpdateResult} 
          onUndo={() => {
            const last = resultHistory.current.pop();
            if (last) { 
              setResults(last); 
              syncToCloud(() => db.set(DB_KEYS.RESULTS, last)); 
              notify('Undo Berjaya'); 
            }
          }} 
          currentUser={user}
          onUpdateGrades={async (gc) => {
            setGradeConfigs(gc);
            await syncToCloud(() => db.set(DB_KEYS.GRADES, gc));
          }}
        />
      )}

      {activeTab === 'analytics' && (
        <Analytics 
          students={students} exams={exams} results={results} focusPoints={focusPoints} 
          gradeConfigs={gradeConfigs}
          onUpdateGrades={async (gc) => {
            setGradeConfigs(gc);
            await syncToCloud(() => db.set(DB_KEYS.GRADES, gc));
          }}
          user={user}
          pbdSkills={pbdSkills}
          pbdRecords={pbdRecords}
        />
      )}

      {activeTab === 'intervention' && (
        <Intervention 
          students={students} 
          exams={exams} 
          results={results} 
          actions={interventionActions}
          onUpdateActions={async (actions) => {
            setInterventionActions(actions);
            await syncToCloud(() => db.set(DB_KEYS.INTERVENTION, actions));
          }}
          currentUser={user!}
        />
      )}

      {activeTab === 'pbd_transit' && (
        <PBDTransit 
          students={students}
          skills={pbdSkills}
          records={pbdRecords}
          classes={classes}
          years={years}
          onAddSkill={async (s) => {
            const newSkill = { ...s, id: Math.random().toString(36).substr(2, 9) };
            const newList = [...pbdSkills, newSkill];
            setPbdSkills(newList);
            await syncToCloud(() => db.set(DB_KEYS.PBD_SKILLS, newList));
            notify('Standard Pembelajaran ditambah');
          }}
          onUpdateSkill={async (s) => {
            const newList = pbdSkills.map(sk => sk.id === s.id ? s : sk);
            setPbdSkills(newList);
            await syncToCloud(() => db.set(DB_KEYS.PBD_SKILLS, newList));
          }}
          onDeleteSkill={async (id) => {
            const newList = pbdSkills.filter(sk => sk.id !== id);
            setPbdSkills(newList);
            await syncToCloud(() => db.delete(DB_KEYS.PBD_SKILLS, id, newList));
          }}
          onUpdateRecord={handleUpdatePBDRecord}
          user={user}
        />
      )}

      {activeTab === 'focus' && (
        <FocusMarks 
          students={students} 
          focusPoints={focusPoints} 
          focusActions={focusActions}
          classes={classes}
          onAddPoint={async (sid, cat, pts) => {
            const newPt = { 
              id: Math.random().toString(36).substr(2, 9), 
              studentId: sid, 
              category: cat, 
              points: pts, 
              date: new Date().toISOString(), 
              teacherId: user.id 
            };
            const newList = [...focusPoints, newPt];
            setFocusPoints(newList);
            await syncToCloud(() => db.addItem(DB_KEYS.FOCUS, newPt));
          }} 
          onUpdateActions={async (actions) => {
            setFocusActions(actions);
            await syncToCloud(() => db.set(DB_KEYS.FOCUS_ACTIONS, actions));
          }}
        />
      )}

      {activeTab === 'assets' && (
        <AssetManagement 
          assets={assets}
          assetLogs={assetLogs}
          onUpdateAssets={handleUpdateAssets}
          onDeleteAsset={handleDeleteAsset}
          onUpdateLogs={handleUpdateAssetLogs}
          onUpdateAssetsAndLogs={handleUpdateAssetsAndLogs}
          user={user}
        />
      )}

      {activeTab === 'annual_report' && (
        <AnnualReportManager 
          students={students}
          exams={exams}
          results={results}
          assets={assets}
          interventions={interventionActions}
          pbdRecords={pbdRecords}
        />
      )}

      {activeTab === 'staff' && user.role === 'ADMIN' && (
        <StaffManagement 
          users={users} 
          onAdd={async (data) => {
            const newUser = { ...data, id: Math.random().toString(36).substr(2, 9) };
            const newList = [...users, newUser];
            setUsers(newList);
            await syncToCloud(() => db.set(DB_KEYS.USERS, newList));
          }} 
          onUpdate={async (updated) => {
            const newList = users.map(u => u.id === updated.id ? updated : u);
            setUsers(newList);
            await syncToCloud(() => db.set(DB_KEYS.USERS, newList));
          }} 
          onDelete={async (id) => {
            if (id === user?.id) return notify('Anda tidak boleh padam diri sendiri!', 'error');
            const newList = users.filter(u => u.id !== id);
            setUsers(newList);
            await syncToCloud(() => db.delete(DB_KEYS.USERS, id, newList));
          }} 
        />
      )}

      {activeTab === 'logs' && user.role === 'ADMIN' && (
        <div className="bg-white rounded-3xl border shadow-sm p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-3"><History className="text-sky-600"/> Log Aktiviti Sistem</h2>
            <button onClick={() => { setLogs([]); db.set(DB_KEYS.LOGS, []); }} className="text-red-500 text-xs font-bold hover:underline">Kosongkan Log</button>
          </div>
          <div className="divide-y max-h-[600px] overflow-y-auto pr-4">
            {logs.length > 0 ? logs.map(log => (
              <div key={log.id} className="py-4 flex justify-between items-start gap-4">
                <div>
                  <p className="text-sm font-bold text-slate-900">{log.userName}</p>
                  <p className="text-sm text-slate-600">{log.action}</p>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            )) : <p className="py-10 text-center text-slate-400 italic">Tiada log aktiviti direkodkan.</p>}
          </div>
        </div>
      )}

      {activeTab === 'settings' && <Settings user={user} onUpdate={(u) => {
        const newList = users.map(us => us.id === u.id ? u : us);
        setUsers(newList);
        db.set(DB_KEYS.USERS, newList);
        setUser(u);
        db.set(DB_KEYS.SESSION, u);
      }} />}
    </Layout>
  );
};

export default App;
