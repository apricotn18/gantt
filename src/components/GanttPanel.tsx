import type { Task, VisibleTask } from '../types';
import { calcRange, computeBodyHeight, getDaysArray, parseDate, today } from '../utils';

const DAY_W = 24;

interface Props {
  tasks: Task[];
  visible: VisibleTask[];
  scrollRef: React.RefObject<HTMLDivElement>;
  onScrollSync: (scrollTop: number) => void;
  onEdit: (id: number) => void;
}

export default function GanttPanel({ tasks, visible, scrollRef, onScrollSync, onEdit }: Props) {
  const { minD, maxD } = calcRange(tasks);
  const days = getDaysArray(minD, maxD);
  const totalW = days.length * DAY_W;
  const totalH = computeBodyHeight(visible);

  const months: { label: string; count: number }[] = [];
  days.forEach(d => {
    const label = `${d.getFullYear()}年${d.getMonth() + 1}月`;
    if (!months.length || months[months.length - 1].label !== label) {
      months.push({ label, count: 1 });
    } else {
      months[months.length - 1].count++;
    }
  });

  const todayOffset = Math.floor((today.getTime() - minD.getTime()) / 86400000) * DAY_W;

  let y = 0;
  const barH = 18;
  const bars: React.ReactNode[] = [];
  visible.forEach(t => {
    const s = parseDate(t.start), e = parseDate(t.end);
    const x1 = Math.floor((s.getTime() - minD.getTime()) / 86400000) * DAY_W;
    const x2 = Math.ceil((e.getTime() - minD.getTime()) / 86400000 + 1) * DAY_W;
    const bw = Math.max(x2 - x1, DAY_W);
    const top = y + (40 - barH) / 2;
    bars.push(
      <button
        key={t.id}
        style={{ position: 'absolute', left: x1, top, width: bw, height: barH, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
        onClick={() => onEdit(t.id)}
      >
        <div
          className="gantt-bar"
          style={{
            width: '100%', height: '100%',
            background: `${t.color}33`,
            position: 'relative', overflow: 'hidden',
          }}
          title={`${t.name}\n${t.start} → ${t.end}\n進捗: ${t.progress}%`}
        >
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: `${t.progress}%`,
            background: t.color,
          }} />
          {DAY_W >= 16 && bw > 40 && (
            <div className="gantt-bar-label">{t.name}</div>
          )}
        </div>
      </button>
    );

    y += 40;
  });

  return (
    <div className="gantt-panel">
      <div
        className="gantt-scroll-wrap"
        ref={scrollRef}
        onScroll={e => onScrollSync((e.target as HTMLDivElement).scrollTop)}
      >
        <div className="gantt-inner" style={{ width: totalW }}>
          {/* Header */}
          <div className="gantt-header">
            <div className="gantt-months">
              {months.map((m, i) => (
                <div key={i} className="gantt-month" style={{ width: m.count * DAY_W + (i === 0 ? 1 : 0) }}>{m.label}</div>
              ))}
            </div>
            <div className="gantt-days">
              {days.map((d, i) => {
                const dow = d.getDay();
                const isToday = d.getTime() === today.getTime();
                return (
                  <div
                    key={i}
                    className={`gantt-day${dow === 0 || dow === 6 ? ' weekend' : ''}${isToday ? ' today' : ''}`}
                    style={{ width: DAY_W }}
                  >
                    {DAY_W >= 18 ? d.getDate() : ''}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="gantt-body" style={{ position: 'relative', height: totalH }}>
            {/* Grid */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: totalH, pointerEvents: 'none' }}>
              {days.map((d, i) => {
                const dow = d.getDay();
                return (
                  <div key={i}>
                    {(dow === 0 || dow === 6) && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: i * DAY_W, width: DAY_W, background: 'rgba(0,0,0,.025)' }} />
                    )}
                    {i > 0 && (
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: i * DAY_W, width: 1, background: 'var(--border)' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Today line */}
            <div className="today-line" style={{ left: todayOffset, height: totalH }} />

            {/* Row lines */}
            {(() => {
              let ry = 0;
              return visible.map(t => {
                const rowTop = ry;
                ry += 40;
                return (
                  <div key={t.id} style={{ position: 'absolute', left: 0, right: 0, top: rowTop, height: 40, borderBottom: '1px solid var(--border)' }} />
                );
              });
            })()}

            {bars}
          </div>
        </div>
      </div>
    </div>
  );
}
