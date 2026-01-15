"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { CSSProperties, ReactNode } from "react";

export interface SortableItemRenderProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
}

interface SortableItemProps {
  id: UniqueIdentifier;
  children: (props: SortableItemRenderProps) => ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });

  const style = {
    "--index": isDragging ? 1 : 0,
    "--translate-y": `${transform?.y ?? 0}px`,
  } as CSSProperties;

  return children({ attributes, isDragging, listeners, setNodeRef, style });
}

interface SortableListProps<T extends { id: UniqueIdentifier }> {
  items: T[];
  onReorder: (items: T[]) => void;
  children: ReactNode;
}

export function SortableList<T extends { id: UniqueIdentifier }>({
  items,
  onReorder,
  children,
}: SortableListProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={verticalListSortingStrategy}
      >
        {children}
      </SortableContext>
    </DndContext>
  );
}

export { arrayMove };
