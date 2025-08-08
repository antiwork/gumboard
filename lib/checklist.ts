export type ChecklistItem = {
  id: string;
  content: string;
  checked: boolean;
  order: number;
};

export function reorderChecklistItems(
  items: ChecklistItem[],
  fromIndex: number,
  toIndex: number
): ChecklistItem[] {
  const clone = [...items];
  const [moved] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, moved);
  return clone.map((item, index) => ({ ...item, order: index }));
}

export function sortUncheckedFirst(items: ChecklistItem[]): ChecklistItem[] {
  return [
    ...items.filter((i) => !i.checked).sort((a, b) => a.order - b.order),
    ...items.filter((i) => i.checked).sort((a, b) => a.order - b.order),
  ];
}

export function areAllChecked(items: ChecklistItem[]): boolean {
  return items.length > 0 ? items.every((i) => i.checked) : false;
}


