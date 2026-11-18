# Dependency audit — 18 November 2026

The reported `npm install` completed successfully. Its audit warnings are separate from installation failure. Dependency versions were inspected; no dependency changes were made during this review.

## Findings

`npm audit --json` reports four high-severity entries: `picomatch`, `fdir`, `tinyglobby` and `vite`. They trace to the same underlying advisory through Vite's development dependency chain:

```text
vite@6.4.6
├── picomatch@4.0.7
├── fdir@6.5.0 → picomatch@4.0.7
└── tinyglobby@0.2.17 → fdir / picomatch
```

[GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) describes regular-expression denial of service in picomatch versions through 4.0.7 and currently lists no patched version. The npm registry check also returns 4.0.7 as the latest published version.

Although npm reports `fixAvailable: true`, `npm audit fix --dry-run --json` proposes zero changed packages and still reports all four high findings. Its optional platform-package additions are dry-run output, not an applied remediation. A normal compatible audit fix therefore does not currently resolve this report. No forced upgrade, downgrade, advisory suppression or unreleased dependency override was applied.

`npm audit --omit=dev --json` reports **zero vulnerabilities** for the runtime dependency set. This does not establish overall application security or remove the development-tool advisory. The development and preview scripts already bind to `127.0.0.1`; no server configuration changes were needed.

## Commands and real results

| Command | Result |
| --- | --- |
| `npm audit --json` | Four high findings; exit 1 because findings remain. |
| `npm ls picomatch fdir tinyglobby vite` | Confirms the chain above. |
| `npm view picomatch version dist-tags --json` | Latest published version: 4.0.7. |
| `npm audit fix --dry-run --json` | Zero changed packages; the same four high findings remain. |
| `npm audit --omit=dev --json` | Zero findings; exit 0. |
| `npm run build` | Passed: strict TypeScript and Vite production build. |
| `npm test` | Passed: 14 tests, zero failures. |

The first sandboxed audit request could not access the registry; the registry checks and build were rerun with approved host permissions. Codacy MCP tools remain unavailable in this session, so no Codacy/Trivy result is claimed. Reset the extension's MCP connection and check GitHub Copilot's MCP settings if that separate analysis is required.

Only this report and its README link were added for this review. Application source, `package.json` and dependency versions were left unchanged. Browser checks were not repeated because neither UI behavior nor dependency versions changed.

## Next step

Watch for a released fix for this advisory, then inspect `npm audit fix --dry-run`, apply a compatible update and rerun audit/build/tests. If npm proposes a dependency-range or major-version change, review that proposal against the project's approval rules first. The four development-tool findings remain open until an actual remediation is verified.

To start the current local UI preview, use `npm run dev`. The version command is `npm -v`, not `npmv`.
