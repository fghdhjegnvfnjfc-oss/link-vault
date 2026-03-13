import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EditFolderModalProps {
  isOpen: boolean;
  folder?: { id: string; name: string; icon: string };
  onSave: (name: string, icon: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const EMOJI_OPTIONS = ["⚡", "🛠", "🎨", "📚", "🔧", "📰", "🌟", "💼", "🚀", "📊"];

export function EditFolderModal({
  isOpen,
  folder,
  onSave,
  onCancel,
  isLoading = false,
}: EditFolderModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("⚡");

  useEffect(() => {
    if (folder) {
      setName(folder.name);
      setIcon(folder.icon);
    }
  }, [folder, isOpen]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name, icon);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg border border-border p-6 w-full max-w-md shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Folder</h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Folder Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter folder name"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Folder Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`p-3 rounded-lg text-2xl transition-all ${
                    icon === emoji
                      ? "bg-primary text-primary-foreground ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="flex-1"
          >
            {isLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
