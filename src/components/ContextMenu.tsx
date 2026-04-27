import type { CtxMenuState, Task } from '../types';

interface Props {
  ctx: CtxMenuState;
  tasks: Task[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ContextMenu({ ctx, onEdit, onDelete }: Props) {
  return (
    <div className={`ctx-menu${ctx.open ? ' open' : ''}`} style={{ left: ctx.x, top: ctx.y }}>
      <div className="ctx-item" onClick={onEdit}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 2l3 3-9 9H2v-3L11 2z"/>
        </svg>
        編集
      </div>
      <div className="ctx-sep" />
      <div className="ctx-item danger" onClick={onDelete}>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3,4 13,4"/><path d="M5 4V2h6v2"/><path d="M5 6l.5 7M8 6v7M11 6l-.5 7"/>
        </svg>
        削除
      </div>
    </div>
  );
}
