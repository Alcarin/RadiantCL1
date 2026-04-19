# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Changed

- **UI Localization Refactoring**: Migrated all hardcoded strings in MenuBar, SideBar, StatusBar, and Modals to dynamic i18n keys.
- **Internationalization Consistency**: Standardized the `credentialManager` translation key across all supported languages (EN, IT, ES, FR, DE) within the `common` namespace.
- **Credits Expansion**: Fully translated technology stack descriptions and legal notices across all supported languages.
- **Menu Snappiness**: Optimized event handling to close menus instantly upon selection, ensuring a responsive feel during async connection starts.
- **Visual Branding**: Switched primary accent color to "Radiant Gold" (Yellow) across the entire application UI.
- **Sidebar Aesthetics**: Applied Radiant Gold theme to all host icons for visual consistency.
- **Sober Typography**: Reverted host labels to standard font weight and color for a more professional look.
- **Status Indicators**: "Disconnected" state now uses a **Red X icon** instead of a simple dot to improve accessibility and clear distinction for color-blind users.
- **Host Configuration**: Updated host form to support credential profile selection.
- **Connection Workflow**: Terminal connections now automatically resolve credentials from the vault, skipping manual login for predefined profiles.

### Fixed

- **Icon Type Safety**: Resolved TypeScript compiler errors caused by missing icon mappings and naming inconsistencies in `Icon.tsx` and `PreferencesModal.tsx`.
- **Type Compatibility**: Resolved critical compiler errors between `i18next` and legacy TypeScript by upgrading the project to TypeScript 5.
- **UI Regressions**: Fixed missing state hooks and type mismatches in `ConnectionsView.tsx` and `App.tsx` during the translation refactor.
- **Modal Window Interaction**: Resolved an issue where double-clicking within modals (Preferences, Credential Manager) would trigger window maximization by implementing event bubbling suppression.
- **Menu Readability**: Removed transparency from top and context menus, using solid colors to prevent background text interference.
- **CSS Variable Cleanup**: Resolved invalid `rd-bg-main` references in TreeView and status indicators, ensuring consistent theme rendering.
- **JSON Unmarshalling**: Fixed a critical bug where `folderId` was sent as a string instead of an int64, preventing host updates.
- **TypeScript Compilation**: Resolved missing imports and test mock inconsistencies caused by the new session metadata structure.
- **Drag and Drop / Mouse Control**: Resolved runtime conflicts and crashes in the DND library (react-arborist vs react-mosaic-component).
- **Context Switching**: Fixed stability issues when switching between different terminal or editor contexts.
- **UI Contrast**: Implemented dynamic text color calculation (`oklch`) for Radiant Gold elements to ensure legibility on accent backgrounds.

---
