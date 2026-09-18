"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

interface DeleteButtonProps {
  id: string;
  onDelete: (id: string) => Promise<{ success: boolean }>;
  itemName?: string;
}

export function DeleteButton({ id, onDelete, itemName = "item" }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete this ${itemName}?`)) {
      startTransition(async () => {
        await onDelete(id);
        router.refresh();
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className={`text-red-600 hover:text-red-800 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
