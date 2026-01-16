"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import {
  restrictToParentElement,
  restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  type CSSProperties,
  createContext,
  type ReactNode,
  useContext,
  useId,
  useState,
} from "react";

const SortableStateContext = createContext<{
  isDraggingAny: boolean;
  projectedIds: UniqueIdentifier[];
}>({
  isDraggingAny: false,
  projectedIds: [],
});

export interface SortableItemRenderProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  isDraggingAny: boolean;
  projectedIndex: number;
  projectedLength: number;
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
}

interface SortableItemProps {
  id: UniqueIdentifier;
  children: (props: SortableItemRenderProps) => ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { isDraggingAny, projectedIds } = useContext(SortableStateContext);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });
  const projectedIndex = projectedIds.indexOf(id);

  const style = {
    "--translate-y": `${transform?.y ?? 0}px`,
  } as CSSProperties;

  return children({
    attributes,
    isDragging,
    isDraggingAny,
    listeners,
    projectedIndex,
    projectedLength: projectedIds.length,
    setNodeRef,
    style,
  });
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
  const id = useId();
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = items.map((item) => item.id);
  const activeIndex = activeId !== null ? ids.indexOf(activeId) : -1;
  const overIndex = overId !== null ? ids.indexOf(overId) : -1;
  const projectedIds =
    activeIndex >= 0 && overIndex >= 0 && activeIndex !== overIndex
      ? arrayMove(ids, activeIndex, overIndex)
      : ids;

  const handleDragStart = (event: DragStartEvent) => {
    setIsDraggingAny(true);
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingAny(false);
    setActiveId(null);
    setOverId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  const handleDragCancel = (_event: DragCancelEvent) => {
    setIsDraggingAny(false);
    setActiveId(null);
    setOverId(null);
  };

  return (
    <SortableStateContext.Provider value={{ isDraggingAny, projectedIds }}>
      <DndContext
        collisionDetection={closestCenter}
        id={id}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </DndContext>
    </SortableStateContext.Provider>
  );
}

export { arrayMove };
