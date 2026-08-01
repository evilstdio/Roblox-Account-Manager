"use strict";

const api = typeof browser !== "undefined" ? browser : chrome;

const COOKIE_NAME = ".ROBLOSECURITY";
const COOKIE_URL = "https://www.roblox.com";
const COOKIE_DOMAIN = ".roblox.com";
const STORAGE_KEY = "accounts";
const ONE_YEAR = 60 * 60 * 24 * 365;

async function getCurrentCookie() {
  const c = await api.cookies.get({ url: COOKIE_URL, name: COOKIE_NAME });
  return c && c.value ? c.value : null;
}

async function setCookie(value) {
  await api.cookies.set({
    url: COOKIE_URL,
    name: COOKIE_NAME,
    value: value,
    domain: COOKIE_DOMAIN,
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "no_restriction",
    expirationDate: Math.floor(Date.now() / 1000) + ONE_YEAR,
  });
}

async function clearCookie() {
  await api.cookies.remove({ url: COOKIE_URL, name: COOKIE_NAME });
}

async function fetchAuthedUser() {
  try {
    const res = await fetch("https://users.roblox.com/v1/users/authenticated", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const d = await res.json();
    return { userId: d.id, name: d.name, displayName: d.displayName };
  } catch {
    return null;
  }
}

async function fetchAvatar(userId) {
  try {
    const res = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=48x48&format=Png&isCircular=true`
    );
    if (!res.ok) return null;
    const d = await res.json();
    return d && d.data && d.data[0] ? d.data[0].imageUrl : null;
  } catch {
    return null;
  }
}

async function loadAccounts() {
  const data = await api.storage.local.get(STORAGE_KEY);
  return Array.isArray(data[STORAGE_KEY]) ? data[STORAGE_KEY] : [];
}

async function saveAccounts(accounts) {
  await api.storage.local.set({ [STORAGE_KEY]: accounts });
}

function upsert(accounts, account) {
  const idx = accounts.findIndex((a) =>
    account.userId ? a.userId === account.userId : a.cookie === account.cookie
  );
  if (idx >= 0) accounts[idx] = { ...accounts[idx], ...account };
  else accounts.push(account);
  return accounts;
}

const $ = (id) => document.getElementById(id);
let statusTimer = null;

function status(msg, kind = "") {
  const el = $("status");
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : "");
  el.hidden = false;
  clearTimeout(statusTimer);
  if (kind === "ok") statusTimer = setTimeout(() => (el.hidden = true), 2500);
}

function fallbackAvatar() {
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="20" fill="%232e3238"/><text x="20" y="26" font-size="18" text-anchor="middle" fill="%239aa2ad" font-family="sans-serif">?</text></svg>'
    )
  );
}

async function render() {
  const accounts = await loadAccounts();
  const current = await getCurrentCookie();
  const list = $("list");
  const empty = $("empty");

  $("count").textContent =
    accounts.length === 0
      ? "No accounts saved"
      : `${accounts.length} account${accounts.length === 1 ? "" : "s"} saved`;

  list.innerHTML = "";
  empty.hidden = accounts.length !== 0;

  for (const acc of accounts) {
    const isActive = current && acc.cookie === current;
    const li = document.createElement("li");
    li.className = "account" + (isActive ? " active" : "");

    const img = document.createElement("img");
    img.className = "avatar";
    img.src = acc.avatar || fallbackAvatar();
    img.onerror = () => (img.src = fallbackAvatar());

    const meta = document.createElement("div");
    meta.className = "meta";
    const name = document.createElement("div");
    name.className = "name";
    name.textContent = acc.displayName || acc.name || acc.label || "Unnamed account";
    if (isActive) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "ACTIVE";
      name.appendChild(badge);
    }
    const handle = document.createElement("div");
    handle.className = "handle";
    handle.textContent = acc.name ? "@" + acc.name : "cookie not yet resolved";
    meta.append(name, handle);

    const actions = document.createElement("div");
    actions.className = "actions";

    const switchBtn = document.createElement("button");
    switchBtn.className = "icon-btn switch";
    switchBtn.textContent = isActive ? "In use" : "Switch";
    switchBtn.disabled = isActive;
    switchBtn.addEventListener("click", () => switchTo(acc));

    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn del";
    delBtn.textContent = "✕";
    delBtn.title = "Remove";
    delBtn.addEventListener("click", () => removeAccount(acc));

    actions.append(switchBtn, delBtn);
    li.append(img, meta, actions);
    list.appendChild(li);
  }
}

async function saveCurrent() {
  status("Reading current session…");
  const cookie = await getCurrentCookie();
  if (!cookie) {
    status("You're not logged into Roblox in this browser.", "err");
    return;
  }
  const info = await fetchAuthedUser();
  if (!info) {
    status("Couldn't verify the session. Are you logged in on roblox.com?", "err");
    return;
  }
  const avatar = await fetchAvatar(info.userId);
  let accounts = await loadAccounts();
  accounts = upsert(accounts, {
    userId: info.userId,
    name: info.name,
    displayName: info.displayName,
    avatar,
    cookie,
    savedAt: Date.now(),
  });
  await saveAccounts(accounts);
  await render();
  status(`Saved ${info.displayName} (@${info.name}).`, "ok");
}

async function switchTo(acc) {
  status(`Switching to ${acc.displayName || acc.name || acc.label}…`);
  await setCookie(acc.cookie);

  const tabs = await api.tabs.query({ url: ["*://*.roblox.com/*"] });
  if (tabs.length) {
    for (const t of tabs) api.tabs.reload(t.id);
    api.tabs.update(tabs[0].id, { active: true });
  } else {
    api.tabs.create({ url: "https://www.roblox.com/home" });
  }

  const info = await fetchAuthedUser();
  if (info) {
    const avatar = await fetchAvatar(info.userId);
    let accounts = await loadAccounts();
    accounts = accounts.map((a) =>
      a === acc || a.cookie === acc.cookie
        ? { ...a, userId: info.userId, name: info.name, displayName: info.displayName, avatar }
        : a
    );
    await saveAccounts(accounts);
  }
  await render();
  status(`Switched. Open Roblox to confirm.`, "ok");
}

async function removeAccount(acc) {
  const label = acc.displayName || acc.name || acc.label || "this account";
  if (!confirm(`Remove ${label}?\n\nThis only deletes the saved entry, not the Roblox account.`)) return;
  let accounts = await loadAccounts();
  accounts = accounts.filter((a) => a.cookie !== acc.cookie);
  await saveAccounts(accounts);
  await render();
  status("Removed.", "ok");
}

async function addManual() {
  const label = $("manualName").value.trim();
  const cookie = $("manualCookie").value.trim();
  if (!cookie) {
    status("Paste a .ROBLOSECURITY cookie value first.", "err");
    return;
  }
  if (!cookie.includes("_|WARNING")) {
    if (!confirm("That doesn't look like a .ROBLOSECURITY value. Add it anyway?")) return;
  }
  let accounts = await loadAccounts();
  accounts = upsert(accounts, {
    userId: null,
    name: null,
    displayName: null,
    label: label || "Manual account",
    avatar: null,
    cookie,
    savedAt: Date.now(),
  });
  await saveAccounts(accounts);
  $("manualName").value = "";
  $("manualCookie").value = "";
  await render();
  status("Added. Its name resolves the first time you switch to it.", "ok");
}

async function logoutCurrent() {
  if (!confirm("Log out the account currently active in this browser?")) return;
  await clearCookie();
  const tabs = await api.tabs.query({ url: ["*://*.roblox.com/*"] });
  for (const t of tabs) api.tabs.reload(t.id);
  await render();
  status("Logged out current session.", "ok");
}

async function exportAccounts() {
  const accounts = await loadAccounts();
  const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `roblox-accounts-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function importAccounts(file) {
  try {
    const text = await file.text();
    const incoming = JSON.parse(text);
    if (!Array.isArray(incoming)) throw new Error("bad format");
    let accounts = await loadAccounts();
    for (const a of incoming) {
      if (a && a.cookie) accounts = upsert(accounts, a);
    }
    await saveAccounts(accounts);
    await render();
    status(`Imported ${incoming.length} account(s).`, "ok");
  } catch {
    status("Import failed — not a valid export file.", "err");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  $("saveCurrent").addEventListener("click", saveCurrent);
  $("addManual").addEventListener("click", addManual);
  $("logoutBtn").addEventListener("click", logoutCurrent);
  $("exportBtn").addEventListener("click", exportAccounts);
  $("importBtn").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    if (e.target.files[0]) importAccounts(e.target.files[0]);
    e.target.value = "";
  });
  render();
});
