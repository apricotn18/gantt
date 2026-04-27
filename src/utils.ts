import type { Task, VisibleTask } from './types';

export const COLORS = [
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#14b8a6',
  '#f97316',
  '#ec4899',
  '#84cc16',
];

export const today = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

export const fmt = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export function parseDate(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function getDaysArray(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export function calcRange(tasks: Task[]): { minD: Date; maxD: Date } {
  let minD = new Date(today); minD.setDate(minD.getDate() - 30);
  let maxD = new Date(today); maxD.setDate(maxD.getDate() + 90);
  tasks.forEach(t => {
    const s = parseDate(t.start), e = parseDate(t.end);
    if (s < minD) { minD = new Date(s); minD.setDate(minD.getDate() - 14); }
    if (e > maxD) { maxD = new Date(e); maxD.setDate(maxD.getDate() + 14); }
  });
  return { minD, maxD };
}

export function visibleTasks(tasks: Task[]): VisibleTask[] {
  const result: VisibleTask[] = [];
  const roots = tasks.filter(t => !t.parentId);
  roots.forEach(r => {
    result.push({ ...r, isRoot: true });
    const subs = tasks.filter(t => t.parentId === r.id);
    if (r.expanded) subs.forEach(s => result.push({ ...s, isRoot: false }));
  });
  return result;
}

export function syncParentProgress(tasks: Task[]): Task[] {
  return tasks.map(t => {
    if (t.parentId !== null) return t;
    const subs = tasks.filter(s => s.parentId === t.id);
    if (subs.length === 0) return t;
    const avg = Math.round(subs.reduce((sum, s) => sum + s.progress, 0) / subs.length);
    return { ...t, progress: avg };
  });
}

export function computeBodyHeight(vis: VisibleTask[]): number {
  let h = 0;
  vis.forEach(() => {
    h += 40;
  });
  return h || 200;
}
