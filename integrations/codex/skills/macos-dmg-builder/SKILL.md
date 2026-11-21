---
name: macos-dmg-builder
description: Design, build, verify, and package native macOS applications (.app and .dmg) for Apple Silicon using Swift 6, SwiftUI, XcodeGen, Hardened Runtime, and strict UI/UX Anti-Slop gates. Use when the user asks to create macOS apps, compile .dmg installers, or scaffold desktop Swift projects.
---

# macOS Native .dmg Application Builder

Deliver clean, hardened, native macOS desktop applications packaged into compressed `.dmg` disk images without AI hallucinations, manual `.pbxproj` file corruption, or generic UI slop.

---

## When to Activate

Trigger phrases:
- "buatkan aplikasi macOS …", "bikin app desktop mac …", "buat app macOS machine"
- "buat installer .dmg", "packaging .dmg", "package into dmg"
- "scaffold native macOS app", "SwiftUI macOS app"
- "macOS spec-driven app development"

---

## Non-Negotiables

1. **One Gate per Turn (Anti-Context Drift):** Never attempt to write the entire application in a single turn. Progress sequentially from Gate 1 to Gate 6.
2. **Strict Platform Isolation (Zero iOS Leakage):**
   - ❌ BANNED: `import UIKit`, `UIColor`, `UIScreen`, `UIImpactFeedbackGenerator`, `.navigationBarTitleDisplayMode()`, `.keyboardType()`.
   - ✅ MANDATORY: `import SwiftUI`, `import AppKit`, `NSColor`, `NSWindow`, `NSPasteboard`, and macOS 14.0+ desktop APIs.
3. **Declarative Project Scaffolding (Zero Manual `.pbxproj` Editing):**
   - ❌ BANNED: Manually writing or editing `.xcodeproj/project.pbxproj` XML.
   - ✅ MANDATORY: Define all build configurations, sources, and targets in `project.yml` (XcodeGen) or `Package.swift`.
4. **Zero Plaintext Secrets:**
   - ❌ BANNED: Storing API keys, credentials, or sensitive tokens in `UserDefaults`, `@AppStorage`, or plain files.
   - ✅ MANDATORY: macOS Keychain wrapper using `Security` framework (`SecItemAdd`, `SecItemCopyMatching`) with `kSecAttrAccessibleWhenUnlocked`.
5. **Strict UI/UX Anti-Slop Protocol:**
   - ❌ BANNED: Purple/indigo gradients, 3-card SaaS web hover cards, hardcoded hex colors, div-soup buttons (`.onTapGesture` on Text/VStack), AI marketing fluff ("Supercharge", "Unlock seamless", 🚀, ✨, ⚡), and unbounded spring animations.
   - ✅ MANDATORY: Semantic system colors (`Color(nsColor: .windowBackgroundColor)`), native materials (`.ultraThinMaterial`), SF Pro/Mono typography with mandatory `.monospacedDigit()` on all numbers, desktop ergonomics, keyboard shortcuts, and 5 interactive states.
6. **Hardened Runtime by Default:**
   - `ENABLE_HARDENED_RUNTIME: YES` is mandatory for Gatekeeper and Apple Notarization compatibility.
7. **CLI Verification Required (Anti-Fake-Complete):**
   - A gate is only complete when verified via terminal command with exit code 0 (`xcodegen generate`, `audit-anti-slop.sh`, `xcodebuild test`).

---

## The 6-Gate Deterministic Workflow

### Gate 1: Architecture & Specification (`docs/SPEC.md`)
Before writing any Swift code, create `docs/SPEC.md`:
1. **Problem Statement & Target User Workflow:** Maximum 5 concrete bullet points.
2. **Window & Scene Topology:**
   - Scene architecture: `WindowGroup`, `Settings` (`Cmd + ,`), or `MenuBarExtra`.
   - Desktop layout: `NavigationSplitView` (Sidebar + Content + Inspector/Detail).
3. **Data & State Contract:**
   - Schema models (`struct`, `Sendable`, `Codable`, or `@Model` SwiftData).
   - Reactive state: `@Observable` macro (Observation framework) with `@MainActor` isolation.
4. **Security & Entitlements Matrix:**
   - Principle of Least Privilege: list exact entitlements required in `App.entitlements`.
5. **UI/UX Anti-Slop Thesis:**
   - Semantic color mappings, typography rules, and keyboard shortcut table (`Cmd + N`, `Cmd + R`, etc.).

*Stop and ask for the user's review before proceeding to Gate 2.*

---

### Gate 2: Declarative Scaffolding (`project.yml` & Entitlements)
1. Scaffold directory tree:
   ```text
   Sources/
     App/
     Models/
     Services/
     Views/
   Resources/
     App.entitlements
     Assets.xcassets
   Tests/
   scripts/
     audit-anti-slop.sh
     build-dmg.sh
   project.yml
   ```
2. Author `project.yml` with `platform: macOS`, `deploymentTarget: "14.0"`, and `ENABLE_HARDENED_RUNTIME: YES`.
3. Author `Resources/App.entitlements`.
4. Copy `audit-anti-slop.sh` and `build-dmg.sh` into `scripts/`.
5. **Verify Gate 2:** Run `xcodegen generate` and verify exit code 0.

---

### Gate 3: Core Domain Logic & Security Hardening
1. Implement domain models in `Sources/Models/` with strict Swift 6 Sendable conformance.
2. Implement services in `Sources/Services/`:
   - Keychain service wrapper for all secret tokens.
   - User file access using `NSOpenPanel` / `NSSavePanel` with Security-Scoped Bookmarks.
   - Safe process execution: pass arguments as an array to `Foundation.Process` (zero shell interpolation).
3. **Verify Gate 3:** Run `xcodebuild build` to verify clean compilation without warnings.

---

### Gate 4: Native macOS HIG UI & Anti-Slop Enforcement
1. Build desktop views in `Sources/Views/`:
   - Use `NavigationSplitView`, `Table`, `Form` with `.formStyle(.grouped)`, and `ToolbarItem`.
   - Apply semantic colors: `Color(nsColor: .windowBackgroundColor)`, `.primary`, `.secondary`, `Color.accentColor`.
   - Apply `.monospacedDigit()` to all numbers, file sizes, and tabular data.
   - Attach keyboard shortcuts via `.keyboardShortcut(...)`.
   - Implement all 5 interactive states: Empty (`ContentUnavailableView`), Loading (`ProgressView`), Populated, Error (with retry), and Focus/Hover.
2. **Verify Gate 4:** Run `bash scripts/audit-anti-slop.sh` to ensure zero anti-slop violations.

---

### Gate 5: Automated Testing & Anti-Slop Audit
1. Implement unit tests in `Tests/` using **Swift Testing** (`@Test`, `#expect(...)`).
2. Test business logic, edge cases, error states, and keychain persistence.
3. **Verify Gate 5:**
   ```bash
   bash scripts/audit-anti-slop.sh
   xcodebuild test -project <AppName>.xcodeproj -scheme <AppName> -destination "platform=macOS,arch=arm64" | xcbeautify
   ```

---

### Gate 6: DMG Packaging Pipeline
1. Execute the packaging script:
   ```bash
   bash scripts/build-dmg.sh "." "<AppName>"
   ```
2. The pipeline deterministically:
   - Re-generates project from `project.yml`.
   - Runs audit and automated test suite.
   - Compiles Release build for `arm64` with Hardened Runtime enabled.
   - Verifies code signing (`codesign --verify --deep --strict`).
   - Generates compressed `UDZO` `.dmg` installer via `create-dmg` (or native `hdiutil` fallback).
   - Audits Gatekeeper acceptance (`spctl`).
   - Computes SHA-256 checksum.

---

## Tooling Quick-Install Reference

If CLI tools are missing on the user's macOS machine:
```bash
brew install xcodegen xcbeautify create-dmg swiftlint
```

---

## References

- Full Architecture Doc: `<plugin-root>/knowledge/macos_native_dmg_app_development.md`
- Apple HIG: `https://developer.apple.com/design/human-interface-guidelines/designing-for-macos`
- Universal Scripts: `<skill-dir>/scripts/audit-anti-slop.sh` and `<skill-dir>/scripts/build-dmg.sh`. Run these from the target app repository on macOS.
