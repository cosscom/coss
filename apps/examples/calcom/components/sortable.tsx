"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
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

type OverPosition = "first" | "last" | null;

const SortableStateContext = createContext<{
  isDraggingAny: boolean;
  overPosition: OverPosition;
}>({
  isDraggingAny: false,
  overPosition: null,
});

export interface SortableItemRenderProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  isDraggingAny: boolean;
  overPosition: OverPosition;
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
}

interface SortableItemProps {
  id: UniqueIdentifier;
  children: (props: SortableItemRenderProps) => ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { isDraggingAny, overPosition } = useContext(SortableStateContext);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });

  const style = {
    "--index": isDragging ? 1 : 0,
    "--translate-y": `${transform?.y ?? 0}px`,
  } as CSSProperties;

  return children({
    attributes,
    isDragging,
    isDraggingAny,
    listeners,
    overPosition: isDragging ? overPosition : null,
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
  const [overPosition, setOverPosition] = useState<OverPosition>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = () => {
    setIsDraggingAny(true);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverPosition(null);
      return;
    }
    const firstId = items[0]?.id;
    const lastId = items[items.length - 1]?.id;
    if (over.id === firstId) {
      setOverPosition("first");
    } else if (over.id === lastId) {
      setOverPosition("last");
    } else {
      setOverPosition(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingAny(false);
    setOverPosition(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <SortableStateContext.Provider value={{ isDraggingAny, overPosition }}>
      <DndContext
        collisionDetection={closestCenter}
        id={id}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={verticalListSortingStrategy}
        >
          {children}
        </SortableContext>
      </DndContext>
    </SortableStateContext.Provider>
  );
}

export { arrayMove };
