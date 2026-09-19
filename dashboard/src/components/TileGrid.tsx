"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppTile } from "./AppTile";

interface TileData {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  status: "up" | "down";
  latency: number;
  logoUrl?: string;
  noHealthCheck?: boolean;
}

const STORAGE_KEY = "kecktech-tile-order";

function SortableTile(props: TileData & { isDraggingAny: boolean; justDropped: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: props.isDraggingAny ? "grabbing" : "grab",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <AppTile
        {...props}
        disableLink={isDragging || props.isDraggingAny || props.justDropped}
      />
    </div>
  );
}

export function TileGrid({ tiles }: { tiles: TileData[] }) {
  const [order, setOrder] = useState<string[]>(() => tiles.map((t) => t.id));
  const [isDragging, setIsDragging] = useState(false);
  const [justDropped, setJustDropped] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const currentIds = tiles.map((t) => t.id);
      if (saved) {
        const savedIds: string[] = JSON.parse(saved);
        // Keep the saved arrangement for tiles that still exist, then append
        // any newly-added tiles at the end instead of discarding the whole
        // saved order (previously: any single new tile wiped the arrangement).
        const known = savedIds.filter((id) => currentIds.includes(id));
        const newOnes = currentIds.filter((id) => !savedIds.includes(id));
        const merged = [...known, ...newOnes];
        setOrder(merged);
        if (newOnes.length > 0) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
      } else {
        setOrder(currentIds);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    setIsDragging(false);
    setJustDropped(true);
    setTimeout(() => setJustDropped(false), 200);

    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const oldIdx = prev.indexOf(String(active.id));
      const newIdx = prev.indexOf(String(over.id));
      const next = arrayMove(prev, oldIdx, newIdx);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  const sorted = order
    .map((id) => tiles.find((t) => t.id === id))
    .filter(Boolean) as TileData[];

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={() => { setIsDragging(false); setJustDropped(false); }}
    >
      <SortableContext items={sorted.map((t) => t.id)} strategy={rectSortingStrategy}>
        {sorted.map((tile) => (
          <SortableTile
            key={tile.id}
            {...tile}
            isDraggingAny={isDragging}
            justDropped={justDropped}
          />
        ))}
      </SortableContext>
      {isDragging ? (
        <div style={{ position: "fixed", bottom: 12, right: 12, zIndex: 9999, fontSize: 12, color: "#94a3b8" }}>
          Drop to reorder tiles
        </div>
      ) : null}
    </DndContext>
  );
}
