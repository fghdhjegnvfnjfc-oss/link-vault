// Updated AdminEmailSignInModal with password check
function AdminEmailSignInModal({ isOpen, onClose, onSuccess }: AdminEmailSignInModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "password">("email");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setEmail("");
      setPassword("");
      setError("");
      setStep("email");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isEmailApproved(trimmedEmail)) {
      const adminPassword = getAdminPassword(trimmedEmail);
      if (adminPassword) {
        setStep("password");
        setError("");
      } else {
        setError("");
        onSuccess(trimmedEmail);
        onClose();
      }
    } else {
      requestEmailApproval(trimmedEmail);
      setError("");
      setEmail("");
      onClose();
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const adminPassword = getAdminPassword(email.trim());
    if (password === adminPassword) {
      setError("");
      setPassword("");
      onSuccess(email.trim());
      onClose();
    } else {
      setError("Incorrect password.");
      setPassword("");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="glass-card-strong rounded-2xl p-8 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: "Sora, sans-serif", color: "#E2E8F0" }}
        >
          {step === "email" ? "Admin Sign In" : "Enter Admin Password"}
        </h2>
        <p className="text-sm mb-6" style={{ color: "oklch(0.60 0.02 220)" }}>
          {step === "email" 
            ? "Enter your email to request admin access. Owner approval required for new emails."
            : `Enter the password for ${email}`}
        </p>

        <form onSubmit={step === "email" ? handleEmailSubmit : handlePasswordSubmit} className="space-y-4">
          <div>
            <input
              ref={inputRef}
              type={step === "email" ? "email" : "password"}
              value={step === "email" ? email : password}
              onChange={(e) => {
                if (step === "email") {
                  setEmail(e.target.value);
                } else {
                  setPassword(e.target.value);
                }
                if (error) setError("");
              }}
              placeholder={step === "email" ? "your.email@example.com" : "Enter password"}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{
                background: "oklch(1 0 0 / 6%)",
                border: error
                  ? "1px solid oklch(0.62 0.22 25 / 70%)"
                  : "1px solid oklch(1 0 0 / 12%)",
                color: "#E2E8F0",
                fontFamily: "DM Sans, sans-serif",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(0.65 0.18 200 / 60%)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.target.style.border = "1px solid oklch(1 0 0 / 12%)";
                }
              }}
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg" style={{ background: "oklch(0.62 0.22 25 / 15%)", color: "oklch(0.70 0.20 25)" }}>
              <p className="text-xs font-semibold">{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold transition-all"
            style={{
              background: "oklch(0.65 0.18 200)",
              color: "oklch(0.15 0 0)",
              fontFamily: "Sora, sans-serif",
            }}
          >
            {step === "email" ? "Continue" : "Sign In"}
          </button>

          {step === "password" && (
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setPassword("");
                setError("");
              }}
              className="w-full py-2 text-sm transition-all"
              style={{ color: "oklch(0.55 0.02 220)" }}
            >
              Back to Email
            </button>
          )}
        </form>

        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-sm transition-all"
          style={{ color: "oklch(0.55 0.02 220)" }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
