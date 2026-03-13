import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordGate } from "@/components/PasswordGate";
import { ExternalLink, Lock, Plus, Trash2, Edit2, Save, X, LogOut } from "lucide-react";
import { io, Socket } from "socket.io-client";

interface Folder {
  id: number;
  name: string;
  icon: string;
  color: string;
  displayOrder: number;
}

interface Link {
  id: number;
  folderId: number;
  title: string;
  url: string;
  description?: string;
  isPasswordProtected: boolean;
  password?: string;
  displayOrder: number;
  clickCount: number;
}

const VAULT_PASSWORD = "vault2024";
const ADMIN_PASSWORD = "admin2024";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Password protection states
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [showVaultPasswordGate, setShowVaultPasswordGate] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPasswordGate, setShowAdminPasswordGate] = useState(false);
  const [vaultPasswordError, setVaultPasswordError] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");

  // Fetch vault data
  const { data: vaultData, isLoading: isLoadingVault } = trpc.vault.getAll.useQuery(
    undefined,
    { enabled: vaultUnlocked }
  );

  // Initialize vault data
  useEffect(() => {
    if (vaultData && vaultUnlocked) {
      setFolders(vaultData.folders as Folder[]);
      setLinks(vaultData.links as Link[]);
      if (vaultData.folders.length > 0) {
        setSelectedFolder(vaultData.folders[0].id);
      }
      setLoading(false);
    }
  }, [vaultData, vaultUnlocked]);

  // Setup WebSocket connection for real-time updates
  useEffect(() => {
    if (!isAuthenticated || !user || !vaultUnlocked) return;

    const newSocket = io(window.location.origin, {
      auth: {
        userId: user.id,
      },
    });

    // Listen for vault data changes
    newSocket.on("vault:link-added", (data: { link: Link }) => {
      setLinks((prev) => [...prev, data.link]);
    });

    newSocket.on("vault:link-updated", (data: { linkId: number; updates: Partial<Link> }) => {
      setLinks((prev) =>
        prev.map((link) =>
          link.id === data.linkId ? { ...link, ...data.updates } : link
        )
      );
    });

    newSocket.on("vault:link-deleted", (data: { linkId: number }) => {
      setLinks((prev) => prev.filter((link) => link.id !== data.linkId));
    });

    newSocket.on("vault:folder-added", (data: { folder: Folder }) => {
      setFolders((prev) => [...prev, data.folder]);
    });

    newSocket.on("vault:folder-updated", (data: { folderId: number; updates: Partial<Folder> }) => {
      setFolders((prev) =>
        prev.map((folder) =>
          folder.id === data.folderId ? { ...folder, ...data.updates } : folder
        )
      );
    });

    newSocket.on("vault:folder-deleted", (data: { folderId: number }) => {
      setFolders((prev) => prev.filter((folder) => folder.id !== data.folderId));
      if (selectedFolder === data.folderId) {
        setSelectedFolder(null);
      }
    });

    newSocket.on("vault:reorder-links", (data: { linkIds: number[] }) => {
      const linkMap = new Map(links.map((link) => [link.id, link]));
      const reorderedLinks = data.linkIds
        .map((id) => linkMap.get(id))
        .filter((link) => link !== undefined) as Link[];
      setLinks(reorderedLinks);
    });

    newSocket.on("vault:reorder-folders", (data: { folderIds: number[] }) => {
      const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
      const reorderedFolders = data.folderIds
        .map((id) => folderMap.get(id))
        .filter((folder) => folder !== undefined) as Folder[];
      setFolders(reorderedFolders);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user, vaultUnlocked]);

  // Mutations
  const addLinkMutation = trpc.vault.addLink.useMutation({
    onSuccess: (data) => {
      socket?.emit("vault:link-added", { link: data });
    },
  });

  const updateLinkMutation = trpc.vault.updateLink.useMutation({
    onSuccess: (data, variables) => {
      socket?.emit("vault:link-updated", {
        linkId: variables.linkId,
        updates: variables,
      });
    },
  });

  const deleteLinkMutation = trpc.vault.deleteLink.useMutation({
    onSuccess: (data, variables) => {
      socket?.emit("vault:link-deleted", { linkId: variables.linkId });
    },
  });

  const addFolderMutation = trpc.vault.addFolder.useMutation({
    onSuccess: (data) => {
      socket?.emit("vault:folder-added", { folder: data });
    },
  });

  const updateFolderMutation = trpc.vault.updateFolder.useMutation({
    onSuccess: (data, variables) => {
      socket?.emit("vault:folder-updated", {
        folderId: variables.folderId,
        updates: variables,
      });
    },
  });

  const deleteFolderMutation = trpc.vault.deleteFolder.useMutation({
    onSuccess: (data, variables) => {
      socket?.emit("vault:folder-deleted", { folderId: variables.folderId });
    },
  });

  const recordClickMutation = trpc.vault.recordClick.useMutation();

  // Handle vault password submission
  const handleVaultPasswordSubmit = (password: string) => {
    if (password === VAULT_PASSWORD) {
      setVaultUnlocked(true);
      setShowVaultPasswordGate(false);
      setVaultPasswordError("");
    } else {
      setVaultPasswordError("Incorrect password. Please try again.");
    }
  };

  // Handle admin password submission
  const handleAdminPasswordSubmit = (password: string) => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setEditMode(true);
      setShowAdminPasswordGate(false);
      setAdminPasswordError("");
    } else {
      setAdminPasswordError("Incorrect admin password. Please try again.");
    }
  };

  // Handle edit mode toggle
  const handleEditModeToggle = () => {
    if (editMode) {
      // Disable edit mode
      setEditMode(false);
      setIsAdmin(false);
    } else {
      // Show admin password gate
      setShowAdminPasswordGate(true);
    }
  };

  // Handle link click
  const handleLinkClick = useCallback(
    (link: Link) => {
      recordClickMutation.mutate({ linkId: link.id });
      window.open(link.url, "_blank");
    },
    [recordClickMutation]
  );

  // Handle add link
  const handleAddLink = useCallback(
    (title: string, url: string, description: string) => {
      if (selectedFolder === null || !isAdmin) return;
      addLinkMutation.mutate({
        folderId: selectedFolder,
        title,
        url,
        description,
      });
    },
    [selectedFolder, addLinkMutation, isAdmin]
  );

  // Handle add folder
  const handleAddFolder = useCallback(
    (name: string, icon: string, color: string) => {
      if (!isAdmin) return;
      addFolderMutation.mutate({ name, icon, color });
    },
    [addFolderMutation, isAdmin]
  );

  // If vault is not unlocked, show password gate
  if (!vaultUnlocked) {
    return (
      <div className="min-h-screen bg-background">
        <PasswordGate
          isOpen={showVaultPasswordGate}
          title="Link Vault"
          description="Enter the vault password to access the shared link directory."
          onSuccess={handleVaultPasswordSubmit}
        />
      </div>
    );
  }

  if (loading || isLoadingVault) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading vault...</p>
        </div>
      </div>
    );
  }

  const selectedFolderData = folders.find((f) => f.id === selectedFolder);
  const folderLinks = links.filter((l) => l.folderId === selectedFolder);

  return (
    <div className="min-h-screen bg-background">
      <PasswordGate
        isOpen={showAdminPasswordGate}
        title="Admin Access"
        description="Enter the admin password to enable editing."
        onSuccess={handleAdminPasswordSubmit}
        onClose={() => setShowAdminPasswordGate(false)}
      />

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-64 bg-card border-r border-border p-4 overflow-y-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">Link Vault</h1>
            <p className="text-sm text-muted-foreground">Shared link directory</p>
            {isAdmin && (
              <p className="text-xs text-primary font-semibold mt-2">🔑 Admin Mode</p>
            )}
          </div>

          {/* Folders List */}
          <div className="space-y-2">
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                  selectedFolder === folder.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-foreground"
                }`}
              >
                <span className="mr-2">{folder.icon}</span>
                {folder.name}
              </button>
            ))}
          </div>

          {/* Add Folder Button */}
          {editMode && isAdmin && (
            <Button
              onClick={() => handleAddFolder("New Folder", "📁", "oklch(0.65 0.18 200)")}
              className="w-full mt-4"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Folder
            </Button>
          )}

          {/* Edit Mode Toggle */}
          <div className="mt-6 pt-6 border-t border-border space-y-2">
            <Button
              onClick={handleEditModeToggle}
              variant={editMode ? "default" : "outline"}
              className="w-full"
              size="sm"
            >
              {editMode ? (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Done Editing
                </>
              ) : (
                <>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Mode
                </>
              )}
            </Button>

            <Button
              onClick={() => {
                setVaultUnlocked(false);
                setShowVaultPasswordGate(true);
                setEditMode(false);
                setIsAdmin(false);
              }}
              variant="outline"
              className="w-full"
              size="sm"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit Vault
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {selectedFolderData ? (
            <div>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-foreground">
                  {selectedFolderData.icon} {selectedFolderData.name}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {folderLinks.length} link{folderLinks.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Links Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {folderLinks.map((link) => (
                  <Card
                    key={link.id}
                    className="p-4 hover:shadow-lg transition-shadow cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground flex-1 pr-2">{link.title}</h3>
                      {editMode && isAdmin && (
                        <button
                          onClick={() => deleteLinkMutation.mutate({ linkId: link.id })}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </button>
                      )}
                    </div>

                    {link.description && (
                      <p className="text-sm text-muted-foreground mb-3">{link.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => handleLinkClick(link)}
                        className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Link
                      </button>
                      {link.isPasswordProtected && (
                        <Lock className="w-4 h-4 text-yellow-600" />
                      )}
                    </div>

                    {link.clickCount > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Clicked {link.clickCount} time{link.clickCount !== 1 ? "s" : ""}
                      </p>
                    )}
                  </Card>
                ))}

                {/* Add Link Card in Edit Mode */}
                {editMode && isAdmin && (
                  <Card
                    onClick={() => handleAddLink("New Link", "https://example.com", "")}
                    className="p-4 border-2 border-dashed border-muted-foreground/50 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-32"
                  >
                    <div className="text-center">
                      <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Add Link</p>
                    </div>
                  </Card>
                )}
              </div>

              {folderLinks.length === 0 && !editMode && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No links in this folder yet.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Select a folder to view links.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
