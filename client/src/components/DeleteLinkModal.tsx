import { AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeleteLinkModalProps {
  isOpen: boolean;
  linkTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteLinkModal({
  isOpen,
  linkTitle,
  onConfirm,
  onCancel,
  isLoading = false,
}: DeleteLinkModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg border border-border p-6 w-full max-w-md shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Delete Link</h2>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Are you sure you want to delete <strong>{linkTitle}</strong>? This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
