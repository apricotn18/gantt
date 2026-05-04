import { useState } from 'react';
import type { Task, VisibleTask } from '../types';

interface Props {
  tasks: Task[];
  visible: VisibleTask[];
  onScrollSync: (scrollTop: number) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  onToggleExpand: (id: number) => void;
  onEdit: (id: number) => void;
  onAddSub: (id: number) => void;
  onToggleStatus: (id: number) => void;
  onReorder: (dragId: number, overId: number, pos: 'before' | 'after') => void;
}

function childHours(task: Task) {
  const total = task.children.reduce((s, c) => s + Object.values(c.hours).reduce((a, b) => a + b, 0), 0);
  const done  = task.children.filter(c => c.status === 'done').reduce((s, c) => s + Object.values(c.hours).reduce((a, b) => a + b, 0), 0);
  return { total, done };
}

export default function WBSPanel({
  tasks, visible, onScrollSync, scrollRef,
  onToggleExpand, onEdit, onAddSub, onToggleStatus, onReorder,
}: Props) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<{ id: number; pos: 'before' | 'after' } | null>(null);

  const progressMap = new Map(tasks.map(t => {
    const { total, done } = childHours(t);
    return [t.id, total > 0 ? Math.round(done / total * 100) : null];
  }));

  const handleDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pos = e.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDragOver({ id, pos });
  };

  const handleDrop = (e: React.DragEvent, overId: number) => {
    e.preventDefault();
    if (draggingId != null && dragOver) onReorder(draggingId, overId, dragOver.pos);
    setDraggingId(null);
    setDragOver(null);
  };

  return (
    <div className="wbs-panel">
      <div className="wbs-header">
        <div>タスク名</div>
        <div>開始日</div>
        <div>終了日</div>
        <div>工数</div>
      </div>
      <div
        className="wbs-body"
        ref={scrollRef}
        onScroll={e => onScrollSync((e.target as HTMLDivElement).scrollTop)}
      >
        {visible.length === 0 ? (
          <div className="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="16" rx="2"/>
              <line x1="7" y1="9" x2="17" y2="9"/>
              <line x1="7" y1="13" x2="13" y2="13"/>
            </svg>
            タスクがありません
          </div>
        ) : (
          visible.map(t => {
            const isDone = !t.isRoot && t.status === 'done';
            const isOver = dragOver?.id === t.id;
            return (
              <div
                key={`${t.id}-${t.isRoot}`}
                draggable
                onDragStart={() => setDraggingId(t.id)}
                onDragEnd={() => { setDraggingId(null); setDragOver(null); }}
                onDragOver={e => handleDragOver(e, t.id)}
                onDrop={e => handleDrop(e, t.id)}
                style={{
                  opacity: draggingId === t.id ? 0.4 : 1,
                  boxShadow: isOver
                    ? dragOver?.pos === 'before' ? 'inset 0 2px 0 #556d94' : 'inset 0 -2px 0 #556d94'
                    : undefined,
                }}
              >
                <div
                  className={`task-row${t.isRoot ? '' : ' sub-task'}`}
                  onClick={() => t.isRoot && onToggleExpand(t.id)}
                >
                  <div className="task-name-cell">
                    {!t.isRoot && <span className="indent" style={{ width: 20 }} />}
                    {t.isRoot ? (
                      <button className="expand-btn" title="子タスクを追加" onClick={e => { e.stopPropagation(); onAddSub(t.id); }}>
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10">
                          <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
                        </svg>
                      </button>
                    ) : (
                      <div className="expand-placeholder" />
                    )}
                    {t.isRoot && <div className="task-color-dot" style={{ background: t.color }} />}
                    {!t.isRoot && (
                      <button
                        className={`status-btn${isDone ? ' done' : ''}`}
                        style={isDone ? { borderColor: t.color } : undefined}
                        onClick={e => { e.stopPropagation(); onToggleStatus(t.id); }}
                        title={isDone ? '完了' : '未完了'}
                      >
                        {isDone && (
                          <svg viewBox="0 0 10 10" fill="none" stroke={t.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="10" height="10">
                            <polyline points="1.5,5 4,7.5 8.5,2.5" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      className={`task-label${isDone ? ' done' : ''}`}
                      onClick={e => { e.stopPropagation(); onEdit(t.id); }}
                    >{t.name}</button>
                  </div>
                  <div className="task-date">{t.isRoot ? t.start.slice(5).replace('-', '/') : ''}</div>
                  <div className="task-date">{t.isRoot ? t.end.slice(5).replace('-', '/') : ''}</div>
                  <div className="progress-cell">
                    <span className="progress-pct">
                      {t.isRoot
                        ? (progressMap.get(t.id) != null ? `${progressMap.get(t.id)}%` : '—')
                        : `${Object.values(t.hours ?? {}).reduce((a, b) => a + b, 0)}h`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
