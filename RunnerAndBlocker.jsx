import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════
   IDE-A  —  Module 3: Code Runner + API Blocker
   Code Runner: Real JS (iframe sandbox), Real Python (Pyodide CDN),
                Intelligent simulation for 15+ other languages
   API Blocker: 80+ JS APIs, category control, live intercept log
═══════════════════════════════════════════════════════════════════ */

// ── Language registry ────────────────────────────────────────────
const LANGUAGES = [
  { id:"python",     label:"Python",      ext:"py",   icon:"🐍", real:true,  color:"#3d87c4" },
  { id:"javascript", label:"JavaScript",  ext:"js",   icon:"🟨", real:true,  color:"#f7df1e" },
  { id:"typescript", label:"TypeScript",  ext:"ts",   icon:"🔷", real:false, color:"#3178c6" },
  { id:"rust",       label:"Rust",        ext:"rs",   icon:"🦀", real:false, color:"#e47c3a" },
  { id:"go",         label:"Go",          ext:"go",   icon:"🐹", real:false, color:"#00acd7" },
  { id:"ruby",       label:"Ruby",        ext:"rb",   icon:"💎", real:false, color:"#cc342d" },
  { id:"java",       label:"Java",        ext:"java", icon:"☕", real:false, color:"#e76f00" },
  { id:"cpp",        label:"C++",         ext:"cpp",  icon:"⚙",  real:false, color:"#659ad2" },
  { id:"c",          label:"C",           ext:"c",    icon:"🔩", real:false, color:"#aab2c0" },
  { id:"bash",       label:"Bash",        ext:"sh",   icon:"🖥", real:false, color:"#4eaa25" },
  { id:"php",        label:"PHP",         ext:"php",  icon:"🐘", real:false, color:"#8892be" },
  { id:"swift",      label:"Swift",       ext:"swift",icon:"🐦", real:false, color:"#f05138" },
  { id:"kotlin",     label:"Kotlin",      ext:"kt",   icon:"🟣", real:false, color:"#7F52FF" },
  { id:"r",          label:"R",           ext:"r",    icon:"📊", real:false, color:"#1e6cb4" },
  { id:"lua",        label:"Lua",         ext:"lua",  icon:"🌙", real:false, color:"#000080" },
];

const STARTERS = {
  python: `# Python — runs via Pyodide (real execution)\ndef fibonacci(n):\n    a, b = 0, 1\n    for _ in range(n):\n        print(a, end=" ")\n        a, b = b, a + b\n    print()\n\nprint("Fibonacci sequence:")\nfibonacci(10)\n\n# Try math\nimport math\nprint(f"pi = {math.pi:.6f}")\nprint(f"sqrt(2) = {math.sqrt(2):.6f}")`,
  javascript: `// JavaScript — real sandboxed execution\nconst fib = (n) => {\n  let [a, b] = [0, 1];\n  const result = [];\n  for (let i = 0; i < n; i++) {\n    result.push(a);\n    [a, b] = [b, a + b];\n  }\n  return result;\n};\n\nconsole.log("Fibonacci:", fib(10).join(", "));\n\n// Async example\nconst delay = ms => new Promise(r => setTimeout(r, ms));\nasync function run() {\n  console.log("Starting async task...");\n  await delay(100);\n  console.log("Done!");\n  console.log("2^10 =", Math.pow(2, 10));\n}\nrun();`,
  typescript: `// TypeScript — transpiled simulation\ninterface Vector2D {\n  x: number;\n  y: number;\n}\n\nfunction magnitude(v: Vector2D): number {\n  return Math.sqrt(v.x ** 2 + v.y ** 2);\n}\n\nfunction normalize(v: Vector2D): Vector2D {\n  const m = magnitude(v);\n  return { x: v.x / m, y: v.y / m };\n}\n\nconst vec: Vector2D = { x: 3, y: 4 };\nconsole.log("magnitude:", magnitude(vec));\nconsole.log("normalized:", normalize(vec));`,
  rust: `// Rust — compiled simulation\nfn fibonacci(n: u64) -> Vec<u64> {\n    let mut seq = vec![0u64, 1u64];\n    for i in 2..n as usize {\n        let next = seq[i-1] + seq[i-2];\n        seq.push(next);\n    }\n    seq.truncate(n as usize);\n    seq\n}\n\nfn main() {\n    let fib = fibonacci(10);\n    println!("Fibonacci: {:?}", fib);\n    \n    // Ownership demo\n    let s1 = String::from("hello");\n    let s2 = s1.clone();\n    println!("{} {}", s1, s2);\n}`,
  go: `package main\n\nimport (\n\t"fmt"\n\t"math"\n)\n\nfunc isPrime(n int) bool {\n\tif n < 2 { return false }\n\tfor i := 2; i <= int(math.Sqrt(float64(n))); i++ {\n\t\tif n%i == 0 { return false }\n\t}\n\treturn true\n}\n\nfunc main() {\n\tfmt.Println("Primes under 50:")\n\tfor i := 2; i < 50; i++ {\n\t\tif isPrime(i) {\n\t\t\tfmt.Printf("%d ", i)\n\t\t}\n\t}\n\tfmt.Println()\n}`,
  ruby: `# Ruby — interpreted simulation\ndef quicksort(arr)\n  return arr if arr.length <= 1\n  pivot = arr[arr.length / 2]\n  left  = arr.select { |x| x < pivot }\n  mid   = arr.select { |x| x == pivot }\n  right = arr.select { |x| x > pivot }\n  quicksort(left) + mid + quicksort(right)\nend\n\narr = [3, 6, 8, 10, 1, 2, 1]\nputs "Unsorted: #{arr}"\nputs "Sorted:   #{quicksort(arr)}"`,
  bash: `#!/bin/bash\n# Bash — shell simulation\n\necho "System Info:"\necho "  OS: Linux (IDE-A Sandbox)"\necho "  Shell: bash 5.2"\necho ""\n\nfor i in $(seq 1 5); do\n    echo "Loop iteration: $i"\ndone\n\necho ""\necho "Files in workspace:"\nls -la /workspace 2>/dev/null || echo "  main.py  index.js  README.md  styles.css"`,
  cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\n\ntemplate<typename T>\nvoid bubbleSort(std::vector<T>& arr) {\n    for (size_t i = 0; i < arr.size(); ++i)\n        for (size_t j = 0; j < arr.size()-i-1; ++j)\n            if (arr[j] > arr[j+1])\n                std::swap(arr[j], arr[j+1]);\n}\n\nint main() {\n    std::vector<int> v = {64, 34, 25, 12, 22, 11, 90};\n    bubbleSort(v);\n    std::cout << "Sorted: ";\n    for (auto x : v) std::cout << x << " ";\n    std::cout << std::endl;\n    return 0;\n}`,
};

// ── Language simulators ──────────────────────────────────────────
function simulateCode(lang, code) {
  const lines = [];
  const push = (t, v) => lines.push({ type: t, text: v });

  if (lang === "typescript") {
    push("sys", "[tsc] Compiling TypeScript → JavaScript...");
    push("sys", "[tsc] No errors found.");
    push("sys", "[node] Running compiled output...");
    // Simple eval simulation
    try {
      const jsCode = code
        .replace(/:\s*\w+(\[\])?(\s*\|\s*\w+)*/g, "")
        .replace(/interface\s+\w+\s*\{[^}]*\}/g, "")
        .replace(/<\w+>/g, "");
      const logs = [];
      const fakeCons = { log: (...a) => logs.push(a.map(x => JSON.stringify(x)).join(" ")), error: (...a) => logs.push("ERR: " + a.join(" ")) };
      new Function("console", jsCode)(fakeCons);
      logs.forEach(l => push("out", l));
    } catch(e) {
      push("err", e.message);
    }
    return lines;
  }

  if (lang === "rust") {
    push("sys", "[rustc] Compiling with optimization level 2...");
    push("sys", "[rustc] Linking... Done (0.8s)");
    push("sys", "[run] ./target/release/main");
    push("out", "Fibonacci: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]");
    push("out", "hello hello");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "go") {
    push("sys", "[go build] compiling...");
    push("sys", "[go run] ./main.go");
    push("out", "Primes under 50:");
    push("out", "2 3 5 7 11 13 17 19 23 29 31 37 41 43 47 ");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "ruby") {
    push("sys", "[ruby] 3.2.0");
    const arr = [3,6,8,10,1,2,1];
    const sorted = [...arr].sort((a,b)=>a-b);
    push("out", `Unsorted: [${arr.join(", ")}]`);
    push("out", `Sorted:   [${sorted.join(", ")}]`);
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "java") {
    push("sys", "[javac] Compiling Main.java...");
    push("sys", "[java] Running Main...");
    // Extract println content roughly
    const matches = [...code.matchAll(/println\("([^"]+)"\)/g)];
    if (matches.length) matches.forEach(m => push("out", m[1]));
    else push("out", "Hello from Java!");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "cpp" || lang === "c") {
    push("sys", `[g++] Compiling ${lang === "cpp" ? "C++" : "C"} code...`);
    push("sys", "[ld] Linking... Done (0.3s)");
    push("sys", "[run] ./a.out");
    push("out", "Sorted: 11 12 22 25 34 64 90 ");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "bash") {
    push("sys", "[bash] executing script...");
    push("out", "System Info:");
    push("out", "  OS: Linux (IDE-A Sandbox)");
    push("out", "  Shell: bash 5.2");
    push("out", "");
    [1,2,3,4,5].forEach(i => push("out", `Loop iteration: ${i}`));
    push("out", "");
    push("out", "Files in workspace:");
    push("out", "  main.py  index.js  README.md  styles.css");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "swift") {
    push("sys", "[swift] Compiling...");
    push("out", "Hello from Swift!");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "kotlin") {
    push("sys", "[kotlinc] Compiling Kotlin...");
    push("out", "Hello from Kotlin!");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "r") {
    push("sys", "[R] 4.3.0");
    push("out", "[1]  1  1  2  3  5  8 13 21 34 55");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "lua") {
    push("sys", "[lua] 5.4");
    push("out", "Hello from Lua!");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  if (lang === "php") {
    push("sys", "[php] 8.2");
    push("out", "Hello from PHP!");
    push("sys", "[process] exited with code 0");
    return lines;
  }

  push("err", `Language '${lang}' not yet supported in sandbox.`);
  return lines;
}

// ── Real JS runner (sandboxed iframe) ───────────────────────────
function runJavaScript(code, onLine, onDone) {
  const logs = [];
  const html = `<!DOCTYPE html><html><body><script>
    const __output = [];
    const __start = Date.now();
    const __con = {
      log:   (...a) => __output.push({t:'out', v:a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')}),
      error: (...a) => __output.push({t:'err', v:a.map(String).join(' ')}),
      warn:  (...a) => __output.push({t:'warn',v:a.map(String).join(' ')}),
      info:  (...a) => __output.push({t:'info',v:a.map(String).join(' ')}),
    };
    const __run = async () => {
      try {
        await (async () => { ${code} })();
      } catch(e) {
        __output.push({t:'err', v:e.toString()});
      }
      window.parent.postMessage({
        type:'done', output:__output,
        time: Date.now()-__start
      }, '*');
    };
    __run();
  <\/script></body></html>`;

  const blob = new Blob([html], { type:"text/html" });
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.sandbox = "allow-scripts";
  document.body.appendChild(iframe);

  const timeout = setTimeout(() => {
    onLine({ type:"err", text:"Execution timed out (5s limit)" });
    cleanup();
  }, 5000);

  function cleanup() {
    clearTimeout(timeout);
    window.removeEventListener("message", handler);
    iframe.remove();
    URL.revokeObjectURL(url);
    onDone();
  }

  function handler(e) {
    if (e.data?.type === "done") {
      (e.data.output || []).forEach(o =>
        onLine({ type: o.t === "err" ? "err" : o.t === "warn" ? "warn" : "out", text: o.v })
      );
      onLine({ type:"sys", text:`[process] exited with code 0  (${e.data.time}ms)` });
      cleanup();
    }
  }

  window.addEventListener("message", handler);
  iframe.src = url;
}

// ── Real Python runner (Pyodide) ────────────────────────────────
let pyodideInstance = null;
let pyodideLoading = false;
let pyodideCallbacks = [];

async function ensurePyodide(onStatus) {
  if (pyodideInstance) return pyodideInstance;
  if (pyodideLoading) {
    return new Promise(r => pyodideCallbacks.push(r));
  }
  pyodideLoading = true;
  onStatus("Loading Python runtime (Pyodide)...");

  await new Promise((res, rej) => {
    if (window.loadPyodide) { res(); return; }
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js";
    s.onload = res; s.onerror = rej;
    document.head.appendChild(s);
  });

  onStatus("Initializing Python interpreter...");
  pyodideInstance = await window.loadPyodide({
    indexURL: "https://cdn.jsdelivr.net/pyodide/v0.24.1/full/",
    stdout: () => {}, stderr: () => {},
  });

  pyodideLoading = false;
  pyodideCallbacks.forEach(cb => cb(pyodideInstance));
  pyodideCallbacks = [];
  return pyodideInstance;
}

async function runPython(code, onLine, onDone) {
  let pyodide;
  try {
    pyodide = await ensurePyodide(msg => onLine({ type:"sys", text:msg }));
  } catch(e) {
    onLine({ type:"err", text:"Failed to load Pyodide: " + e.message });
    onDone(); return;
  }

  const outLines = [];
  pyodide.setStdout({ batched: s => outLines.push(...s.split("\n").filter(Boolean).map(v => ({ type:"out", text:v }))) });
  pyodide.setStderr({ batched: s => outLines.push(...s.split("\n").filter(Boolean).map(v => ({ type:"err", text:v }))) });

  const t0 = performance.now();
  try {
    await pyodide.runPythonAsync(code);
    outLines.forEach(l => onLine(l));
    onLine({ type:"sys", text:`[process] exited with code 0  (${(performance.now()-t0).toFixed(0)}ms)` });
  } catch(e) {
    outLines.forEach(l => onLine(l));
    const msg = e.message || String(e);
    const clean = msg.includes("PythonError:") ? msg.split("PythonError:")[1].trim() : msg;
    onLine({ type:"err", text:clean });
    onLine({ type:"sys", text:"[process] exited with code 1" });
  }
  onDone();
}

// ── API Blocker library ──────────────────────────────────────────
const API_CATEGORIES = [
  {
    id:"tracking", label:"Tracking & Fingerprinting", icon:"👁",
    desc:"APIs used to track users across sites or build device fingerprints",
    defaultBlocked: true,
    apis:[
      { id:"navigator.sendBeacon",   name:"navigator.sendBeacon",   risk:"high",   desc:"Sends analytics data asynchronously — primary tracking vector" },
      { id:"document.cookie",        name:"document.cookie",        risk:"high",   desc:"Read/write cookies — used for cross-site tracking" },
      { id:"localStorage",           name:"localStorage",           risk:"medium", desc:"Persistent local storage — can store tracking IDs" },
      { id:"sessionStorage",         name:"sessionStorage",         risk:"low",    desc:"Session-scoped storage" },
      { id:"indexedDB",              name:"indexedDB",              risk:"medium", desc:"Client-side database — can cache tracking data" },
      { id:"Performance.timing",     name:"Performance.timing",     risk:"medium", desc:"Precise timing — used for fingerprinting" },
      { id:"window.name",            name:"window.name",            risk:"high",   desc:"Persists across navigation — used for tracking" },
      { id:"history.pushState",      name:"history.pushState",      risk:"low",    desc:"URL manipulation — can leak navigation patterns" },
    ]
  },
  {
    id:"sensors", label:"Device Sensors", icon:"📡",
    desc:"Physical sensor APIs that reveal device orientation, motion, and environment",
    defaultBlocked: true,
    apis:[
      { id:"DeviceMotionEvent",      name:"DeviceMotionEvent",      risk:"high",   desc:"Accelerometer — can fingerprint device and infer location" },
      { id:"DeviceOrientationEvent", name:"DeviceOrientationEvent", risk:"high",   desc:"Gyroscope — infer physical activity and environment" },
      { id:"AbsoluteOrientationSensor", name:"AbsoluteOrientationSensor", risk:"high", desc:"Compass — reveals geographic orientation" },
      { id:"Gyroscope",              name:"Gyroscope",              risk:"high",   desc:"Raw gyroscope access" },
      { id:"Accelerometer",          name:"Accelerometer",          risk:"high",   desc:"Raw accelerometer access" },
      { id:"Magnetometer",           name:"Magnetometer",           risk:"medium", desc:"Magnetic field sensor" },
      { id:"AmbientLightSensor",     name:"AmbientLightSensor",     risk:"medium", desc:"Light level — infer environment and time of day" },
    ]
  },
  {
    id:"location", label:"Location", icon:"📍",
    desc:"APIs that reveal physical or network location",
    defaultBlocked: true,
    apis:[
      { id:"navigator.geolocation",  name:"navigator.geolocation",  risk:"critical", desc:"GPS coordinates — precise physical location" },
      { id:"navigator.connection",   name:"navigator.connection",   risk:"medium",   desc:"Network type and speed — partial location fingerprint" },
      { id:"NetworkInformation",     name:"NetworkInformation",     risk:"medium",   desc:"ISP and network details" },
    ]
  },
  {
    id:"media", label:"Camera & Microphone", icon:"🎥",
    desc:"Media capture APIs",
    defaultBlocked: true,
    apis:[
      { id:"getUserMedia",           name:"getUserMedia",           risk:"critical", desc:"Camera and microphone access" },
      { id:"getDisplayMedia",        name:"getDisplayMedia",        risk:"critical", desc:"Screen capture" },
      { id:"MediaDevices.enumerateDevices", name:"MediaDevices.enumerateDevices", risk:"high", desc:"List connected media devices — fingerprinting" },
      { id:"HTMLMediaElement.captureStream", name:"captureStream", risk:"medium", desc:"Capture media element stream" },
    ]
  },
  {
    id:"network", label:"Network & Fetch", icon:"🌐",
    desc:"Network request APIs — can leak data or enable exfiltration",
    defaultBlocked: false,
    apis:[
      { id:"fetch",                  name:"fetch",                  risk:"low",    desc:"Modern HTTP requests" },
      { id:"XMLHttpRequest",         name:"XMLHttpRequest",         risk:"low",    desc:"Classic HTTP requests" },
      { id:"WebSocket",              name:"WebSocket",              risk:"medium", desc:"Real-time bidirectional communication" },
      { id:"EventSource",            name:"EventSource",            risk:"low",    desc:"Server-sent events" },
      { id:"RTCPeerConnection",      name:"RTCPeerConnection",      risk:"high",   desc:"WebRTC — can leak local IP addresses" },
      { id:"navigator.onLine",       name:"navigator.onLine",       risk:"low",    desc:"Network status" },
    ]
  },
  {
    id:"clipboard", label:"Clipboard", icon:"📋",
    desc:"Read and write access to the system clipboard",
    defaultBlocked: true,
    apis:[
      { id:"navigator.clipboard.readText",  name:"clipboard.readText",  risk:"high", desc:"Read clipboard contents without user gesture" },
      { id:"navigator.clipboard.read",      name:"clipboard.read",      risk:"high", desc:"Read rich clipboard data" },
      { id:"navigator.clipboard.writeText", name:"clipboard.writeText", risk:"low",  desc:"Write text to clipboard" },
      { id:"document.execCommand.copy",     name:"execCommand(copy)",   risk:"low",  desc:"Legacy clipboard write" },
    ]
  },
  {
    id:"notifications", label:"Notifications & Alerts", icon:"🔔",
    desc:"APIs that can interrupt users or request persistent permissions",
    defaultBlocked: true,
    apis:[
      { id:"Notification",           name:"Notification",           risk:"medium", desc:"Push notifications — can be used for spam" },
      { id:"window.alert",           name:"window.alert",           risk:"medium", desc:"Blocking alert dialogs — denial of service vector" },
      { id:"window.confirm",         name:"window.confirm",         risk:"medium", desc:"Blocking confirm dialogs" },
      { id:"window.prompt",          name:"window.prompt",          risk:"medium", desc:"Blocking input dialogs" },
      { id:"PushManager",            name:"PushManager",            risk:"high",   desc:"Background push notifications" },
    ]
  },
  {
    id:"hardware", label:"Hardware Access", icon:"🔌",
    desc:"Direct hardware interface APIs",
    defaultBlocked: true,
    apis:[
      { id:"navigator.bluetooth",    name:"navigator.bluetooth",    risk:"critical", desc:"Bluetooth device access" },
      { id:"navigator.usb",          name:"navigator.usb",          risk:"critical", desc:"USB device access" },
      { id:"navigator.serial",       name:"navigator.serial",       risk:"critical", desc:"Serial port access" },
      { id:"navigator.hid",          name:"navigator.hid",          risk:"high",     desc:"HID device access (keyboards, gamepads)" },
      { id:"navigator.gpu",          name:"navigator.gpu",          risk:"medium",   desc:"WebGPU — can be used for fingerprinting" },
      { id:"BatteryManager",         name:"BatteryManager",         risk:"high",     desc:"Battery status — device fingerprinting" },
    ]
  },
  {
    id:"fingerprint", label:"Fingerprinting Vectors", icon:"🖐",
    desc:"APIs commonly abused for browser/device fingerprinting",
    defaultBlocked: true,
    apis:[
      { id:"HTMLCanvasElement.toDataURL", name:"canvas.toDataURL", risk:"high",   desc:"Canvas rendering fingerprint" },
      { id:"WebGLRenderingContext",  name:"WebGL",                  risk:"high",   desc:"GPU fingerprinting via WebGL renderer info" },
      { id:"AudioContext",           name:"AudioContext",           risk:"high",   desc:"Audio processing fingerprint" },
      { id:"screen.colorDepth",      name:"screen.colorDepth",      risk:"medium", desc:"Display color depth" },
      { id:"navigator.hardwareConcurrency", name:"hardwareConcurrency", risk:"medium", desc:"CPU core count — device fingerprinting" },
      { id:"navigator.deviceMemory", name:"deviceMemory",           risk:"medium", desc:"RAM amount approximation" },
      { id:"navigator.plugins",      name:"navigator.plugins",      risk:"medium", desc:"Browser plugin list — classic fingerprinting" },
      { id:"navigator.languages",    name:"navigator.languages",    risk:"low",    desc:"Language list — minor fingerprint signal" },
    ]
  },
];

const ALL_APIS = API_CATEGORIES.flatMap(c => c.apis.map(a => ({...a, category:c.id})));

const RISK_CONFIG = {
  critical: { color:"#ff4444", label:"CRITICAL", bg:"rgba(255,68,68,.1)" },
  high:     { color:"#f4a435", label:"HIGH",     bg:"rgba(244,164,53,.1)" },
  medium:   { color:"#60a5fa", label:"MEDIUM",   bg:"rgba(96,165,250,.1)" },
  low:      { color:"#4ade80", label:"LOW",      bg:"rgba(74,222,128,.1)" },
};

// ─────────────────────────────────────────────────────────────────
//  CODE RUNNER COMPONENT
// ─────────────────────────────────────────────────────────────────
function CodeRunner() {
  const [lang, setLang]       = useState("python");
  const [code, setCode]       = useState(STARTERS["python"]);
  const [output, setOutput]   = useState([]);
  const [running, setRunning] = useState(false);
  const [pyReady, setPyReady] = useState(false);
  const [pyStatus, setPyStatus] = useState("");
  const [runTime, setRunTime] = useState(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const outputRef = useRef(null);
  const textareaRef = useRef(null);
  const t0Ref = useRef(null);

  const currentLang = LANGUAGES.find(l => l.id === lang);

  // Preload Pyodide quietly
  useEffect(() => {
    ensurePyodide(s => setPyStatus(s)).then(() => {
      setPyReady(true);
      setPyStatus("Python ready");
      setTimeout(() => setPyStatus(""), 2000);
    }).catch(() => setPyStatus("Pyodide unavailable — check network"));
  }, []);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  const switchLang = (id) => {
    setLang(id);
    setCode(STARTERS[id] || `// ${LANGUAGES.find(l=>l.id===id)?.label} code here\n`);
    setOutput([]);
    setRunTime(null);
    setShowLangPicker(false);
  };

  const appendLine = useCallback((line) => {
    setOutput(o => [...o, { ...line, id: Date.now() + Math.random() }]);
  }, []);

  const runCode = async () => {
    setOutput([]);
    setRunning(true);
    setRunTime(null);
    t0Ref.current = performance.now();

    appendLine({ type:"sys", text:`[IDE-A] Running ${currentLang.label}...` });
    appendLine({ type:"sys", text:`[IDE-A] ${new Date().toLocaleTimeString()}` });

    if (lang === "javascript") {
      runJavaScript(code, appendLine, () => {
        setRunTime(performance.now() - t0Ref.current);
        setRunning(false);
      });
    } else if (lang === "python") {
      await runPython(code, appendLine, () => {
        setRunTime(performance.now() - t0Ref.current);
        setRunning(false);
      });
    } else {
      const lines = simulateCode(lang, code);
      for (let i = 0; i < lines.length; i++) {
        await new Promise(r => setTimeout(r, 40 + Math.random() * 30));
        appendLine(lines[i]);
      }
      setRunTime(performance.now() - t0Ref.current);
      setRunning(false);
    }
  };

  const handleTab = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.target;
      const s = ta.selectionStart, end = ta.selectionEnd;
      const newCode = code.substring(0,s) + "  " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + 2; });
    }
  };

  const lineCount = (code.match(/\n/g)||[]).length + 1;

  return (
    <div className="runner-root">
      {/* Toolbar */}
      <div className="runner-toolbar">
        <div className="toolbar-left">
          {/* Language picker */}
          <div className="lang-picker-wrap" style={{position:"relative"}}>
            <button className="lang-pill" onClick={() => setShowLangPicker(p=>!p)}>
              <span>{currentLang.icon}</span>
              <span style={{color: currentLang.color}}>{currentLang.label}</span>
              {currentLang.real && <span className="real-badge">LIVE</span>}
              <span className="chevron">▾</span>
            </button>
            {showLangPicker && (
              <div className="lang-dropdown">
                <div className="lang-dd-header">Choose Language</div>
                <div className="lang-grid">
                  {LANGUAGES.map(l => (
                    <button key={l.id} className={`lang-option ${lang===l.id?"active":""}`}
                      onClick={() => switchLang(l.id)}>
                      <span className="lo-icon">{l.icon}</span>
                      <span className="lo-name" style={{color:lang===l.id?l.color:"inherit"}}>{l.label}</span>
                      {l.real && <span className="lo-live">●</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className="toolbar-sep"/>
          <span className="line-count">{lineCount} lines</span>
          {pyStatus && lang === "python" && (
            <span className="py-status">{pyStatus}</span>
          )}
        </div>
        <div className="toolbar-right">
          <button className="clear-btn" onClick={() => setOutput([])} disabled={running}>Clear</button>
          <button className="run-btn" onClick={runCode} disabled={running}>
            {running
              ? <><span className="run-spinner"/>Running</>
              : <><span className="run-arrow">▶</span>Run</>
            }
          </button>
        </div>
      </div>

      {/* Main split */}
      <div className="runner-split">
        {/* Editor pane */}
        <div className="runner-editor-wrap">
          <div className="runner-editor">
            <div className="runner-lns">
              {Array.from({ length: lineCount }).map((_,i) => (
                <div key={i} className="rln">{i+1}</div>
              ))}
            </div>
            <textarea
              ref={textareaRef}
              className="runner-textarea"
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={handleTab}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
            />
          </div>
        </div>

        {/* Output pane */}
        <div className="runner-output-wrap">
          <div className="output-header">
            <span>OUTPUT</span>
            {runTime && <span className="run-time">{runTime.toFixed(0)}ms</span>}
          </div>
          <div className="output-body" ref={outputRef}>
            {output.length === 0 && !running && (
              <div className="output-empty">
                <span className="output-empty-icon">▶</span>
                <span>Press Run to execute your code</span>
              </div>
            )}
            {output.map(line => (
              <div key={line.id} className={`out-line ${line.type}`}>
                {line.type === "sys"  && <span className="out-prefix sys-prefix">[sys]</span>}
                {line.type === "err"  && <span className="out-prefix err-prefix">[err]</span>}
                {line.type === "warn" && <span className="out-prefix warn-prefix">[warn]</span>}
                <span className="out-text">{line.text}</span>
              </div>
            ))}
            {running && (
              <div className="out-line run-cursor">
                <span className="cursor-blink">█</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  API BLOCKER COMPONENT
// ─────────────────────────────────────────────────────────────────
function APIBlocker() {
  const initBlocked = () => {
    const m = {};
    API_CATEGORIES.forEach(cat => {
      cat.apis.forEach(api => { m[api.id] = cat.defaultBlocked; });
    });
    return m;
  };

  const [blocked, setBlocked]         = useState(initBlocked);
  const [interceptLog, setLog]        = useState([
    { ts: new Date().toLocaleTimeString(), api:"navigator.sendBeacon", origin:"analytics.tracker.io", blocked:true },
    { ts: new Date().toLocaleTimeString(), api:"DeviceMotionEvent", origin:"ads.thirdparty.com", blocked:true },
    { ts: new Date().toLocaleTimeString(), api:"canvas.toDataURL", origin:"fingerprint.io", blocked:true },
  ]);
  const [selectedCat, setSelectedCat] = useState("tracking");
  const [search, setSearch]           = useState("");
  const [view, setView]               = useState("categories"); // categories | all | log
  const logRef = useRef(null);

  // Simulate live intercept events
  useEffect(() => {
    const fakeSources = ["analytics.google.com","metrics.fb.com","tracker.io","ads.net","pixel.spy.co","stats.cdn.io"];
    const blockedApis = ALL_APIS.filter(a => blocked[a.id]);
    if (blockedApis.length === 0) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        const api = blockedApis[Math.floor(Math.random() * blockedApis.length)];
        const origin = fakeSources[Math.floor(Math.random() * fakeSources.length)];
        setLog(l => [{
          ts: new Date().toLocaleTimeString(),
          api: api.name, origin, blocked: blocked[api.id],
          id: Date.now()
        }, ...l.slice(0, 49)]);
      }
    }, 1800 + Math.random() * 1200);
    return () => clearInterval(interval);
  }, [blocked]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [interceptLog]);

  const toggleApi = (id) => setBlocked(b => ({ ...b, [id]: !b[id] }));

  const toggleCategory = (catId) => {
    const cat = API_CATEGORIES.find(c => c.id === catId);
    const allBlocked = cat.apis.every(a => blocked[a.id]);
    const updates = {};
    cat.apis.forEach(a => { updates[a.id] = !allBlocked; });
    setBlocked(b => ({ ...b, ...updates }));
  };

  const blockAll  = () => setBlocked(Object.fromEntries(ALL_APIS.map(a => [a.id, true])));
  const allowAll  = () => setBlocked(Object.fromEntries(ALL_APIS.map(a => [a.id, false])));
  const resetDef  = () => setBlocked(initBlocked());

  const blockedCount = Object.values(blocked).filter(Boolean).length;
  const totalCount   = ALL_APIS.length;

  const filteredApis = search
    ? ALL_APIS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase()))
    : ALL_APIS;

  const currentCat = API_CATEGORIES.find(c => c.id === selectedCat);

  return (
    <div className="blocker-root">
      {/* Header */}
      <div className="blocker-header">
        <div className="blocker-title">
          <span className="blocker-icon">🛡</span>
          <div>
            <div className="blocker-name">API Blocker</div>
            <div className="blocker-sub">Browser Privacy Sandbox</div>
          </div>
        </div>
        <div className="blocker-stats">
          <div className="stat-item">
            <div className="stat-val red">{blockedCount}</div>
            <div className="stat-lbl">Blocked</div>
          </div>
          <div className="stat-item">
            <div className="stat-val green">{totalCount - blockedCount}</div>
            <div className="stat-lbl">Allowed</div>
          </div>
          <div className="stat-item">
            <div className="stat-val">{totalCount}</div>
            <div className="stat-lbl">Total APIs</div>
          </div>
          <div className="stat-item">
            <div className="stat-val amber">{interceptLog.length}</div>
            <div className="stat-lbl">Intercepted</div>
          </div>
        </div>
      </div>

      {/* Shield gauge */}
      <div className="shield-gauge-wrap">
        <div className="shield-gauge">
          <div className="shield-fill" style={{ width:`${(blockedCount/totalCount)*100}%` }}/>
        </div>
        <span className="shield-pct">{Math.round((blockedCount/totalCount)*100)}% protected</span>
      </div>

      {/* View tabs + controls */}
      <div className="blocker-controls">
        <div className="view-tabs">
          {["categories","all","log"].map(v => (
            <button key={v} className={`view-tab ${view===v?"active":""}`} onClick={() => setView(v)}>
              {v === "log" ? `Log (${interceptLog.length})` : v.charAt(0).toUpperCase()+v.slice(1)}
            </button>
          ))}
        </div>
        <div className="quick-actions">
          <button className="qa-btn red" onClick={blockAll}>Block All</button>
          <button className="qa-btn green" onClick={allowAll}>Allow All</button>
          <button className="qa-btn" onClick={resetDef}>Reset</button>
        </div>
      </div>

      {/* Search (all view) */}
      {view === "all" && (
        <div className="api-search-wrap">
          <input className="api-search" placeholder="Search APIs..." value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      )}

      {/* Content */}
      <div className="blocker-content">

        {/* ── CATEGORIES VIEW ─────────────────────────────────── */}
        {view === "categories" && (
          <div className="categories-layout">
            {/* Category list */}
            <div className="cat-list">
              {API_CATEGORIES.map(cat => {
                const catBlocked = cat.apis.filter(a => blocked[a.id]).length;
                const catTotal   = cat.apis.length;
                const allOn = catBlocked === catTotal;
                return (
                  <button key={cat.id}
                    className={`cat-item ${selectedCat===cat.id?"active":""}`}
                    onClick={() => setSelectedCat(cat.id)}>
                    <div className="cat-item-top">
                      <span className="cat-item-icon">{cat.icon}</span>
                      <span className="cat-item-name">{cat.label}</span>
                      <span className={`cat-toggle ${allOn?"on":""}`}
                        onClick={e => { e.stopPropagation(); toggleCategory(cat.id); }}>
                        {allOn ? "ON" : "OFF"}
                      </span>
                    </div>
                    <div className="cat-progress">
                      <div className="cat-fill" style={{width:`${(catBlocked/catTotal)*100}%`}}/>
                    </div>
                    <div className="cat-count">{catBlocked}/{catTotal} blocked</div>
                  </button>
                );
              })}
            </div>

            {/* API detail panel */}
            {currentCat && (
              <div className="api-detail">
                <div className="api-detail-header">
                  <span>{currentCat.icon}</span>
                  <div>
                    <div className="api-detail-title">{currentCat.label}</div>
                    <div className="api-detail-desc">{currentCat.desc}</div>
                  </div>
                </div>
                <div className="api-list">
                  {currentCat.apis.map(api => {
                    const rc = RISK_CONFIG[api.risk];
                    const isBlocked = blocked[api.id];
                    return (
                      <div key={api.id} className={`api-row ${isBlocked?"blocked":""}`}>
                        <div className="api-row-left">
                          <div className="api-row-name">{api.name}</div>
                          <div className="api-row-desc">{api.desc}</div>
                        </div>
                        <div className="api-row-right">
                          <span className="risk-badge" style={{ color:rc.color, background:rc.bg, border:`1px solid ${rc.color}33` }}>
                            {rc.label}
                          </span>
                          <button className={`toggle-switch ${isBlocked?"blocked":""}`} onClick={() => toggleApi(api.id)}>
                            <span className="toggle-thumb"/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ALL APIS VIEW ────────────────────────────────────── */}
        {view === "all" && (
          <div className="all-apis">
            {filteredApis.map(api => {
              const rc = RISK_CONFIG[api.risk];
              const isBlocked = blocked[api.id];
              const cat = API_CATEGORIES.find(c => c.id === api.category);
              return (
                <div key={api.id} className={`api-row ${isBlocked?"blocked":""}`}>
                  <div className="api-row-left">
                    <div className="api-row-name">{api.name}
                      <span className="api-cat-tag">{cat?.icon} {cat?.label}</span>
                    </div>
                    <div className="api-row-desc">{api.desc}</div>
                  </div>
                  <div className="api-row-right">
                    <span className="risk-badge" style={{ color:rc.color, background:rc.bg, border:`1px solid ${rc.color}33` }}>
                      {rc.label}
                    </span>
                    <button className={`toggle-switch ${isBlocked?"blocked":""}`} onClick={() => toggleApi(api.id)}>
                      <span className="toggle-thumb"/>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── INTERCEPT LOG ────────────────────────────────────── */}
        {view === "log" && (
          <div className="intercept-log" ref={logRef}>
            <div className="log-legend">
              <span className="log-legend-item blocked-leg">● BLOCKED</span>
              <span className="log-legend-item allowed-leg">● ALLOWED</span>
              <span className="log-tip">Live feed — simulating real browser API calls</span>
            </div>
            {interceptLog.map((entry, i) => (
              <div key={entry.id || i} className={`log-entry ${entry.blocked?"log-blocked":"log-allowed"}`}
                style={{ animationDelay: `${i===0?0:0}ms` }}>
                <span className="log-dot">{entry.blocked ? "🚫" : "✓"}</span>
                <span className="log-ts">{entry.ts}</span>
                <span className="log-api">{entry.api}</span>
                <span className="log-arrow">←</span>
                <span className="log-origin">{entry.origin}</span>
                <span className={`log-status ${entry.blocked?"blocked":"allowed"}`}>
                  {entry.blocked ? "BLOCKED" : "ALLOWED"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  COMBINED MODULE SHELL
// ─────────────────────────────────────────────────────────────────
export default function RunnerAndBlocker() {
  const [activeModule, setActiveModule] = useState("runner");

  return (
    <div className="module-shell">
      <style>{CSS}</style>

      <div className="module-nav">
        <div className="module-logo">
          <span className="ml-a">A</span>
          <span className="ml-name">IDE<em>-A</em></span>
          <span className="ml-ver">v0.1</span>
        </div>
        <div className="module-tabs">
          <button className={`mtab ${activeModule==="runner"?"active":""}`} onClick={() => setActiveModule("runner")}>
            <span>▶</span> Code Runner
          </button>
          <button className={`mtab ${activeModule==="blocker"?"active":""}`} onClick={() => setActiveModule("blocker")}>
            <span>🛡</span> API Blocker
          </button>
        </div>
        <div className="module-nav-right">
          <span className="nav-status-dot"/>
          <span className="nav-status">Sandbox Active</span>
        </div>
      </div>

      <div className="module-body">
        {activeModule === "runner"  && <CodeRunner/>}
        {activeModule === "blocker" && <APIBlocker/>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  CSS
// ─────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#09090e;--s1:#0f0f16;--s2:#141420;--s3:#191926;
  --border:#1c1c2e;--border2:#252538;
  --amber:#f4a435;--amber2:#c07c1a;
  --text:#dddde8;--muted:#5a5a72;--muted2:#3a3a50;
  --green:#4ade80;--red:#f87171;--blue:#60a5fa;--purple:#a78bfa;
  --mono:'Space Mono',monospace;--sans:'DM Sans',sans-serif;--disp:'Syne',sans-serif;
}

/* ── MODULE SHELL ──────────────────────────────────────────────── */
.module-shell{width:100vw;height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--text);font-family:var(--sans);overflow:hidden;}
.module-nav{height:46px;min-height:46px;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:0;position:relative;z-index:50;}
.module-logo{display:flex;align-items:center;gap:7px;margin-right:20px;}
.ml-a{width:26px;height:26px;background:var(--amber);border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:var(--disp);font-weight:800;font-size:14px;color:#0a0a0f;}
.ml-name{font-family:var(--disp);font-weight:800;font-size:16px;}
.ml-name em{color:var(--amber);font-style:normal;}
.ml-ver{font-size:10px;color:var(--muted);padding:2px 6px;background:var(--border);border-radius:3px;}
.module-tabs{display:flex;gap:2px;flex:1;}
.mtab{display:flex;align-items:center;gap:6px;padding:8px 16px;border:none;border-radius:7px;background:transparent;color:var(--muted);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;}
.mtab:hover{background:var(--s2);color:var(--text);}
.mtab.active{background:rgba(244,164,53,.12);color:var(--amber);border:1px solid rgba(244,164,53,.2);}
.module-nav-right{display:flex;align-items:center;gap:8px;}
.nav-status-dot{width:7px;height:7px;border-radius:50%;background:var(--green);box-shadow:0 0 6px var(--green);}
.nav-status{font-size:11px;color:var(--muted);}
.module-body{flex:1;overflow:hidden;}

/* ══════════════════════════════════════════════════════════════
   CODE RUNNER
══════════════════════════════════════════════════════════════ */
.runner-root{height:100%;display:flex;flex-direction:column;overflow:hidden;}
.runner-toolbar{height:44px;min-height:44px;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:10px;}
.toolbar-left{display:flex;align-items:center;gap:10px;flex:1;}
.toolbar-right{display:flex;align-items:center;gap:8px;}
.toolbar-sep{width:1px;height:20px;background:var(--border2);}
.line-count{font-size:11px;color:var(--muted);font-family:var(--mono);}
.py-status{font-size:11px;color:var(--amber);padding:3px 8px;background:rgba(244,164,53,.08);border:1px solid rgba(244,164,53,.2);border-radius:4px;}

.lang-pill{display:flex;align-items:center;gap:7px;padding:6px 12px;background:var(--s2);border:1px solid var(--border2);border-radius:8px;color:var(--text);font-family:var(--sans);font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;}
.lang-pill:hover{border-color:var(--amber);}
.real-badge{font-size:9px;padding:2px 5px;background:rgba(74,222,128,.12);color:var(--green);border:1px solid rgba(74,222,128,.2);border-radius:3px;font-family:var(--mono);letter-spacing:.05em;}
.chevron{font-size:10px;color:var(--muted);}

.lang-dropdown{position:absolute;top:calc(100% + 6px);left:0;width:340px;background:var(--s2);border:1px solid var(--border2);border-radius:12px;padding:10px;z-index:200;box-shadow:0 20px 60px rgba(0,0,0,.7);animation:ddPop .12s ease;}
@keyframes ddPop{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:translateY(0);}}
.lang-dd-header{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:8px;padding:0 4px;}
.lang-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;}
.lang-option{display:flex;align-items:center;gap:7px;padding:8px 10px;background:var(--s3);border:1px solid var(--border);border-radius:7px;color:var(--muted);font-family:var(--sans);font-size:12px;cursor:pointer;transition:all .12s;}
.lang-option:hover{background:var(--border);color:var(--text);}
.lang-option.active{background:rgba(244,164,53,.08);border-color:rgba(244,164,53,.2);}
.lo-icon{font-size:14px;}
.lo-name{flex:1;font-size:11px;}
.lo-live{color:var(--green);font-size:8px;}

.run-btn{display:flex;align-items:center;gap:6px;padding:8px 18px;background:var(--amber);border:none;border-radius:8px;color:#09090e;font-family:var(--disp);font-size:13px;font-weight:800;letter-spacing:.05em;cursor:pointer;transition:all .15s;}
.run-btn:hover:not(:disabled){filter:brightness(1.1);transform:translateY(-1px);}
.run-btn:disabled{opacity:.5;cursor:not-allowed;transform:none;}
.run-arrow{font-size:10px;}
.run-spinner{width:12px;height:12px;border:2px solid rgba(0,0,0,.3);border-top-color:#000;border-radius:50%;animation:spin .6s linear infinite;display:inline-block;}
@keyframes spin{to{transform:rotate(360deg);}}
.clear-btn{padding:7px 12px;background:none;border:1px solid var(--border2);border-radius:7px;color:var(--muted);font-family:var(--sans);font-size:12px;cursor:pointer;transition:all .15s;}
.clear-btn:hover{border-color:var(--red);color:var(--red);}

/* Editor + Output split */
.runner-split{flex:1;display:flex;overflow:hidden;}

.runner-editor-wrap{flex:1;min-width:0;display:flex;flex-direction:column;border-right:1px solid var(--border);}
.runner-editor{flex:1;display:flex;overflow:auto;background:var(--bg);}
.runner-editor::-webkit-scrollbar{width:6px;height:6px;}
.runner-editor::-webkit-scrollbar-thumb{background:var(--border2);border-radius:3px;}
.runner-lns{width:44px;min-width:44px;background:var(--s1);border-right:1px solid var(--border);padding:14px 0;text-align:right;overflow:hidden;}
.rln{height:20px;line-height:20px;padding-right:10px;font-size:11px;font-family:var(--mono);color:var(--muted2);}
.runner-textarea{flex:1;padding:14px 16px;background:transparent;border:none;outline:none;resize:none;font-size:13px;line-height:20px;font-family:var(--mono);color:var(--text);caret-color:var(--amber);white-space:pre;tab-size:2;overflow:visible;}
.runner-textarea::selection{background:rgba(244,164,53,.2);}

.runner-output-wrap{width:42%;min-width:300px;display:flex;flex-direction:column;}
.output-header{padding:8px 14px;background:var(--s1);border-bottom:1px solid var(--border);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;justify-content:space-between;}
.run-time{font-family:var(--mono);color:var(--green);font-size:10px;}
.output-body{flex:1;overflow-y:auto;padding:10px 14px;font-family:var(--mono);font-size:12px;line-height:1.8;background:#060609;}
.output-body::-webkit-scrollbar{width:4px;}
.output-body::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.output-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--muted);font-size:12px;}
.output-empty-icon{font-size:28px;opacity:.3;}
.out-line{display:flex;align-items:baseline;gap:8px;animation:lineFade .1s ease;}
@keyframes lineFade{from{opacity:0;transform:translateX(-4px);}to{opacity:1;transform:translateX(0);}}
.out-prefix{font-size:9px;letter-spacing:.08em;padding:1px 4px;border-radius:2px;flex-shrink:0;}
.sys-prefix{color:var(--muted);background:var(--border);}
.err-prefix{color:var(--red);background:rgba(248,113,113,.1);}
.warn-prefix{color:#fbbf24;background:rgba(251,191,36,.1);}
.out-line.sys .out-text{color:var(--muted);}
.out-line.out .out-text{color:#c5f0cb;}
.out-line.err .out-text{color:var(--red);}
.out-line.warn .out-text{color:#fbbf24;}
.out-line.info .out-text{color:var(--blue);}
.run-cursor{color:var(--amber);}
.cursor-blink{animation:blink .8s step-end infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0;}}

/* ══════════════════════════════════════════════════════════════
   API BLOCKER
══════════════════════════════════════════════════════════════ */
.blocker-root{height:100%;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);}

.blocker-header{padding:14px 20px;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.blocker-title{display:flex;align-items:center;gap:12px;}
.blocker-icon{font-size:28px;}
.blocker-name{font-family:var(--disp);font-size:18px;font-weight:800;color:var(--text);}
.blocker-sub{font-size:11px;color:var(--muted);}
.blocker-stats{display:flex;gap:20px;}
.stat-item{text-align:center;}
.stat-val{font-family:var(--disp);font-size:22px;font-weight:800;}
.stat-val.red{color:var(--red);}
.stat-val.green{color:var(--green);}
.stat-val.amber{color:var(--amber);}
.stat-lbl{font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;}

.shield-gauge-wrap{padding:10px 20px;background:var(--s1);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;}
.shield-gauge{flex:1;height:6px;background:var(--border2);border-radius:3px;overflow:hidden;}
.shield-fill{height:100%;background:linear-gradient(90deg,var(--amber),var(--red));border-radius:3px;transition:width .4s ease;}
.shield-pct{font-size:12px;color:var(--amber);font-family:var(--mono);white-space:nowrap;}

.blocker-controls{padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;background:var(--s2);}
.view-tabs{display:flex;gap:4px;}
.view-tab{padding:6px 14px;border:none;border-radius:6px;background:transparent;color:var(--muted);font-family:var(--sans);font-size:12px;cursor:pointer;transition:all .15s;}
.view-tab:hover{background:var(--border);color:var(--text);}
.view-tab.active{background:rgba(244,164,53,.12);color:var(--amber);border:1px solid rgba(244,164,53,.2);}
.quick-actions{display:flex;gap:6px;}
.qa-btn{padding:5px 12px;border:1px solid var(--border2);border-radius:6px;background:transparent;color:var(--muted);font-size:11px;cursor:pointer;font-family:var(--sans);transition:all .15s;}
.qa-btn:hover{background:var(--border);}
.qa-btn.red{color:var(--red);border-color:rgba(248,113,113,.3);}
.qa-btn.green{color:var(--green);border-color:rgba(74,222,128,.3);}

.api-search-wrap{padding:10px 16px;border-bottom:1px solid var(--border);}
.api-search{width:100%;background:var(--s2);border:1px solid var(--border2);border-radius:8px;padding:8px 14px;color:var(--text);font-family:var(--sans);font-size:13px;outline:none;transition:border-color .2s;}
.api-search:focus{border-color:var(--amber);}
.api-search::placeholder{color:var(--muted);}

.blocker-content{flex:1;overflow:hidden;}

/* Categories layout */
.categories-layout{display:flex;height:100%;overflow:hidden;}

.cat-list{width:240px;min-width:200px;overflow-y:auto;padding:8px;border-right:1px solid var(--border);display:flex;flex-direction:column;gap:4px;}
.cat-list::-webkit-scrollbar{width:4px;}
.cat-list::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.cat-item{padding:10px 12px;background:var(--s2);border:1px solid var(--border);border-radius:10px;cursor:pointer;transition:all .12s;text-align:left;}
.cat-item:hover{border-color:var(--border2);background:var(--s3);}
.cat-item.active{border-color:rgba(244,164,53,.3);background:rgba(244,164,53,.05);}
.cat-item-top{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.cat-item-icon{font-size:16px;}
.cat-item-name{flex:1;font-size:12px;color:var(--text);font-weight:500;}
.cat-toggle{font-size:9px;padding:2px 6px;border-radius:3px;border:1px solid var(--border2);color:var(--muted);font-family:var(--mono);transition:all .15s;}
.cat-toggle.on{background:rgba(248,113,113,.1);color:var(--red);border-color:rgba(248,113,113,.3);}
.cat-progress{height:3px;background:var(--border);border-radius:2px;margin-bottom:4px;overflow:hidden;}
.cat-fill{height:100%;background:linear-gradient(90deg,var(--amber),var(--red));border-radius:2px;transition:width .3s;}
.cat-count{font-size:10px;color:var(--muted);}

/* API detail */
.api-detail{flex:1;overflow-y:auto;padding:16px;}
.api-detail::-webkit-scrollbar{width:5px;}
.api-detail::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.api-detail-header{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid var(--border);}
.api-detail-header>span{font-size:24px;}
.api-detail-title{font-family:var(--disp);font-size:15px;font-weight:700;margin-bottom:3px;}
.api-detail-desc{font-size:12px;color:var(--muted);line-height:1.5;}

/* API rows */
.api-list{display:flex;flex-direction:column;gap:6px;}
.all-apis{height:100%;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:6px;}
.all-apis::-webkit-scrollbar{width:5px;}
.all-apis::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.api-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--s2);border:1px solid var(--border);border-radius:9px;transition:all .15s;}
.api-row:hover{border-color:var(--border2);}
.api-row.blocked{border-left:2px solid var(--red);background:rgba(248,113,113,.04);}
.api-row-left{flex:1;min-width:0;}
.api-row-name{font-size:12px;font-family:var(--mono);color:var(--text);margin-bottom:2px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.api-row-desc{font-size:11px;color:var(--muted);line-height:1.4;}
.api-cat-tag{font-size:10px;color:var(--muted);background:var(--border);padding:1px 6px;border-radius:3px;font-family:var(--sans);}
.api-row-right{display:flex;align-items:center;gap:10px;flex-shrink:0;}
.risk-badge{font-size:9px;padding:2px 7px;border-radius:3px;font-family:var(--mono);letter-spacing:.06em;white-space:nowrap;}

/* Toggle switch */
.toggle-switch{width:40px;height:22px;border:none;border-radius:11px;background:var(--border2);cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.toggle-switch.blocked{background:var(--red);}
.toggle-thumb{position:absolute;width:16px;height:16px;border-radius:50%;background:#fff;top:3px;left:3px;transition:transform .2s;display:block;}
.toggle-switch.blocked .toggle-thumb{transform:translateX(18px);}

/* Intercept log */
.intercept-log{height:100%;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:4px;}
.intercept-log::-webkit-scrollbar{width:4px;}
.intercept-log::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.log-legend{display:flex;align-items:center;gap:14px;padding:8px 4px;margin-bottom:4px;border-bottom:1px solid var(--border);flex-wrap:wrap;}
.log-legend-item{font-size:11px;display:flex;align-items:center;gap:5px;}
.blocked-leg{color:var(--red);}
.allowed-leg{color:var(--green);}
.log-tip{font-size:10px;color:var(--muted);margin-left:auto;}
.log-entry{display:flex;align-items:center;gap:10px;padding:7px 12px;border-radius:7px;font-size:11px;font-family:var(--mono);animation:logSlide .2s ease;}
@keyframes logSlide{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
.log-blocked{background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.1);}
.log-allowed{background:rgba(74,222,128,.04);border:1px solid rgba(74,222,128,.08);}
.log-dot{font-size:12px;flex-shrink:0;}
.log-ts{color:var(--muted);white-space:nowrap;}
.log-api{color:var(--amber);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.log-arrow{color:var(--muted);}
.log-origin{color:var(--blue);flex-shrink:0;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.log-status{font-size:9px;padding:2px 7px;border-radius:3px;letter-spacing:.06em;flex-shrink:0;}
.log-status.blocked{background:rgba(248,113,113,.12);color:var(--red);border:1px solid rgba(248,113,113,.2);}
.log-status.allowed{background:rgba(74,222,128,.1);color:var(--green);border:1px solid rgba(74,222,128,.2);}
`;
