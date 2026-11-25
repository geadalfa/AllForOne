---
name: ghidra-headless-analysis
description: Install Ghidra and run authorized, repeatable headless analysis on local binaries. Use when the user asks to disassemble, decompile, inspect, or batch-analyze a binary with Ghidra, set up PyGhidra, or export functions, strings, and cross-references from a Ghidra project.
---

# Ghidra headless analysis

Run Ghidra without the GUI and produce evidence an agent can cite. This skill installs the official release, imports a binary into a disposable project, runs a post-script, and exports results.

## When to activate

- The user asks for Ghidra setup, headless analysis, PyGhidra, or batch disassembly.
- The user provides a binary they own or are authorized to inspect.
- A reverse-engineering question needs function lists, strings, cross-references, or decompiled excerpts.

Do not activate for requests to analyze software the user does not own or have written authorization to inspect.

## Non-negotiables

1. **Authorization first.** Ask for the target's origin and confirm the user owns it or has permission. If not, stop.
2. **Analyze copies.** Copy the sample into an isolated working directory. Never execute the sample, its installer, or unknown extensions.
3. **Official release only.** Download `ghidra_<version>_<release>_<date>.zip` from the Ghidra release page. Do not use "Source Code" archives for installation.
4. **Fresh extraction.** Extract into an empty directory; never extract over an existing installation.
5. **Evidence labels.** Separate observed bytes, strings, symbols, and hashes from interpretation such as intent or vulnerability claims.
6. **Record provenance.** Ghidra version, release date, input SHA-256, script names, and exact command lines belong in the report.

## Install

1. Install JDK 25 64-bit and verify `java -version`.
2. Download the latest official release archive.
3. Extract to a new directory, for example `~/tools/ghidra_12.2_PUBLIC`.
4. Verify the launcher: `support/analyzeHeadless -help` (Windows: `support\analyzeHeadless.bat -help`).
5. Optional Python access: run `support/pyghidraRun` and let it install the bundled `pyghidra` module, or install it from `Ghidra/Features/PyGhidra/pypkg/dist`.
6. Check the repository Security Advisories before using an older release.

## Headless workflow

1. Create a disposable project directory, for example `work/ghidra-projects`.
2. Hash the input: `sha256sum <binary>` (PowerShell: `Get-FileHash`).
3. Import and run analysis plus a post-script:

   ```bash
   support/analyzeHeadless <project_dir> <project_name> \
     -import <binary> \
     -scriptPath <scripts_dir> \
     -postScript <script>.java \
     -deleteProject
   ```

   Flag names differ between releases; confirm with `analyzeHeadless -help`.
4. Export artifacts to a separate output directory. Good post-scripts emit function names, addresses, sizes, strings, references, and decompiled excerpts as text or CSV.
5. For repeat runs on the same program, use `-process <program_name>` instead of `-import`.
6. Verify the export is non-empty and that function counts are plausible before drawing conclusions.
7. Remove the project directory when the analysis is reproducible from the script; keep only the export and the command log.

## PyGhidra option

Use PyGhidra when Python tooling already exists. Launch `pyghidraRun` for the GUI or `pyghidra` for scripting, then import and analyze through the Python API. Keep the same authorization, isolation, and evidence rules.

## Outputs

- Input SHA-256 and file metadata.
- Ghidra version, release build date, and script names.
- Function inventory, strings of interest, and cross-references.
- Decompiled excerpts with addresses.
- A short report that separates verified observations from hypotheses.
- Reproduction command line and any script source used.

## Failure modes

- JDK mismatch: the launcher exits before analysis; install JDK 25.
- Missing `-scriptPath`: post-scripts are not found.
- Huge binaries: analysis time grows sharply; scope to specific functions or use headless options.
- Corrupt project: delete the disposable project directory and re-import.
- Decompiler output misread as source: always label it as generated.

## References

- `knowledge/ghidra_software_reverse_engineering.md`
- https://github.com/NationalSecurityAgency/ghidra
- https://github.com/NationalSecurityAgency/ghidra/blob/master/GhidraDocs/GettingStarted.md
- https://github.com/NationalSecurityAgency/ghidra/security/advisories
