import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AppIcon } from './index';

export function SortableAppIcon({ id, icon, label, onClick, isEditing }: { id: string, icon: React.ReactNode, label: string, onClick?: () => void, isEditing?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      className={`col-span-1 flex justify-center ${isDragging ? 'scale-110' : ''} ${isEditing && !isDragging ? 'animate-[jiggle_0.3s_ease-in-out_infinite]' : ''}`}
    >
      <div className="relative">
        <AppIcon icon={icon} label={label} onClick={isDragging ? undefined : onClick} />
      </div>
    </div>
  );
}
