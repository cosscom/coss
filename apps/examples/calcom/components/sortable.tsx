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
  MouseSensor,
  TouchSensor,
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
  useMemo,
  useState,
} from "react";

const SortableStateContext = createContext<{
  isDraggingAny: boolean;
}>({
  isDraggingAny: false,
});

export interface SortableItemRenderProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  isDraggingAny: boolean;
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
}

interface SortableItemProps {
  id: UniqueIdentifier;
  children: (props: SortableItemRenderProps) => ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { isDraggingAny } = useContext(SortableStateContext);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });

  const style = {
    "--translate-y": `${transform?.y ?? 0}px`,
  } as CSSProperties;

  return children({
    attributes,
    isDragging,
    isDraggingAny,
    listeners,
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
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const ids = items.map((item) => item.id);
  const activeIndex = activeId !== null ? ids.indexOf(activeId) : -1;
  const overIndex = overId !== null ? ids.indexOf(overId) : -1;
  const projectedIndex =
    activeIndex >= 0 && overIndex >= 0 ? overIndex : activeIndex;

  const announcements = useMemo(
    () => ({
      onDragCancel: () =>
        "Sorting cancelled. Item returned to original position.",
      onDragEnd: () =>
        projectedIndex >= 0
          ? `Sortable item dropped at position ${projectedIndex + 1} of ${ids.length}.`
          : "Sortable item dropped.",
      onDragOver: () =>
        projectedIndex >= 0
          ? `Sortable item moved to position ${projectedIndex + 1} of ${ids.length}.`
          : undefined,
      onDragStart: ({ active }: DragStartEvent) => {
        const index = ids.indexOf(active.id);

        return index >= 0
          ? `Picked up sortable item. Current position: ${index + 1} of ${ids.length}.`
          : "Picked up sortable item.";
      },
    }),
    [projectedIndex, ids.length, ids.indexOf],
  );

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
    <SortableStateContext.Provider value={{ isDraggingAny }}>
      <DndContext
        accessibility={{ announcements }}
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
