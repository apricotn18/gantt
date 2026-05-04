import { useCallback, useEffect, useRef, useState } from 'react';
import GanttPanel from './components/GanttPanel';
import TaskModal from './components/TaskModal';
import WBSPanel from './components/WBSPanel';
import type { ModalState, Task } from './types';
import { calcRange, today, visibleTasks } from './utils';

const INITIAL_TASKS: Task[] = [
  { id:1,  name:'フェーズ1：要件定義', start:'2026-05-01', end:'2026-05-31', color:'#0ea5e9', expanded:true,  children:[
    { id:2,  name:'ヒアリング・調査', status:'todo', hours:{'2026-05-01':3,'2026-05-02':4,'2026-05-07':3,'2026-05-08':2,'2026-05-11':4,'2026-05-12':3,'2026-05-13':2} },
    { id:3,  name:'要件書作成',       status:'todo', hours:{'2026-05-14':4,'2026-05-15':3,'2026-05-18':4,'2026-05-19':2,'2026-05-20':3,'2026-05-21':4,'2026-05-22':2} },
  ]},
  { id:4,  name:'フェーズ2：設計',    start:'2026-05-01', end:'2026-05-30', color:'#06b6d4', expanded:true,  children:[
    { id:5,  name:'UI/UXデザイン',    status:'todo', hours:{'2026-05-01':2,'2026-05-08':3,'2026-05-11':4,'2026-05-12':4,'2026-05-13':3,'2026-05-14':2,'2026-05-15':3} },
    { id:6,  name:'DB設計',           status:'todo', hours:{'2026-05-18':3,'2026-05-19':4,'2026-05-20':3,'2026-05-21':2,'2026-05-25':4,'2026-05-26':3,'2026-05-27':2} },
  ]},
  { id:7,  name:'フェーズ3：開発',    start:'2026-06-01', end:'2026-06-30', color:'#10b981', expanded:true,  children:[
    { id:8,  name:'フロントエンド実装', status:'todo', hours:{'2026-06-01':4,'2026-06-02':3,'2026-06-03':4,'2026-06-08':3,'2026-06-09':4,'2026-06-10':2,'2026-06-11':3} },
    { id:9,  name:'バックエンド実装',   status:'todo', hours:{'2026-06-15':4,'2026-06-16':3,'2026-06-17':4,'2026-06-18':3,'2026-06-22':4,'2026-06-23':2,'2026-06-24':3} },
    { id:10, name:'テスト',             status:'todo', hours:{'2026-06-08':2,'2026-06-09':2,'2026-06-15':3,'2026-06-16':2,'2026-06-22':3,'2026-06-23':3,'2026-06-24':2} },
  ]},
  { id:11, name:'フェーズ4：リリース', start:'2026-08-01', end:'2026-08-31', color:'#ef4444', expanded:false, children:[] },
];

let nextId = 20;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [modal, setModal] = useState<ModalState>({ open: false, editingId: null, isAddingSub: false, addSubParentId: null });

  const wbsScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  const visible = visibleTasks(tasks);

  const syncScroll = useCallback((source: 'wbs' | 'gantt', scrollTop: number) => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    if (source === 'wbs' && ganttScrollRef.current) ganttScrollRef.current.scrollTop = scrollTop;
    if (source === 'gantt' && wbsScrollRef.current) wbsScrollRef.current.scrollTop = scrollTop;
    syncingRef.current = false;
  }, []);

  const goToToday = useCallback(() => {
    const { minD } = calcRange(tasks);
    const offset = Math.floor((today.getTime() - minD.getTime()) / 86400000) * 24 - 32;
    if (ganttScrollRef.current) ganttScrollRef.current.scrollLeft = Math.max(0, offset);
  }, [tasks]);

  useEffect(() => { setTimeout(goToToday, 100); }, [goToToday]);

  const openAddTaskModal = () => setModal({ open: true, editingId: null, isAddingSub: false, addSubParentId: null });
  const openAddSubModal = (id: number) => setModal({ open: true, editingId: null, isAddingSub: true, addSubParentId: id });
  const openEditModal = (id: number) => setModal({ open: true, editingId: id, isAddingSub: false, addSubParentId: null });
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  const handleSubmit = (data: { name: string; start: string; end: string; color: string }) => {
    if (modal.editingId !== null) {
      const isRoot = tasks.some(t => t.id === modal.editingId);
      if (isRoot) {
        setTasks(ts => ts.map(t => t.id === modal.editingId ? { ...t, ...data } : t));
      } else {
        setTasks(ts => ts.map(t => ({
          ...t,
          children: t.children.map(c => c.id === modal.editingId ? { ...c, name: data.name } : c),
        })));
      }
    } else if (modal.isAddingSub && modal.addSubParentId !== null) {
      const pid = modal.addSubParentId;
      setTasks(ts => ts.map(t => t.id === pid
        ? { ...t, expanded: true, children: [...t.children, { id: nextId++, name: data.name, hours: {}, status: 'todo' as const }] }
        : t
      ));
    } else {
      setTasks(ts => [...ts, { id: nextId++, name: data.name, start: data.start, end: data.end, color: data.color, expanded: true, children: [] }]);
    }
    closeModal();
    setTimeout(goToToday, 50);
  };

  const toggleExpand = (id: number) => setTasks(ts => ts.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t));

  const handleToggleStatus = (id: number) => {
    setTasks(ts => {
      const pi = ts.findIndex(t => t.children.some(c => c.id === id));
      if (pi === -1) return ts;
      return ts.map((t, i) => i !== pi ? t : {
        ...t,
        children: t.children.map(c => c.id === id ? { ...c, status: c.status === 'done' ? 'todo' : 'done' } : c),
      });
    });
  };

  const handleUpdateHours = (taskId: number, date: string, value: number) => {
    setTasks(ts => ts.map(t => ({
      ...t,
      children: t.children.map(c => c.id !== taskId ? c : {
        ...c,
        hours: value > 0
          ? { ...c.hours, [date]: value }
          : Object.fromEntries(Object.entries(c.hours).filter(([k]) => k !== date)),
      }),
    })));
  };

  const handleDelete = (id: number) => {
    const rootTask = tasks.find(x => x.id === id);
    if (rootTask) {
      const msg = rootTask.children.length > 0
        ? `「${rootTask.name}」とそのサブタスクをすべて削除しますか？`
        : `「${rootTask.name}」を削除しますか？`;
      if (!confirm(msg)) return;
      setTasks(ts => ts.filter(t => t.id !== id));
    } else {
      const parent = tasks.find(t => t.children.some(c => c.id === id));
      if (!parent) return;
      const child = parent.children.find(c => c.id === id)!;
      if (!confirm(`「${child.name}」を削除しますか？`)) return;
      setTasks(ts => ts.map(t => t.id === parent.id
        ? { ...t, children: t.children.filter(c => c.id !== id) }
        : t
      ));
    }
    closeModal();
  };

  useEffect(() => {
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') closeModal(); };
    document.addEventListener('keydown', keyHandler);
    return () => document.removeEventListener('keydown', keyHandler);
  }, []);

  return (
    <>
      <div className="topbar">
        <h1>GANTT</h1>
        <button className="btn primary" onClick={openAddTaskModal}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
          </svg>
          タスク追加
        </button>
        <button className="btn" onClick={goToToday}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="12" height="11" rx="2"/>
            <line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/><line x1="2" y1="7" x2="14" y2="7"/>
          </svg>
          今日
        </button>
      </div>

      <div className="main">
        <WBSPanel
          visible={visible}
          scrollRef={wbsScrollRef}
          onScrollSync={top => syncScroll('wbs', top)}
          onToggleExpand={toggleExpand}
          onEdit={openEditModal}
          onAddSub={openAddSubModal}
          onToggleStatus={handleToggleStatus}
        />
        <GanttPanel
          tasks={tasks}
          visible={visible}
          scrollRef={ganttScrollRef}
          onScrollSync={top => syncScroll('gantt', top)}
          onEdit={openEditModal}
          onUpdateHours={handleUpdateHours}
        />
      </div>

      <TaskModal modal={modal} tasks={tasks} onClose={closeModal} onSubmit={handleSubmit} onDelete={handleDelete} />
    </>
  );
}
