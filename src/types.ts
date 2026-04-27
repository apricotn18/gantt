export interface ChildTask {
  id: number;
  name: string;
  hours: Record<string, number>;
}

export interface Task {
  id: number;
  name: string;
  start: string;
  end: string;
  color: string;
  expanded: boolean;
  children: ChildTask[];
}

export interface VisibleTask {
  id: number;
  name: string;
  start: string;
  end: string;
  color: string;
  hours: Record<string, number> | null;
  isRoot: boolean;
  expanded: boolean;
}

export interface ModalState {
  open: boolean;
  editingId: number | null;
  isAddingSub: boolean;
  addSubParentId: number | null;
}
