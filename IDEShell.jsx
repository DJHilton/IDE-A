import { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   IDE-A  —  Main Shell + AI Agent
   Aesthetic: Precision industrial. Obsidian panels, amber system,
              surgical typography. Every pixel earns its place.
═══════════════════════════════════════════════════════════════════ */

// ── Default starter files ────────────────────────────────────────
const STARTER_FILES = {
  "main.py": `# IDE-A — Welcome\n# Your AI agent is ready. Start coding.\n\ndef greet(name: str) -> str:\n    return f"Hello, {name}! Welcome to IDE-A."\n\nif __name__ == "__main__":\n    print(greet("World"))\n`,
  "index.js": `// IDE-A Frontend Entry\nconsole.log("IDE-A is running");\n\nconst app = {\n  name: "IDE-A",\n  version: "0.1.0",\n  agent: null,\n};\n\nexport default app;\n`,
  "README.md": `# IDE-A\n\nSecure, adaptive, yours.\n\n## Features\n- Multi-language sandbox\n- AI agent with customizable avatar\n- Built-in 2FA auth\n- API blocker + privacy browser\n- Full theme customization\n\n## Getting Started\n1. Name your AI agent\n2. Customize their avatar\n3. Start building\n`,
  "styles.css": `/* IDE-A Styles */\n:root {\n  --bg: #0a0a0f;\n  --amber: #f4a435;\n  --text: #e8e8f0;\n}\n\nbody {\n  background: var(--bg);\n  color: var(--text);\n  font-family: 'Space Mono', monospace;\n}\n`,
};

const LANG_MAP = { py: "Python", js: "JavaScript", ts: "TypeScript", jsx: "React", tsx: "React/TS", md: "Markdown", css: "CSS", html: "HTML", rs: "Rust", go: "Go", rb: "Ruby", java: "Java", cpp: "C++", c: "C", sh: "Bash" };
const getLang = f => LANG_MAP[f.split(".").pop()] || "Text";

// ── Avatar config ────────────────────────────────────────────────
const SKIN_TONES   = ["#FDDBB4","#F5C18A","#D4956A","#A0624A","#6B3B2B","#3D1F10","#F0E0C8","#C8A882"];
const HAIR_COLORS  = ["#1a1a1a","#3d2b1f","#7B4F2E","#C97D3A","#D4A537","#E8C97A","#F5F0E8","#E03C3C","#3C6BE0","#3CE05C","#C03CE0","#ffffff"];
const EYE_COLORS   = ["#3B6EE0","#3DA85B","#8B4E2F","#6E3BD4","#D4823B","#2B8C8C","#888","#1a1a1a"];
const ACCESSORIES  = ["none","glasses","sunglasses","monocle","eyepatch","headphones","beanie","cap","cowboy-hat","crown","halo","horns","bandana","scarf","wheelchair","crutches","cane","cast-arm"];
const SPECIES      = ["human","cat","dog","fox","rabbit","bear","wolf","panda","tiger","raccoon"];
const EXPRESSIONS  = ["neutral","happy","focused","curious","stern","friendly","mischievous"];

const MENU_ITEMS = {
  File:      ["New File","New Folder","---","Open File","Import from URL","---","Save  Ctrl+S","Save As…","---","Export Project","---","Exit"],
  Edit:      ["Undo  Ctrl+Z","Redo  Ctrl+Y","---","Cut","Copy","Paste","---","Find  Ctrl+F","Replace  Ctrl+H","---","Select All"],
  Options:   ["Preferences","Theme Editor","Font Settings","---","API Blocker","Privacy Browser","---","Keyboard Shortcuts","Extensions"],
  Workspace: ["New Workspace","Open Workspace","---","Split Editor","Toggle Terminal","Toggle Agent","---","Workspaces…"],
  Trash:     ["View Trash","Restore Last Deleted","---","Empty Trash"],
  Account:   ["Profile","Security & 2FA","Billing","---","Sign Out"],
  Settings:  ["General","Editor","Terminal","AI Agent","Browser","Privacy & Security","---","About IDE-A","Check for Updates"],
};

const AGENT_SUGGESTIONS = [
  { type:"warn",  msg:"Avoid storing API keys in plain text. Use environment variables or a secrets manager." },
  { type:"tip",   msg:"Consider adding type hints to your Python functions for better readability and tooling." },
  { type:"tip",   msg:"This function could be refactored. Want me to suggest a cleaner version?" },
  { type:"warn",  msg:"No error handling detected. I can add try/except blocks automatically." },
  { type:"info",  msg:"Best practice: Add a README to document this module's purpose." },
];

// ── SVG Avatar renderer ──────────────────────────────────────────
function AgentAvatar({ cfg, size = 80, animated = false }) {
  const { skin, hair, eyes, species, expression, accessories } = cfg;
  const isAnthro = species !== "human";

  const earShape = () => {
    if (species === "cat" || species === "fox" || species === "wolf" || species === "tiger") return (
      <>
        <polygon points="-28,-32 -16,-54 -6,-30" fill={skin} stroke={hair} strokeWidth="1.5"/>
        <polygon points="28,-32 16,-54 6,-30"  fill={skin} stroke={hair} strokeWidth="1.5"/>
        <polygon points="-26,-34 -16,-50 -8,-32" fill={hair} opacity="0.6"/>
        <polygon points="26,-34 16,-50 8,-32"  fill={hair} opacity="0.6"/>
      </>
    );
    if (species === "rabbit") return (
      <>
        <ellipse cx="-20" cy="-52" rx="7" ry="22" fill={skin} stroke={hair} strokeWidth="1.5"/>
        <ellipse cx="20"  cy="-52" rx="7" ry="22" fill={skin} stroke={hair} strokeWidth="1.5"/>
        <ellipse cx="-20" cy="-52" rx="4" ry="18" fill="#f9c0c0" opacity="0.7"/>
        <ellipse cx="20"  cy="-52" rx="4" ry="18" fill="#f9c0c0" opacity="0.7"/>
      </>
    );
    if (species === "bear" || species === "panda") return (
      <>
        <circle cx="-26" cy="-34" r="12" fill={species==="panda"?"#1a1a1a":hair}/>
        <circle cx="26"  cy="-34" r="12" fill={species==="panda"?"#1a1a1a":hair}/>
      </>
    );
    if (species === "dog") return (
      <>
        <ellipse cx="-26" cy="-28" rx="10" ry="16" fill={hair} transform="rotate(20,-26,-28)"/>
        <ellipse cx="26"  cy="-28" rx="10" ry="16" fill={hair} transform="rotate(-20,26,-28)"/>
      </>
    );
    return null;
  };

  const headShape = species === "raccoon" || species === "panda" ? (
    <ellipse cx="0" cy="0" rx="36" ry="34" fill={skin}/>
  ) : (
    <ellipse cx="0" cy="0" rx="34" ry="32" fill={skin}/>
  );

  const muzzle = isAnthro ? (
    <ellipse cx="0" cy="16" rx="14" ry="10" fill={skin} opacity="0.85"/>
  ) : null;

  const nose = isAnthro ? (
    species === "cat" || species === "fox" || species === "rabbit" ?
      <path d="M-4,13 Q0,11 4,13 Q0,17 -4,13" fill={hair} opacity="0.8"/> :
      <ellipse cx="0" cy="13" rx="7" ry="5" fill={hair} opacity="0.7"/>
  ) : (
    <ellipse cx="0" cy="10" rx="8" ry="6" fill="#2a2a2a" opacity="0.15"/>
  );

  const eyeStyle = () => {
    if (expression === "happy") return (
      <>
        <path d="M-16,-4 Q-12,-10 -8,-4" fill="none" stroke={eyes} strokeWidth="3" strokeLinecap="round"/>
        <path d="M8,-4 Q12,-10 16,-4" fill="none" stroke={eyes} strokeWidth="3" strokeLinecap="round"/>
      </>
    );
    if (expression === "stern") return (
      <>
        <ellipse cx="-12" cy="-4" rx="6" ry="5" fill={eyes}/>
        <ellipse cx="12"  cy="-4" rx="6" ry="5" fill={eyes}/>
        <line x1="-18" y1="-10" x2="-6" y2="-8" stroke={hair} strokeWidth="2.5"/>
        <line x1="6"  y1="-8"  x2="18" y2="-10" stroke={hair} strokeWidth="2.5"/>
        <circle cx="-12" cy="-4" r="2.5" fill="#fff" opacity="0.6"/>
        <circle cx="12"  cy="-4" r="2.5" fill="#fff" opacity="0.6"/>
      </>
    );
    if (expression === "mischievous") return (
      <>
        <ellipse cx="-12" cy="-4" rx="6" ry="5" fill={eyes}/>
        <ellipse cx="12"  cy="-4" rx="6" ry="5" fill={eyes}/>
        <path d="M-18,-10 Q-12,-8 -6,-10" fill="none" stroke={hair} strokeWidth="2"/>
        <path d="M6,-10 Q12,-6 18,-10" fill="none" stroke={hair} strokeWidth="2"/>
        <circle cx="-12" cy="-4" r="2.5" fill="#fff" opacity="0.6"/>
        <circle cx="12"  cy="-4" r="2.5" fill="#fff" opacity="0.6"/>
      </>
    );
    return (
      <>
        <ellipse cx="-12" cy="-4" rx="6" ry="6" fill={eyes}/>
        <ellipse cx="12"  cy="-4" rx="6" ry="6" fill={eyes}/>
        <circle cx="-12" cy="-4" r="2.5" fill="#fff" opacity="0.6"/>
        <circle cx="12"  cy="-4" r="2.5" fill="#fff" opacity="0.6"/>
        <circle cx="-10" cy="-6" r="1.2" fill="#fff" opacity="0.9"/>
        <circle cx="14"  cy="-6" r="1.2" fill="#fff" opacity="0.9"/>
      </>
    );
  };

  const mouthStyle = () => {
    if (expression === "happy") return <path d="M-10,20 Q0,28 10,20" fill="none" stroke={hair} strokeWidth="2.5" strokeLinecap="round" opacity="0.7"/>;
    if (expression === "stern") return <line x1="-8" y1="22" x2="8" y2="22" stroke={hair} strokeWidth="2" opacity="0.6"/>;
    if (expression === "curious") return <path d="M-6,20 Q0,26 6,20" fill="none" stroke={hair} strokeWidth="2" opacity="0.6"/>;
    return <path d="M-7,21 Q0,25 7,21" fill="none" stroke={hair} strokeWidth="2" opacity="0.5"/>;
  };

  const hairStyle = () => {
    if (isAnthro) return <ellipse cx="0" cy="-24" rx="34" ry="14" fill={hair} opacity="0.9"/>;
    return (
      <>
        <ellipse cx="0" cy="-26" rx="34" ry="16" fill={hair}/>
        <rect x="-34" y="-30" width="68" height="12" fill={hair} rx="4"/>
        <ellipse cx="-28" cy="-18" rx="10" ry="18" fill={hair}/>
        <ellipse cx="28"  cy="-18" rx="10" ry="18" fill={hair}/>
      </>
    );
  };

  const renderAccessory = () => {
    if (!accessories || accessories === "none") return null;
    if (accessories === "glasses") return (
      <g opacity="0.9">
        <circle cx="-12" cy="-4" r="9" fill="none" stroke="#888" strokeWidth="1.5"/>
        <circle cx="12"  cy="-4" r="9" fill="none" stroke="#888" strokeWidth="1.5"/>
        <line x1="-3" y1="-4" x2="3" y2="-4" stroke="#888" strokeWidth="1.5"/>
        <line x1="-21" y1="-4" x2="-26" y2="-2" stroke="#888" strokeWidth="1.5"/>
        <line x1="21"  y1="-4" x2="26" y2="-2" stroke="#888" strokeWidth="1.5"/>
      </g>
    );
    if (accessories === "sunglasses") return (
      <g opacity="0.95">
        <rect x="-22" y="-11" width="18" height="12" rx="4" fill="#1a1a2e" opacity="0.9"/>
        <rect x="4"   y="-11" width="18" height="12" rx="4" fill="#1a1a2e" opacity="0.9"/>
        <line x1="-4" y1="-5" x2="4" y2="-5" stroke="#555" strokeWidth="1.5"/>
        <line x1="-22" y1="-5" x2="-27" y2="-3" stroke="#555" strokeWidth="1.5"/>
        <line x1="22"  y1="-5" x2="27" y2="-3" stroke="#555" strokeWidth="1.5"/>
      </g>
    );
    if (accessories === "crown") return (
      <g>
        <path d="M-20,-42 L-28,-56 L-12,-46 L0,-60 L12,-46 L28,-56 L20,-42 Z" fill="#FFD700" stroke="#E0A000" strokeWidth="1"/>
        <circle cx="0" cy="-56" r="3" fill="#E03C3C"/>
        <circle cx="-22" cy="-52" r="2" fill="#3C6BE0"/>
        <circle cx="22"  cy="-52" r="2" fill="#3CE05C"/>
      </g>
    );
    if (accessories === "beanie") return (
      <g>
        <ellipse cx="0" cy="-34" rx="36" ry="18" fill={hair} opacity="0.95"/>
        <rect x="-36" y="-44" width="72" height="16" rx="6" fill={hair}/>
        <ellipse cx="0" cy="-54" rx="14" ry="12" fill={hair}/>
        <circle cx="0" cy="-60" r="6" fill={hair} opacity="0.8"/>
      </g>
    );
    if (accessories === "headphones") return (
      <g opacity="0.9">
        <path d="M-34,-4 Q-34,-50 0,-50 Q34,-50 34,-4" fill="none" stroke="#333" strokeWidth="4"/>
        <rect x="-40" y="-16" width="14" height="22" rx="5" fill="#222"/>
        <rect x="26"  y="-16" width="14" height="22" rx="5" fill="#222"/>
        <rect x="-39" y="-14" width="12" height="18" rx="4" fill={hair} opacity="0.7"/>
        <rect x="27"  y="-14" width="12" height="18" rx="4" fill={hair} opacity="0.7"/>
      </g>
    );
    if (accessories === "eyepatch") return (
      <g>
        <ellipse cx="-12" cy="-4" rx="9" ry="8" fill="#1a1a1a"/>
        <line x1="-21" y1="-10" x2="4" y2="-10" stroke="#333" strokeWidth="2"/>
      </g>
    );
    if (accessories === "halo") return (
      <ellipse cx="0" cy="-50" rx="22" ry="6" fill="none" stroke="#FFD700" strokeWidth="3" opacity="0.9"/>
    );
    if (accessories === "horns") return (
      <g fill="#8B0000">
        <path d="M-18,-34 Q-22,-56 -14,-58 Q-8,-56 -10,-34"/>
        <path d="M18,-34 Q22,-56 14,-58 Q8,-56 10,-34"/>
      </g>
    );
    if (accessories === "cap") return (
      <g>
        <ellipse cx="0" cy="-28" rx="38" ry="14" fill={hair}/>
        <rect x="-38" y="-42" width="76" height="16" rx="6" fill={hair}/>
        <rect x="-40" y="-28" width="50" height="10" rx="4" fill={hair} opacity="0.8"/>
      </g>
    );
    return null;
  };

  const pandaMask = species === "panda" ? (
    <>
      <ellipse cx="-14" cy="-2" rx="10" ry="9" fill="#1a1a1a" opacity="0.85"/>
      <ellipse cx="14"  cy="-2" rx="10" ry="9" fill="#1a1a1a" opacity="0.85"/>
    </>
  ) : null;

  const raccoonMask = species === "raccoon" ? (
    <path d="M-22,-14 Q-10,-20 0,-14 Q10,-20 22,-14 L18,4 Q10,0 0,2 Q-10,0 -18,4 Z" fill="#1a1a1a" opacity="0.5"/>
  ) : null;

  return (
    <svg width={size} height={size} viewBox="-50 -70 100 110" style={{ display:"block", filter: animated ? "drop-shadow(0 0 12px rgba(244,164,53,0.3))" : "none" }}>
      {earShape()}
      {headShape}
      {pandaMask}
      {raccoonMask}
      {hairStyle()}
      {muzzle}
      {eyeStyle()}
      {nose}
      {mouthStyle()}
      {renderAccessory()}
    </svg>
  );
}

// ── Syntax highlight (lightweight) ──────────────────────────────
function highlight(code, ext) {
  const esc = code.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  if (["py","js","ts","jsx","tsx","rs","go","rb","java","cpp","c"].includes(ext)) {
    return esc
      .replace(/(#[^\n]*|\/\/[^\n]*)/g,       '<span class="hl-comment">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, '<span class="hl-string">$1</span>')
      .replace(/\b(def|class|import|from|return|if|else|elif|for|while|in|not|and|or|True|False|None|const|let|var|function|async|await|export|default|import|type|interface|extends|implements|new|this|super|pub|fn|use|mod|struct|enum|impl|go|func|package|select|case|switch|break|continue|throw|try|catch|finally|yield)\b/g,
        '<span class="hl-kw">$1</span>')
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="hl-num">$1</span>');
  }
  if (ext === "css") {
    return esc
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
      .replace(/([a-zA-Z-]+)(?=\s*:)/g, '<span class="hl-kw">$1</span>')
      .replace(/(:[\s]*[^;{}\n]+)/g, '<span class="hl-string">$1</span>');
  }
  if (ext === "md") {
    return esc
      .replace(/^(#{1,6}\s.+)$/gm, '<span class="hl-kw">$1</span>')
      .replace(/(`[^`]+`)/g, '<span class="hl-string">$1</span>')
      .replace(/(\*\*[^*]+\*\*)/g, '<strong>$1</strong>');
  }
  return esc;
}

// ─────────────────────────────────────────────────────────────────
//  MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
export default function IDEShell() {
  // ── File state ─────────────────────────────────────────────────
  const [files, setFiles]           = useState(STARTER_FILES);
  const [openTabs, setOpenTabs]     = useState(["main.py","index.js"]);
  const [activeTab, setActiveTab]   = useState("main.py");
  const [fileContent, setFileContent] = useState(STARTER_FILES);

  // ── UI panels ──────────────────────────────────────────────────
  const [termOpen, setTermOpen]     = useState(true);
  const [agentOpen, setAgentOpen]   = useState(true);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [termLines, setTermLines]   = useState([
    { t:"sys",  v:"IDE-A v0.1.0 — Secure Adaptive IDE" },
    { t:"sys",  v:"Type 'help' for available commands." },
    { t:"prompt", v:"" },
  ]);
  const [termInput, setTermInput]   = useState("");
  const termRef = useRef(null);

  // ── Agent state ────────────────────────────────────────────────
  const [agentName, setAgentName]   = useState("ARIA");
  const [agentInput, setAgentInput] = useState("");
  const [agentChat, setAgentChat]   = useState([
    { role:"agent", text:`Hi! I'm ARIA, your AI coding assistant. I'm watching your code and I'm here to help. What are we building today?` },
  ]);
  const [avatarCfg, setAvatarCfg]   = useState({
    skin: SKIN_TONES[0], hair: HAIR_COLORS[2], eyes: EYE_COLORS[0],
    species: "human", expression: "friendly", accessories: "none",
  });
  const [agentTyping, setAgentTyping] = useState(false);
  const chatRef = useRef(null);

  // ── Editor helpers ─────────────────────────────────────────────
  const currentContent = fileContent[activeTab] || "";
  const currentExt = activeTab.split(".").pop();

  const openFile = (name) => {
    if (!openTabs.includes(name)) setOpenTabs(t => [...t, name]);
    setActiveTab(name);
  };

  const closeTab = (name, e) => {
    e.stopPropagation();
    const next = openTabs.filter(t => t !== name);
    setOpenTabs(next);
    if (activeTab === name) setActiveTab(next[next.length - 1] || "");
  };

  const editContent = (v) => {
    setFileContent(f => ({ ...f, [activeTab]: v }));
  };

  const newFile = () => {
    const name = `untitled_${Date.now()}.py`;
    setFiles(f => ({ ...f, [name]: "" }));
    setFileContent(f => ({ ...f, [name]: "" }));
    openFile(name);
  };

  // ── Terminal ────────────────────────────────────────────────────
  const runTermCmd = (cmd) => {
    const trim = cmd.trim();
    let out = [];
    if (!trim) {}
    else if (trim === "help") {
      out = [
        { t:"out", v:"Available commands:" },
        { t:"out", v:"  ls          — list files" },
        { t:"out", v:"  cat <file>  — show file content" },
        { t:"out", v:"  run <file>  — simulate running a file" },
        { t:"out", v:"  clear       — clear terminal" },
        { t:"out", v:"  agent       — talk to AI agent" },
      ];
    } else if (trim === "ls") {
      out = Object.keys(files).map(f => ({ t:"out", v:`  ${f}` }));
    } else if (trim.startsWith("cat ")) {
      const fn = trim.slice(4).trim();
      if (files[fn] !== undefined) {
        out = (fileContent[fn]||"").split("\n").map(l => ({ t:"out", v:l }));
      } else {
        out = [{ t:"err", v:`File not found: ${fn}` }];
      }
    } else if (trim === "clear") {
      setTermLines([{ t:"prompt", v:"" }]);
      return;
    } else if (trim.startsWith("run ")) {
      const fn = trim.slice(4).trim();
      out = [
        { t:"out", v:`→ Running ${fn}…` },
        { t:"out", v:`[Process started]` },
        { t:"out", v:`Hello, World! Welcome to IDE-A.` },
        { t:"out", v:`[Process exited with code 0]` },
      ];
    } else if (trim.startsWith("agent ")) {
      const msg = trim.slice(6);
      out = [{ t:"agent", v:`ARIA: Got it — "${msg}". Check the agent panel for my response.` }];
      sendAgentMessage(msg);
    } else {
      out = [{ t:"err", v:`Command not found: ${trim}. Type 'help' for commands.` }];
    }
    setTermLines(l => [
      ...l.slice(0,-1),
      { t:"cmd", v:`$ ${cmd}` },
      ...out,
      { t:"prompt", v:"" },
    ]);
  };

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [termLines]);

  // ── Agent chat ──────────────────────────────────────────────────
  const sendAgentMessage = useCallback((msg) => {
    const userMsg = msg || agentInput.trim();
    if (!userMsg) return;
    setAgentInput("");
    setAgentChat(c => [...c, { role:"user", text:userMsg }]);
    setAgentTyping(true);

    const lower = userMsg.toLowerCase();
    let reply = "";

    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      reply = `Hey there! I'm ${agentName} — always on. What are we working on?`;
    } else if (lower.includes("security") || lower.includes("encrypt")) {
      reply = `Security is my priority. Make sure you're using environment variables for secrets, never hardcode API keys. Want me to scan your current file for potential leaks?`;
    } else if (lower.includes("refactor") || lower.includes("clean")) {
      reply = `I can suggest a refactored version of your current file. I'll focus on readability, type safety, and DRY principles. Want to see it?`;
    } else if (lower.includes("bug") || lower.includes("error") || lower.includes("fix")) {
      reply = `I'll scan your code for issues. Common pitfalls I check: unhandled exceptions, undefined variables, type mismatches, and off-by-one errors. Running analysis…`;
    } else if (lower.includes("name")) {
      reply = `My name is ${agentName}! You can rename me anytime in the avatar panel (the face icon above).`;
    } else if (lower.includes("avatar") || lower.includes("look") || lower.includes("appear")) {
      reply = `You can customize my avatar — species, skin, hair, eyes, accessories and more. Hit the avatar button at the top of this panel!`;
    } else if (lower.includes("run") || lower.includes("execute")) {
      reply = `To run your code, use the terminal below. Type 'run ${activeTab}' to simulate execution. Full runtime support coming in the next build!`;
    } else {
      const random = AGENT_SUGGESTIONS[Math.floor(Math.random() * AGENT_SUGGESTIONS.length)];
      reply = `${random.msg} — Also regarding your question: I'm continuously learning. What specifically would you like me to help with in '${activeTab}'?`;
    }

    setTimeout(() => {
      setAgentTyping(false);
      setAgentChat(c => [...c, { role:"agent", text:reply }]);
    }, 900 + Math.random() * 600);
  }, [agentInput, agentName, activeTab]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [agentChat, agentTyping]);

  // ── Menu handler ────────────────────────────────────────────────
  const handleMenuAction = (item) => {
    setActiveMenu(null);
    if (item === "New File") newFile();
    else if (item === "Toggle Terminal") setTermOpen(t => !t);
    else if (item === "Toggle Agent")    setAgentOpen(t => !t);
    else if (item === "Exit") alert("Close IDE-A? Save your work first.");
  };

  // ── Close menus on outside click ─────────────────────────────
  useEffect(() => {
    const h = () => setActiveMenu(null);
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);

  // ── Line numbers ─────────────────────────────────────────────
  const lineCount = (currentContent.match(/\n/g)||[]).length + 1;

  return (
    <div className="idea-shell">
      <style>{CSS}</style>

      {/* ── MENU BAR ─────────────────────────────────────────── */}
      <header className="menubar" onClick={e => e.stopPropagation()}>
        <div className="menubar-left">
          <div className="logo-pill">
            <span className="logo-a">A</span>
            <span className="logo-text">IDE<em>-A</em></span>
          </div>
          {Object.entries(MENU_ITEMS).map(([label, items]) => (
            <div key={label} className="menu-item-wrap">
              <button
                className={`menu-btn ${activeMenu === label ? "active" : ""}`}
                onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === label ? null : label); }}
              >
                {label}
              </button>
              {activeMenu === label && (
                <div className="dropdown">
                  {items.map((item, i) =>
                    item === "---" ? <div key={i} className="dd-sep"/> :
                    <button key={i} className="dd-item" onClick={() => handleMenuAction(item)}>
                      {item}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="menubar-right">
          <span className="status-dot green"/>
          <span className="status-label">Connected</span>
          <button className="icon-btn" title="2FA Active">🔒</button>
          <div className="user-chip">
            <AgentAvatar cfg={avatarCfg} size={26}/>
            <span>User</span>
          </div>
        </div>
      </header>

      {/* ── MAIN LAYOUT ──────────────────────────────────────── */}
      <div className="main-layout">

        {/* ── SIDEBAR / FILE TREE ────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <span>EXPLORER</span>
            <button className="icon-btn small" onClick={newFile} title="New File">+</button>
          </div>
          <div className="file-tree">
            <div className="tree-section">
              <span className="tree-dir">📁 workspace</span>
              {Object.keys(files).map(name => (
                <button
                  key={name}
                  className={`tree-file ${activeTab === name ? "active" : ""}`}
                  onClick={() => openFile(name)}
                >
                  <span className="file-icon">{getFileIcon(name)}</span>
                  <span className="file-name">{name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="sidebar-footer">
            <button className="sidebar-action" onClick={() => setTermOpen(t=>!t)}>
              {termOpen ? "▼" : "▲"} Terminal
            </button>
            <button className="sidebar-action" onClick={() => setAgentOpen(t=>!t)}>
              ◈ Agent
            </button>
          </div>
        </aside>

        {/* ── EDITOR + TERMINAL ──────────────────────────────── */}
        <div className="editor-col">

          {/* Tab bar */}
          <div className="tab-bar">
            {openTabs.map(name => (
              <div key={name} className={`editor-tab ${activeTab===name?"active":""}`} onClick={() => setActiveTab(name)}>
                <span className="file-icon small">{getFileIcon(name)}</span>
                <span>{name}</span>
                <button className="tab-close" onClick={e => closeTab(name,e)}>×</button>
              </div>
            ))}
            <button className="new-tab-btn" onClick={newFile}>+</button>
            <div className="tab-bar-info">
              <span className="lang-badge">{getLang(activeTab)}</span>
            </div>
          </div>

          {/* Editor */}
          <div className="editor-area">
            <div className="line-numbers">
              {Array.from({ length: lineCount }).map((_, i) => (
                <div key={i} className="ln">{i+1}</div>
              ))}
            </div>
            <div className="code-highlight-wrap">
              <pre
                className="code-highlight"
                dangerouslySetInnerHTML={{ __html: highlight(currentContent, currentExt) + "\n" }}
                aria-hidden="true"
              />
              <textarea
                className="code-textarea"
                value={currentContent}
                onChange={e => editContent(e.target.value)}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
              />
            </div>
          </div>

          {/* Terminal */}
          {termOpen && (
            <div className="terminal">
              <div className="terminal-header">
                <span>TERMINAL</span>
                <div style={{display:"flex",gap:6}}>
                  <button className="icon-btn small" onClick={() => setTermLines([{t:"prompt",v:""}])}>Clear</button>
                  <button className="icon-btn small" onClick={() => setTermOpen(false)}>×</button>
                </div>
              </div>
              <div className="terminal-body" ref={termRef}>
                {termLines.map((l, i) => (
                  <div key={i} className={`term-line ${l.t}`}>
                    {l.t === "prompt" ? (
                      <span className="term-prompt">
                        <span className="prompt-sym">❯</span>
                        <input
                          className="term-input"
                          value={termInput}
                          onChange={e => setTermInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { runTermCmd(termInput); setTermInput(""); }}}
                          placeholder="type a command…"
                          autoFocus
                        />
                      </span>
                    ) : (
                      <span>{l.v}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── AI AGENT PANEL ─────────────────────────────────── */}
        {agentOpen && (
          <aside className="agent-panel">
            {/* Agent header */}
            <div className="agent-header">
              <div className="agent-avatar-wrap" onClick={() => setAvatarOpen(o=>!o)}>
                <AgentAvatar cfg={avatarCfg} size={52} animated />
                <div className="agent-status-ring"/>
              </div>
              <div className="agent-info">
                <input
                  className="agent-name-input"
                  value={agentName}
                  onChange={e => setAgentName(e.target.value)}
                  title="Click to rename your agent"
                />
                <span className="agent-role">AI Coding Assistant</span>
                <span className="agent-mood">● Active</span>
              </div>
              <button className="icon-btn" onClick={() => setAgentOpen(false)} style={{marginLeft:"auto"}}>×</button>
            </div>

            {/* Avatar customizer */}
            {avatarOpen && (
              <div className="avatar-customizer">
                <div className="cust-title">Customize Avatar</div>

                <div className="cust-section">
                  <span className="cust-label">Species</span>
                  <div className="cust-pills">
                    {SPECIES.map(s => (
                      <button key={s} className={`cust-pill ${avatarCfg.species===s?"on":""}`}
                        onClick={() => setAvatarCfg(c=>({...c, species:s}))}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cust-section">
                  <span className="cust-label">Skin</span>
                  <div className="color-swatches">
                    {SKIN_TONES.map(c => (
                      <button key={c} className={`swatch ${avatarCfg.skin===c?"on":""}`}
                        style={{background:c}} onClick={() => setAvatarCfg(a=>({...a,skin:c}))}/>
                    ))}
                  </div>
                </div>

                <div className="cust-section">
                  <span className="cust-label">Hair / Fur</span>
                  <div className="color-swatches">
                    {HAIR_COLORS.map(c => (
                      <button key={c} className={`swatch ${avatarCfg.hair===c?"on":""}`}
                        style={{background:c}} onClick={() => setAvatarCfg(a=>({...a,hair:c}))}/>
                    ))}
                  </div>
                </div>

                <div className="cust-section">
                  <span className="cust-label">Eye Color</span>
                  <div className="color-swatches">
                    {EYE_COLORS.map(c => (
                      <button key={c} className={`swatch ${avatarCfg.eyes===c?"on":""}`}
                        style={{background:c}} onClick={() => setAvatarCfg(a=>({...a,eyes:c}))}/>
                    ))}
                  </div>
                </div>

                <div className="cust-section">
                  <span className="cust-label">Expression</span>
                  <div className="cust-pills">
                    {EXPRESSIONS.map(x => (
                      <button key={x} className={`cust-pill ${avatarCfg.expression===x?"on":""}`}
                        onClick={() => setAvatarCfg(c=>({...c,expression:x}))}>
                        {x}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cust-section">
                  <span className="cust-label">Accessory</span>
                  <div className="cust-pills wrap">
                    {ACCESSORIES.map(a => (
                      <button key={a} className={`cust-pill ${avatarCfg.accessories===a?"on":""}`}
                        onClick={() => setAvatarCfg(c=>({...c,accessories:a}))}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{textAlign:"center",marginTop:12}}>
                  <AgentAvatar cfg={avatarCfg} size={80} animated/>
                </div>
              </div>
            )}

            {/* Suggestions strip */}
            <div className="suggestions-strip">
              {AGENT_SUGGESTIONS.slice(0,2).map((s,i) => (
                <div key={i} className={`suggestion ${s.type}`}>
                  <span className="sug-icon">{s.type==="warn"?"⚠":"💡"}</span>
                  <span>{s.msg}</span>
                </div>
              ))}
            </div>

            {/* Chat */}
            <div className="agent-chat" ref={chatRef}>
              {agentChat.map((m, i) => (
                <div key={i} className={`chat-msg ${m.role}`}>
                  {m.role === "agent" && (
                    <div className="chat-avatar-sm">
                      <AgentAvatar cfg={avatarCfg} size={28}/>
                    </div>
                  )}
                  <div className="chat-bubble">{m.text}</div>
                </div>
              ))}
              {agentTyping && (
                <div className="chat-msg agent">
                  <div className="chat-avatar-sm"><AgentAvatar cfg={avatarCfg} size={28}/></div>
                  <div className="chat-bubble typing">
                    <span/><span/><span/>
                  </div>
                </div>
              )}
            </div>

            {/* Chat input */}
            <div className="agent-input-row">
              <input
                className="agent-input"
                placeholder={`Ask ${agentName}…`}
                value={agentInput}
                onChange={e => setAgentInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendAgentMessage()}
              />
              <button className="send-btn" onClick={() => sendAgentMessage()} disabled={!agentInput.trim()}>
                ↑
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

// ── File icon helper ─────────────────────────────────────────────
function getFileIcon(name) {
  const ext = name.split(".").pop();
  const map = { py:"🐍", js:"🟨", ts:"🔷", jsx:"⚛", tsx:"⚛", md:"📝", css:"🎨", html:"🌐", rs:"🦀", go:"🐹", rb:"💎", sh:"🖥", json:"📋" };
  return map[ext] || "📄";
}

// ─────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&family=DM+Sans:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

:root {
  --bg:       #09090e;
  --s1:       #0f0f16;
  --s2:       #141420;
  --border:   #1c1c2e;
  --border2:  #252538;
  --amber:    #f4a435;
  --amber2:   #c07c1a;
  --text:     #dddde8;
  --muted:    #5a5a72;
  --green:    #4ade80;
  --red:      #f87171;
  --blue:     #60a5fa;
  --mono:     'Space Mono', monospace;
  --sans:     'DM Sans', sans-serif;
  --disp:     'Syne', sans-serif;
  --term-green: #39ff7a;
}

.idea-shell {
  width: 100vw; height: 100vh;
  display: flex; flex-direction: column;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  overflow: hidden;
  user-select: none;
}

/* ── MENU BAR ──────────────────────────────────────────────────── */
.menubar {
  height: 42px; min-height: 42px;
  background: var(--s1);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center;
  padding: 0 12px;
  gap: 4px;
  position: relative; z-index: 100;
}

.menubar-left { display:flex; align-items:center; gap:2px; flex:1; }
.menubar-right { display:flex; align-items:center; gap:10px; }

.logo-pill {
  display: flex; align-items: center; gap: 7px;
  padding: 4px 10px 4px 4px;
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: 8px;
  margin-right: 8px;
  flex-shrink: 0;
}

.logo-a {
  width: 24px; height: 24px;
  background: var(--amber);
  border-radius: 5px;
  display: flex; align-items:center; justify-content:center;
  font-family: var(--disp);
  font-weight: 800; font-size: 14px;
  color: #0a0a0f;
}

.logo-text {
  font-family: var(--disp);
  font-weight: 800; font-size: 15px;
  color: var(--text);
}
.logo-text em { color: var(--amber); font-style:normal; }

.menu-item-wrap { position: relative; }

.menu-btn {
  background: none; border: none;
  padding: 5px 10px;
  border-radius: 6px;
  color: var(--muted);
  font-family: var(--sans); font-size: 12px;
  cursor: pointer;
  transition: all .15s;
}
.menu-btn:hover, .menu-btn.active {
  background: var(--s2); color: var(--text);
}

.dropdown {
  position: absolute; top: calc(100% + 4px); left: 0;
  min-width: 200px;
  background: var(--s2);
  border: 1px solid var(--border2);
  border-radius: 10px;
  padding: 6px;
  z-index: 200;
  box-shadow: 0 16px 48px rgba(0,0,0,.6);
  animation: ddFade .12s ease;
}

@keyframes ddFade {
  from { opacity:0; transform:translateY(-6px); }
  to   { opacity:1; transform:translateY(0); }
}

.dd-item {
  display: block; width: 100%;
  padding: 7px 12px;
  background: none; border: none;
  border-radius: 6px;
  color: var(--text); font-family: var(--sans); font-size: 12px;
  text-align: left; cursor: pointer;
  transition: background .1s;
  white-space: nowrap;
}
.dd-item:hover { background: var(--border); }

.dd-sep {
  height: 1px; background: var(--border);
  margin: 4px 0;
}

.status-dot { width:7px; height:7px; border-radius:50%; }
.status-dot.green { background: var(--green); box-shadow: 0 0 6px var(--green); }
.status-label { font-size:11px; color:var(--muted); }

.user-chip {
  display:flex; align-items:center; gap:7px;
  background: var(--s2); border: 1px solid var(--border2);
  border-radius: 20px; padding: 3px 10px 3px 3px;
  font-size: 12px; cursor: pointer;
}

.icon-btn {
  background: none; border: none;
  color: var(--muted); font-size: 14px;
  cursor: pointer; padding: 4px 6px;
  border-radius: 5px; transition: all .15s;
  line-height:1;
}
.icon-btn:hover { background: var(--border); color: var(--text); }
.icon-btn.small { font-size: 12px; }

/* ── MAIN LAYOUT ───────────────────────────────────────────────── */
.main-layout {
  flex: 1; display: flex; overflow: hidden;
}

/* ── SIDEBAR ───────────────────────────────────────────────────── */
.sidebar {
  width: 220px; min-width: 180px;
  background: var(--s1);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  padding: 10px 12px;
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--muted);
  border-bottom: 1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
}

.file-tree {
  flex:1; overflow-y: auto; padding: 8px 0;
}
.file-tree::-webkit-scrollbar { width:4px; }
.file-tree::-webkit-scrollbar-track { background:transparent; }
.file-tree::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

.tree-section { padding: 0 8px; }

.tree-dir {
  display: block;
  font-size: 11px; color: var(--muted);
  padding: 4px 6px; margin-bottom: 2px;
  font-family: var(--mono);
}

.tree-file {
  display: flex; align-items:center; gap:7px;
  width: 100%; padding: 5px 8px;
  background: none; border: none;
  border-radius: 6px;
  color: var(--muted); font-family: var(--sans); font-size: 12px;
  text-align: left; cursor: pointer;
  transition: all .12s;
  margin-bottom: 1px;
}
.tree-file:hover { background: var(--border); color: var(--text); }
.tree-file.active { background: rgba(244,164,53,.1); color: var(--amber); }

.file-icon { font-size: 13px; line-height:1; }
.file-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid var(--border);
  display: flex; flex-direction:column; gap: 4px;
}

.sidebar-action {
  background: none; border: 1px solid var(--border2);
  border-radius: 6px; padding: 5px 10px;
  color: var(--muted); font-family: var(--sans); font-size: 11px;
  cursor: pointer; text-align:left; transition: all .12s;
}
.sidebar-action:hover { background: var(--border); color: var(--text); }

/* ── EDITOR COLUMN ─────────────────────────────────────────────── */
.editor-col {
  flex: 1; display: flex; flex-direction: column;
  overflow: hidden; min-width: 0;
}

/* Tab bar */
.tab-bar {
  height: 38px; min-height: 38px;
  background: var(--s1);
  border-bottom: 1px solid var(--border);
  display: flex; align-items: flex-end;
  padding: 0 8px;
  gap: 2px; overflow-x: auto;
}
.tab-bar::-webkit-scrollbar { height: 0; }

.editor-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px 5px;
  border-radius: 6px 6px 0 0;
  background: var(--s2);
  border: 1px solid var(--border);
  border-bottom: none;
  color: var(--muted); font-size: 12px; font-family: var(--sans);
  cursor: pointer; white-space: nowrap;
  transition: all .12s;
  margin-bottom: -1px;
}
.editor-tab:hover { color: var(--text); }
.editor-tab.active {
  background: var(--bg);
  border-color: var(--border2);
  color: var(--amber);
}

.tab-close {
  background: none; border: none;
  color: var(--muted); font-size: 14px;
  cursor: pointer; padding: 0 2px;
  border-radius: 3px; line-height:1;
  margin-left: 2px;
}
.tab-close:hover { background:rgba(248,113,113,.15); color:var(--red); }

.file-icon.small { font-size:11px; }

.new-tab-btn {
  background: none; border: none;
  color: var(--muted); font-size: 16px;
  cursor: pointer; padding: 0 8px; padding-bottom:6px;
  transition: color .12s;
}
.new-tab-btn:hover { color: var(--amber); }

.tab-bar-info { margin-left:auto; display:flex;align-items:center; padding-bottom:4px; }
.lang-badge {
  font-size:10px; letter-spacing:.1em; text-transform:uppercase;
  color:var(--amber); background:rgba(244,164,53,.08);
  border:1px solid rgba(244,164,53,.2); border-radius:4px;
  padding:2px 8px;
}

/* Editor area */
.editor-area {
  flex: 1; display: flex;
  overflow: hidden;
  background: var(--bg);
  position: relative;
}

.line-numbers {
  width: 48px; min-width:48px;
  padding: 14px 0;
  background: var(--s1);
  border-right: 1px solid var(--border);
  text-align: right;
  overflow: hidden;
}

.ln {
  height: 21px; line-height:21px;
  padding-right: 12px;
  font-size: 12px; font-family: var(--mono);
  color: var(--border2);
}

.code-highlight-wrap {
  flex:1; position:relative; overflow:auto;
}
.code-highlight-wrap::-webkit-scrollbar { width:6px; height:6px; }
.code-highlight-wrap::-webkit-scrollbar-track { background:transparent; }
.code-highlight-wrap::-webkit-scrollbar-thumb { background:var(--border2); border-radius:3px; }

.code-highlight {
  position: absolute; top:0; left:0; right:0;
  padding: 14px 16px;
  font-size: 13px; line-height:21px;
  font-family: var(--mono);
  white-space: pre;
  pointer-events: none;
  tab-size: 2;
  color: var(--text);
  min-height:100%;
}

.code-textarea {
  position: relative; z-index: 1;
  width: 100%; min-height: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none; outline: none;
  resize: none;
  font-size: 13px; line-height:21px;
  font-family: var(--mono);
  color: transparent;
  caret-color: var(--amber);
  white-space: pre;
  tab-size: 2;
  overflow: visible;
}

/* Syntax highlight colors */
.hl-comment { color: #4a5060; font-style:italic; }
.hl-string  { color: #7ec99a; }
.hl-kw      { color: #c792ea; }
.hl-num     { color: #f78c6c; }

/* ── TERMINAL ──────────────────────────────────────────────────── */
.terminal {
  height: 200px; min-height:160px;
  background: #060609;
  border-top: 1px solid var(--border);
  display: flex; flex-direction:column;
}

.terminal-header {
  padding: 6px 12px;
  background: var(--s1);
  border-bottom: 1px solid var(--border);
  font-size: 10px; letter-spacing:.12em; text-transform:uppercase;
  color: var(--muted);
  display:flex; align-items:center; justify-content:space-between;
}

.terminal-body {
  flex:1; overflow-y:auto; padding:10px 16px;
  font-family: var(--mono); font-size:12px;
  line-height:1.8;
}
.terminal-body::-webkit-scrollbar { width:4px; }
.terminal-body::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

.term-line { display:block; }
.term-line.sys   { color: var(--muted); }
.term-line.cmd   { color: var(--amber); }
.term-line.out   { color: var(--text); opacity:.85; }
.term-line.err   { color: var(--red); }
.term-line.agent { color: var(--blue); }

.term-prompt { display:flex; align-items:center; gap:8px; }
.prompt-sym { color: var(--term-green); font-size:14px; }

.term-input {
  flex:1; background:none; border:none; outline:none;
  color: var(--term-green);
  font-family: var(--mono); font-size: 12px;
  caret-color: var(--term-green);
}
.term-input::placeholder { color:var(--muted); opacity:.5; }

/* ── AGENT PANEL ───────────────────────────────────────────────── */
.agent-panel {
  width: 300px; min-width:260px;
  background: var(--s1);
  border-left: 1px solid var(--border);
  display:flex; flex-direction:column;
  overflow:hidden;
}

.agent-header {
  padding: 14px 12px;
  border-bottom: 1px solid var(--border);
  display:flex; align-items:center; gap:10px;
  background: var(--s2);
}

.agent-avatar-wrap {
  position:relative; cursor:pointer; flex-shrink:0;
  transition: transform .2s;
}
.agent-avatar-wrap:hover { transform: scale(1.05); }

.agent-status-ring {
  position:absolute; bottom:-1px; right:-1px;
  width:12px; height:12px;
  background:var(--green); border-radius:50%;
  border:2px solid var(--s2);
  animation: ring-pulse 2s ease-in-out infinite;
}
@keyframes ring-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,.4); }
  50% { box-shadow: 0 0 0 5px rgba(74,222,128,0); }
}

.agent-info { flex:1; min-width:0; }

.agent-name-input {
  background:none; border:none; outline:none;
  font-family: var(--disp); font-weight:700; font-size:16px;
  color: var(--text); cursor:pointer; width:100%;
  border-bottom: 1px solid transparent;
  transition: border-color .2s;
  padding-bottom:1px;
}
.agent-name-input:focus { border-bottom-color: var(--amber); color: var(--amber); }

.agent-role { display:block; font-size:10px; color:var(--muted); letter-spacing:.08em; margin-top:1px; }
.agent-mood { display:block; font-size:10px; color:var(--green); margin-top:2px; }

/* Avatar customizer */
.avatar-customizer {
  padding:12px;
  border-bottom:1px solid var(--border);
  background:var(--bg);
  max-height:340px; overflow-y:auto;
}
.avatar-customizer::-webkit-scrollbar { width:4px; }
.avatar-customizer::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

.cust-title {
  font-size:11px; letter-spacing:.12em; text-transform:uppercase;
  color:var(--muted); margin-bottom:10px;
}
.cust-section { margin-bottom:10px; }
.cust-label {
  font-size:10px; text-transform:uppercase; letter-spacing:.1em;
  color:var(--muted); display:block; margin-bottom:5px;
}
.cust-pills { display:flex; flex-wrap:wrap; gap:4px; }
.cust-pill {
  padding:3px 8px; font-size:10px;
  background:var(--s1); border:1px solid var(--border2);
  border-radius:4px; color:var(--muted); cursor:pointer;
  transition:all .12s;
}
.cust-pill:hover { border-color:var(--amber); color:var(--text); }
.cust-pill.on { background:rgba(244,164,53,.15); border-color:var(--amber); color:var(--amber); }

.color-swatches { display:flex; flex-wrap:wrap; gap:5px; }
.swatch {
  width:20px; height:20px; border-radius:50%;
  border:2px solid transparent; cursor:pointer;
  transition:all .12s;
}
.swatch:hover { transform:scale(1.2); }
.swatch.on { border-color:var(--amber); transform:scale(1.15); box-shadow:0 0 0 2px var(--bg); }

/* Suggestions */
.suggestions-strip {
  padding:8px;
  border-bottom:1px solid var(--border);
  display:flex; flex-direction:column; gap:5px;
  background: #0a0a12;
}

.suggestion {
  display:flex; align-items:flex-start; gap:7px;
  padding:7px 10px;
  border-radius:7px;
  font-size:11px; line-height:1.5;
  cursor:pointer; transition:background .12s;
}
.suggestion:hover { opacity:.8; }
.suggestion.warn { background:rgba(248,113,113,.07); color:#fca5a5; border-left:2px solid var(--red); }
.suggestion.tip  { background:rgba(244,164,53,.07); color:#fcd596; border-left:2px solid var(--amber); }
.suggestion.info { background:rgba(96,165,250,.07); color:#93c5fd; border-left:2px solid var(--blue); }
.sug-icon { flex-shrink:0; font-size:12px; margin-top:1px; }

/* Chat */
.agent-chat {
  flex:1; overflow-y:auto;
  padding:12px 10px;
  display:flex; flex-direction:column; gap:10px;
}
.agent-chat::-webkit-scrollbar { width:4px; }
.agent-chat::-webkit-scrollbar-thumb { background:var(--border2); border-radius:2px; }

.chat-msg { display:flex; align-items:flex-start; gap:8px; }
.chat-msg.user { flex-direction:row-reverse; }

.chat-avatar-sm { flex-shrink:0; margin-top:2px; }

.chat-bubble {
  max-width:220px;
  padding:9px 12px;
  border-radius:12px;
  font-size:12px; line-height:1.6;
  font-family: var(--sans);
  animation:bubblePop .2s ease;
}
@keyframes bubblePop {
  from { opacity:0; transform:scale(.95); }
  to   { opacity:1; transform:scale(1); }
}

.chat-msg.agent .chat-bubble {
  background:var(--s2); color:var(--text);
  border:1px solid var(--border);
  border-bottom-left-radius:4px;
}

.chat-msg.user .chat-bubble {
  background:rgba(244,164,53,.12);
  border:1px solid rgba(244,164,53,.2);
  color:var(--amber);
  border-bottom-right-radius:4px;
}

.chat-bubble.typing {
  display:flex; gap:5px; align-items:center;
  padding:12px 16px;
}
.chat-bubble.typing span {
  width:7px; height:7px; border-radius:50%;
  background:var(--muted);
  animation:typeBounce 1.2s ease-in-out infinite;
}
.chat-bubble.typing span:nth-child(2) { animation-delay:.2s; }
.chat-bubble.typing span:nth-child(3) { animation-delay:.4s; }
@keyframes typeBounce {
  0%,60%,100% { transform:translateY(0); opacity:.4; }
  30% { transform:translateY(-5px); opacity:1; }
}

/* Agent input */
.agent-input-row {
  padding:10px;
  border-top:1px solid var(--border);
  display:flex; gap:6px;
  background:var(--s2);
}

.agent-input {
  flex:1; background:var(--bg);
  border:1px solid var(--border2);
  border-radius:8px; padding:8px 12px;
  color:var(--text); font-family:var(--sans); font-size:12px;
  outline:none; transition:border-color .2s;
}
.agent-input:focus { border-color:var(--amber); }
.agent-input::placeholder { color:var(--muted); }

.send-btn {
  width:34px; height:34px;
  background:var(--amber); border:none; border-radius:8px;
  color:#0a0a0f; font-size:16px; font-weight:700;
  cursor:pointer; transition:all .15s;
  display:flex;align-items:center;justify-content:center;
}
.send-btn:hover:not(:disabled) { filter:brightness(1.15); transform:scale(1.05); }
.send-btn:disabled { opacity:.3; cursor:not-allowed; }
`;
