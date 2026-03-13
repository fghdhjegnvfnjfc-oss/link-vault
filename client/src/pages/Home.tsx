import { useState, useEffect } from "react";
import { Lock, Unlock, ExternalLink, Edit2, Trash2, Plus, Menu, X, Settings, History, RotateCcw, LogOut } from "lucide-react";
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

type AccessLevel = "locked" | "viewer" | "admin" | "owner";

export default function Home() {
  const [accessLevel, setAccessLevel] = useState<AccessLevel>("locked");
  const [vaultPassword, setVaultPassword] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showOwnerPanel, setShowOwnerPanel] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);

  // Fetch vault data
  const { data: vaultData, isLoading: isLoadingVault, refetch: refetchVault } = trpc.vault.getAll.useQuery(
    undefined,
    { enabled: accessLevel !== "locked" }
  );

  // Fetch owner passwords
  const { data: ownerPasswords } = trpc.owner.getPasswords.useQuery();

  // Fetch change history
  const { data: changeHistory } = trpc.owner.getChangeHistory.useQuery(
    undefined,
    { enabled: accessLevel === "owner" }
  );

  // Handle vault unlock (initial access)
  const handleVaultUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPasswords && vaultPassword === ownerPasswords.vaultPassword) {
      setAccessLevel("viewer");
      setVaultPassword("");
    } else {
      alert("Incorrect vault password");
    }
  };

  // Handle admin unlock (optional, after vault access)
  const handleAdminUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPasswords && adminPassword === ownerPasswords.adminPassword) {
      setAccessLevel("admin");
      setAdminPassword("");
      setShowAdminModal(false);
    } else {
      alert("Incorrect admin password");
    }
  };

  // Handle owner unlock (optional, after admin access)
  const handleOwnerUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (ownerPasswords && ownerPassword === ownerPasswords.ownerPassword) {
      setAccessLevel("owner");
      setOwnerPassword("");
      setShowOwnerModal(false);
    } else {
      alert("Incorrect owner password");
    }
  };

  // Handle logout
  const handleLogout = () => {
    setAccessLevel("locked");
    setSelectedFolderId(null);
    setShowOwnerPanel(false);
    setShowAdminModal(false);
    setShowOwnerModal(false);
  };

  // If not authenticated, show vault password gate
  if (accessLevel === "locked") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="glass-card-strong rounded-2xl p-8 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <Lock size={32} className="text-teal-400" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2 text-white">Website Library</h1>
          <p className="text-center text-slate-400 mb-6">Enter the vault password to access the link collection.</p>

          <form onSubmit={handleVaultUnlock} className="space-y-4">
            <div className="relative">
              <input
                type="password"
                value={vaultPassword}
                onChange={(e) => setVaultPassword(e.target.value)}
                placeholder="Enter vault password"
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

  // Main vault view (for viewer, admin, and owner)
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
            {/* Access Level Badge */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50 border border-slate-600/50">
              <span className="text-sm text-slate-300">
                {accessLevel === "owner" ? "👑 Owner" : accessLevel === "admin" ? "🔧 Admin" : "👤 Viewer"}
              </span>
            </div>

            {/* Unlock Admin Button */}
            {accessLevel !== "admin" && accessLevel !== "owner" && (
              <button
                onClick={() => setShowAdminModal(true)}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors flex items-center gap-2"
              >
                <Edit2 size={16} />
                Unlock Admin
              </button>
            )}

            {/* Unlock Owner Button */}
            {accessLevel !== "owner" && accessLevel === "admin" && (
              <button
                onClick={() => setShowOwnerModal(true)}
                className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors flex items-center gap-2"
              >
                <Settings size={16} />
                Unlock Owner
              </button>
            )}

            {/* Owner Settings Button */}
            {accessLevel === "owner" && (
              <button
                onClick={() => setShowOwnerPanel(!showOwnerPanel)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Settings size={20} className="text-teal-400" />
              </button>
            )}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors flex items-center gap-2"
            >
              <LogOut size={16} />
              Exit
            </button>
          </div>
        </div>
      </header>

      {/* Admin Unlock Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card-strong rounded-2xl p-8 w-full max-w-md">
            <div className="flex justify-center mb-6">
              <Lock size={32} className="text-teal-400" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2 text-white">Admin Access</h2>
            <p className="text-center text-slate-400 mb-6">Enter admin password to unlock editing features.</p>

            <form onSubmit={handleAdminUnlock} className="space-y-4">
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Enter admin password"
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-teal-500/30 text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="submit"
                className="w-full px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
              >
                <Unlock size={18} className="inline mr-2" />
                Unlock Admin
              </button>
            </form>

            <button
              onClick={() => setShowAdminModal(false)}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Owner Unlock Modal */}
      {showOwnerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="glass-card-strong rounded-2xl p-8 w-full max-w-md">
            <div className="flex justify-center mb-6">
              <Lock size={32} className="text-teal-400" />
            </div>
            <h2 className="text-2xl font-bold text-center mb-2 text-white">Owner Access</h2>
            <p className="text-center text-slate-400 mb-6">Enter owner password to manage settings and history.</p>

            <form onSubmit={handleOwnerUnlock} className="space-y-4">
              <input
                type="password"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Enter owner password"
                className="w-full px-4 py-3 rounded-xl bg-slate-700/50 border border-teal-500/30 text-white placeholder-slate-400 outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="submit"
                className="w-full px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors"
              >
                <Unlock size={18} className="inline mr-2" />
                Unlock Owner
              </button>
            </form>

            <button
              onClick={() => setShowOwnerModal(false)}
              className="w-full mt-4 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
          {showOwnerPanel && accessLevel === "owner" ? (
            <OwnerPanel
              onClose={() => setShowOwnerPanel(false)}
              changeHistory={changeHistory}
              currentPasswords={ownerPasswords}
              onPasswordsUpdated={refetchVault}
            />
          ) : selectedFolderId && selectedFolder ? (
            <FolderView
              folder={selectedFolder}
              links={folderLinks}
              isAdmin={accessLevel === "admin" || accessLevel === "owner"}
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
  currentPasswords: any;
  onPasswordsUpdated: () => void;
}

function OwnerPanel({ onClose, changeHistory, currentPasswords, onPasswordsUpdated }: OwnerPanelProps) {
  const [activeTab, setActiveTab] = useState<"history" | "passwords">("history");

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 max-w-4xl">
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

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-700/50">
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "history"
              ? "text-teal-400 border-b-2 border-teal-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <History size={18} className="inline mr-2" />
          Change History
        </button>
        <button
          onClick={() => setActiveTab("passwords")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "passwords"
              ? "text-teal-400 border-b-2 border-teal-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          <Lock size={18} className="inline mr-2" />
          Password Management
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "history" ? (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Recent Changes</h3>
            {changeHistory && changeHistory.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {changeHistory.map((change: any) => (
                  <div
                    key={change.id}
                    className="bg-slate-700/50 p-3 rounded-lg flex items-center justify-between"
                  >
                    <div className="text-sm">
                      <p className="text-white font-medium">{change.changeType}</p>
                      <p className="text-slate-400 text-xs">{change.resourceName}</p>
                    </div>
                    <button className="p-2 hover:bg-slate-600 rounded-lg transition-colors">
                      <RotateCcw size={16} className="text-teal-400" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No changes recorded yet</p>
            )}
          </div>
        ) : (
          <PasswordChangeForm
            currentPasswords={currentPasswords}
            onSuccess={() => {
              onPasswordsUpdated();
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
}

interface PasswordChangeFormProps {
  currentPasswords: any;
  onSuccess: () => void;
}

function PasswordChangeForm({ currentPasswords, onSuccess }: PasswordChangeFormProps) {
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    vault: false,
    admin: false,
    owner: false,
  });

  const [formData, setFormData] = useState({
    currentOwnerPassword: "",
    newVaultPassword: "",
    newAdminPassword: "",
    newOwnerPassword: "",
    confirmNewOwnerPassword: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const updatePasswordsMutation = trpc.owner.updatePasswords.useMutation();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.currentOwnerPassword !== currentPasswords?.ownerPassword) {
      newErrors.currentOwnerPassword = "Current owner password is incorrect";
    }

    if (!formData.newVaultPassword.trim()) {
      newErrors.newVaultPassword = "Vault password is required";
    } else if (formData.newVaultPassword.length < 6) {
      newErrors.newVaultPassword = "Password must be at least 6 characters";
    }

    if (!formData.newAdminPassword.trim()) {
      newErrors.newAdminPassword = "Admin password is required";
    } else if (formData.newAdminPassword.length < 6) {
      newErrors.newAdminPassword = "Password must be at least 6 characters";
    }

    if (!formData.newOwnerPassword.trim()) {
      newErrors.newOwnerPassword = "Owner password is required";
    } else if (formData.newOwnerPassword.length < 6) {
      newErrors.newOwnerPassword = "Password must be at least 6 characters";
    }

    if (formData.newOwnerPassword !== formData.confirmNewOwnerPassword) {
      newErrors.confirmNewOwnerPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setSuccessMessage("");

    try {
      await updatePasswordsMutation.mutateAsync({
        vaultPassword: formData.newVaultPassword,
        adminPassword: formData.newAdminPassword,
        ownerPassword: formData.newOwnerPassword,
      });

      setSuccessMessage("✓ Passwords updated successfully!");
      setFormData({
        currentOwnerPassword: "",
        newVaultPassword: "",
        newAdminPassword: "",
        newOwnerPassword: "",
        confirmNewOwnerPassword: "",
      });

      setTimeout(() => {
        setSuccessMessage("");
        onSuccess();
      }, 2000);
    } catch (error) {
      setErrors({ submit: "Failed to update passwords. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field],
    }));
  };

  const PasswordInput = ({
    label,
    field,
    value,
    showField,
    error,
  }: {
    label: string;
    field: keyof typeof showPasswords;
    value: string;
    showField: boolean;
    error?: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="relative">
        <input
          type={showField ? "text" : "password"}
          value={value}
          onChange={(e) => {
            const fieldMap: Record<string, keyof typeof formData> = {
              current: "currentOwnerPassword",
              vault: "newVaultPassword",
              admin: "newAdminPassword",
              owner: "newOwnerPassword",
            };
            const dataField = fieldMap[field] || "confirmNewOwnerPassword";
            setFormData(prev => ({
              ...prev,
              [dataField]: e.target.value,
            }));
          }}
          placeholder={`Enter ${label.toLowerCase()}`}
          className={`w-full px-4 py-2 pr-10 rounded-lg bg-slate-700/50 border transition-colors outline-none ${
            error
              ? "border-red-500/50 focus:border-red-500"
              : "border-slate-600/50 focus:border-teal-500"
          } text-white placeholder-slate-400`}
        />
        <button
          type="button"
          onClick={() => togglePasswordVisibility(field)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
        >
          {showField ? <X size={18} /> : <Lock size={18} />}
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
        <p className="text-sm text-slate-300 flex items-center gap-2">
          <Lock size={16} className="text-teal-400" />
          Verify your current owner password before making changes
        </p>
      </div>

      <PasswordInput
        label="Current Owner Password"
        field="current"
        value={formData.currentOwnerPassword}
        showField={showPasswords.current}
        error={errors.currentOwnerPassword}
      />

      <div className="border-t border-slate-600/30 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Update Passwords</h3>

        <div className="space-y-4">
          <PasswordInput
            label="New Vault Password (for users)"
            field="vault"
            value={formData.newVaultPassword}
            showField={showPasswords.vault}
            error={errors.newVaultPassword}
          />

          <PasswordInput
            label="New Admin Password (for editors)"
            field="admin"
            value={formData.newAdminPassword}
            showField={showPasswords.admin}
            error={errors.newAdminPassword}
          />

          <PasswordInput
            label="New Owner Password"
            field="owner"
            value={formData.newOwnerPassword}
            showField={showPasswords.owner}
            error={errors.newOwnerPassword}
          />

          <PasswordInput
            label="Confirm New Owner Password"
            field="owner"
            value={formData.confirmNewOwnerPassword}
            showField={showPasswords.owner}
            error={errors.confirmNewOwnerPassword}
          />
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-sm">{errors.submit}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle size={20} className="text-teal-400 flex-shrink-0" />
          <p className="text-teal-300 text-sm">{successMessage}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-3 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold transition-colors"
        >
          {isLoading ? "Updating..." : "Update Passwords"}
        </button>
      </div>

      <p className="text-xs text-slate-400 text-center">
        All passwords must be at least 6 characters long
      </p>
    </form>
  );
}

interface AlertCircleProps {
  size?: number;
  className?: string;
}

function AlertCircle({ size = 24, className }: AlertCircleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

interface CheckCircleProps {
  size?: number;
  className?: string;
}

function CheckCircle({ size = 24, className }: CheckCircleProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
