import { useState, useEffect } from "react";
import { Lock, Unlock, ExternalLink, Edit2, Trash2, Plus, Menu, X, Settings, History, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface Link {
  id: number;
  title: string;
  url: string;
  description: string | null;
  folderId: number;
}

interface Folder {
  id: number;
  name: string;
  icon: string;
  color: string;
}

type AuthLevel = "none" | "user" | "admin" | "owner";

export default function Home() {
  const [authLevel, setAuthLevel] = useState<AuthLevel>("none");
  const [vaultPassword, setVaultPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAllLinks, setShowAllLinks] = useState(false);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showChangeHistory, setShowChangeHistory] = useState(false);

  // Fetch vault data
  const { data: vaultData, isLoading: isLoadingVault, refetch: refetchVault } = trpc.vault.getAll.useQuery(
    undefined,
    { enabled: authLevel !== "none" }
  );

  // Fetch owner passwords
  const { data: ownerPasswords } = trpc.owner.getPasswords.useQuery();

  // Fetch change history
  const { data: changeHistory } = trpc.owner.getChangeHistory.useQuery(
    undefined,
    { enabled: authLevel === "owner" && showChangeHistory }
  );

  // Handle vault unlock (user access)
  const handleVaultUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPasswords && vaultPassword === ownerPasswords.vaultPassword) {
      setAuthLevel("user");
      setVaultPassword("");
    } else {
      alert("Incorrect vault password");
    }
  };

  // Handle admin unlock
  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPasswords && adminPassword === ownerPasswords.adminPassword) {
      setAuthLevel("admin");
      setAdminPassword("");
    } else {
      alert("Incorrect admin password");
    }
  };

  // Handle owner unlock
  const handleOwnerUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPasswords && ownerPassword === ownerPasswords.ownerPassword) {
      setAuthLevel("owner");
      setOwnerPassword("");
    } else {
      alert("Incorrect owner password");
    }
  };

  // Handle logout
  const handleLogout = () => {
    setAuthLevel("none");
    setSelectedFolderId(null);
    setShowAllLinks(false);
    setShowOwnerPanel(false);
  };

  // If not authenticated, show password gate
  if (authLevel === "none") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card-strong rounded-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Lock size={32} className="text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-white">Website Library</h1>
          <p className="text-center text-slate-400 mb-6">Enter the vault password for access.</p>

          <form onSubmit={handleVaultUnlock} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={vaultPassword}
                onChange={(e) => setVaultPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-teal-500/30 text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
            >
              <Unlock size={18} className="inline mr-2" />
              Unlock Vault
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">🔒 Password Protected</p>
        </div>
      </div>
    );
  }

  // If user is logged in but not admin, show admin password gate
  if (authLevel === "user") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card-strong rounded-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Lock size={32} className="text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-white">Admin Access</h1>
          <p className="text-center text-slate-400 mb-6">Enter admin password to edit links and folders.</p>

          <form onSubmit={handleAdminUnlock} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-teal-500/30 text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
            >
              <Unlock size={18} className="inline mr-2" />
              Unlock Admin
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => setAuthLevel("user")}
              className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Continue as Viewer
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Exit Vault
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If admin is logged in but not owner, show owner password gate
  if (authLevel === "admin") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card-strong rounded-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Lock size={32} className="text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-white">Owner Access</h1>
          <p className="text-center text-slate-400 mb-6">Enter owner password to manage settings and history.</p>

          <form onSubmit={handleOwnerUnlock} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Enter owner password"
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-teal-500/30 text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              className="w-full px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
            >
              <Unlock size={18} className="inline mr-2" />
              Unlock Owner
            </button>
          </form>

          <div className="mt-6 space-y-2">
            <button
              onClick={() => setAuthLevel("admin")}
              className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Continue as Admin
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Exit Vault
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main vault view (for admin and owner)
  const folders: Folder[] = vaultData?.folders || [];
  const links: Link[] = vaultData?.links || [];
  const selectedFolder = folders.find(f => f.id === selectedFolderId);
  const folderLinks = selectedFolderId ? links.filter(l => l.folderId === selectedFolderId) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 hover:bg-slate-700 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <h1 className="text-2xl font-bold text-white">Website Library</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">
              {authLevel === "owner" ? "👑 Owner" : authLevel === "admin" ? "🔧 Admin" : "👤 Viewer"}
            </span>
            {authLevel === "owner" && (
              <button
                onClick={() => setShowOwnerPanel(!showOwnerPanel)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Settings size={20} className="text-teal-400" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Exit
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? "w-64" : "w-0"
          } bg-slate-800/30 border-r border-slate-700/50 transition-all duration-300 overflow-hidden md:w-64 md:block`}
        >
          <div className="p-4 space-y-2">
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolderId(folder.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedFolderId === folder.id
                    ? "bg-teal-600/20 border border-teal-500/50 text-teal-300"
                    : "hover:bg-slate-700/50 text-slate-300"
                }`}
              >
                <span className="mr-2">{folder.icon}</span>
                {folder.name}
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {showOwnerPanel && authLevel === "owner" ? (
            <OwnerPanel
              onClose={() => setShowOwnerPanel(false)}
              changeHistory={changeHistory}
            />
          ) : selectedFolderId && selectedFolder ? (
            <FolderView
              folder={selectedFolder}
              links={folderLinks}
              isAdmin={authLevel === "admin" || (authLevel as AuthLevel) === "owner"}
              onRefresh={refetchVault}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-slate-400">Select a folder to view links</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

interface FolderViewProps {
  folder: Folder;
  links: Link[];
  isAdmin: boolean;
  onRefresh: () => void;
}

function FolderView({ folder, links, isAdmin, onRefresh }: FolderViewProps) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-6">
        {folder.icon} {folder.name}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {links.map(link => (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 hover:border-teal-500/50 hover:bg-slate-800/80 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-white group-hover:text-teal-300 transition-colors">
                {link.title}
              </h3>
              <ExternalLink size={16} className="text-slate-400 group-hover:text-teal-300 transition-colors" />
            </div>
            {link.description && (
              <p className="text-sm text-slate-400 mb-3">{link.description}</p>
            )}
            <p className="text-xs text-slate-500 truncate">{link.url}</p>
          </a>
        ))}
      </div>
    </div>
  );
}

interface OwnerPanelProps {
  onClose: () => void;
  changeHistory: any;
}

function OwnerPanel({ onClose }: OwnerPanelProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={24} />
          Owner Control Panel
        </h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <History size={20} />
            Change History
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            <p className="text-slate-400 text-sm">Change history will be displayed here</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-4">Password Management</h3>
          <p className="text-slate-400 text-sm">Password management UI coming soon</p>
        </div>
      </div>
    </div>
  );
}
