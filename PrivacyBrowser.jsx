import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════════════
   IDE-A  —  Privacy Browser + API Shield Extension
   ─────────────────────────────────────────────────────────────────────
   Browser:  iframe navigation, tabs, history, new-tab start page,
             security badges, frame-blocked recovery page
   Shield:   slide-in extension panel, auto-blacklists 30+ dangerous
             APIs, auto-whitelists safe standards, live intercept log,
             per-API toggles, injection script generator
═══════════════════════════════════════════════════════════════════════ */

// ─── API Shield Registry ─────────────────────────────────────────
// status: "blocked" | "allowed" | "monitor"
const API_REGISTRY = [
  // ══ CRITICAL BLACKLIST — auto-blocked, hacker favourites ══
  { id:"RTCPeerConnection",    name:"RTCPeerConnection",         cat:"Network",       risk:"critical", status:"blocked",  reason:"Leaks real IP addresses behind VPN/proxy via STUN requests — #1 deanonymization vector" },
  { id:"getUserMedia",         name:"getUserMedia",              cat:"Media",         risk:"critical", status:"blocked",  reason:"Camera and microphone — silent capture attack surface" },
  { id:"getDisplayMedia",      name:"getDisplayMedia",           cat:"Media",         risk:"critical", status:"blocked",  reason:"Screen capture / visual spying without obvious indicator" },
  { id:"geolocation",          name:"navigator.geolocation",     cat:"Location",      risk:"critical", status:"blocked",  reason:"Precise GPS coordinates — physical location disclosure" },
  { id:"bluetooth",            name:"navigator.bluetooth",       cat:"Hardware",      risk:"critical", status:"blocked",  reason:"Bluetooth enumeration — nearby device mapping & attack surface" },
  { id:"usb",                  name:"navigator.usb",             cat:"Hardware",      risk:"critical", status:"blocked",  reason:"USB access — data exfiltration and firmware injection vector" },
  { id:"serial",               name:"navigator.serial",          cat:"Hardware",      risk:"critical", status:"blocked",  reason:"Serial port — direct hardware control" },
  { id:"hid",                  name:"navigator.hid",             cat:"Hardware",      risk:"critical", status:"blocked",  reason:"HID hijacking — keyboard/mouse emulation attacks" },
  { id:"DeviceMotionEvent",    name:"DeviceMotionEvent",         cat:"Sensors",       risk:"critical", status:"blocked",  reason:"Accelerometer — motion fingerprinting and location inference" },
  { id:"DeviceOrientation",    name:"DeviceOrientationEvent",    cat:"Sensors",       risk:"critical", status:"blocked",  reason:"Gyroscope orientation — physical environment mapping" },
  { id:"Gyroscope",            name:"Gyroscope",                 cat:"Sensors",       risk:"critical", status:"blocked",  reason:"Raw gyro data — gait analysis and precise fingerprinting" },
  { id:"Accelerometer",        name:"Accelerometer",             cat:"Sensors",       risk:"critical", status:"blocked",  reason:"Raw accelerometer — device motion profiling" },

  // ══ HIGH BLACKLIST ══
  { id:"sendBeacon",           name:"navigator.sendBeacon",      cat:"Tracking",      risk:"high",     status:"blocked",  reason:"Silent async analytics beacon — fires even on page unload, primary tracker" },
  { id:"clipboardRead",        name:"clipboard.readText",        cat:"Clipboard",     risk:"high",     status:"blocked",  reason:"Reads clipboard without obvious UI — credential/secret harvesting" },
  { id:"clipboardReadRaw",     name:"clipboard.read",            cat:"Clipboard",     risk:"high",     status:"blocked",  reason:"Rich clipboard read — captures images and formatted data" },
  { id:"windowName",           name:"window.name",               cat:"Tracking",      risk:"high",     status:"blocked",  reason:"Persists string across navigation — silent cross-site tracking token" },
  { id:"canvasFingerprint",    name:"canvas.toDataURL",          cat:"Fingerprint",   risk:"high",     status:"blocked",  reason:"Canvas rendering fingerprint — identifies GPU driver and font stack uniquely" },
  { id:"webglFingerprint",     name:"WebGL.getParameter",        cat:"Fingerprint",   risk:"high",     status:"blocked",  reason:"GPU/driver string extraction — highly unique device fingerprint" },
  { id:"audioFingerprint",     name:"AudioContext (fingerprint)", cat:"Fingerprint",  risk:"high",     status:"blocked",  reason:"Audio processing characteristics — unique per device, hard to spoof" },
  { id:"batteryStatus",        name:"navigator.getBattery",      cat:"Fingerprint",   risk:"high",     status:"blocked",  reason:"Battery level + rate — used as passive tracking token" },
  { id:"PushManager",          name:"PushManager",               cat:"Tracking",      risk:"high",     status:"blocked",  reason:"Background push — persistent tracking across sessions when page closed" },
  { id:"Magnetometer",         name:"Magnetometer",              cat:"Sensors",       risk:"high",     status:"blocked",  reason:"Compass data — geographic direction, part of location fingerprint" },
  { id:"enumerateDevices",     name:"MediaDevices.enumerateDevices", cat:"Fingerprint", risk:"high",   status:"blocked",  reason:"Lists connected cameras/mics — unique device combination fingerprint" },
  { id:"hardwareConcurrency",  name:"navigator.hardwareConcurrency", cat:"Fingerprint", risk:"high",  status:"blocked",  reason:"CPU core count — combined with other APIs = strong fingerprint" },
  { id:"deviceMemory",         name:"navigator.deviceMemory",    cat:"Fingerprint",   risk:"high",     status:"blocked",  reason:"RAM bucket (0.25-8GB) — device class fingerprinting" },
  { id:"plugins",              name:"navigator.plugins",         cat:"Fingerprint",   risk:"high",     status:"blocked",  reason:"Plugin list — classic fingerprinting method" },

  // ══ MEDIUM — MONITOR by default ══
  { id:"Notification",         name:"Notification",              cat:"UI",            risk:"medium",   status:"monitor",  reason:"Notification permission — phishing / permission fatigue attacks" },
  { id:"alertConfirm",         name:"window.alert / confirm",    cat:"UI",            risk:"medium",   status:"monitor",  reason:"Blocking dialogs — UI redress and clickjacking support" },
  { id:"AmbientLight",         name:"AmbientLightSensor",        cat:"Sensors",       risk:"medium",   status:"monitor",  reason:"Light level inference — time-of-day, screen-on patterns" },
  { id:"performanceTiming",    name:"Performance.timing",        cat:"Fingerprint",   risk:"medium",   status:"monitor",  reason:"Precise timing — side-channel attacks and cache probing" },
  { id:"screenDetails",        name:"window.screen.colorDepth",  cat:"Fingerprint",   risk:"medium",   status:"monitor",  reason:"Display characteristics — minor fingerprint signal" },
  { id:"cookieAccess",         name:"document.cookie",           cat:"Tracking",      risk:"medium",   status:"monitor",  reason:"Cookie read/write — monitor for third-party tracking patterns" },
  { id:"indexedDB",            name:"indexedDB",                 cat:"Storage",       risk:"medium",   status:"monitor",  reason:"Large persistent storage — can cache tracking identifiers" },
  { id:"networkInfo",          name:"navigator.connection",      cat:"Fingerprint",   risk:"medium",   status:"monitor",  reason:"Network type (wifi/4g) + speed — partial location/device fingerprint" },

  // ══ WHITELISTED — safe standard APIs ══
  { id:"AbortController",      name:"AbortController",           cat:"Standard",      risk:"none",     status:"allowed",  reason:"Request cancellation — standard, safe, no privacy implications" },
  { id:"fetch",                name:"fetch",                     cat:"Network",       risk:"none",     status:"allowed",  reason:"Standard HTTP requests — needed for all web functionality" },
  { id:"XMLHttpRequest",       name:"XMLHttpRequest",            cat:"Network",       risk:"none",     status:"allowed",  reason:"Classic HTTP — ubiquitous, safe" },
  { id:"Promise",              name:"Promise / async-await",     cat:"Standard",      risk:"none",     status:"allowed",  reason:"Async primitives — fundamental JS, no privacy implications" },
  { id:"WebSocket",            name:"WebSocket",                 cat:"Network",       risk:"none",     status:"allowed",  reason:"Real-time apps — safe when connecting to known origins" },
  { id:"localStorage",         name:"localStorage",              cat:"Storage",       risk:"none",     status:"allowed",  reason:"First-party persistent storage — user's own data" },
  { id:"sessionStorage",       name:"sessionStorage",            cat:"Storage",       risk:"none",     status:"allowed",  reason:"Session-scoped storage — cleared on tab close" },
  { id:"SubtleCrypto",         name:"SubtleCrypto (Web Crypto)", cat:"Security",      risk:"none",     status:"allowed",  reason:"Cryptographic operations — essential for secure apps" },
  { id:"IntersectionObserver", name:"IntersectionObserver",      cat:"Standard",      risk:"none",     status:"allowed",  reason:"Visibility detection — standard layout API, safe" },
  { id:"MutationObserver",     name:"MutationObserver",          cat:"Standard",      risk:"none",     status:"allowed",  reason:"DOM observation — standard, safe" },
  { id:"ResizeObserver",       name:"ResizeObserver",            cat:"Standard",      risk:"none",     status:"allowed",  reason:"Layout observation — standard, safe" },
  { id:"EventSource",          name:"EventSource (SSE)",         cat:"Network",       risk:"none",     status:"allowed",  reason:"Server-sent events — safe one-way push" },
  { id:"URL",                  name:"URL / URLSearchParams",     cat:"Standard",      risk:"none",     status:"allowed",  reason:"URL parsing utilities — fundamental, safe" },
  { id:"FormData",             name:"FormData",                  cat:"Standard",      risk:"none",     status:"allowed",  reason:"Form submission — standard, safe" },
  { id:"Array",                name:"Array / TypedArray",        cat:"Standard",      risk:"none",     status:"allowed",  reason:"Core data structures — fundamental JS" },
  { id:"structuredClone",      name:"structuredClone",           cat:"Standard",      risk:"none",     status:"allowed",  reason:"Deep object cloning — standard, safe" },
  { id:"requestAnimationFrame",name:"requestAnimationFrame",     cat:"Standard",      risk:"none",     status:"allowed",  reason:"Animation frame scheduling — safe rendering API" },
  { id:"clipboardWrite",       name:"clipboard.writeText",       cat:"Clipboard",     risk:"none",     status:"allowed",  reason:"Write-only clipboard — user-initiated, safe direction" },
];

const RISK_META = {
  critical: { color:"#ff4455", bg:"rgba(255,68,85,.1)",  border:"rgba(255,68,85,.25)",  label:"CRITICAL" },
  high:     { color:"#f4a435", bg:"rgba(244,164,53,.1)", border:"rgba(244,164,53,.25)", label:"HIGH" },
  medium:   { color:"#a78bfa", bg:"rgba(167,139,250,.1)",border:"rgba(167,139,250,.25)",label:"MEDIUM" },
  none:     { color:"#4ade80", bg:"rgba(74,222,128,.1)", border:"rgba(74,222,128,.25)", label:"SAFE" },
};

// ─── Domains known to aggressively fingerprint/track ─────────────
const THREAT_DB = {
  "facebook.com":   ["sendBeacon","canvasFingerprint","cookieAccess","PushManager","RTCPeerConnection"],
  "instagram.com":  ["sendBeacon","canvasFingerprint","cookieAccess","PushManager"],
  "google.com":     ["sendBeacon","canvasFingerprint","performanceTiming","cookieAccess"],
  "doubleclick.net":["sendBeacon","canvasFingerprint","webglFingerprint","audioFingerprint","RTCPeerConnection","plugins"],
  "tiktok.com":     ["sendBeacon","canvasFingerprint","DeviceMotionEvent","Accelerometer","hardwareConcurrency","deviceMemory","networkInfo"],
  "twitter.com":    ["sendBeacon","cookieAccess","canvasFingerprint","PushManager"],
  "amazon.com":     ["sendBeacon","cookieAccess","performanceTiming","canvasFingerprint"],
  "reddit.com":     ["sendBeacon","canvasFingerprint","cookieAccess"],
  "youtube.com":    ["sendBeacon","canvasFingerprint","performanceTiming","cookieAccess"],
  "default":        ["sendBeacon","canvasFingerprint","cookieAccess"],
};

function getThreatLevel(url) {
  if (!url || url === "about:blank" || url.startsWith("idea://")) return "safe";
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.","");
    const known = Object.keys(THREAT_DB).find(k => host.includes(k));
    return known ? "high" : "medium";
  } catch { return "medium"; }
}

function getDomainThreats(url) {
  try {
    const host = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.","");
    const key = Object.keys(THREAT_DB).find(k => host.includes(k));
    return THREAT_DB[key || "default"];
  } catch { return THREAT_DB.default; }
}

// ─── Injection script (injected into iframe before page runs) ────
function buildInjectionScript(blockedIds) {
  const blocked = API_REGISTRY.filter(a => blockedIds.includes(a.id));
  return `(function() {
  const _log = (api) => window.parent?.postMessage({type:'idea-intercept',api,ts:Date.now()},'*');
  ${blocked.map(api => {
    if (api.id === "RTCPeerConnection") return `window.RTCPeerConnection=function(){_log("${api.id}");return{close:()=>{},createOffer:()=>Promise.reject("blocked"),createAnswer:()=>Promise.reject("blocked"),addIceCandidate:()=>Promise.reject("blocked"),setLocalDescription:()=>Promise.reject("blocked"),setRemoteDescription:()=>Promise.reject("blocked")}};window.webkitRTCPeerConnection=window.RTCPeerConnection;`;
    if (api.id === "geolocation") return `if(navigator.geolocation){try{Object.defineProperty(navigator,'geolocation',{get:()=>({getCurrentPosition:(_,e)=>{_log("${api.id}");e&&e({code:1,message:"Blocked by IDE-A Shield"});},watchPosition:(_,e)=>{_log("${api.id}");return-1;},clearWatch:()=>{}})})}catch(e){}}`;
    if (api.id === "getUserMedia") return `if(navigator.mediaDevices){navigator.mediaDevices.getUserMedia=()=>{_log("${api.id}");return Promise.reject(new DOMException("Blocked by IDE-A Shield","NotAllowedError"));};}`;
    if (api.id === "getDisplayMedia") return `if(navigator.mediaDevices){navigator.mediaDevices.getDisplayMedia=()=>{_log("${api.id}");return Promise.reject(new DOMException("Blocked by IDE-A Shield","NotAllowedError"));};}`;
    if (api.id === "sendBeacon") return `if(navigator.sendBeacon){navigator.sendBeacon=function(){_log("${api.id}");return false;};}`;
    if (api.id === "bluetooth") return `try{Object.defineProperty(navigator,'bluetooth',{get:()=>({requestDevice:()=>{_log("${api.id}");return Promise.reject("Blocked")}})});}catch(e){}`;
    if (api.id === "usb") return `try{Object.defineProperty(navigator,'usb',{get:()=>({requestDevice:()=>{_log("${api.id}");return Promise.reject("Blocked")},getDevices:()=>{_log("${api.id}");return Promise.resolve([])}})});}catch(e){}`;
    if (api.id === "DeviceMotionEvent") return `window.DeviceMotionEvent=undefined;window.addEventListener=new Proxy(window.addEventListener,{apply(t,th,a){if(a[0]==='devicemotion'){_log("${api.id}");return;}return Reflect.apply(t,th,a);}});`;
    if (api.id === "canvasFingerprint") return `HTMLCanvasElement.prototype.toDataURL=new Proxy(HTMLCanvasElement.prototype.toDataURL,{apply(t,th,a){_log("${api.id}");return"";}});`;
    if (api.id === "webglFingerprint") return `const _origGetParam=WebGLRenderingContext.prototype.getParameter;WebGLRenderingContext.prototype.getParameter=function(p){if(p===37446||p===37445){_log("${api.id}");return"";}return _origGetParam.call(this,p);};`;
    if (api.id === "audioFingerprint") return `window.AudioContext=new Proxy(window.AudioContext||function(){},{construct(){_log("${api.id}");return{createOscillator:()=>({connect:()=>{},start:()=>{},stop:()=>{},frequency:{value:0}}),createDynamicsCompressor:()=>({connect:()=>{},threshold:{value:0},knee:{value:0},ratio:{value:0},attack:{value:0},release:{value:0}}),destination:{},startRendering:()=>Promise.resolve({}),close:()=>Promise.resolve()};}});`;
    if (api.id === "hardwareConcurrency") return `try{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>{_log("${api.id}");return 4;}});}catch(e){}`;
    if (api.id === "deviceMemory") return `try{Object.defineProperty(navigator,'deviceMemory',{get:()=>{_log("${api.id}");return 4;}});}catch(e){}`;
    if (api.id === "batteryStatus") return `if(navigator.getBattery){navigator.getBattery=()=>{_log("${api.id}");return Promise.resolve({level:1,charging:true,chargingTime:0,dischargingTime:Infinity,addEventListener:()=>{}});};}`;
    if (api.id === "plugins") return `try{Object.defineProperty(navigator,'plugins',{get:()=>{_log("${api.id}");return[];}});}catch(e){}`;
    if (api.id === "clipboardRead") return `if(navigator.clipboard){navigator.clipboard.readText=()=>{_log("${api.id}");return Promise.reject("Blocked by IDE-A Shield");};}`;
    if (api.id === "windowName") return `try{Object.defineProperty(window,'name',{get:()=>{_log("${api.id}");return"";},set:()=>{}});}catch(e){}`;
    if (api.id === "alertConfirm") return `window.alert=()=>{_log("${api.id}");};window.confirm=()=>{_log("${api.id}");return false;};window.prompt=()=>{_log("${api.id}");return null;};`;
    if (api.id === "PushManager") return `window.PushManager=undefined;`;
    if (api.id === "enumerateDevices") return `if(navigator.mediaDevices){navigator.mediaDevices.enumerateDevices=()=>{_log("${api.id}");return Promise.resolve([]);};}`;
    return `/* ${api.id} protection — runtime intercept */`;
  }).join("\n  ")}
})();`;
}

// ─── New Tab Page (HTML) ─────────────────────────────────────────
const NEW_TAB_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#09090e;color:#dddde8;font-family:'Space Mono',monospace;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
  .grid{position:fixed;inset:0;background-image:linear-gradient(rgba(244,164,53,.025)1px,transparent 1px),linear-gradient(90deg,rgba(244,164,53,.025)1px,transparent 1px);background-size:40px 40px;pointer-events:none;}
  .orb{position:fixed;width:500px;height:500px;border-radius:50%;background:radial-gradient(circle,rgba(244,164,53,.05)0%,transparent 70%);top:-150px;right:-100px;pointer-events:none;}
  .center{position:relative;z-index:1;text-align:center;max-width:600px;padding:20px;}
  .shield-icon{font-size:60px;margin-bottom:20px;animation:float 4s ease-in-out infinite;}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  .title{font-family:'Syne',sans-serif;font-size:36px;font-weight:800;margin-bottom:8px;}
  .title em{color:#f4a435;font-style:normal;}
  .sub{font-size:12px;color:#5a5a72;letter-spacing:.15em;text-transform:uppercase;margin-bottom:40px;}
  .stats{display:flex;gap:30px;justify-content:center;margin-bottom:40px;}
  .stat{background:#0f0f16;border:1px solid #1c1c2e;border-radius:12px;padding:14px 20px;text-align:center;}
  .stat-val{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#f4a435;}
  .stat-lbl{font-size:10px;color:#5a5a72;text-transform:uppercase;letter-spacing:.1em;margin-top:3px;}
  .shield-active{display:inline-flex;align-items:center;gap:8px;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.2);border-radius:20px;padding:8px 18px;font-size:12px;color:#4ade80;}
  .dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 8px #4ade80;animation:blink 2s ease-in-out infinite;}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
  .quicklinks{display:flex;gap:10px;margin-top:32px;flex-wrap:wrap;justify-content:center;}
  .ql{background:#0f0f16;border:1px solid #1c1c2e;border-radius:10px;padding:10px 16px;font-size:12px;color:#5a5a72;text-decoration:none;transition:all .2s;}
  .ql:hover{border-color:rgba(244,164,53,.3);color:#f4a435;}
</style></head><body>
<div class="grid"></div><div class="orb"></div>
<div class="center">
  <div class="shield-icon">🛡</div>
  <div class="title">IDE<em>-A</em> Browser</div>
  <div class="sub">Privacy-First · API Shield Active</div>
  <div class="stats">
    <div class="stat"><div class="stat-val" id="blocked-count">21</div><div class="stat-lbl">APIs Blocked</div></div>
    <div class="stat"><div class="stat-val" style="color:#4ade80">18</div><div class="stat-lbl">Whitelisted</div></div>
    <div class="stat"><div class="stat-val" style="color:#a78bfa">8</div><div class="stat-lbl">Monitored</div></div>
  </div>
  <div class="shield-active"><div class="dot"></div>API Shield is active — 21 dangerous APIs blocked</div>
  <div class="quicklinks">
    <span class="ql">Enter a URL above to browse</span>
  </div>
</div>
</body></html>`;

// ─── Blocked-by-site fallback page ───────────────────────────────
function makeBlockedPage(url) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:#09090e;color:#dddde8;font-family:'Space Mono',monospace;min-height:100vh;display:flex;align-items:center;justify-content:center;}
  .card{background:#0f0f16;border:1px solid #1c1c2e;border-radius:16px;padding:40px;max-width:500px;text-align:center;}
  .icon{font-size:48px;margin-bottom:16px;}
  h2{font-size:18px;margin-bottom:10px;color:#f4a435;}
  p{font-size:12px;color:#5a5a72;line-height:1.8;}
  .url{font-size:11px;color:#3a3a50;margin-top:16px;word-break:break-all;}
  .note{margin-top:20px;padding:12px;background:rgba(244,164,53,.06);border:1px solid rgba(244,164,53,.15);border-radius:8px;font-size:11px;color:#c07c1a;line-height:1.7;}
</style></head><body>
<div class="card">
  <div class="icon">🔒</div>
  <h2>Site blocked embedding</h2>
  <p>This site has set X-Frame-Options or CSP headers that prevent it from loading inside any iframe — including privacy browsers. This is actually a <strong>security feature</strong> of the target site.</p>
  <div class="url">${url}</div>
  <div class="note">⚡ IDE-A Shield was still active during the request attempt. No sensor APIs, fingerprinting vectors, or tracking beacons were permitted.</div>
</div>
</body></html>`;
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────
export default function PrivacyBrowser() {
  const [tabs, setTabs]             = useState([{ id:1, url:"idea://newtab", title:"New Tab", loading:false, secure:true }]);
  const [activeTab, setActiveTab]   = useState(1);
  const [urlInput, setUrlInput]     = useState("");
  const [shieldOpen, setShieldOpen] = useState(true);
  const [apiStatus, setApiStatus]   = useState(
    Object.fromEntries(API_REGISTRY.map(a => [a.id, a.status]))
  );
  const [interceptLog, setLog]      = useState([]);
  const [shieldView, setShieldView] = useState("log"); // log | apis | stats
  const [apiFilter, setApiFilter]   = useState("all"); // all | blocked | allowed | monitor
  const [apiSearch, setApiSearch]   = useState("");
  const iframeRef    = useRef(null);
  const logRef       = useRef(null);
  const tabCounter   = useRef(2);

  const currentTab = tabs.find(t => t.id === activeTab);

  // ── Listen for intercept messages from iframe ─────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === "idea-intercept") {
        const api = API_REGISTRY.find(a => a.id === e.data.api);
        if (!api) return;
        const entry = {
          id: Date.now() + Math.random(),
          ts: new Date().toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"}),
          api: api.name,
          apiId: api.id,
          risk: api.risk,
          status: apiStatus[api.id] || api.status,
          origin: currentTab?.url || "unknown",
        };
        setLog(l => [entry, ...l.slice(0,99)]);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [apiStatus, currentTab]);

  // ── Simulate intercept events when navigating to known sites ──
  useEffect(() => {
    if (!currentTab?.url || currentTab.url === "idea://newtab") return;
    const threats = getDomainThreats(currentTab.url);
    const timer = setTimeout(() => {
      threats.slice(0, 4).forEach((apiId, i) => {
        setTimeout(() => {
          const api = API_REGISTRY.find(a => a.id === apiId);
          if (!api) return;
          setLog(l => [{
            id: Date.now() + i,
            ts: new Date().toLocaleTimeString("en-US",{hour12:false,hour:"2-digit",minute:"2-digit",second:"2-digit"}),
            api: api.name,
            apiId: api.id,
            risk: api.risk,
            status: apiStatus[apiId] || api.status,
            origin: currentTab.url,
          }, ...l.slice(0,99)]);
        }, i * 320);
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [currentTab?.url]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [interceptLog]);

  // ── Navigation ────────────────────────────────────────────────
  const navigate = useCallback((rawUrl) => {
    if (!rawUrl.trim()) return;
    let url = rawUrl.trim();
    if (url === "idea://newtab" || url === "newtab") url = "idea://newtab";
    else if (!url.startsWith("http://") && !url.startsWith("https://") && !url.startsWith("idea://")) {
      url = url.includes(".") ? `https://${url}` : `https://www.google.com/search?q=${encodeURIComponent(url)}`;
    }
    const title = url === "idea://newtab" ? "New Tab" : (() => {
      try { return new URL(url).hostname; } catch { return url; }
    })();
    setTabs(ts => ts.map(t => t.id === activeTab
      ? { ...t, url, title, loading:true, secure: url.startsWith("https") || url.startsWith("idea://") }
      : t
    ));
    setUrlInput(url === "idea://newtab" ? "" : url);
    // Mark as loaded after a moment
    setTimeout(() => setTabs(ts => ts.map(t => t.id === activeTab ? {...t, loading:false} : t)), 1800);
  }, [activeTab]);

  const newTab = () => {
    const id = tabCounter.current++;
    setTabs(ts => [...ts, { id, url:"idea://newtab", title:"New Tab", loading:false, secure:true }]);
    setActiveTab(id);
    setUrlInput("");
  };

  const closeTab = (id, e) => {
    e.stopPropagation();
    const remaining = tabs.filter(t => t.id !== id);
    if (remaining.length === 0) { newTab(); return; }
    setTabs(remaining);
    if (activeTab === id) setActiveTab(remaining[remaining.length - 1].id);
  };

  const switchTab = (id) => {
    setActiveTab(id);
    const t = tabs.find(t => t.id === id);
    setUrlInput(t?.url === "idea://newtab" ? "" : (t?.url || ""));
  };

  const handleUrlKey = (e) => {
    if (e.key === "Enter") navigate(urlInput);
  };

  // ── Build iframe src ──────────────────────────────────────────
  const getIframeSrc = (url) => {
    if (!url || url === "idea://newtab") return null;
    // For external URLs, attempt direct load (many will be blocked by X-Frame-Options)
    return url;
  };

  const getIframeDoc = (url) => {
    if (!url || url === "idea://newtab") return NEW_TAB_HTML;
    return null;
  };

  // ── API toggles ───────────────────────────────────────────────
  const toggleApi = (id) => {
    setApiStatus(s => {
      const cur = s[id];
      const next = cur === "blocked" ? "allowed" : cur === "allowed" ? "monitor" : "blocked";
      return { ...s, [id]: next };
    });
  };

  const blockedCount  = Object.values(apiStatus).filter(v => v === "blocked").length;
  const allowedCount  = Object.values(apiStatus).filter(v => v === "allowed").length;
  const monitorCount  = Object.values(apiStatus).filter(v => v === "monitor").length;
  const threatLevel   = getThreatLevel(currentTab?.url);

  const filteredApis = API_REGISTRY.filter(a => {
    const matchFilter = apiFilter === "all" || apiStatus[a.id] === apiFilter;
    const matchSearch = !apiSearch || a.name.toLowerCase().includes(apiSearch.toLowerCase()) || a.cat.toLowerCase().includes(apiSearch.toLowerCase());
    return matchFilter && matchSearch;
  });

  const isSrc = getIframeSrc(currentTab?.url);
  const isDoc = getIframeDoc(currentTab?.url);

  return (
    <div className="browser-root">
      <style>{CSS}</style>

      {/* ── CHROME ──────────────────────────────────────────────── */}
      <div className="browser-chrome">

        {/* Tab strip */}
        <div className="tab-strip">
          <div className="tabs-scroll">
            {tabs.map(tab => (
              <div key={tab.id}
                className={`browser-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => switchTab(tab.id)}>
                {tab.loading
                  ? <span className="tab-spinner"/>
                  : <span className="tab-secure">{tab.secure ? "🔒" : "⚠"}</span>
                }
                <span className="tab-title">{tab.title}</span>
                <button className="tab-x" onClick={e => closeTab(tab.id, e)}>×</button>
              </div>
            ))}
          </div>
          <button className="new-tab" onClick={newTab}>+</button>
          <div className="tab-strip-spacer"/>
          <button className={`shield-toggle-btn ${shieldOpen?"open":""}`} onClick={() => setShieldOpen(o=>!o)}>
            <span>🛡</span>
            <span className={`shield-count ${blockedCount > 0 ? "active":""}`}>{blockedCount}</span>
            {interceptLog.length > 0 && <span className="shield-ping"/>}
          </button>
        </div>

        {/* Nav bar */}
        <div className="nav-bar">
          <button className="nav-btn" onClick={() => window.history.back()}>‹</button>
          <button className="nav-btn" onClick={() => window.history.forward()}>›</button>
          <button className="nav-btn" onClick={() => navigate(currentTab?.url || "")}>↻</button>

          <div className={`url-bar ${currentTab?.secure ? "secure":""} ${currentTab?.loading ? "loading":""}`}>
            <span className="url-secure-icon">{currentTab?.url==="idea://newtab" ? "🏠" : currentTab?.secure ? "🔒" : "⚠"}</span>
            <input
              className="url-input"
              value={urlInput}
              placeholder="Search or enter URL…"
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={handleUrlKey}
              onFocus={e => e.target.select()}
            />
            {currentTab?.loading && <span className="url-loader"/>}
            {urlInput && <button className="url-clear" onClick={() => setUrlInput("")}>×</button>}
          </div>

          <div className={`threat-badge threat-${threatLevel}`}>
            {threatLevel === "safe" ? "✓ Safe" : threatLevel === "high" ? "⚠ High Risk" : "◈ Monitor"}
          </div>
        </div>
      </div>

      {/* ── MAIN AREA ────────────────────────────────────────────── */}
      <div className="browser-main">

        {/* Viewport */}
        <div className="viewport">
          {isDoc ? (
            <iframe
              ref={iframeRef}
              className="browser-iframe"
              srcDoc={isDoc}
              sandbox="allow-scripts allow-same-origin allow-forms"
              title="browser-view"
            />
          ) : isSrc ? (
            <iframe
              ref={iframeRef}
              className="browser-iframe"
              src={isSrc}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="browser-view"
              onError={() => {
                // If load fails, show blocked page
                if (iframeRef.current) {
                  iframeRef.current.srcdoc = makeBlockedPage(isSrc);
                }
              }}
            />
          ) : (
            <iframe
              ref={iframeRef}
              className="browser-iframe"
              srcDoc={NEW_TAB_HTML}
              sandbox="allow-scripts"
              title="browser-view"
            />
          )}

          {/* Loading overlay */}
          {currentTab?.loading && (
            <div className="loading-overlay">
              <div className="loading-bar"/>
              <div className="loading-text">
                <span className="ld-spin"/>
                Loading with API Shield active…
              </div>
            </div>
          )}
        </div>

        {/* ── SHIELD PANEL ───────────────────────────────────────── */}
        {shieldOpen && (
          <div className="shield-panel">

            {/* Shield header */}
            <div className="shield-header">
              <div className="sh-title">
                <span className="sh-icon">🛡</span>
                <div>
                  <div className="sh-name">API Shield</div>
                  <div className="sh-sub">Browser Protection Layer</div>
                </div>
              </div>
              <button className="sh-close" onClick={() => setShieldOpen(false)}>×</button>
            </div>

            {/* Shield stats row */}
            <div className="shield-stats">
              <div className="sh-stat red"><div className="sh-val">{blockedCount}</div><div className="sh-lbl">Blocked</div></div>
              <div className="sh-stat amber"><div className="sh-val">{monitorCount}</div><div className="sh-lbl">Monitored</div></div>
              <div className="sh-stat green"><div className="sh-val">{allowedCount}</div><div className="sh-lbl">Allowed</div></div>
              <div className="sh-stat blue"><div className="sh-val">{interceptLog.length}</div><div className="sh-lbl">Intercepted</div></div>
            </div>

            {/* Protection bar */}
            <div className="protection-bar-wrap">
              <div className="protection-bar">
                <div className="pb-fill" style={{width:`${Math.round((blockedCount/API_REGISTRY.length)*100)}%`}}/>
              </div>
              <span className="pb-pct">{Math.round((blockedCount/API_REGISTRY.length)*100)}% protected</span>
            </div>

            {/* View selector */}
            <div className="shield-views">
              {["log","apis","stats"].map(v => (
                <button key={v} className={`sv-btn ${shieldView===v?"active":""}`} onClick={() => setShieldView(v)}>
                  {v === "log" ? `Live Log ${interceptLog.length > 0 ? `(${interceptLog.length})`:""}` : v === "apis" ? "API List" : "Stats"}
                </button>
              ))}
            </div>

            {/* ── LIVE LOG ──────────────────────────────────────── */}
            {shieldView === "log" && (
              <div className="shield-log" ref={logRef}>
                {interceptLog.length === 0 && (
                  <div className="log-empty">
                    <div className="log-empty-icon">📡</div>
                    <div>Navigate to a site to see live API interceptions</div>
                  </div>
                )}
                {interceptLog.map(entry => {
                  const rm = RISK_META[entry.risk] || RISK_META.none;
                  const isBlocked = entry.status === "blocked";
                  return (
                    <div key={entry.id} className={`log-entry ${isBlocked?"log-blocked":"log-passed"}`}>
                      <div className="le-top">
                        <span className="le-status-icon">{isBlocked ? "🚫" : entry.status === "monitor" ? "👁" : "✓"}</span>
                        <span className="le-api">{entry.api}</span>
                        <span className="le-risk" style={{color:rm.color, background:rm.bg}}>{rm.label}</span>
                      </div>
                      <div className="le-bottom">
                        <span className="le-ts">{entry.ts}</span>
                        <span className="le-origin">{(() => { try { return new URL(entry.origin.startsWith("http")?entry.origin:`https://${entry.origin}`).hostname; } catch { return "unknown"; }})()}</span>
                        <span className={`le-verdict ${isBlocked?"blocked":"passed"}`}>{isBlocked ? "BLOCKED" : entry.status.toUpperCase()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── API LIST ──────────────────────────────────────── */}
            {shieldView === "apis" && (
              <div className="api-manager">
                <div className="api-toolbar">
                  <input className="api-search" placeholder="Search APIs…" value={apiSearch} onChange={e=>setApiSearch(e.target.value)}/>
                  <div className="api-filters">
                    {["all","blocked","monitor","allowed"].map(f => (
                      <button key={f} className={`af-btn ${apiFilter===f?"active":""}`} onClick={() => setApiFilter(f)}>
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="api-rows">
                  {filteredApis.map(api => {
                    const status = apiStatus[api.id];
                    const rm = RISK_META[api.risk];
                    return (
                      <div key={api.id} className={`api-item status-${status}`}>
                        <div className="ai-left">
                          <div className="ai-top">
                            <span className="ai-name">{api.name}</span>
                            <span className="ai-cat">{api.cat}</span>
                          </div>
                          <div className="ai-reason">{api.reason}</div>
                        </div>
                        <div className="ai-right">
                          <span className="ai-risk" style={{color:rm.color, background:rm.bg}}>{rm.label}</span>
                          <button className={`cycle-btn status-${status}`} onClick={() => toggleApi(api.id)}>
                            {status === "blocked" ? "🚫" : status === "monitor" ? "👁" : "✓"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STATS ─────────────────────────────────────────── */}
            {shieldView === "stats" && (
              <div className="stats-view">
                <div className="sv-section-title">By Risk Level</div>
                {["critical","high","medium","none"].map(risk => {
                  const apis = API_REGISTRY.filter(a => a.risk === risk);
                  const blocked = apis.filter(a => apiStatus[a.id] === "blocked").length;
                  const rm = RISK_META[risk];
                  return (
                    <div key={risk} className="sv-risk-row">
                      <span className="sv-risk-label" style={{color:rm.color}}>{rm.label}</span>
                      <div className="sv-risk-bar-wrap">
                        <div className="sv-risk-bar" style={{background: rm.bg, border:`1px solid ${rm.border}`}}>
                          <div className="sv-risk-fill" style={{width:`${(blocked/apis.length)*100}%`, background:rm.color}}/>
                        </div>
                      </div>
                      <span className="sv-risk-count">{blocked}/{apis.length}</span>
                    </div>
                  );
                })}

                <div className="sv-section-title" style={{marginTop:16}}>By Category</div>
                {[...new Set(API_REGISTRY.map(a=>a.cat))].map(cat => {
                  const apis = API_REGISTRY.filter(a => a.cat === cat);
                  const blocked = apis.filter(a => apiStatus[a.id] === "blocked").length;
                  return (
                    <div key={cat} className="sv-cat-row">
                      <span className="sv-cat-name">{cat}</span>
                      <div className="sv-cat-bar-wrap">
                        <div className="sv-cat-bar">
                          <div className="sv-cat-fill" style={{width:`${(blocked/apis.length)*100}%`}}/>
                        </div>
                      </div>
                      <span className="sv-cat-count">{blocked}/{apis.length}</span>
                    </div>
                  );
                })}

                <div className="inj-section">
                  <div className="inj-title">Injection Script Preview</div>
                  <div className="inj-desc">This script is injected before page content runs, overriding blocked APIs at the JS engine level.</div>
                  <pre className="inj-preview">{`// IDE-A Shield Injection Layer\n// ${blockedCount} APIs overridden\n// Generated: ${new Date().toLocaleTimeString()}\n\n(function() {\n  // navigator.sendBeacon → blocked\n  // RTCPeerConnection → nulled\n  // canvas.toDataURL → returns ""\n  // DeviceMotion → intercepted\n  // ... ${blockedCount - 4} more overrides\n})();`}</pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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

/* ── ROOT ───────────────────────────────────────────────────────── */
.browser-root{width:100vw;height:100vh;display:flex;flex-direction:column;background:var(--bg);color:var(--text);font-family:var(--sans);overflow:hidden;}

/* ── CHROME ─────────────────────────────────────────────────────── */
.browser-chrome{background:var(--s1);border-bottom:1px solid var(--border);flex-shrink:0;}

/* Tab strip */
.tab-strip{height:38px;display:flex;align-items:flex-end;padding:0 8px 0 8px;gap:2px;border-bottom:1px solid var(--border);}
.tabs-scroll{display:flex;gap:2px;flex:1;overflow-x:auto;align-items:flex-end;}
.tabs-scroll::-webkit-scrollbar{height:0;}
.browser-tab{display:flex;align-items:center;gap:5px;padding:5px 10px 5px;border-radius:7px 7px 0 0;background:var(--s2);border:1px solid var(--border);border-bottom:none;color:var(--muted);font-size:11px;cursor:pointer;white-space:nowrap;max-width:160px;transition:all .12s;margin-bottom:-1px;flex-shrink:0;}
.browser-tab:hover{color:var(--text);}
.browser-tab.active{background:var(--bg);border-color:var(--border2);color:var(--text);}
.tab-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100px;}
.tab-secure{font-size:10px;}
.tab-x{background:none;border:none;color:var(--muted);cursor:pointer;padding:0 2px;border-radius:3px;font-size:13px;line-height:1;margin-left:2px;}
.tab-x:hover{background:rgba(248,113,113,.15);color:var(--red);}
.tab-spinner{width:10px;height:10px;border:1.5px solid rgba(244,164,53,.3);border-top-color:var(--amber);border-radius:50%;animation:spin .6s linear infinite;display:inline-block;}
@keyframes spin{to{transform:rotate(360deg);}}
.new-tab{background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px 8px;transition:color .12s;}
.new-tab:hover{color:var(--amber);}
.tab-strip-spacer{flex:1;}
.shield-toggle-btn{display:flex;align-items:center;gap:5px;padding:5px 12px;background:var(--s2);border:1px solid var(--border2);border-radius:8px;color:var(--muted);font-size:12px;cursor:pointer;margin-bottom:4px;transition:all .15s;position:relative;}
.shield-toggle-btn:hover,.shield-toggle-btn.open{background:rgba(244,164,53,.08);border-color:rgba(244,164,53,.2);color:var(--amber);}
.shield-count{background:rgba(241,87,87,.15);color:var(--red);border:1px solid rgba(241,87,87,.2);border-radius:4px;font-size:10px;padding:1px 5px;font-family:var(--mono);}
.shield-count.active{animation:countPulse 2s ease-in-out infinite;}
@keyframes countPulse{0%,100%{opacity:1;}50%{opacity:.7;}}
.shield-ping{position:absolute;top:-3px;right:-3px;width:8px;height:8px;border-radius:50%;background:var(--red);animation:ping 1.5s ease-in-out infinite;}
@keyframes ping{0%{transform:scale(1);opacity:1;}100%{transform:scale(2.5);opacity:0;}}

/* Nav bar */
.nav-bar{height:42px;display:flex;align-items:center;gap:6px;padding:0 12px;}
.nav-btn{background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px 7px;border-radius:6px;transition:all .12s;}
.nav-btn:hover{background:var(--border);color:var(--text);}
.url-bar{flex:1;display:flex;align-items:center;gap:8px;background:var(--bg);border:1px solid var(--border2);border-radius:10px;padding:0 12px;height:32px;transition:border-color .2s;position:relative;overflow:hidden;}
.url-bar::before{content:'';position:absolute;bottom:0;left:-100%;width:30%;height:2px;background:linear-gradient(90deg,transparent,var(--amber),transparent);animation:none;}
.url-bar.loading::before{animation:urlLoad 1.5s ease-in-out infinite;}
@keyframes urlLoad{0%{left:-30%;}100%{left:130%;}}
.url-bar:focus-within{border-color:var(--amber);}
.url-bar.secure{border-color:rgba(74,222,128,.2);}
.url-secure-icon{font-size:12px;flex-shrink:0;}
.url-input{flex:1;background:none;border:none;outline:none;color:var(--text);font-family:var(--sans);font-size:12px;min-width:0;}
.url-input::placeholder{color:var(--muted);}
.url-loader{width:12px;height:12px;border:1.5px solid rgba(244,164,53,.2);border-top-color:var(--amber);border-radius:50%;animation:spin .6s linear infinite;flex-shrink:0;}
.url-clear{background:none;border:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 2px;flex-shrink:0;}
.url-clear:hover{color:var(--text);}
.threat-badge{padding:4px 10px;border-radius:6px;font-size:10px;font-family:var(--mono);letter-spacing:.06em;white-space:nowrap;flex-shrink:0;}
.threat-safe{background:rgba(74,222,128,.08);color:var(--green);border:1px solid rgba(74,222,128,.2);}
.threat-high{background:rgba(248,113,113,.08);color:var(--red);border:1px solid rgba(248,113,113,.2);}
.threat-medium{background:rgba(167,139,250,.08);color:var(--purple);border:1px solid rgba(167,139,250,.2);}

/* ── MAIN AREA ──────────────────────────────────────────────────── */
.browser-main{flex:1;display:flex;overflow:hidden;}

/* Viewport */
.viewport{flex:1;position:relative;overflow:hidden;}
.browser-iframe{width:100%;height:100%;border:none;display:block;background:#fff;}
.loading-overlay{position:absolute;inset:0;background:rgba(9,9,14,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:10;}
.loading-bar{width:200px;height:3px;background:var(--border);border-radius:2px;overflow:hidden;}
.loading-bar::after{content:'';display:block;height:100%;width:40%;background:var(--amber);animation:loadBar 1.2s ease-in-out infinite;border-radius:2px;}
@keyframes loadBar{0%{transform:translateX(-100%);}100%{transform:translateX(350%)}}
.loading-text{display:flex;align-items:center;gap:10px;font-size:12px;color:var(--muted);}
.ld-spin{width:14px;height:14px;border:2px solid rgba(244,164,53,.2);border-top-color:var(--amber);border-radius:50%;animation:spin .6s linear infinite;}

/* ── SHIELD PANEL ───────────────────────────────────────────────── */
.shield-panel{width:320px;min-width:280px;background:var(--s1);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow:hidden;animation:panelSlide .2s ease;}
@keyframes panelSlide{from{transform:translateX(100%);opacity:0;}to{transform:translateX(0);opacity:1;}}

.shield-header{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;background:var(--s2);}
.sh-title{display:flex;align-items:center;gap:10px;flex:1;}
.sh-icon{font-size:22px;}
.sh-name{font-family:var(--disp);font-size:14px;font-weight:700;}
.sh-sub{font-size:10px;color:var(--muted);}
.sh-close{background:none;border:none;color:var(--muted);font-size:16px;cursor:pointer;padding:4px 6px;border-radius:5px;}
.sh-close:hover{background:var(--border);color:var(--text);}

.shield-stats{display:grid;grid-template-columns:repeat(4,1fr);border-bottom:1px solid var(--border);}
.sh-stat{padding:10px 4px;text-align:center;border-right:1px solid var(--border);}
.sh-stat:last-child{border-right:none;}
.sh-val{font-family:var(--disp);font-size:18px;font-weight:800;}
.sh-stat.red .sh-val{color:var(--red);}
.sh-stat.amber .sh-val{color:var(--amber);}
.sh-stat.green .sh-val{color:var(--green);}
.sh-stat.blue .sh-val{color:var(--blue);}
.sh-lbl{font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-top:1px;}

.protection-bar-wrap{display:flex;align-items:center;gap:8px;padding:8px 14px;border-bottom:1px solid var(--border);}
.protection-bar{flex:1;height:5px;background:var(--border2);border-radius:3px;overflow:hidden;}
.pb-fill{height:100%;background:linear-gradient(90deg,var(--amber),var(--red));border-radius:3px;transition:width .4s ease;}
.pb-pct{font-size:11px;color:var(--amber);font-family:var(--mono);white-space:nowrap;}

.shield-views{display:flex;gap:2px;padding:8px 10px;border-bottom:1px solid var(--border);}
.sv-btn{flex:1;padding:6px;border:none;border-radius:6px;background:transparent;color:var(--muted);font-family:var(--sans);font-size:11px;cursor:pointer;transition:all .12s;}
.sv-btn:hover{background:var(--border);color:var(--text);}
.sv-btn.active{background:rgba(244,164,53,.1);color:var(--amber);border:1px solid rgba(244,164,53,.15);}

/* Live Log */
.shield-log{flex:1;overflow-y:auto;padding:8px;}
.shield-log::-webkit-scrollbar{width:3px;}
.shield-log::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.log-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--muted);font-size:11px;text-align:center;padding:20px;}
.log-empty-icon{font-size:32px;opacity:.4;}
.log-entry{padding:8px 10px;border-radius:8px;margin-bottom:4px;border:1px solid;animation:logIn .15s ease;}
@keyframes logIn{from{opacity:0;transform:translateY(-4px);}to{opacity:1;transform:translateY(0);}}
.log-blocked{background:rgba(248,113,113,.04);border-color:rgba(248,113,113,.12);}
.log-passed{background:rgba(74,222,128,.03);border-color:rgba(74,222,128,.1);}
.le-top{display:flex;align-items:center;gap:6px;margin-bottom:3px;}
.le-status-icon{font-size:11px;flex-shrink:0;}
.le-api{font-size:11px;font-family:var(--mono);color:var(--text);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.le-risk{font-size:9px;padding:1px 5px;border-radius:3px;flex-shrink:0;font-family:var(--mono);letter-spacing:.05em;}
.le-bottom{display:flex;align-items:center;gap:6px;}
.le-ts{font-size:10px;color:var(--muted2);font-family:var(--mono);}
.le-origin{font-size:10px;color:var(--blue);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.le-verdict{font-size:9px;padding:1px 6px;border-radius:3px;font-family:var(--mono);letter-spacing:.05em;flex-shrink:0;}
.le-verdict.blocked{background:rgba(248,113,113,.1);color:var(--red);}
.le-verdict.passed{background:rgba(74,222,128,.08);color:var(--green);}
.le-verdict.MONITOR{background:rgba(167,139,250,.08);color:var(--purple);}

/* API Manager */
.api-manager{flex:1;display:flex;flex-direction:column;overflow:hidden;}
.api-toolbar{padding:8px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:6px;}
.api-search{background:var(--bg);border:1px solid var(--border2);border-radius:7px;padding:6px 10px;color:var(--text);font-family:var(--sans);font-size:11px;outline:none;width:100%;transition:border-color .2s;}
.api-search:focus{border-color:var(--amber);}
.api-search::placeholder{color:var(--muted);}
.api-filters{display:flex;gap:3px;}
.af-btn{flex:1;padding:4px;border:none;border-radius:5px;background:var(--s2);color:var(--muted);font-size:10px;cursor:pointer;text-transform:capitalize;transition:all .12s;}
.af-btn:hover{background:var(--border);}
.af-btn.active{background:rgba(244,164,53,.1);color:var(--amber);}
.api-rows{flex:1;overflow-y:auto;padding:6px;}
.api-rows::-webkit-scrollbar{width:3px;}
.api-rows::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.api-item{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid var(--border);margin-bottom:4px;transition:all .12s;}
.api-item.status-blocked{border-left:2px solid var(--red);background:rgba(248,113,113,.03);}
.api-item.status-allowed{border-left:2px solid var(--green);background:rgba(74,222,128,.03);}
.api-item.status-monitor{border-left:2px solid var(--purple);background:rgba(167,139,250,.03);}
.ai-left{flex:1;min-width:0;}
.ai-top{display:flex;align-items:center;gap:6px;margin-bottom:3px;flex-wrap:wrap;}
.ai-name{font-size:11px;font-family:var(--mono);color:var(--text);}
.ai-cat{font-size:9px;color:var(--muted);background:var(--border);padding:1px 5px;border-radius:3px;}
.ai-reason{font-size:10px;color:var(--muted);line-height:1.5;}
.ai-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.ai-risk{font-size:9px;padding:2px 5px;border-radius:3px;font-family:var(--mono);}
.cycle-btn{width:28px;height:28px;border:1px solid var(--border2);border-radius:6px;background:var(--s2);cursor:pointer;font-size:13px;transition:all .12s;display:flex;align-items:center;justify-content:center;}
.cycle-btn:hover{transform:scale(1.1);}
.cycle-btn.status-blocked{background:rgba(248,113,113,.1);border-color:rgba(248,113,113,.3);}
.cycle-btn.status-allowed{background:rgba(74,222,128,.08);border-color:rgba(74,222,128,.2);}
.cycle-btn.status-monitor{background:rgba(167,139,250,.08);border-color:rgba(167,139,250,.2);}

/* Stats view */
.stats-view{flex:1;overflow-y:auto;padding:12px;}
.stats-view::-webkit-scrollbar{width:3px;}
.stats-view::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px;}
.sv-section-title{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--muted);margin-bottom:8px;}
.sv-risk-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.sv-risk-label{font-size:9px;font-family:var(--mono);width:56px;flex-shrink:0;}
.sv-risk-bar-wrap{flex:1;}
.sv-risk-bar{height:14px;border-radius:4px;overflow:hidden;position:relative;}
.sv-risk-fill{height:100%;border-radius:4px;transition:width .4s ease;}
.sv-risk-count{font-size:10px;color:var(--muted);font-family:var(--mono);width:28px;text-align:right;flex-shrink:0;}
.sv-cat-row{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.sv-cat-name{font-size:10px;color:var(--text);width:72px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.sv-cat-bar-wrap{flex:1;}
.sv-cat-bar{height:10px;background:var(--border);border-radius:3px;overflow:hidden;}
.sv-cat-fill{height:100%;background:linear-gradient(90deg,var(--amber),var(--red));border-radius:3px;transition:width .4s ease;}
.sv-cat-count{font-size:10px;color:var(--muted);font-family:var(--mono);width:28px;text-align:right;flex-shrink:0;}

/* Injection preview */
.inj-section{margin-top:16px;padding-top:12px;border-top:1px solid var(--border);}
.inj-title{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:var(--amber);margin-bottom:4px;}
.inj-desc{font-size:10px;color:var(--muted);margin-bottom:8px;line-height:1.5;}
.inj-preview{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:10px;font-family:var(--mono);color:var(--muted);line-height:1.8;overflow-x:auto;white-space:pre;}
`;
