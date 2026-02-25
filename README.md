A secure, sandboxed, fully customizable development environment with a built-in AI agent that knows your name.
What is IDE-A?
IDE-A is an open-source, browser-based IDE built with security, accessibility, and inclusivity at its core. It runs code in isolated Docker containers, gives you a full-featured AI coding assistant you can name and customize, and never lets your sensitive data end up somewhere it shouldn't be.
Features
🔒 Security First
Per-type encryption — AES-256-GCM for files, ChaCha20-Poly1305 for tokens, Argon2id for passwords. No unnecessary layering.
Anti-RPC & anti-screen-mirroring defenses at the HTTP and CSP layer.
Automatic secret scanning — the AI agent flags hardcoded API keys, passwords, and tokens in your code before you can accidentally commit them.
TLS 1.3 only in production. Older protocols disabled.
Path traversal protection on all file operations.
Strict CSP headers on every response.
🤖 AI Agent (Name It Whatever You Want)
On first launch, you name your AI assistant. It remembers its name across sessions.
Your agent can:
Write, refactor, review, and explain code in any language
Accept plain-English instructions to modify code: "Add rate limiting to this endpoint"
Show a diff view of proposed changes before applying them
Review code for security vulnerabilities, bias, and bad practices
Answer questions across computer science, math, physics, chemistry, biology, medicine, psychology, sociology, history, and linguistics
Your agent will never:
Assist with malware, exploits, or discriminatory code
Suggest storing secrets in insecure locations
Write code that profiles people based on protected characteristics
🎨 Fully Customizable Avatar
Your AI agent has a visual avatar you can customize with:
Category
Options
Species
Human, Cat, Dog, Rabbit, Fox, Bear, Bird (anthropomorphic)
Race / skin tone
Full spectrum, vitiligo, albinism
Gender expression
Fully open — define it or leave it undefined
Body type
Full range including plus-size
Hair
Texture (straight, wavy, coily, locs, braids, fade, bald), length, color
Facial features
Scars, birthmarks, freckles, glasses, facial hair
Mobility aids
Wheelchair (manual/power), crutches, cane, walker, prosthetics
Medical accessories
Arm cast, leg cast, hearing aid, eye patch
Fashion
Hats, sunglasses, earrings, cultural dress, leather gear, streetwear
Bags
Purse, backpack, messenger bag, fanny pack
Tattoos & piercings
Custom placement and design
💻 Multi-Language Sandboxed Execution
Code runs in isolated Docker containers with no network access, enforced time limits, and automatic teardown.
Supported languages include: Python, JavaScript, TypeScript, Ruby, Go, Rust, Java, Kotlin, C, C++, Bash, R, PHP, Haskell, Lua, Perl, Swift, Dart, Elixir, Erlang, COBOL, Fortran, and more.
🌐 Sandboxed Browser with API Control Panel
A built-in research browser with granular JavaScript API control:
Blocked by default (user can whitelist):
Accelerometer / gyroscope / motion sensors
Geolocation
Notifications
Clipboard
Battery / Network Information
Bluetooth, USB, Serial
Payment Request
SharedArrayBuffer
Full API library panel with toggle switches and plain-English descriptions of what each API does and why it might be risky.
Automatic ad/tracker blocking using EasyList + EasyPrivacy (updated weekly).
🎨 UI Customization
Full-spectrum color picker for every UI region
Font library (100+ options including OpenDyslexic and Atkinson Hyperlegible)
Upload your own fonts (TTF/WOFF2) and background images
Preset themes: Dark, Light, High Contrast, Solarized, Monokai, Nord, Gruvbox, Dracula
Save, export, and import custom themes
📁 Code Import
Paste raw source (language auto-detected)
Upload files or ZIP archives
Git clone any public repo
Import from URL (GitHub raw, Pastebin, etc.)
Project scaffolding wizard
Getting Started
Prerequisites
Python 3.11+
Docker (for sandboxed code execution)
Node.js 18+ (for frontend build)
Installation
# 1. Clone the repository
git clone https://github.com/your-org/ide-a.git
cd ide-a

# 2. Create a virtual environment
python -m venv .venv
source .venv/bin/activate     # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up your environment file
cp .env.example .env
Configure Your API Key
Open .env and fill in your values:
# Generate with: python -c "import secrets; print(secrets.token_hex(32))"
IDE_A_SECRET_KEY=your_generated_secret_here

# Get your key at: https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...
⚠️ Never commit your .env file. It is already in .gitignore. Your API key should only ever live in your .env file or your system's environment variables — never in source code, config YAML files, or comments.
Run
python main.py
Then open http://localhost:5000 in your browser.
Development mode (verbose logging + hot reload):
python main.py --dev
Project Structure
ide-a/
├── main.py                    # Entry point
├── requirements.txt
├── .env.example               # Safe API key template (copy to .env)
├── .gitignore
│
├── ide_a/                     # Core Python package
│   ├── __init__.py
│   ├── app.py                 # Application factory (Starlette)
│   ├── config.py              # Configuration loader (reads from .env)
│   ├── security.py            # Encryption, session tokens, secret scanning
│   ├── agent.py               # AI agent core (name, avatar, capabilities)
│   ├── logger.py              # Logging setup
│   │
│   ├── routes/
│   │   ├── api.py             # REST API endpoints
│   │   └── ws.py              # WebSocket endpoints (terminal, agent)
│   │
│   └── middleware/
│       └── security_headers.py  # CSP + security headers on every response
│
├── modules/                   # Feature modules (next to be built)
│   ├── sandbox/               # Docker-based code execution engine
│   ├── browser/               # Sandboxed browser + API control panel
│   ├── editor/                # Code editor (Monaco-based)
│   ├── filesystem/            # Encrypted file storage
│   └── avatar/                # SVG avatar renderer
│
├── static/                    # Frontend SPA (React + Monaco Editor)
├── config/                    # Default config files
│   └── agent_system_prompt.txt
└── tests/
Roadmap
[ ] v0.1 — Core: config, security, agent, routing (current)
[ ] v0.2 — Sandbox module: Docker execution engine for top 20 languages
[ ] v0.3 — Editor module: Monaco editor integration, file tree, import system
[ ] v0.4 — Browser module: Sandboxed iframe proxy, API control panel
[ ] v0.5 — Avatar module: SVG avatar builder with full customization
[ ] v0.6 — UI customization: theme engine, font library, custom uploads
[ ] v0.7 — User accounts, encrypted storage, settings persistence
[ ] v1.0 — Production-ready release
Security Policy
Found a vulnerability? Please do not open a public GitHub issue. Email security@ide-a.dev with details. We take security reports seriously and will respond within 48 hours.
Contributing
We welcome contributions. Before submitting a PR, please:
Read CONTRIBUTING.md
Ensure all tests pass: pytest
Run the security scan: python -m ide_a.security --scan
Follow the inclusive coding guidelines in docs/inclusive-code.md
License
MIT License — see LICENSE for details.
Values
IDE-A is built on the principle that good software serves everyone. Our code, our agent, and our community are actively hostile to racism, sexism, homophobia, ableism, and any other system that treats people as less than fully human. This is non-negotiable.
