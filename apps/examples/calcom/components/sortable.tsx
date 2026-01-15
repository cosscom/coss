"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
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

type ItemPosition = "first" | "middle" | "last" | null;

const SortableStateContext = createContext<{
  isDraggingAny: boolean;
  itemIds: UniqueIdentifier[];
  activeId: UniqueIdentifier | null;
  overId: UniqueIdentifier | null;
}>({
  activeId: null,
  isDraggingAny: false,
  itemIds: [],
  overId: null,
});

export interface SortableItemRenderProps {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
  isDragging: boolean;
  isDraggingAny: boolean;
  position: ItemPosition;
  setNodeRef: (node: HTMLElement | null) => void;
  style: CSSProperties;
}

interface SortableItemProps {
  id: UniqueIdentifier;
  children: (props: SortableItemRenderProps) => ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
  const { isDraggingAny, itemIds, activeId, overId } =
    useContext(SortableStateContext);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({ id });

  const style = {
    "--index": isDragging ? 1 : 0,
    "--translate-y": `${transform?.y ?? 0}px`,
  } as CSSProperties;

  const getPosition = (): ItemPosition => {
    if (!isDraggingAny) return null;

    let projectedIds = itemIds;
    if (activeId && overId && activeId !== overId) {
      const oldIndex = itemIds.indexOf(activeId);
      const newIndex = itemIds.indexOf(overId);
      if (oldIndex !== -1 && newIndex !== -1) {
        projectedIds = arrayMove([...itemIds], oldIndex, newIndex);
      }
    }

    const index = projectedIds.indexOf(id);
    if (index === 0) return "first";
    if (index === projectedIds.length - 1) return "last";
    return "middle";
  };

  return children({
    attributes,
    isDragging,
    isDraggingAny,
    listeners,
    position: getPosition(),
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
  const itemIds = items.map((item) => item.id);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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

  return (
    <SortableStateContext.Provider
      value={{ activeId, isDraggingAny, itemIds, overId }}
    >
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
