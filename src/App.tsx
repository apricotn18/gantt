import { useCallback, useEffect, useRef, useState } from 'react';
import ContextMenu from './components/ContextMenu';
import GanttPanel from './components/GanttPanel';
import TaskModal from './components/TaskModal';
import WBSPanel from './components/WBSPanel';
import type { CtxMenuState, ModalState, Task } from './types';
import { calcRange, today, visibleTasks } from './utils';

const INITIAL_TASKS: Task[] = [
  { id:1,  name:'フェーズ1：要件定義',   start:'2026-05-01', end:'2026-05-31', progress:100, color:'#4f8ef7', expanded:true,  parentId:null },
  { id:2,  name:'ヒアリング・調査',       start:'2026-05-01', end:'2026-05-15', progress:100, color:'#4f8ef7', expanded:false, parentId:1 },
  { id:3,  name:'要件書作成',             start:'2026-05-16', end:'2026-05-31', progress:100, color:'#4f8ef7', expanded:false, parentId:1 },
  { id:4,  name:'フェーズ2：設計',        start:'2026-05-01', end:'2026-05-30', progress:80,  color:'#06b6d4', expanded:true,  parentId:null },
  { id:5,  name:'UI/UXデザイン',          start:'2026-05-01', end:'2026-05-20', progress:100, color:'#06b6d4', expanded:false, parentId:4 },
  { id:6,  name:'DB設計',                 start:'2026-05-10', end:'2026-05-30', progress:60,  color:'#06b6d4', expanded:false, parentId:4 },
  { id:7,  name:'フェーズ3：開発',        start:'2025-06-01', end:'2025-06-31', progress:30,  color:'#10b981', expanded:true,  parentId:null },
  { id:8,  name:'フロントエンド実装',     start:'2025-06-01', end:'2025-06-30', progress:40,  color:'#10b981', expanded:false, parentId:7 },
  { id:9,  name:'バックエンド実装',       start:'2025-06-15', end:'2025-06-15', progress:25,  color:'#10b981', expanded:false, parentId:7 },
  { id:10, name:'テスト',                 start:'2025-07-01', end:'2025-07-31', progress:0,   color:'#f59e0b', expanded:false, parentId:7 },
  { id:11, name:'フェーズ4：リリース',    start:'2025-08-01', end:'2025-08-31', progress:0,   color:'#ef4444', expanded:false, parentId:null },
];

let nextId = 20;

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [modal, setModal] = useState<ModalState>({ open: false, editingId: null, isAddingSub: false, addSubParentId: null });
  const [ctx, setCtx] = useState<CtxMenuState>({ open: false, x: 0, y: 0, taskId: null });

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
const openEditModal = (id: number) => setModal({ open: true, editingId: id, isAddingSub: false, addSubParentId: null });
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  const handleSubmit = (data: { name: string; start: string; end: string; progress: number; color: string }) => {
    if (modal.editingId !== null) {
      setTasks(ts => ts.map(t => t.id === modal.editingId ? { ...t, ...data } : t));
    } else if (modal.isAddingSub && modal.addSubParentId !== null) {
      setTasks(ts => [...ts, { id: nextId++, ...data, expanded: false, parentId: modal.addSubParentId }]);
    } else {
      setTasks(ts => [...ts, { id: nextId++, ...data, expanded: true, parentId: null }]);
    }
    closeModal();
    setTimeout(goToToday, 50);
  };

  const toggleExpand = (id: number) => setTasks(ts => ts.map(t => t.id === id ? { ...t, expanded: !t.expanded } : t));

  const openCtxMenu = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    setCtx({ open: true, x: e.clientX, y: e.clientY, taskId: id });
  };
  const closeCtxMenu = () => setCtx(c => ({ ...c, open: false }));

  const ctxEdit = () => { closeCtxMenu(); if (ctx.taskId !== null) openEditModal(ctx.taskId); };
const ctxDelete = () => {
    closeCtxMenu();
    if (ctx.taskId === null) return;
    const t = tasks.find(x => x.id === ctx.taskId);
    if (!t) return;
    const hasSubs = tasks.some(x => x.parentId === ctx.taskId);
    const msg = hasSubs ? `「${t.name}」とそのサブタスクをすべて削除しますか？` : `「${t.name}」を削除しますか？`;
    if (!confirm(msg)) return;
    setTasks(ts => ts.filter(x => x.id !== ctx.taskId && x.parentId !== ctx.taskId));
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('#ctx-menu')) closeCtxMenu();
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { closeModal(); closeCtxMenu(); }
    };
    document.addEventListener('click', handler);
    document.addEventListener('keydown', keyHandler);
    return () => { document.removeEventListener('click', handler); document.removeEventListener('keydown', keyHandler); };
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
          tasks={tasks}
          visible={visible}
          scrollRef={wbsScrollRef}
          onScrollSync={top => syncScroll('wbs', top)}
          onToggleExpand={toggleExpand}
          onEdit={openEditModal}
          onContextMenu={openCtxMenu}
          onAddTask={openAddTaskModal}
        />
        <GanttPanel
          tasks={tasks}
          visible={visible}
          scrollRef={ganttScrollRef}
          onScrollSync={top => syncScroll('gantt', top)}
          onEdit={openEditModal}
          onContextMenu={openCtxMenu}
        />
      </div>

      <TaskModal modal={modal} tasks={tasks} onClose={closeModal} onSubmit={handleSubmit} />

      <div id="ctx-menu">
        <ContextMenu ctx={ctx} tasks={tasks} onClose={closeCtxMenu} onEdit={ctxEdit} onDelete={ctxDelete} />
      </div>
    </>
  );
}
