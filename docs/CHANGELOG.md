# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Multilingual Support (i18n)**: Implemented full internationalization support for English, Italian, French, Spanish, and German.
- **Preferences Manager**: New modal for user settings, starting with real-time language switching.
- **Settings Persistence**: Backend synchronization for user preferences, stored in the SQLite database.
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
- **Credits Expansion**: Fully translated technology stack descriptions and legal notices across all supported languages.
- **Menu Snappiness**: Optimized event handling to close menus instantly upon selection, ensuring a responsive feel during async connection starts.
- **Visual Branding**: Switched primary accent color to "Radiant Gold" (Yellow) across the entire application UI.
- **Sidebar Aesthetics**: Applied Radiant Gold theme to all host icons for visual consistency.
- **Sober Typography**: Reverted host labels to standard font weight and color for a more professional look.
- **Status Indicators**: "Disconnected" state now uses a **Red X icon** instead of a simple dot to improve accessibility and clear distinction for color-blind users.
- **Host Configuration**: Updated host form to support credential profile selection.
- **Connection Workflow**: Terminal connections now automatically resolve credentials from the vault, skipping manual login for predefined profiles.

### Fixed

- **Type Compatibility**: Resolved critical compiler errors between `i18next` and legacy TypeScript by upgrading the project to TypeScript 5.
- **UI Regressions**: Fixed missing state hooks and type mismatches in `ConnectionsView.tsx` and `App.tsx` during the translation refactor.
- **Menu Readability**: Removed transparency from top and context menus, using solid colors to prevent background text interference.
- **CSS Variable Cleanup**: Resolved invalid `rd-bg-main` references in TreeView and status indicators, ensuring consistent theme rendering.
- **JSON Unmarshalling**: Fixed a critical bug where `folderId` was sent as a string instead of an int64, preventing host updates.
- **TypeScript Compilation**: Resolved missing imports and test mock inconsistencies caused by the new session metadata structure.
- **Drag and Drop / Mouse Control**: Resolved runtime conflicts and crashes in the DND library (react-arborist vs react-mosaic-component).
- **Context Switching**: Fixed stability issues when switching between different terminal or editor contexts.
- **UI Contrast**: Implemented dynamic text color calculation (`oklch`) for Radiant Gold elements to ensure legibility on accent backgrounds.

---

---
