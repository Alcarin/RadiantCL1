# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Legacy SSH Protocol Support**: Added opt-in support for obsolete security algorithms (e.g., diffie-hellman-group1-sha1, ssh-rsa) to enable connections with legacy networking equipment.
- **Extended Legacy SSH Support**: Expanded the set of supported algorithms to include `arcfour`, `blowfish-cbc`, `cast128-cbc`, and `hmac-md5` for full compatibility with very old hardware (e.g., Cisco IOS 1.99).
- **Smart SSH Error Parsing**: Implemented backend logic to extract server-offered algorithms from "no common algorithm" errors and provide transparent, dynamic feedback in the security warning modal.
- **Security Warning Modal**: New interactive dialog that appears during SSH handshake failures, allowing users to authorize deprecated protocols for the current session or permanently for the host.
- **Pre-authorization Toggle**: Added "Authorize deprecated security protocols" checkbox to the Host creation/edit modal for proactive configuration of legacy devices.
- **Connection Progress Modal**: New real-time visual feedback for SSH and Telnet connections, providing granular log steps (TCP, Handshake, Authentication, etc.).
- **Asynchronous Protocol Handlers**: Refactored backend connection logic to support background execution and progress events for improved UI responsiveness.
- **Connection Abort Support**: Added the ability to prematurely terminate pending or active terminal connections directly from the progress modal.
- **OS Protocol Handlers**: Integrated support for `ssh://` and `telnet://` URIs, allowing the application to be launched directly from external links.
- **Cross-Platform Registration**: Implemented registration handlers for Windows Registry, Linux `.desktop` files, and macOS bundle integration.
- **Single Instance Support**: Configured Wails `SingleInstanceLock` to route protocol requests to an already running instance instead of spawning duplicates.
- **Intelligent Conflict Resolution**: New modal logic that identifies existing host configurations and resolves credential mismatches before connecting.
- **Path Mismatch Detection**: Real-time verification of the registered executable path with automated update capabilities integrated into the Preferences UI.
- **Multilingual Support (i18n)**: Implemented full internationalization support for English, Italian, French, Spanish, and German.
- **Preferences Manager**: New modal for user settings, starting with real-time language switching.
- **Settings Persistence**: Backend synchronization for user preferences, stored in the SQLite database.
- **Credential Manager Menu Integration**: Added a direct access entry to the Credential Manager in the top File menu for improved accessibility.
- **Modernized Build System (TS 5)**: Upgraded the frontend infrastructure to TypeScript 5.4 and configured `moduleResolution: "Bundler"`.
- **Functional Top Menu**: Replaced the mock MenuBar with a fully functional dropdown system (File, Connect, Help).
- **Dynamic Connect Menu**: Implemented a recursive menu that mirrors the full saved hosts tree, including hierarchical folders and specific host icons.
- **Credits Modal**: New integrated modal detailing the core technology stack (Wails, Monaco, xterm.js, etc.).
- **Terminal Session Status Persistence**: Introduced `connected`/`disconnected` status for terminals that persists until the tab is manually closed.
- **Dynamic Host Icons**: Support for specific host icons in terminal tabs and the sidebar for better visual identification.
- **Expanded Icon Library**: Added over 40 networking, hardware, and infrastructure icons imported from Lucide React.
- **Real-time Metadata Sync**: Modifications to host labels or icons are now immediately reflected in all active terminal tabs.
- **Icon Tooltips**: Added titles to icons in the host selection modal for easier identification.
- **Status Indicators**: Visual status dots (Green/Red) in the "Active Connections" section.
- **Persistent Session Logging**: Implemented versioned logging via Jujutsu (jj), including ANSI code stripping and automatic idle-timeout commits.
- **Centralized Credential Manager**: New management interface for reusable credential profiles across multiple hosts.
- **OS Keychain Integration**: Secure storage for host passwords using system-level services (Windows Credential Manager, macOS Keychain) via `go-keyring`.
- **Database Schema Expansion**: Added `credentials` table and linked it to existing host infrastructure.
- **Connections Management**: Implemented "Saved Hosts" sidebar with SQLite backend and folder organization.
- **Session Log History Viewer**: New sidebar panel (`History`) listing all session log files grouped by host and date, with a tree-view navigator.
- **Session Log Replay Engine**: Step-by-step replay of recorded sessions via `LogViewerContent`, using a client-side singleton store (`playbackStore`) polled at 60 fps via `requestAnimationFrame` for a flicker-free, zero-latency playback loop decoupled from the Go backend.
- **Jujutsu (jj) Integration**: Embedded `jj` binary for cross-platform versioned session logging; each idle-timeout period produces an automatic commit containing the session direction and timestamp in the message.
- **Timeline Slider with Commit Markers**: Visual tick marks on the timeline at each commit boundary; continuous scrubbing reveals log content in real time while dragging, with a final confirmatory seek on mouse-up.
- **Playback Controls**: Play/Pause, Stop, Previous Frame, Next Frame and variable speed selector (0.5×, 1×, 2×, 5×, 10×).
- **Monaco Commit Decorations**: Glyph-margin gold dot, overview ruler tick and subtle line highlight at each commit boundary, with a Markdown hover tooltip showing the local timestamp and session direction.
- **Commit Info Bar**: Row below the timeline showing the current commit timestamp (system locale, 24 h, gold) and session direction (e.g. `Server Debian → RadiantCL1`), with a full tooltip when truncated.
- **Log Viewer Tab Labels**: Tabs display `host  date time` (system locale, 24 h) instead of raw filenames, with a native `title` tooltip exposing the full label on hover.

### Changed

- **Session List Visibility**: The "Active Connections" sidebar now strictly filters for successfully established sessions, preventing "phantom" or failed connection attempts from cluttering the UI.
- **Refined handshaking logic**: SSH connection workflow now attempts modern protocols first and only escalates to legacy algorithms upon explicit user authorization.
- **Internationalization Consistency**: Standardized the `credentialManager` translation key across all supported languages (EN, IT, ES, FR, DE) within the `common` namespace.
- **Protocol Data Consistency**: Migrated protocol handler event emission to explicit string maps to resolve Go/JS case-sensitivity conflicts.
- **Connection Synchronization**: Introduced a 250ms delay in connection start to ensure the frontend listener is ready for progress events.
- **Credits Expansion**: Fully translated technology stack descriptions and legal notices across all supported languages.
- **Menu Snappiness**: Optimized event handling to close menus instantly upon selection, ensuring a responsive feel during async connection starts.
- **Visual Branding**: Switched primary accent color to "Radiant Gold" (Yellow) across the entire application UI.
- **Sidebar Aesthetics**: Applied Radiant Gold theme to all host icons for visual consistency.
- **Sober Typography**: Reverted host labels to standard font weight and color for a more professional look.
- **Status Indicators**: "Disconnected" state now uses a **Red X icon** instead of a simple dot to improve accessibility and clear distinction for color-blind users.
- **Host Configuration**: Updated host form to support credential profile selection.
- **Connection Workflow**: Terminal connections now automatically resolve credentials from the vault, skipping manual login for predefined profiles.
- **Date/Time Consistency**: All date/time values across the application (log player tab labels, info bar, glyph tooltips, history tree nodes) use the operating system locale (`undefined`) with explicit 24-hour format, ensuring consistent display regardless of the application language setting.
- **Log Filename Timestamp Parsing**: `GetSessionLogs` now calls `time.ParseInLocation(..., time.Local)` so session timestamps derived from filenames reflect the machine's local timezone instead of UTC.
- **Integrated Settings Access**: Connected the sidebar gear icon to the Preferences modal, enabling direct access to application settings via a new event-driven communication (app:open-preferences).

### Removed

- **Activity Bar Account Icon**: Removed the redundant account icon from the bottom left sidebar to streamline the primary navigation interface.

### Fixed

- **Telnet Protocol Reliability**: Fixed an issue where no input or output was visible after establishing a Telnet connection.
- **Robust Telnet Negotiation**: Implemented support for `ECHO` and `SGA` (Suppress Go Ahead) options (RFC 854/855), enabling remote echo for network devices.
- **Transparent TCP Support**: Improved handling of raw data streams, allowing the terminal to be used for manual SMTP/HTTP protocol simulation.
- **IAC Sequence Handling**: Corrected management of `IAC IAC` (escaped 255) and subnegotiation (SB) sequences to prevent data corruption.
- **Resource Leak Prevention**: Ensured all TCP sockets and SSH clients are explicitly closed in `RemoveSession`, even for connection attempts that failed during the initial handshake stage.
- **Icon Type Safety**: Resolved TypeScript compiler errors caused by missing icon mappings and naming inconsistencies in `Icon.tsx` and `PreferencesModal.tsx`.
- **Type Compatibility**: Resolved critical compiler errors between `i18next` and legacy TypeScript by upgrading the project to TypeScript 5.
- **UI Regressions**: Fixed missing state hooks and type mismatches in `ConnectionsView.tsx` and `App.tsx` during the translation refactor.
- **Modal Window Interaction**: Resolved an issue where double-clicking within modals (Preferences, Credential Manager) would trigger window maximization by implementing event bubbling suppression.
- **Protocol Handler Failures**: Fixed a critical bug where Windows quotes around URIs (`"ssh://..."`) prevented protocol links from being recognized.
- **Ad-hoc Connection Recovery**: Resolved an issue where ad-hoc connection parameters were lost during the event transmission from backend to frontend.
- **Empty Address Errors**: Fixed "Host address is empty" failures by implementing ultra-robust URI parsing and argument cleaning.
- **Menu Readability**: Removed transparency from top and context menus, using solid colors to prevent background text interference.
- **CSS Variable Cleanup**: Resolved invalid `rd-bg-main` references in TreeView and status indicators, ensuring consistent theme rendering.
- **JSON Unmarshalling**: Fixed a critical bug where `folderId` was sent as a string instead of an int64, preventing host updates.
- **TypeScript Compilation**: Resolved missing imports and test mock inconsistencies caused by the new session metadata structure.
- **Drag and Drop / Mouse Control**: Resolved runtime conflicts and crashes in the DND library (react-arborist vs react-mosaic-component).
- **Context Switching**: Fixed stability issues when switching between different terminal or editor contexts.
- **UI Contrast**: Implemented dynamic text color calculation (`oklch`) for Radiant Gold elements to ensure legibility on accent backgrounds.

---
