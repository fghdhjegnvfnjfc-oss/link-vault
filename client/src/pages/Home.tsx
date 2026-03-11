/* =============================================================
   LINK VAULT — Home Page
   Design: Neo-Noir / Glassmorphism Dark
   - Lock screen: centered frosted glass card over mesh gradient bg
   - Vault page: sidebar folder nav + main link card grid
   - Cyan (#06B6D4) accent, Sora display font, DM Sans body
   ============================================================= */

import { useState, useRef, useEffect } from "react";
import { Eye, EyeOff, Lock, Unlock, ExternalLink, Folder, FolderOpen, Search, X, ChevronRight, Shield, LogOut } from "lucide-react";

// ─── Configuration ────────────────────────────────────────────
// Change VAULT_PASSWORD to set your own password
const VAULT_PASSWORD = "vault2024";

// ─── Link Data ────────────────────────────────────────────────
interface LinkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  favicon?: string;
}

interface FolderData {
  id: string;
  name: string;
  icon: string;
  color: string;
  links: LinkItem[];
}

const VAULT_DATA: FolderData[] = [
  {
    id: "productivity",
    name: "Productivity",
    icon: "⚡",
    color: "oklch(0.75 0.18 85)",
    links: [
      { id: "notion", title: "Notion", url: "https://notion.so", description: "All-in-one workspace for notes and projects" },
      { id: "linear", title: "Linear", url: "https://linear.app", description: "Modern project management for software teams" },
      { id: "todoist", title: "Todoist", url: "https://todoist.com", description: "Task manager and to-do list app" },
      { id: "obsidian", title: "Obsidian", url: "https://obsidian.md", description: "Knowledge base and note-taking with markdown" },
    ],
  },
  {
    id: "development",
    name: "Development",
    icon: "🛠",
    color: "oklch(0.65 0.18 200)",
    links: [
      { id: "github", title: "GitHub", url: "https://github.com", description: "Code hosting and version control platform" },
      { id: "vercel", title: "Vercel", url: "https://vercel.com", description: "Deploy and host frontend applications" },
      { id: "devdocs", title: "DevDocs", url: "https://devdocs.io", description: "Unified API documentation browser" },
      { id: "codepen", title: "CodePen", url: "https://codepen.io", description: "Online code editor and front-end playground" },
      { id: "stackblitz", title: "StackBlitz", url: "https://stackblitz.com", description: "Online IDE for web development" },
    ],
  },
  {
    id: "design",
    name: "Design",
    icon: "🎨",
    color: "oklch(0.68 0.20 320)",
    links: [
      { id: "figma", title: "Figma", url: "https://figma.com", description: "Collaborative interface design tool" },
      { id: "dribbble", title: "Dribbble", url: "https://dribbble.com", description: "Design inspiration and portfolio community" },
      { id: "coolors", title: "Coolors", url: "https://coolors.co", description: "Color palette generator and explorer" },
      { id: "unsplash", title: "Unsplash", url: "https://unsplash.com", description: "Free high-resolution stock photography" },
    ],
  },
  {
    id: "learning",
    name: "Learning",
    icon: "📚",
    color: "oklch(0.70 0.18 145)",
    links: [
      { id: "mdn", title: "MDN Web Docs", url: "https://developer.mozilla.org", description: "Comprehensive web development documentation" },
      { id: "frontendmasters", title: "Frontend Masters", url: "https://frontendmasters.com", description: "Advanced JavaScript and frontend courses" },
      { id: "youtube", title: "YouTube", url: "https://youtube.com", description: "Video learning and tutorials" },
      { id: "coursera", title: "Coursera", url: "https://coursera.org", description: "Online courses from top universities" },
    ],
  },
  {
    id: "tools",
    name: "Tools",
    icon: "🔧",
    color: "oklch(0.68 0.18 50)",
    links: [
      { id: "regex101", title: "Regex101", url: "https://regex101.com", description: "Online regex tester and debugger" },
      { id: "jsonformatter", title: "JSON Formatter", url: "https://jsonformatter.curiousconcept.com", description: "Format and validate JSON data" },
      { id: "squoosh", title: "Squoosh", url: "https://squoosh.app", description: "Image compression and conversion tool" },
      { id: "transform", title: "Transform", url: "https://transform.tools", description: "Transform code between different formats" },
    ],
  },
  {
    id: "news",
    name: "News & Reads",
    icon: "📰",
    color: "oklch(0.65 0.15 25)",
    links: [
      { id: "hackernews", title: "Hacker News", url: "https://news.ycombinator.com", description: "Tech news and discussions from Y Combinator" },
      { id: "producthunt", title: "Product Hunt", url: "https://producthunt.com", description: "Discover new products and startups daily" },
      { id: "tldr", title: "TLDR Newsletter", url: "https://tldr.tech", description: "Byte-sized daily tech news digest" },
    ],
  },
];

// ─── Favicon helper ───────────────────────────────────────────
function getFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

// ─── Lock Screen ─────────────────────────────────────────────
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    // Simulate a brief check delay for UX polish
    await new Promise((r) => setTimeout(r, 350));

    if (password === VAULT_PASSWORD) {
      setError("");
      onUnlock();
    } else {
      setIsLoading(false);
      setError("Incorrect password. Access denied.");
      setIsShaking(true);
      setPassword("");
      setTimeout(() => setIsShaking(false), 600);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="min-h-screen mesh-bg flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663426870855/MTnGojgUB5HzdQARgKvcKo/vault-bg-LY49Eu2ppdyKFegFxJ8wq7.webp')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-[#0F172A]/60" />

      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/6 w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: "radial-gradient(circle, #06B6D4, transparent)" }} />
      <div className="absolute bottom-1/4 right-1/6 w-80 h-80 rounded-full opacity-8 blur-3xl"
        style={{ background: "radial-gradient(circle, #312E81, transparent)" }} />

      {/* Lock card */}
      <div
        className={`relative z-10 w-full max-w-md animate-fade-in-up ${isShaking ? "shake" : ""}`}
      >
        <div className="glass-card-strong rounded-2xl p-8 md:p-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <div className="relative">
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663426870855/MTnGojgUB5HzdQARgKvcKo/vault-lock-icon-6PZsayaWfgxkZyGh8B2aGr.webp"
                  alt="Vault Lock"
                  className="w-16 h-16 object-contain"
                />
              </div>
            </div>
            <h1
              className="text-3xl font-bold tracking-tight mb-2"
              style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
            >
              Link Vault
            </h1>
            <p className="text-sm" style={{ color: "oklch(0.60 0.02 220)" }}>
              Enter your password to access the vault
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Password"
                className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition-all duration-200"
                style={{
                  background: "oklch(1 0 0 / 6%)",
                  border: error
                    ? "1px solid oklch(0.62 0.22 25 / 70%)"
                    : "1px solid oklch(1 0 0 / 12%)",
                  color: "#E2E8F0",
                  fontFamily: "DM Sans, sans-serif",
                  boxShadow: error
                    ? "0 0 0 3px oklch(0.62 0.22 25 / 15%)"
                    : "none",
                }}
                onFocus={(e) => {
                  if (!error) {
                    e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                    e.target.style.boxShadow = "0 0 0 3px oklch(0.65 0.18 200 / 15%)";
                  }
                }}
                onBlur={(e) => {
                  if (!error) {
                    e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors duration-150"
                style={{ color: "oklch(0.55 0.02 220)" }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Error message */}
            {error && (
              <p
                className="text-xs flex items-center gap-1.5 animate-fade-in"
                style={{ color: "oklch(0.70 0.20 25)" }}
              >
                <X size={12} />
                {error}
              </p>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? "oklch(0.55 0.15 200)"
                  : "linear-gradient(135deg, oklch(0.65 0.18 200), oklch(0.55 0.20 215))",
                color: "#0F172A",
                fontFamily: "Sora, sans-serif",
                boxShadow: "0 4px 20px oklch(0.65 0.18 200 / 30%)",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.target as HTMLButtonElement).style.boxShadow =
                    "0 4px 30px oklch(0.65 0.18 200 / 50%)";
                  (e.target as HTMLButtonElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow =
                  "0 4px 20px oklch(0.65 0.18 200 / 30%)";
                (e.target as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {isLoading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{ borderColor: "#0F172A", borderTopColor: "transparent" }}
                  />
                  Unlocking…
                </>
              ) : (
                <>
                  <Unlock size={15} />
                  Unlock Vault
                </>
              )}
            </button>
          </form>

          {/* Footer hint */}
          <div className="mt-6 pt-5 border-t flex items-center justify-center gap-2"
            style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
            <Shield size={12} style={{ color: "oklch(0.50 0.02 220)" }} />
            <p className="text-xs" style={{ color: "oklch(0.50 0.02 220)" }}>
              Protected by Link Vault
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Link Card ────────────────────────────────────────────────
function LinkCard({ link }: { link: LinkItem }) {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl p-4 transition-all duration-200 animate-fade-in-up"
      style={{
        background: "oklch(1 0 0 / 4%)",
        border: "1px solid oklch(1 0 0 / 8%)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.background = "oklch(1 0 0 / 7%)";
        el.style.border = "1px solid oklch(0.65 0.18 200 / 35%)";
        el.style.boxShadow = "0 4px 20px oklch(0.65 0.18 200 / 12%)";
        el.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.background = "oklch(1 0 0 / 4%)";
        el.style.border = "1px solid oklch(1 0 0 / 8%)";
        el.style.boxShadow = "none";
        el.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-start gap-3">
        {/* Favicon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden"
          style={{ background: "oklch(1 0 0 / 8%)" }}
        >
          {!imgError ? (
            <img
              src={getFaviconUrl(link.url)}
              alt=""
              className="w-4 h-4 object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <ExternalLink size={14} style={{ color: "oklch(0.65 0.18 200)" }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="text-sm font-semibold truncate"
              style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
            >
              {link.title}
            </span>
            <ExternalLink
              size={11}
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ color: "oklch(0.65 0.18 200)" }}
            />
          </div>
          <p
            className="text-xs leading-relaxed line-clamp-2"
            style={{ color: "oklch(0.55 0.02 220)" }}
          >
            {link.description}
          </p>
        </div>
      </div>
    </a>
  );
}

// ─── Vault Page ───────────────────────────────────────────────
function VaultPage({ onLock }: { onLock: () => void }) {
  const [activeFolder, setActiveFolder] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const allLinks = VAULT_DATA.flatMap((f) => f.links.map((l) => ({ ...l, folderId: f.id })));

  const filteredLinks = (() => {
    const q = searchQuery.toLowerCase().trim();
    if (activeFolder === "all") {
      if (!q) return allLinks;
      return allLinks.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q)
      );
    }
    const folder = VAULT_DATA.find((f) => f.id === activeFolder);
    if (!folder) return [];
    const links = folder.links.map((l) => ({ ...l, folderId: folder.id }));
    if (!q) return links;
    return links.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q)
    );
  })();

  const activeLabel =
    activeFolder === "all"
      ? "All Links"
      : VAULT_DATA.find((f) => f.id === activeFolder)?.name ?? "";

  const activeFolderData = VAULT_DATA.find((f) => f.id === activeFolder);

  return (
    <div
      className="min-h-screen flex animate-unlock-reveal"
      style={{ background: "#0F172A" }}
    >
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col transition-all duration-300"
        style={{
          width: sidebarOpen ? "260px" : "0px",
          overflow: "hidden",
          background: "oklch(1 0 0 / 3%)",
          borderRight: "1px solid oklch(1 0 0 / 8%)",
        }}
      >
        <div style={{ width: "260px" }}>
          {/* Sidebar header */}
          <div className="p-5 pb-4">
            <div className="flex items-center gap-2.5 mb-6">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663426870855/MTnGojgUB5HzdQARgKvcKo/vault-lock-icon-6PZsayaWfgxkZyGh8B2aGr.webp"
                alt="Vault"
                className="w-7 h-7 object-contain"
              />
              <span
                className="text-base font-bold"
                style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
              >
                Link Vault
              </span>
            </div>

            {/* All links item */}
            <button
              onClick={() => setActiveFolder("all")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 mb-1"
              style={{
                background:
                  activeFolder === "all"
                    ? "oklch(0.65 0.18 200 / 15%)"
                    : "transparent",
                border:
                  activeFolder === "all"
                    ? "1px solid oklch(0.65 0.18 200 / 30%)"
                    : "1px solid transparent",
                color:
                  activeFolder === "all"
                    ? "oklch(0.75 0.18 200)"
                    : "oklch(0.65 0.02 220)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              <Folder size={15} />
              <span className="font-medium">All Links</span>
              <span
                className="ml-auto text-xs px-1.5 py-0.5 rounded-md"
                style={{
                  background: "oklch(1 0 0 / 8%)",
                  color: "oklch(0.55 0.02 220)",
                }}
              >
                {allLinks.length}
              </span>
            </button>

            {/* Divider */}
            <div
              className="my-3 text-xs font-semibold uppercase tracking-widest px-3"
              style={{ color: "oklch(0.45 0.02 220)", fontFamily: "Sora, sans-serif" }}
            >
              Folders
            </div>

            {/* Folder list */}
            <nav className="space-y-0.5">
              {VAULT_DATA.map((folder) => (
                <button
                  key={folder.id}
                  onClick={() => setActiveFolder(folder.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
                  style={{
                    background:
                      activeFolder === folder.id
                        ? "oklch(0.65 0.18 200 / 15%)"
                        : "transparent",
                    border:
                      activeFolder === folder.id
                        ? "1px solid oklch(0.65 0.18 200 / 30%)"
                        : "1px solid transparent",
                    color:
                      activeFolder === folder.id
                        ? "oklch(0.75 0.18 200)"
                        : "oklch(0.65 0.02 220)",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  <span className="text-base leading-none">{folder.icon}</span>
                  <span className="font-medium truncate">{folder.name}</span>
                  <span
                    className="ml-auto text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
                    style={{
                      background: "oklch(1 0 0 / 8%)",
                      color: "oklch(0.55 0.02 220)",
                    }}
                  >
                    {folder.links.length}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Sidebar footer — lock button */}
          <div
            className="p-4 mt-auto border-t"
            style={{ borderColor: "oklch(1 0 0 / 8%)" }}
          >
            <button
              onClick={onLock}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150"
              style={{
                color: "oklch(0.55 0.02 220)",
                fontFamily: "DM Sans, sans-serif",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(0.62 0.22 25 / 12%)";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.70 0.20 25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.55 0.02 220)";
              }}
            >
              <LogOut size={15} />
              <span>Lock Vault</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center gap-4 px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
        >
          {/* Sidebar toggle */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg transition-all duration-150"
            style={{
              color: "oklch(0.55 0.02 220)",
              background: "oklch(1 0 0 / 4%)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(1 0 0 / 8%)";
              (e.currentTarget as HTMLButtonElement).style.color = "#E2E8F0";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "oklch(1 0 0 / 4%)";
              (e.currentTarget as HTMLButtonElement).style.color =
                "oklch(0.55 0.02 220)";
            }}
            title="Toggle sidebar"
          >
            <ChevronRight
              size={16}
              style={{
                transform: sidebarOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s",
              }}
            />
          </button>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            {activeFolder !== "all" && activeFolderData && (
              <>
                <button
                  onClick={() => setActiveFolder("all")}
                  className="text-sm transition-colors duration-150"
                  style={{ color: "oklch(0.55 0.02 220)", fontFamily: "DM Sans, sans-serif" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.75 0.18 200)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.55 0.02 220)";
                  }}
                >
                  All Links
                </button>
                <ChevronRight size={13} style={{ color: "oklch(0.40 0.02 220)" }} />
              </>
            )}
            <h2
              className="text-sm font-semibold"
              style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
            >
              {activeFolder !== "all" && activeFolderData
                ? `${activeFolderData.icon} ${activeLabel}`
                : activeLabel}
            </h2>
          </div>

          {/* Search */}
          <div className="ml-auto relative max-w-xs w-full">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: "oklch(0.50 0.02 220)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search links…"
              className="w-full pl-9 pr-9 py-2 rounded-lg text-sm outline-none transition-all duration-200"
              style={{
                background: "oklch(1 0 0 / 5%)",
                border: "1px solid oklch(1 0 0 / 10%)",
                color: "#E2E8F0",
                fontFamily: "DM Sans, sans-serif",
              }}
              onFocus={(e) => {
                e.target.style.border = "1px solid oklch(0.65 0.18 200 / 50%)";
                e.target.style.boxShadow = "0 0 0 3px oklch(0.65 0.18 200 / 10%)";
              }}
              onBlur={(e) => {
                e.target.style.border = "1px solid oklch(1 0 0 / 10%)";
                e.target.style.boxShadow = "none";
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "oklch(0.50 0.02 220)" }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </header>

        {/* Link grid */}
        <main className="flex-1 p-6 overflow-auto">
          {filteredLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <Search size={32} style={{ color: "oklch(0.35 0.02 220)" }} />
              <p
                className="text-sm"
                style={{ color: "oklch(0.50 0.02 220)", fontFamily: "DM Sans, sans-serif" }}
              >
                {searchQuery ? `No links found for "${searchQuery}"` : "No links in this folder"}
              </p>
            </div>
          ) : activeFolder === "all" && !searchQuery ? (
            // All folders view — grouped
            <div className="space-y-8 stagger-children">
              {VAULT_DATA.map((folder) => (
                <section key={folder.id}>
                  <button
                    onClick={() => setActiveFolder(folder.id)}
                    className="flex items-center gap-2.5 mb-4 group"
                  >
                    <span className="text-lg leading-none">{folder.icon}</span>
                    <h3
                      className="text-sm font-bold uppercase tracking-widest transition-colors duration-150"
                      style={{
                        fontFamily: "Sora, sans-serif",
                        color: "oklch(0.65 0.02 220)",
                      }}
                    >
                      {folder.name}
                    </h3>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md"
                      style={{
                        background: "oklch(1 0 0 / 8%)",
                        color: "oklch(0.50 0.02 220)",
                      }}
                    >
                      {folder.links.length}
                    </span>
                    <ChevronRight
                      size={13}
                      className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      style={{ color: "oklch(0.65 0.18 200)" }}
                    />
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {folder.links.map((link) => (
                      <LinkCard key={link.id} link={link} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            // Filtered / single folder view
            <div>
              {searchQuery && (
                <p
                  className="text-xs mb-4"
                  style={{ color: "oklch(0.50 0.02 220)", fontFamily: "DM Sans, sans-serif" }}
                >
                  {filteredLinks.length} result{filteredLinks.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 stagger-children">
                {filteredLinks.map((link) => (
                  <LinkCard key={link.id} link={link} />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────
export default function Home() {
  const [unlocked, setUnlocked] = useState(false);

  return unlocked ? (
    <VaultPage onLock={() => setUnlocked(false)} />
  ) : (
    <LockScreen onUnlock={() => setUnlocked(true)} />
  );
}
