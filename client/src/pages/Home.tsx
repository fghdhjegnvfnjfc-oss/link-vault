import { useState, useEffect } from "react";
import { Lock, Unlock, ExternalLink, Edit2, Trash2, Plus, Menu, X } from "lucide-react";
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

export default function Home() {
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [vaultPassword, setVaultPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAllLinks, setShowAllLinks] = useState(false);

  // Fetch vault data from database
  const { data: vaultData, isLoading: isLoadingVault, refetch: refetchVault } = trpc.vault.getAll.useQuery(
    undefined,
    { enabled: isVaultUnlocked }
  );



  // Handle vault password submission
  const handleVaultUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (vaultPassword === "vault2024") {
      setIsVaultUnlocked(true);
      setVaultPassword("");
    } else {
      alert("Incorrect vault password");
    }
  };

  // Handle admin password submission
  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "admin2024") {
      setIsAdminMode(true);
      setAdminPassword("");
    } else {
      alert("Incorrect admin password");
    }
  };

  // Handle exit vault
  const handleExitVault = () => {
    setIsVaultUnlocked(false);
    setIsAdminMode(false);
    setSelectedFolderId(null);
  };

  // Handle exit admin mode
  const handleExitAdminMode = () => {
    setIsAdminMode(false);
  };

  // If vault is not unlocked, show password gate
  if (!isVaultUnlocked) {
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

  // If admin mode password is needed
  if (!isAdminMode && selectedFolderId === null && !showAllLinks) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card-strong rounded-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Lock size={32} className="text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-white">Admin Access</h1>
          <p className="text-center text-slate-400 mb-6">Enter admin password to edit.</p>

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

          <button
            onClick={handleExitVault}
            className="w-full mt-4 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
          >
            Exit Vault
          </button>
        </div>
      </div>
    );
  }

  // Main vault view
  const folders: Folder[] = vaultData?.folders || [];
  const links: Link[] = vaultData?.links || [];
  const currentFolder = folders.find((f: Folder) => f.id === selectedFolderId);
  const currentFolderLinks = selectedFolderId ? links.filter((l: Link) => l.folderId === selectedFolderId) : [];
  const displayLinks = showAllLinks ? links : currentFolderLinks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div
        className={`fixed md:relative z-40 h-screen w-64 bg-slate-800/50 backdrop-blur-md border-r border-teal-500/20 flex flex-col transition-transform ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-6 border-b border-teal-500/20">
          <h2 className="text-2xl font-bold text-white">Website Library</h2>
          <p className="text-sm text-slate-400 mt-1">{links.length} links</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isAdminMode && (
            <button className="w-full px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors">
              <Plus size={16} className="inline mr-2" />
              Add Folder
            </button>
          )}

          {folders.map((folder: Folder) => (
            <button
              key={folder.id}
              onClick={() => {
                setSelectedFolderId(folder.id);
                setShowAllLinks(false);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                selectedFolderId === folder.id
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-700/50"
              }`}
            >
              <span className="text-lg mr-2">{folder.icon}</span>
              {folder.name}
            </button>
          ))}

          <button
            onClick={() => {
              setShowAllLinks(true);
              setSelectedFolderId(null);
              setSidebarOpen(false);
            }}
            className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
              showAllLinks
                ? "bg-teal-600 text-white"
                : "text-slate-300 hover:bg-slate-700/50"
            }`}
          >
            <span className="text-lg mr-2">📋</span>
            All Links
          </button>
        </div>

        <div className="p-4 border-t border-teal-500/20 space-y-2">
          {isAdminMode && (
            <button
              onClick={handleExitAdminMode}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Exit Admin Mode
            </button>
          )}
          <button
            onClick={handleExitVault}
            className="w-full px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
          >
            Exit Vault
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-teal-500/20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-2xl font-bold text-white">
            {showAllLinks ? "All Links" : currentFolder?.name || "Select a folder"}
          </h1>
          <div className="flex gap-2">
            {!isAdminMode && (
              <button
                onClick={() => setIsAdminMode(true)}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
              >
                Edit Mode
              </button>
            )}
          </div>
        </div>

        {/* Links Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingVault ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">Loading vault...</p>
            </div>
          ) : displayLinks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">No links in this folder</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayLinks.map((link: Link) => (
                <div
                  key={link.id}
                  className="glass-card-strong rounded-xl p-4 hover:bg-slate-700/30 transition-colors group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-white flex-1">{link.title}</h3>
                    {isAdminMode && (
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1 rounded hover:bg-slate-600 text-slate-300">
                          <Edit2 size={16} />
                        </button>
                        <button className="p-1 rounded hover:bg-red-600/20 text-red-400">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{link.description}</p>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm transition-colors"
                  >
                    <ExternalLink size={14} />
                    Open
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
