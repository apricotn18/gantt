export interface Task {
  id: number;
  name: string;
  start: string;
  end: string;
  progress: number;
  color: string;
  expanded: boolean;
  parentId: number | null;
}

export interface VisibleTask extends Task {
  isRoot: boolean;
}

export interface ModalState {
  open: boolean;
  editingId: number | null;
  isAddingSub: boolean;
  addSubParentId: number | null;
}

