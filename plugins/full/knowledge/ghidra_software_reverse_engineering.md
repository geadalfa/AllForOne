# Ghidra: NSA Software Reverse Engineering Framework

Source: NationalSecurityAgency/ghidra · Apache-2.0 · verified 2026-11-22
Repository: https://github.com/NationalSecurityAgency/ghidra · Releases: https://github.com/NationalSecurityAgency/ghidra/releases
Baseline: HEAD `3fb3eec6a054` (2026-11-20), latest release Ghidra 12.2 (`Ghidra_12.2_build`, 2026-10-22), Java/Gradle, about 418 MB checkout.

## What it is

Ghidra is a software reverse engineering (SRE) framework created and maintained by the NSA Research Directorate. It provides disassembly, assembly, decompilation, graphing, and scripting across Windows, macOS, and Linux, with support for many processor instruction sets and executable formats. It runs interactively or in headless batch mode, and users can extend it with Java or Python components.

## Why it matters

- **Free, source-available SRE platform.** Apache-2.0 makes it usable for commercial and personal analysis without a paid license.
- **Automation surface.** Headless mode and PyGhidra make repeatable analysis possible from scripts and CI, not only from a GUI.
- **Extensibility.** Extensions and scripts let a team codify recurring analysis tasks and share them.
- **Provenance.** The repository publishes source, release archives, security advisories, and build instructions, so results can be traced to a specific build.

## Key concepts

- **Project** — a Ghidra project stores programs, metadata, and analysis state. Headless runs create or reuse a project directory.
- **Program** — an imported binary plus its analysis database.
- **Headless (batch) mode** — `support/analyzeHeadless`, documented in `<GhidraInstallDir>/support/analyzeHeadlessREADME.html`. Used for imports, scripted analysis, and exports without the GUI.
- **PyGhidra** — Python access to Ghidra, launched with `support/pyghidraRun` or the `pyghidra` module.
- **Scripts** — Java or Python scripts that run inside Ghidra and can be invoked in GUI or headless mode.
- **Extensions** — installable modules that add processors, analyzers, or features.

## Workflow / architecture

1. Install JDK 25 64-bit. The README lists JDK 25 as the supported runtime.
2. Download the official release archive (`ghidra_<version>_<release>_<date>.zip`) from the release page. Do not use the "Source Code" files for installation.
3. Extract into a fresh directory; never extract over an existing installation.
4. Launch `ghidraRun` (`ghidraRun.bat` on Windows) for the GUI, or `support/pyghidraRun` for PyGhidra.
5. For batch work, create a dedicated project directory and run `support/analyzeHeadless` with import and post-script options. Run `analyzeHeadless -help` on the installed version to confirm flag names.
6. Export findings (function lists, strings, cross-references, decompiled excerpts) to a separate output directory. Keep the project directory disposable.
7. For source builds, install Gradle 9.1.0+ (or use the wrapper), run `gradle -I gradle/support/fetchDependencies.gradle`, then `gradle buildGhidra`; output lands in `build/dist/`.

## Verified behavior

Read from the repository on 2026-11-22:

- README documents the framework scope, JDK 25 requirement, release-file naming, launch scripts, PyGhidra, and the source-build steps above.
- `GhidraDocs/GettingStarted.md` documents headless batch mode, PyGhidra mode, and extension installation.
- The repository publishes a security warning that certain Ghidra versions have known vulnerabilities and directs users to the Security Advisories.
- License file is Apache-2.0; `NOTICE` and `DISCLAIMER.md` are present.
- Repository metrics at verification time: about 100.9k stars, 11.5k forks.

No Ghidra build was downloaded or executed during verification.

## Limitations

- Large checkout and long build time. Prefer the official release archive unless you need source changes.
- JDK 25 is required by the current release; older JDKs are not supported.
- Decompiler output is an approximation. Treat it as evidence, not as source truth.
- Some processors, formats, and vendor extensions are incomplete or community-maintained.
- Security advisories exist for older versions. Check the advisory list before analyzing untrusted files.
- Analysis of malware or third-party binaries can create legal and safety obligations. Authorization and isolation are mandatory.

## How the assistant should use it

- Activate the `ghidra-headless-analysis` skill for installation and batch analysis workflows.
- Require a legitimate, authorized target. Refuse requests to analyze software the user does not own or have written permission to inspect.
- Analyze copies in an isolated directory. Never execute the sample or install unknown extensions.
- Record the Ghidra version, release build, script names, input hashes, and command lines.
- Separate verified facts (bytes, strings, symbols, hashes) from interpretation (intent, vulnerability claims).
- Prefer headless exports and deterministic scripts over screenshots when results feed an agent.

## References

- https://github.com/NationalSecurityAgency/ghidra
- https://github.com/NationalSecurityAgency/ghidra/blob/master/README.md
- https://github.com/NationalSecurityAgency/ghidra/blob/master/GhidraDocs/GettingStarted.md
- https://github.com/NationalSecurityAgency/ghidra/security/advisories
- https://github.com/NationalSecurityAgency/ghidra/releases
