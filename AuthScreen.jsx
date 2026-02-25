import { useState, useEffect } from "react";

// ─── IDE-A Auth Screen ────────────────────────────────────────────────────────
// Aesthetic: Dark terminal-luxe. Deep obsidian bg, amber accents, monospace pride.
// ─────────────────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Syne:wght@400;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #0a0a0f;
    --surface:   #111118;
    --border:    #1e1e2e;
    --amber:     #f4a435;
    --amber-dim: #9a6418;
    --red:       #e05c5c;
    --green:     #4ade80;
    --text:      #e8e8f0;
    --muted:     #6b6b80;
    --mono:      'Space Mono', monospace;
    --display:   'Syne', sans-serif;
  }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: var(--mono);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .grid-bg {
    position: fixed; inset: 0; z-index: 0;
    background-image:
      linear-gradient(rgba(244,164,53,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(244,164,53,0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    pointer-events: none;
  }

  .glow-orb {
    position: fixed; width: 600px; height: 600px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(244,164,53,0.06) 0%, transparent 70%);
    top: -200px; right: -200px; z-index: 0;
    animation: pulse 8s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,100% { transform: scale(1); opacity: 0.6; }
    50%      { transform: scale(1.1); opacity: 1; }
  }

  .auth-wrapper {
    position: relative; z-index: 10;
    width: 100%; max-width: 460px;
    padding: 16px;
  }

  .logo-area {
    text-align: center; margin-bottom: 32px;
    animation: fadeDown 0.6s ease both;
  }

  .logo-badge {
    display: inline-flex; align-items: center; gap: 10px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 10px 20px;
    margin-bottom: 16px;
  }

  .logo-icon {
    width: 36px; height: 36px;
    background: var(--amber);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--display);
    font-weight: 800;
    color: #0a0a0f;
    font-size: 18px;
  }

  .logo-name {
    font-family: var(--display);
    font-weight: 800;
    font-size: 22px;
    letter-spacing: 0.05em;
    color: var(--text);
  }

  .logo-name span { color: var(--amber); }

  .logo-tagline {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    animation: fadeUp 0.5s ease both 0.1s;
    position: relative;
    overflow: hidden;
  }

  .card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, transparent, var(--amber), transparent);
  }

  @keyframes fadeDown {
    from { opacity: 0; transform: translateY(-20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .tab-row {
    display: flex;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 4px;
    margin-bottom: 28px;
    gap: 4px;
  }

  .tab-btn {
    flex: 1;
    padding: 9px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: var(--muted);
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: all 0.2s;
    text-transform: uppercase;
  }

  .tab-btn.active {
    background: var(--amber);
    color: #0a0a0f;
    font-weight: 700;
  }

  .field-group { margin-bottom: 18px; }

  .field-label {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--muted);
    margin-bottom: 8px;
  }

  .field-input {
    width: 100%;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 14px;
    color: var(--text);
    font-family: var(--mono);
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s;
  }

  .field-input:focus { border-color: var(--amber); }
  .field-input::placeholder { color: var(--muted); }

  .field-input.error { border-color: var(--red); }

  .error-msg {
    font-size: 11px;
    color: var(--red);
    margin-top: 6px;
  }

  .otp-row {
    display: flex; gap: 8px; justify-content: center;
    margin: 20px 0;
  }

  .otp-digit {
    width: 52px; height: 60px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--amber);
    font-family: var(--display);
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    outline: none;
    transition: border-color 0.2s;
    caret-color: var(--amber);
  }

  .otp-digit:focus { border-color: var(--amber); box-shadow: 0 0 0 3px rgba(244,164,53,0.12); }

  .submit-btn {
    width: 100%;
    padding: 14px;
    background: var(--amber);
    border: none;
    border-radius: 10px;
    color: #0a0a0f;
    font-family: var(--display);
    font-size: 14px;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 8px;
    position: relative;
    overflow: hidden;
  }

  .submit-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
  .submit-btn:active { transform: translateY(0); }
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .submit-btn .spinner {
    display: inline-block;
    width: 14px; height: 14px;
    border: 2px solid rgba(0,0,0,0.3);
    border-top-color: #000;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    vertical-align: middle;
    margin-right: 8px;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .divider {
    display: flex; align-items: center; gap: 12px;
    margin: 20px 0;
    color: var(--muted);
    font-size: 11px;
  }

  .divider::before, .divider::after {
    content: ''; flex: 1;
    height: 1px; background: var(--border);
  }

  .qr-area {
    background: #fff;
    border-radius: 12px;
    width: 160px; height: 160px;
    margin: 0 auto 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: #333;
    text-align: center; padding: 12px;
  }

  .secret-box {
    background: var(--bg);
    border: 1px dashed var(--amber-dim);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    color: var(--amber);
    text-align: center;
    letter-spacing: 0.2em;
    margin-bottom: 16px;
    word-break: break-all;
  }

  .step-indicator {
    display: flex; gap: 6px; justify-content: center; margin-bottom: 24px;
  }

  .step-dot {
    width: 28px; height: 4px;
    border-radius: 2px;
    background: var(--border);
    transition: background 0.3s;
  }

  .step-dot.active { background: var(--amber); }

  .hint-text {
    font-size: 12px;
    color: var(--muted);
    text-align: center;
    line-height: 1.6;
    margin-bottom: 20px;
  }

  .hint-text strong { color: var(--text); }

  .status-badge {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 16px;
  }

  .status-badge.success { background: rgba(74,222,128,0.1); color: var(--green); border: 1px solid rgba(74,222,128,0.2); }
  .status-badge.info    { background: rgba(244,164,53,0.1);  color: var(--amber); border: 1px solid rgba(244,164,53,0.2); }

  .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }

  .footer-note {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
    margin-top: 20px;
    line-height: 1.7;
  }

  .footer-note a { color: var(--amber); text-decoration: none; cursor: pointer; }
`;

// ── Mock 2FA secret (in real app: from server) ──────────────────────────────
const MOCK_SECRET = "JBSWY3DPEHPK3PXP";

export default function AuthScreen() {
  const [tab, setTab]           = useState("login");      // login | register
  const [step, setStep]         = useState(1);            // 1=creds, 2=2fa-setup, 3=2fa-verify, 4=done
  const [loading, setLoading]   = useState(false);
  const [otp, setOtp]           = useState(["","","","","",""]);
  const [error, setError]       = useState("");
  const [form, setForm]         = useState({ username:"", email:"", password:"", confirm:"" });

  const isRegister = tab === "register";

  const handleTabSwitch = (t) => {
    setTab(t); setStep(1); setError(""); setOtp(["","","","","",""]);
    setForm({ username:"", email:"", password:"", confirm:"" });
  };

  const updateForm = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // ── OTP digit input logic ──────────────────────────────────────────────────
  const handleOtpChange = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp]; next[i] = v;
    setOtp(next);
    if (v && i < 5) document.getElementById(`otp-${i+1}`)?.focus();
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0)
      document.getElementById(`otp-${i-1}`)?.focus();
  };

  const handleOtpPaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (text.length === 6) setOtp(text.split(""));
    e.preventDefault();
  };

  // ── Submit handlers (mock — replace with API calls) ───────────────────────
  const handleCredSubmit = async () => {
    setError("");
    if (!form.username || !form.password) { setError("All fields required."); return; }
    if (isRegister && form.password !== form.confirm) { setError("Passwords don't match."); return; }
    if (isRegister && form.password.length < 10) { setError("Password must be ≥ 10 characters."); return; }

    setLoading(true);
    await new Promise(r => setTimeout(r, 1200)); // simulate API
    setLoading(false);

    if (isRegister) setStep(2);   // show 2FA setup
    else            setStep(3);   // go straight to verify
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the full 6-digit code."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    setLoading(false);
    // In prod: POST /auth/verify-totp { code }
    if (code === "123456" || true) { // mock always passes
      setStep(4);
    } else {
      setError("Invalid code. Try again.");
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const Steps = ({ total, current }) => (
    <div className="step-indicator">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`step-dot ${i < current ? "active" : ""}`} />
      ))}
    </div>
  );

  const renderLogin = () => (
    <>
      <div className="field-group">
        <label className="field-label">Username or Email</label>
        <input className={`field-input ${error ? "error" : ""}`}
          placeholder="your_handle"
          value={form.username}
          onChange={e => updateForm("username", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCredSubmit()}
          autoComplete="username"
        />
      </div>
      <div className="field-group">
        <label className="field-label">Password</label>
        <input className={`field-input ${error ? "error" : ""}`}
          type="password" placeholder="••••••••••"
          value={form.password}
          onChange={e => updateForm("password", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCredSubmit()}
          autoComplete="current-password"
        />
        {error && <p className="error-msg">{error}</p>}
      </div>
      <button className="submit-btn" onClick={handleCredSubmit} disabled={loading}>
        {loading ? <><span className="spinner"/>Authenticating...</> : "Sign In →"}
      </button>
      <div className="footer-note">
        <a onClick={() => handleTabSwitch("register")}>No account? Register here</a>
      </div>
    </>
  );

  const renderRegister = () => (
    <>
      <Steps total={3} current={1} />
      <div className="field-group">
        <label className="field-label">Username</label>
        <input className="field-input" placeholder="choose_a_handle"
          value={form.username} onChange={e => updateForm("username", e.target.value)} />
      </div>
      <div className="field-group">
        <label className="field-label">Email</label>
        <input className="field-input" type="email" placeholder="you@domain.com"
          value={form.email} onChange={e => updateForm("email", e.target.value)} />
      </div>
      <div className="field-group">
        <label className="field-label">Password <span style={{color:"var(--muted)"}}>— min 10 chars</span></label>
        <input className="field-input" type="password" placeholder="••••••••••"
          value={form.password} onChange={e => updateForm("password", e.target.value)} />
      </div>
      <div className="field-group">
        <label className="field-label">Confirm Password</label>
        <input className={`field-input ${error ? "error" : ""}`} type="password" placeholder="••••••••••"
          value={form.confirm} onChange={e => updateForm("confirm", e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCredSubmit()} />
        {error && <p className="error-msg">{error}</p>}
      </div>
      <button className="submit-btn" onClick={handleCredSubmit} disabled={loading}>
        {loading ? <><span className="spinner"/>Creating Account...</> : "Continue →"}
      </button>
      <div className="footer-note">
        <a onClick={() => handleTabSwitch("login")}>Already registered? Sign in</a>
      </div>
    </>
  );

  const renderSetup2FA = () => (
    <>
      <Steps total={3} current={2} />
      <div style={{textAlign:"center", marginBottom:8}}>
        <span className="status-badge info"><span className="dot"/>2FA Setup Required</span>
      </div>
      <p className="hint-text">
        Scan this QR code with <strong>Google Authenticator</strong>,{" "}
        <strong>Authy</strong>, or any TOTP app. Then enter the 6-digit code to confirm.
      </p>
      <div className="qr-area">
        {/* In prod: render actual QR from pyotp.totp.TOTP(secret).provisioning_uri() */}
        <div style={{fontSize:10, color:"#555", lineHeight:1.5}}>
          [QR Code]<br/>
          <span style={{fontSize:8}}>Scan with your authenticator app</span>
        </div>
      </div>
      <p className="hint-text" style={{marginBottom:6}}>Or enter this key manually:</p>
      <div className="secret-box">{MOCK_SECRET}</div>
      <button className="submit-btn" onClick={() => { setStep(3); setError(""); }}>
        I've scanned it →
      </button>
    </>
  );

  const renderVerify2FA = () => (
    <>
      {isRegister && <Steps total={3} current={3} />}
      <p className="hint-text">
        Enter the <strong>6-digit code</strong> from your authenticator app.
      </p>
      <div className="otp-row" onPaste={handleOtpPaste}>
        {otp.map((d, i) => (
          <input
            key={i} id={`otp-${i}`}
            className="otp-digit"
            value={d} maxLength={1}
            inputMode="numeric"
            onChange={e => handleOtpChange(i, e.target.value)}
            onKeyDown={e => handleOtpKey(i, e)}
            autoFocus={i === 0}
          />
        ))}
      </div>
      {error && <p className="error-msg" style={{textAlign:"center",marginBottom:12}}>{error}</p>}
      <button className="submit-btn" onClick={handleVerifyOtp} disabled={loading}>
        {loading ? <><span className="spinner"/>Verifying...</> : "Verify Code →"}
      </button>
      <div className="footer-note">
        <a onClick={() => { setOtp(["","","","","",""]); setError(""); document.getElementById("otp-0")?.focus(); }}>
          Didn't get a code? Resend
        </a>
      </div>
    </>
  );

  const renderDone = () => (
    <div style={{textAlign:"center", padding:"16px 0"}}>
      <div style={{fontSize:48, marginBottom:16}}>✦</div>
      <span className="status-badge success"><span className="dot"/>Authenticated</span>
      <p className="hint-text" style={{marginTop:12}}>
        Welcome to <strong>IDE-A</strong>. Your session is encrypted and your 2FA is active.
        Redirecting to workspace…
      </p>
      <button className="submit-btn" style={{marginTop:24}}
        onClick={() => alert("→ Navigate to IDE workspace")}>
        Open Workspace →
      </button>
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="grid-bg" />
      <div className="glow-orb" />
      <div className="auth-wrapper">
        <div className="logo-area">
          <div className="logo-badge">
            <div className="logo-icon">A</div>
            <span className="logo-name">IDE<span>-A</span></span>
          </div>
          <p className="logo-tagline">Secure · Adaptive · Yours</p>
        </div>

        <div className="card">
          {step === 1 && (
            <>
              <div className="tab-row">
                <button className={`tab-btn ${tab==="login" ? "active":""}`} onClick={() => handleTabSwitch("login")}>Sign In</button>
                <button className={`tab-btn ${tab==="register" ? "active":""}`} onClick={() => handleTabSwitch("register")}>Register</button>
              </div>
              {isRegister ? renderRegister() : renderLogin()}
            </>
          )}
          {step === 2 && renderSetup2FA()}
          {step === 3 && renderVerify2FA()}
          {step === 4 && renderDone()}
        </div>
      </div>
    </>
  );
}
