import { useCallback, useEffect, useRef, useState } from 'react';
import GanttPanel from './components/GanttPanel';
import TaskModal from './components/TaskModal';
import WBSPanel from './components/WBSPanel';
import type { ModalState, Task } from './types';
import { calcRange, today, visibleTasks } from './utils';

const STORAGE_KEY = 'gantt_tasks';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Task[];
      const maxId = parsed.flatMap(t => [t.id, ...t.children.map(c => c.id)]).reduce((a, b) => Math.max(a, b), 0);
      nextId = maxId + 1;
      return parsed;
    }
  } catch { /* 破損データは無視 */ }
  return [];
}

let nextId = 20;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const [modal, setModal] = useState<ModalState>({ open: false, editingId: null, isAddingSub: false, addSubParentId: null });
  const [showDone, setShowDone] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const wbsScrollRef = useRef<HTMLDivElement>(null);
  const ganttScrollRef = useRef<HTMLDivElement>(null);
  const syncingRef = useRef(false);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }, [tasks]);

  const filteredTasks = tasks.filter(t => showArchived || !t.archived);
  const visible = visibleTasks(filteredTasks).filter(t => showDone || t.isRoot || t.status !== 'done');

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

  const handleReorder = (dragId: number, overId: number, pos: 'before' | 'after') => {
    if (dragId === overId) return;
    const dragIsRoot = tasks.some(t => t.id === dragId);
    const overIsRoot = tasks.some(t => t.id === overId);

    const reorder = <T,>(arr: T[], fromIdx: number, toIdx: number, insertAt: number): T[] => {
      const next = [...arr];
      const [item] = next.splice(fromIdx, 1);
      next.splice(fromIdx < toIdx ? insertAt - 1 : insertAt, 0, item);
      return next;
    };

    if (dragIsRoot && overIsRoot) {
      setTasks(ts => {
        const fi = ts.findIndex(t => t.id === dragId);
        const ti = ts.findIndex(t => t.id === overId);
        return reorder(ts, fi, ti, pos === 'before' ? ti : ti + 1);
      });
    } else if (!dragIsRoot && !overIsRoot) {
      const dragParentId = tasks.find(t => t.children.some(c => c.id === dragId))?.id;
      const overParentId = tasks.find(t => t.children.some(c => c.id === overId))?.id;
      if (!dragParentId || dragParentId !== overParentId) return;
      setTasks(ts => ts.map(t => {
        if (t.id !== dragParentId) return t;
        const fi = t.children.findIndex(c => c.id === dragId);
        const ti = t.children.findIndex(c => c.id === overId);
        return { ...t, children: reorder(t.children, fi, ti, pos === 'before' ? ti : ti + 1) };
      }));
    }
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

  const handleArchive = (id: number) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, archived: !t.archived } : t));
    closeModal();
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
        <button className="btn" onClick={() => setShowDone(v => !v)}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="12" height="12" rx="2.5"/>
            {showDone
              ? <polyline points="4.5,8.5 7,11 11.5,5.5"/>
              : <line x1="4" y1="12" x2="12" y2="4" strokeWidth="1.5"/>}
          </svg>
          {showDone ? '完了を非表示' : '完了を表示'}
        </button>
        <button className="btn" onClick={goToToday}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="12" height="11" rx="2"/>
            <line x1="5" y1="1" x2="5" y2="5"/><line x1="11" y1="1" x2="11" y2="5"/><line x1="2" y1="7" x2="14" y2="7"/>
          </svg>
          今日
        </button>
        <div style={{ marginLeft: 'auto' }} />
        <button className="btn" onClick={() => setShowArchived(v => !v)}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="5" width="12" height="9" rx="1"/>
            <path d="M1 5h14M6 5V3h4v2"/>
          </svg>
          {showArchived ? 'アーカイブを非表示' : 'アーカイブを表示'}
        </button>
      </div>

      <div className="main">
        <WBSPanel
          tasks={filteredTasks}
          visible={visible}
          scrollRef={wbsScrollRef}
          onScrollSync={top => syncScroll('wbs', top)}
          onToggleExpand={toggleExpand}
          onEdit={openEditModal}
          onAddSub={openAddSubModal}
          onToggleStatus={handleToggleStatus}
          onReorder={handleReorder}
        />
        <GanttPanel
          tasks={filteredTasks}
          visible={visible}
          scrollRef={ganttScrollRef}
          onScrollSync={top => syncScroll('gantt', top)}
          onEdit={openEditModal}
          onUpdateHours={handleUpdateHours}
        />
      </div>

      <TaskModal modal={modal} tasks={tasks} onClose={closeModal} onSubmit={handleSubmit} onDelete={handleDelete} onArchive={handleArchive} />
    </>
  );
}
