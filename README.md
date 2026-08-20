<p align="center">
  <img src="https://shieldcn.dev/badge/OpenDialer-Community%20Edition-black.svg" alt="OpenDialer Community Edition" />
</p>

<h1 align="center">OpenDialer Community Edition</h1>

<p align="center">
  A self-hosted desktop softphone & dialer for sales teams that combines native SIP telephony, campaign context, and follow-up work in one focused workspace.
</p>

<p align="center">
  <a href="https://github.com/yogabayusavira/OpenDialer-by-Icary/stargazers"><img src="https://shieldcn.dev/github/stars/yogabayusavira/OpenDialer-by-Icary.svg" alt="GitHub stars" /></a>
  <a href="https://github.com/yogabayusavira/OpenDialer-by-Icary/forks"><img src="https://shieldcn.dev/github/forks/yogabayusavira/OpenDialer-by-Icary.svg" alt="GitHub forks" /></a>
  <a href="./LICENSE.md"><img src="https://shieldcn.dev/badge/license-Sustainable%20Use%20License-black.svg" alt="Sustainable Use License 1.0" /></a>
  <img src="https://shieldcn.dev/badge/desktop-Tauri-black.svg" alt="Tauri desktop app" />
  <img src="https://shieldcn.dev/badge/voip-Native%20SIP%20(Zoiper%205%20Style)-black.svg" alt="Native SIP" />
  <img src="https://shieldcn.dev/badge/status-early%20access-black.svg" alt="Early access" />
</p>

## What it is

OpenDialer is for sales representatives and account executives who need to move quickly without bouncing between a softphone, spreadsheet, CRM, calendar, and notes app.

- **Native Desktop SIP Softphone**: Connect directly to your PBX over UDP, TCP, or TLS (like Zoiper 5 or MicroSIP)—no WebSocket bridges or WebRTC proxies required.
- **Campaign-Driven Queue**: Work through lead lists from top to bottom with automatic progression and outcome tagging.
- **Unified Call Desk**: Keep live audio, prospect details, conversation playbooks, and qualification checklists on a single screen.
- **Multi-Line Management**: Configure and switch between multiple SIP numbers and identities on the fly.
- **Lead List CSV Upload**: Easily import contacts with custom column mapping.
- **Quick Qualification & Wrap-Up**: Capture notes, trigger follow-up email drafts, book meetings, and record dispositions in seconds.

The Community Edition is self-hosted and source-available. It is designed for individuals and teams who want complete control over their sales calling infrastructure.

---

## Native SIP Architecture (Zoiper 5 Style)

Unlike web-only dialers that force all SIP traffic through WebSocket gateways, OpenDialer runs a **native VoIP engine in the Tauri Rust backend**:

```text
┌──────────────────────────────────────────────────────────────┐
│                    REACT / TAURI FRONTEND                    │
│   • Settings > Numbers: SIP Host, Port, User, Password, UDP  │
│   • Dialer Screen: Number input, Call / Hangup buttons       │
│   • Tauri IPC: invoke("sip_register", ...), listen("sip://*")│
└──────────────────────────────▲───────────────────────────────┘
                               │ Tauri IPC Commands & Events
┌──────────────────────────────▼───────────────────────────────┐
│                    TAURI RUST VOIP ENGINE                    │
│                                                              │
│  ┌───────────────────────┐        ┌───────────────────────┐  │
│  │     SIP Signaling     │        │   RTP & Media Engine  │  │
│  │ • Direct UDP (5060)   │        │ • RTP Packetizer/Depk │  │
│  │ • Direct TCP (5060)   │◄──────►│ • G.711 μ-law / A-law │  │
│  │ • Direct TLS (5061)   │        │ • CPAL Native Mic/Spk │  │
│  │ • RFC 3261 / MD5 Auth │        │ • RFC 4733 DTMF Events│  │
│  │ • SDP Offer/Answer    │        │ • Jitter Buffer Queue │  │
│  └───────────▲───────────┘        └───────────▲───────────┘  │
└──────────────┼────────────────────────────────┼──────────────┘
               │ Direct UDP/TLS (5060/5061)     │ Direct UDP RTP (Media)
               ▼                                ▼
       PBX / SIP Server                 RTP Media Endpoint
    (Asterisk / FreePBX /            (10000–20000 UDP)
     FreeSWITCH / 3CX / Kamailio)
```

### Supported Protocols & Standards
- **Signaling**: RFC 3261 (`REGISTER`, `INVITE`, `ACK`, `BYE`, `CANCEL`, `OPTIONS`, `100`, `180`, `183`, `200 OK`)
- **Authentication**: RFC 2617 / RFC 3261 MD5 HTTP Digest Authentication (`401 Unauthorized` / `407 Proxy Authentication`)
- **Transports**: Direct UDP (port 5060), TCP (port 5060), TLS (port 5061), and WebRTC (port 8089)
- **Audio Codecs**: G.711 μ-law (PCMU, payload 0) and G.711 A-law (PCMA, payload 8) at 8kHz
- **Media Streaming**: RFC 3550 RTP with native `cpal` microphone capture & speaker playback
- **In-Call DTMF**: RFC 4733 / RFC 2833 `telephone-event` (payload 101)

---

## Current Status

OpenDialer is in active development. Features available today:

- 🟢 **Native Rust SIP Softphone Engine** (Direct UDP, TCP, TLS, G.711, DTMF, Mute, Hangup)
- 🟢 **Multi-Line Phone Management** with instant active line switching
- 🟢 **Google Sign-In & Convex Backend** with reactive real-time database
- 🟢 **Campaigns & Playbooks Engine** (Discovery questions, objection handlers, pitch scripts)
- 🟢 **Product Catalog with Pagination**
- 🟢 **Lead CSV Import** with flexible column mapping
- 🟢 **Post-Call Wrap-up**: Outcome recording, custom notes, meeting booking, follow-up email drafts
- 🟡 **Telnyx & Twilio Direct Trunking** *(Coming Soon)*
- 🟡 **Calendar Sync & Job Board** *(Coming Soon)*
- 🟡 **Live AI Transcription & Coaching** *(Planned)*

---

## Community Edition Model

OpenDialer Community Edition uses the [Sustainable Use License 1.0](./LICENSE.md). You may use, modify, and contribute to the software for internal business, personal, or non-commercial use.

You may not offer OpenDialer itself as a paid hosted, white-label, or competing commercial dialer service without a separate commercial agreement. This is a fair-code, source-available project—not an OSI-approved open-source license.

For commercial licensing, open a [GitHub issue](https://github.com/yogabayusavira/OpenDialer-by-Icary/issues) with the `commercial licensing` label in the title.

---

## Run Locally

### Prerequisites

- **Node.js**: 20 or later
- **Rust Toolchain**: 1.80+ (for compiling the Tauri native VoIP backend)
- **Convex Account / Project**: For real-time database and auth
- **SIP Account**: Any Asterisk, FreePBX, FreeSWITCH, 3CX, Kamailio, or VoIP provider account (UDP/TCP/TLS)

### Install

```bash
# Clone the repository
git clone https://github.com/yogabayusavira/OpenDialer-by-Icary.git
cd OpenDialer-by-Icary

# Install npm dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

Set `VITE_CONVEX_URL` in `.env.local` to your Convex deployment URL.

### Develop

Run Convex in one terminal:

```bash
npm run convex:dev
```

Run the desktop app with Tauri in another terminal:

```bash
npm run tauri:dev
```

*(On Windows, `run-dev.bat` can be used to launch both processes together.)*

### Build for Production

```bash
# Build frontend
npm run build

# Build native desktop installer (EXE / DMG / AppImage)
npm run tauri:build
```

---

## Core Concepts

```text
Organization
└── Campaign
    ├── Product / Offer  What is being pitched, qualification checklist, booking link
    ├── Lead Lists       Imported CSV or CRM leads queued for dialing
    └── Playbook         Opener, pain points, objection handling, closing scripts
```

`My campaigns` is a representative’s active working set across organizations. Choosing a campaign automatically loads its queued leads, product context, qualification checklist, and objection battlecards into the dialer desk.

---

## Contributing

Issues and pull requests are welcome. Please keep contributions focused, include a clear explanation of the user problem, and avoid committing credentials or `.env.local` files.

By contributing, you agree that your contribution is provided under the [Sustainable Use License 1.0](./LICENSE.md).

---

## License

Copyright © 2026 Icary. OpenDialer Community Edition is available under the [Sustainable Use License 1.0](./LICENSE.md).
