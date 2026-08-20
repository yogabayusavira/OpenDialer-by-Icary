<p align="center">
  <img src="https://shieldcn.dev/badge/OpenDialer-Community%20Edition-black.svg" alt="OpenDialer Community Edition" />
</p>

<h1 align="center">OpenDialer Community Edition</h1>

<p align="center">
  A self-hosted desktop dialer for sales teams that keeps calls, campaign context, and follow-up work in one focused workspace.
</p>

<p align="center">
  <a href="https://github.com/yogabayusavira/OpenDialer-by-Icary/stargazers"><img src="https://shieldcn.dev/github/stars/yogabayusavira/OpenDialer-by-Icary.svg" alt="GitHub stars" /></a>
  <a href="https://github.com/yogabayusavira/OpenDialer-by-Icary/forks"><img src="https://shieldcn.dev/github/forks/yogabayusavira/OpenDialer-by-Icary.svg" alt="GitHub forks" /></a>
  <a href="./LICENSE.md"><img src="https://shieldcn.dev/badge/license-Sustainable%20Use%20License-black.svg" alt="Sustainable Use License 1.0" /></a>
  <img src="https://shieldcn.dev/badge/desktop-Tauri-black.svg" alt="Tauri desktop app" />
  <img src="https://shieldcn.dev/badge/status-early%20access-black.svg" alt="Early access" />
</p>

## What it is

OpenDialer is for representatives who need to move quickly without bouncing between a phone, spreadsheet, CRM, calendar, and notes app.

- Work a campaign’s lead lists from top to bottom.
- Keep live conversation, account context, and call assistance in one screen.
- Import CSV lead lists with explicit column mapping.
- Configure SIP calling from the desktop app.
- Capture outcomes, notes, and meeting qualification while the call is still fresh.

The Community Edition is self-hosted and source-available. It is designed for individuals and teams who want control of their own sales-calling workspace.

## Current status

OpenDialer is in active early development. The foundation available today includes:

- Google sign-in and a Convex-backed user workspace
- Onboarding for profile, organization, and SIP setup
- SIP.js calling from the Tauri desktop app
- Lead-list CSV upload and manual field mapping
- Campaign, offer, and playbook foundations
- In-call transcript, notes, booking checklist, email-draft, dial-pad, mute, and wrap-up interactions

The following are planned but not production-complete: provider-managed numbers and SMS, live AI transcription, calendar connection, CRM integrations, team permissions, and reporting.

## Community Edition model

OpenDialer Community Edition uses the [Sustainable Use License 1.0](./LICENSE.md). You may use, modify, and contribute to the software for internal business, personal, or non-commercial use.

You may not offer OpenDialer itself as a paid hosted, white-label, or competing commercial dialer service without a separate commercial agreement. This is a fair-code, source-available project—not an OSI-approved open-source license.

For commercial licensing, open a [GitHub issue](https://github.com/yogabayusavira/OpenDialer-by-Icary/issues) with the `commercial licensing` label in the title.

## Run locally

### Prerequisites

- Node.js 20 or later
- Rust toolchain for Tauri
- A Convex project
- A SIP account with secure WebSocket and WebRTC support to place calls

### Install

```bash
npm install
cp .env.example .env.local
```

Set `VITE_CONVEX_URL` in `.env.local` to your Convex deployment URL.

### Develop

Run Convex in one terminal:

```bash
npm run convex:dev
```

Run the desktop app in another:

```bash
npm run tauri:dev
```

On Windows, `run-dev.bat` starts both processes for local development. It is deliberately ignored by Git so each contributor can tailor it to their machine.

### Build

```bash
npm run build
npm run tauri:build
```

## Core concepts

```text
Organization
└── Campaign
    ├── Offer        What is being sold, who it is for, qualification rules, booking link
    ├── Lead lists   Imported or managed people the campaign may call
    └── Playbook     Opener, discovery, objections, and follow-up guidance
```

`My campaigns` is a representative’s chosen working set across organizations. A rep chooses one campaign to dial; the campaign determines the lead queue, offer context, qualification checklist, booking destination, and playbook guidance.

## Contributing

Issues and pull requests are welcome. Please keep contributions focused, include a clear explanation of the user problem, and avoid committing credentials or `.env.local` files.

By contributing, you agree that your contribution is provided under the [Sustainable Use License 1.0](./LICENSE.md).

## License

Copyright © 2026 Icary. OpenDialer Community Edition is available under the [Sustainable Use License 1.0](./LICENSE.md).
