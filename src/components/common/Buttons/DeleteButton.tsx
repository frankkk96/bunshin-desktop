import { IoTrashOutline } from "react-icons/io5";
import { cn } from "@/lib/ui/utils";
import { ask } from "@tauri-apps/plugin-dialog";

interface DeleteButtonProps {
  text: string;
  onDelete: () => void;
  className?: string;
  confirmMessage?: string;
}

export function DeleteButton({ 
  text, 
  onDelete, 
  className,
  confirmMessage = "Are you sure you want to delete this? This action cannot be undone."
}: DeleteButtonProps) {
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const confirmed = await ask(confirmMessage, {
        title: 'Confirm Delete',
        kind: 'warning'
      });
      
      if (confirmed) {
        onDelete();
      }
    } catch (error) {
      console.error('Error showing confirmation dialog:', error);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "flex items-center justify-center gap-2 p-4 cursor-pointer bg-transparent text-red-500 text-sm font-semibold rounded-lg",
        className
      )}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(255, 68, 68, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <IoTrashOutline size={16} />
      {text}
    </div>
  );
}
