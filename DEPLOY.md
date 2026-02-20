# Deploying DGDS to VPS

The DGDS app is served at `https://alumicubeengineering.com/dgds/`. The VPS does not have enough RAM to run `npm run build`, so you must **build locally** and **transfer the `dist` folder** to the VPS.

## Workaround Process

**When you make changes to the DGDS app source code, you must manually transfer the built `dist` folder to the VPS:**

### 1. Build the app locally (on your PC)

From this repo root (e.g. `c:\CODE\DGDS`):

```bash
npm install   # Only needed if dependencies changed
npm run build
```

### 2. Transfer the `dist` folder to the VPS

- Use SCP, WinSCP, or your preferred file transfer method.
- Copy the **entire** `dist/` folder from your local DGDS project.
- Put it at: **`/var/www/alumicube-website/client/dgds/dist/`** on the VPS.
- Folder structure on VPS should be:
  - `/var/www/alumicube-website/client/dgds/dist/index.html`
  - `/var/www/alumicube-website/client/dgds/dist/assets/` (with all asset files)

**Example (SCP from Windows PowerShell, from this repo root):**

```powershell
scp -r dist\* user@your-vps-ip:/var/www/alumicube-website/client/dgds/dist/
```

Replace `user` and `your-vps-ip` with your SSH user and VPS address. Use `-P port` if your SSH port is not 22.

### 3. Verify on VPS

```bash
ls -la /var/www/alumicube-website/client/dgds/dist/
```

You should see `index.html` and an `assets/` folder with files inside.

### 4. Restart the PM2 service

```bash
pm2 restart alumicube-website
```

## When to Rebuild and Transfer

Rebuild and transfer when:

- You change DGDS app source code (`src/`)
- You change `vite.config.js` (e.g. base path)
- You change `package.json` dependencies
- The `/dgds` route shows a white page or 404 on the VPS
- Browser console shows missing assets or wrong MIME type for JS/CSS

You do **not** need to rebuild when:

- Only the main alumicube website (non-DGDS) changes; those deploy via `git pull` on the VPS.

## Deployment Checklist (DGDS updates)

- [ ] Make changes in this repo (`src/` or config)
- [ ] Build locally: `npm run build`
- [ ] Transfer `dist/` to VPS: `/var/www/alumicube-website/client/dgds/dist/`
- [ ] On VPS: `ls -la /var/www/alumicube-website/client/dgds/dist/` to verify
- [ ] On VPS: `pm2 restart alumicube-website`
- [ ] Test: https://alumicubeengineering.com/dgds/

## Troubleshooting

### White page or "Cannot GET /dgds"

- Check that `dist/index.html` and `dist/assets/` exist on the VPS at the path above.
- Restart PM2: `pm2 restart alumicube-website`
- Check logs: `pm2 logs alumicube-website`

### Assets not loading (JS/CSS show "text/html" or 404)

- Ensure **`vite.config.js`** has **`base: '/dgds/'`** so asset URLs use `/dgds/assets/...`.
- Rebuild locally and transfer the new `dist` folder again.
- Hard refresh the page (Ctrl+Shift+R).

### Build fails on VPS (out of memory / hangs)

- This is expected. Always build on your PC and transfer `dist` only.

## Notes

- The `dist/` folder is in `.gitignore` and is not committed.
- The site is served under the `/dgds/` path; the base path in Vite must match.
