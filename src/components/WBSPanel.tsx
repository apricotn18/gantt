import type { VisibleTask } from '../types';

interface Props {
  visible: VisibleTask[];
  onScrollSync: (scrollTop: number) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  onToggleExpand: (id: number) => void;
  onEdit: (id: number) => void;
  onAddSub: (id: number) => void;
}

export default function WBSPanel({
  visible, onScrollSync, scrollRef,
  onToggleExpand, onEdit, onAddSub,
}: Props) {
  return (
    <div className="wbs-panel">
      <div className="wbs-header">
        <div>タスク名</div>
        <div>開始日</div>
        <div>終了日</div>
        <div>進捗</div>
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
          visible.map(t => (
            <div key={`${t.id}-${t.isRoot}`}>
              <div
                className={`task-row${t.isRoot ? '' : ' sub-task'}`}
                onClick={() => t.isRoot && onToggleExpand(t.id)}
              >
                <div className="task-name-cell">
                  {!t.isRoot && <span className="indent" style={{ width: 20 }} />}
                  {t.isRoot ? (
                    <div className="expand-btn" title="子タスクを追加" onClick={e => { e.stopPropagation(); onAddSub(t.id); }}>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" width="10" height="10">
                        <line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="expand-placeholder" />
                  )}
                  <div className="task-color-dot" style={{ background: t.color }} />
                  <span className="task-label" onClick={e => { e.stopPropagation(); onEdit(t.id); }}>{t.name}</span>
                </div>
                <div className="task-date">{t.start.slice(5).replace('-', '/')}</div>
                <div className="task-date">{t.end.slice(5).replace('-', '/')}</div>
                <div className="progress-cell">
                  <span className="progress-pct">{t.progress}%</span>
                  <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${t.progress}%`, background: t.color }} />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
