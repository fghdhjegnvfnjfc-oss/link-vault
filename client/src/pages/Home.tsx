import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PasswordGate } from "@/components/PasswordGate";
import { EditLinkModal } from "@/components/EditLinkModal";
import { ExternalLink, Lock, Plus, Trash2, Edit2, Save, X, LogOut, Menu, Grid3x3, Link as LinkIcon } from "lucide-react";
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

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // View state
  const [viewMode, setViewMode] = useState<"folder" | "all">("folder");

  // Edit link modal state
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

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
      setEditMode(false);
      setIsAdmin(false);
    } else {
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

  // Handle edit link
  const handleEditLink = useCallback(
    (linkId: number, updates: { title: string; url: string; description: string }) => {
      if (!isAdmin) return;
      updateLinkMutation.mutate({
        linkId,
        ...updates,
      });
      setShowEditModal(false);
      setEditingLink(null);
    },
    [updateLinkMutation, isAdmin]
  );

  // Handle add folder
  const handleAddFolder = useCallback(
    (name: string, icon: string, color: string) => {
      if (!isAdmin) return;
      addFolderMutation.mutate({ name, icon, color });
    },
    [addFolderMutation, isAdmin]
  );

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        if (window.innerWidth < 768) {
          setSidebarOpen(false);
        }
      }
    };

    if (sidebarOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [sidebarOpen]);

  // If vault is not unlocked, show password gate
  if (!vaultUnlocked) {
    const totalLinks = links.length;
    return (
      <div className="min-h-screen bg-background">
        <PasswordGate
          isOpen={showVaultPasswordGate}
          title="Link Vault"
          description={`Enter the vault password to access the shared link directory. (${totalLinks} links available)`}
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
  const totalLinks = links.length;

  const renderLinkCard = (link: Link, showFolder: boolean = false) => (
    <Card
      key={link.id}
      className="p-4 hover:shadow-lg transition-shadow cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 pr-2">
          <h3 className="font-semibold text-foreground line-clamp-2">
            {link.title}
          </h3>
          {showFolder && (
            <p className="text-xs text-muted-foreground mt-1">
              {folders.find((f) => f.id === link.folderId)?.name}
            </p>
          )}
        </div>
        {editMode && isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={() => {
                setEditingLink(link);
                setShowEditModal(true);
              }}
              className="p-1 hover:bg-primary/10 rounded"
            >
              <Edit2 className="w-4 h-4 text-primary" />
            </button>
            <button
              onClick={() => deleteLinkMutation.mutate({ linkId: link.id })}
              className="p-1 hover:bg-destructive/10 rounded"
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          </div>
        )}
      </div>

      {link.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {link.description}
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => handleLinkClick(link)}
          className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm"
        >
          <ExternalLink className="w-4 h-4 flex-shrink-0" />
          <span className="truncate">Open</span>
        </button>
        {link.isPasswordProtected && (
          <Lock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
        )}
      </div>

      {link.clickCount > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Clicked {link.clickCount} time{link.clickCount !== 1 ? "s" : ""}
        </p>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <EditLinkModal
        isOpen={showEditModal}
        link={editingLink}
        onClose={() => {
          setShowEditModal(false);
          setEditingLink(null);
        }}
        onSave={handleEditLink}
        isSaving={updateLinkMutation.isPending}
      />

      <PasswordGate
        isOpen={showAdminPasswordGate}
        title="Admin Access"
        description="Enter the admin password to enable editing."
        onSuccess={handleAdminPasswordSubmit}
        onClose={() => setShowAdminPasswordGate(false)}
      />

      <div className="flex h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div
          ref={sidebarRef}
          className={`fixed md:relative w-64 bg-card border-r border-border p-4 overflow-y-auto transition-transform duration-300 z-50 md:z-auto h-screen ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold text-foreground mb-2">Link Vault</h1>
            <p className="text-sm text-muted-foreground">
              Shared link directory
            </p>
            <p className="text-xs text-primary font-semibold mt-2">
              {totalLinks} link{totalLinks !== 1 ? "s" : ""}
            </p>
            {isAdmin && (
              <p className="text-xs text-primary font-semibold mt-1">🔑 Admin Mode</p>
            )}
          </div>

          {/* Mobile admin indicator */}
          <div className="md:hidden mb-4">
            <p className="text-xs text-primary font-semibold">
              {totalLinks} link{totalLinks !== 1 ? "s" : ""}
            </p>
            {isAdmin && (
              <p className="text-xs text-primary font-semibold">🔑 Admin Mode</p>
            )}
          </div>

          {/* View Mode Selector */}
          <div className="space-y-2 mb-4">
            <button
              onClick={() => {
                setViewMode("folder");
                if (window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                viewMode === "folder"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              }`}
            >
              <Grid3x3 className="w-4 h-4" />
              <span>By Folder</span>
            </button>
            <button
              onClick={() => {
                setViewMode("all");
                if (window.innerWidth < 768) {
                  setSidebarOpen(false);
                }
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                viewMode === "all"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-foreground"
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              <span>All Links</span>
            </button>
          </div>

          {/* Folders List (only show when in folder view) */}
          {viewMode === "folder" && (
            <>
              <div className="space-y-2 mb-4">
                {folders.map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => {
                      setSelectedFolder(folder.id);
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedFolder === folder.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    <span className="mr-2">{folder.icon}</span>
                    <span className="truncate">{folder.name}</span>
                  </button>
                ))}
              </div>

              {/* Add Folder Button */}
              {editMode && isAdmin && (
                <Button
                  onClick={() => handleAddFolder("New Folder", "📁", "oklch(0.65 0.18 200)")}
                  className="w-full mb-4"
                  size="sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Folder
                </Button>
              )}
            </>
          )}

          {/* Edit Mode Toggle */}
          <div className="mt-auto pt-6 border-t border-border space-y-2">
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
                setViewMode("folder");
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
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col">
          {/* Mobile header with menu button */}
          <div className="md:hidden mb-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-foreground">Link Vault</h1>
            <div className="w-10" />
          </div>

          <div className="flex-1">
            {viewMode === "folder" ? (
              // Folder View
              selectedFolderData ? (
                <div
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <div className="mb-8">
                    <h2 className="text-3xl font-bold text-foreground">
                      {selectedFolderData.icon} {selectedFolderData.name}
                    </h2>
                    <p className="text-muted-foreground mt-2">
                      {folderLinks.length} link{folderLinks.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Links Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {folderLinks.map((link) => renderLinkCard(link, false))}

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
              )
            ) : (
              // All Links View
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-foreground">All Links</h2>
                  <p className="text-muted-foreground mt-2">
                    {totalLinks} link{totalLinks !== 1 ? "s" : ""} across {folders.length} folder{folders.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* All Links Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {links.map((link) => renderLinkCard(link, true))}

                  {/* Add Link Card in Edit Mode */}
                  {editMode && isAdmin && (
                    <Card
                      onClick={() => {
                        if (selectedFolder) {
                          handleAddLink("New Link", "https://example.com", "");
                        } else {
                          alert("Please select a folder first");
                        }
                      }}
                      className="p-4 border-2 border-dashed border-muted-foreground/50 hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-32"
                    >
                      <div className="text-center">
                        <Plus className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Add Link</p>
                      </div>
                    </Card>
                  )}
                </div>

                {totalLinks === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No links available yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
