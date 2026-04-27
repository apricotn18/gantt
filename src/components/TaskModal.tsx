import { useEffect, useRef, useState } from 'react';
import type { ModalState, Task } from '../types';
import { COLORS, fmt, today } from '../utils';

interface Props {
  modal: ModalState;
  tasks: Task[];
  onClose: () => void;
  onSubmit: (data: { name: string; start: string; end: string; progress: number; color: string }) => void;
  onDelete: (id: number) => void;
}

export default function TaskModal({ modal, tasks, onClose, onSubmit, onDelete }: Props) {
  const nameRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [progress, setProgress] = useState(0);
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (!modal.open) return;
    if (modal.editingId !== null) {
      const t = tasks.find(x => x.id === modal.editingId);
      if (t) { setName(t.name); setStart(t.start); setEnd(t.end); setProgress(t.progress); setColor(t.color); }
    } else if (modal.isAddingSub && modal.addSubParentId !== null) {
      const parent = tasks.find(t => t.id === modal.addSubParentId);
      setName('');
      setStart(parent ? parent.start : fmt(today));
      setEnd(parent ? parent.end : fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)));
      setProgress(0);
      setColor(parent ? parent.color : COLORS[0]);
    } else {
      setName('');
      setStart(fmt(today));
      setEnd(fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)));
      setProgress(0);
      setColor(COLORS[0]);
    }
    setTimeout(() => nameRef.current?.focus(), 100);
  }, [modal.open, modal.editingId, modal.isAddingSub, modal.addSubParentId, tasks]);

  const handleSubmit = () => {
    if (!name.trim() || !start || !end) return;
    if (start > end) { alert('開始日は終了日より前に設定してください'); return; }
    onSubmit({ name: name.trim(), start, end, progress, color });
  };

  const title = modal.editingId ? 'タスク編集' : modal.isAddingSub ? 'サブタスク追加' : 'タスク追加';

  return (
    <div className={`modal-overlay${modal.open ? ' open' : ''}`} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          {modal.editingId !== null && (
            <button className="btn danger" onClick={() => onDelete(modal.editingId!)}>削除</button>
          )}
        </div>
        <div className="form-group">
          <label>タスク名</label>
          <input ref={nameRef} type="text" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>開始日</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} />
          </div>
          <div className="form-group">
            <label>終了日</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>進捗 <span className="range-val">{progress}%</span></label>
          <input type="range" min="0" max="100" value={progress} onChange={e => setProgress(Number(e.target.value))} />
        </div>
        <div className="form-group">
          <label>カラー</label>
          <div className="color-picker-row">
            {COLORS.map(c => (
              <button key={c} className={`color-swatch${color === c ? ' selected' : ''}`}
                style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn cancel" onClick={onClose}>キャンセル</button>
          <button className="btn primary" onClick={handleSubmit}>保存</button>
        </div>
      </div>
    </div>
  );
}
