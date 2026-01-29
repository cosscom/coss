"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import {
  closestCenter,
  DndContext,
  type DragCancelEvent,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
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
  activeId: UniqueIdentifier | null;
}>({
  activeId: null,
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
  renderOverlay?: (activeItem: T) => ReactNode;
}

export function SortableList<T extends { id: UniqueIdentifier }>({
  items,
  onReorder,
  children,
  renderOverlay,
}: SortableListProps<T>) {
  const id = useId();
  const [isDraggingAny, setIsDraggingAny] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
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

  const handleDragStart = (event: DragStartEvent) => {
    setIsDraggingAny(true);
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDraggingAny(false);
    setActiveId(null);
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
  };

  const activeItem =
    activeId !== null ? items.find((item) => item.id === activeId) : null;

  return (
    <SortableStateContext.Provider value={{ activeId, isDraggingAny }}>
      <DndContext
        collisionDetection={closestCenter}
        id={id}
        modifiers={[restrictToVerticalAxis]}
        onDragCancel={handleDragCancel}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
        <DragOverlay
          dropAnimation={{
            duration: 150,
            easing: "cubic-bezier(0.4, 0, 0.2, 1)",
            sideEffects({ active, dragOverlay }) {
              active.node.setAttribute("data-drag-release", "");
              dragOverlay.node.firstElementChild?.setAttribute(
                "data-drag-release",
                "",
              );
              return () => {
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => {
                    active.node.removeAttribute("data-drag-release");
                    dragOverlay.node.firstElementChild?.removeAttribute(
                      "data-drag-release",
                    );
                  }),
                );
              };
            },
          }}
        >
          {activeItem && renderOverlay ? renderOverlay(activeItem) : null}
        </DragOverlay>
      </DndContext>
    </SortableStateContext.Provider>
  );
}

export { arrayMove };
