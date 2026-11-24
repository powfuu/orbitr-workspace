# Releasing Orbitr

Orbitr ships macOS (Apple Silicon + Intel) and Windows builds through GitHub Releases.
Installed apps check `latest.json` on the latest release at launch and every 6 hours,
download the update, verify its signature, install it and relaunch (sessions are restored).

## One-time setup

1. **Create the GitHub repository** and push this project to it.
2. **Point the updater at it**

   ```bash
   npm run set-release-repo owner/name
   ```

   Until this is done, Settings → Updates says no repository is configured and nothing is checked.
3. **Add the signing key to GitHub** (Settings → Secrets and variables → Actions):
   `TAURI_SIGNING_PRIVATE_KEY` = the contents of `~/.tauri/orbitr-updater.key`.
   The public key is already in `src-tauri/tauri.conf.json`. **Keep the private key safe:**
   if it is lost, installed apps can never accept another update; if it leaks, anyone can sign one.
4. **npm registry for CI.** `package-lock.json` must resolve packages from a registry the
   GitHub runners can reach (the public npm registry). A lockfile generated behind a private
   proxy will make `npm ci` fail in CI.
5. **Optional — macOS code signing & notarization.** Without it macOS shows "unidentified
   developer" on first launch (right-click → Open). With an Apple Developer ID, add the
   `APPLE_*` secrets listed at the top of `.github/workflows/release.yml`.
   Windows builds are unsigned unless you add a code-signing certificate (SmartScreen warns).

## Each release

```bash
npm run release:version 0.2.0
git commit -am "release: v0.2.0"
git tag v0.2.0
git push --follow-tags
```

The `Release` workflow builds all three targets, runs typecheck + tests, and creates a
**draft** release with the installers, `.sig` files and `latest.json`. Review it and click
**Publish**: from that moment installed apps see the update.

## Local release build

```bash
TAURI_SIGNING_PRIVATE_KEY=~/.tauri/orbitr-updater.key TAURI_SIGNING_PRIVATE_KEY_PASSWORD="" npm run tauri build
```

Output: `src-tauri/target/release/bundle/` (`.app`, `.dmg`, and the updater `.app.tar.gz` + `.sig`).
