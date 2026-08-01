# Roblox Account Manager

A Chrome/Edge extension (Manifest V3) to save unlimited Roblox accounts and switch
between them in one click. It works by saving and swapping your `.ROBLOSECURITY`
session cookie — the same thing that keeps you logged in.

## Install on Chrome / Edge (unpacked)

1. Open `chrome://extensions` (or `edge://extensions`).
2. Turn on **Developer mode** (top-right).
3. Click **Load unpacked** and select this `roblox-ext` folder.
4. Pin the red **R** icon from the puzzle-piece menu so it's always visible.

## Install on Firefox (.xpi)

The packaged file is **`roblox-account-switcher.xpi`** (rebuild it any time with
`build-xpi.ps1`). It uses the `manifest.firefox.json` (Manifest V2) config.

**Firefox blocks *permanent* install of unsigned add-ons on the normal Release/Beta
builds** — this is a Mozilla security rule, not something the extension can opt out of.
Pick one:

- **Try it now (any Firefox), removed on restart:** go to `about:debugging#/runtime/this-firefox`
  - **Load Temporary Add-on** - select `roblox-account-manager.xpi`.
- **Permanent, no signing:** use **Firefox Developer Edition, Nightly, or ESR**. In
  `about:config` set `xpinstall.signatures.required` to `false`, then open `about:addons`
  - gear icon - **Install Add-on From File** - pick the `.xpi`.

## How to use

1. Log into a Roblox account normally at [roblox.com](https://www.roblox.com).
2. Open the extension and click **+ Save current**. Your username and avatar are stored.
3. Log out, log into a different account, and **+ Save current** again. Repeat for as
   many accounts as you like.
4. To switch, just click **Switch** on any saved account, open Roblox tabs reload into
   that account automatically.

### Adding an account without logging in
Open **“Add account manually”** and paste a `.ROBLOSECURITY` cookie value. The account's
name/avatar resolves the first time you switch to it.

### Backup
Use **Export** to save all accounts to a JSON file, and **Import** to restore them (handy
when moving to a new machine). Keep this file private.

## How it works
- The extension reads/writes the `.ROBLOSECURITY` cookie on `.roblox.com` using the
  `cookies` permission.
- Accounts are stored **locally** in `chrome.storage.local`, nothing is sent anywhere.
- Switching sets the cookie to the chosen account's value and reloads Roblox tabs.

## Files
| File | Purpose |
|------|---------|
| `manifest.json` | Extension config & permissions (`cookies`, `storage`, roblox.com hosts) |
| `popup.html/.css/.js` | The account manager UI and all logic |
| `icons/` | Toolbar icons |

## Security!
The `.ROBLOSECURITY` cookie is a **full session token**. Anyone who obtains it can access
your account without a password or 2FA. Because of that:

- **Never share your export file** or paste your cookie anywhere else.

This is an unofficial tool and is not affiliated with or endorsed by Roblox.

