import { createGitHubClient, GitHubApiError } from "./github-contents.js";
import {
  getStoredPassword,
  getStoredToken,
  PRIVATE_VAULT_PATH,
  requireStoredToken,
} from "./reading-config.js";
import { appendToVault, createVault } from "./reading-crypto.js";

const form = document.querySelector("#article-form");
const titleInput = document.querySelector("#article-title");
const urlInput = document.querySelector("#article-url");
const canonicalInput = document.querySelector("#canonical-url");
const noteInput = document.querySelector("#article-note");
const tagsInput = document.querySelector("#article-tags");
const stateInput = document.querySelector("#reading-state");
const privatePasswordInput = document.querySelector("#private-password");
const privatePasswordField = document.querySelector("#private-password-field");
const archiveInput = document.querySelector("#archive-url");
const findArchiveLink = document.querySelector("#find-archive-link");
const saveArchiveLink = document.querySelector("#save-archive-link");
const setupNotice = document.querySelector("#setup-notice");
const saveButton = document.querySelector("#save-article");
const saveStatus = document.querySelector("#save-status");
const saveResult = document.querySelector("#save-result");

function setStatus(message, state = "") {
  saveStatus.textContent = message;
  saveStatus.dataset.state = state;
}

function safeHttpUrl(value, { optional = false } = {}) {
  const trimmed = value.trim();
  if (!trimmed && optional) return "";

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error("Enter a complete URL beginning with http:// or https://.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http:// and https:// URLs can be saved.");
  }

  return parsed.href;
}

function randomId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function archiveProvider(archiveUrl) {
  if (!archiveUrl) return "";
  const host = new URL(archiveUrl).hostname;
  if (host === "web.archive.org" || host === "archive.org") return "wayback";
  if (/^archive\.(today|is|ph|md|li|fo|vn)$/.test(host)) return "archive.today";
  return host;
}

function normalizeTags(value) {
  const seen = new Set();
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLocaleLowerCase();
      if (!tag || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 20);
}

function makeEntry() {
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    throw new Error("Enter an article title.");
  }

  const url = safeHttpUrl(urlInput.value);
  const canonicalUrl = safeHttpUrl(canonicalInput.value, { optional: true });
  const archiveUrl = safeHttpUrl(archiveInput.value, { optional: true });
  const visibility = form.elements.visibility.value;
  const now = new Date().toISOString();

  return {
    id: randomId(),
    title,
    url,
    canonical_url: canonicalUrl,
    saved_at: now,
    state: stateInput.value,
    visibility,
    tags: normalizeTags(tagsInput.value),
    note: noteInput.value.trim(),
    archive_url: archiveUrl,
    archive_provider: archiveProvider(archiveUrl),
  };
}

function publicEntryPath(entry) {
  const stamp = entry.saved_at.replace(/\D/g, "").slice(0, 14);
  return `_data/reading/${stamp}-${entry.id}.json`;
}

function parseVault(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The encrypted vault is not valid JSON. It was not changed.");
  }
}

async function savePrivateEntry(client, password, entry) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const currentFile = await client.getFile(PRIVATE_VAULT_PATH, { allowMissing: true });
    let envelope;
    let sha;

    if (currentFile) {
      const currentEnvelope = parseVault(currentFile.text);
      envelope = await appendToVault(password, currentEnvelope, entry);
      sha = currentFile.sha;
    } else {
      envelope = await createVault(password, [entry]);
    }

    try {
      return await client.putFile(
        PRIVATE_VAULT_PATH,
        `${JSON.stringify(envelope, null, 2)}\n`,
        { message: "Update encrypted reading vault", sha },
      );
    } catch (error) {
      const createRace = !sha && error instanceof GitHubApiError && error.status === 422;
      const changedDuringSave = error instanceof GitHubApiError && error.status === 409;
      if ((!createRace && !changedDuringSave) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("The private vault kept changing. Try the save again.");
}

function showResult(result, visibility) {
  saveResult.replaceChildren();
  const message = document.createTextNode(
    visibility === "public"
      ? "Saved publicly. The reading page will update after GitHub Pages rebuilds. "
      : "Saved in the encrypted vault. This browser can read it immediately; the published encrypted copy may take a minute to update. ",
  );
  saveResult.append(message);

  if (result.commitUrl) {
    const link = document.createElement("a");
    link.href = result.commitUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "View commit";
    saveResult.append(link);
  }
}

function prefillFromFragment() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);

  titleInput.value = (params.get("title") || "").slice(0, 500);
  urlInput.value = params.get("url") || "";
  canonicalInput.value = params.get("canonical") || "";
  noteInput.value = (params.get("selection") || "").slice(0, 1000);
}

function updateArchiveLinks() {
  let url;
  try {
    url = safeHttpUrl(urlInput.value);
  } catch {
    findArchiveLink.href = "https://web.archive.org/";
    saveArchiveLink.href = "https://web.archive.org/";
    return;
  }

  const withoutFragment = new URL(url);
  withoutFragment.hash = "";
  findArchiveLink.href = `https://web.archive.org/web/*/${withoutFragment.href}`;
  saveArchiveLink.href = `https://web.archive.org/save/${withoutFragment.href}`;
}

function updateVisibility() {
  const isPrivate = form.elements.visibility.value === "private";
  privatePasswordField.hidden = !isPrivate;
}

form.addEventListener("change", (event) => {
  if (event.target.name === "visibility") updateVisibility();
});
urlInput.addEventListener("input", updateArchiveLinks);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveResult.replaceChildren();
  setStatus("", "");

  let entry;
  let token;
  try {
    entry = makeEntry();
    token = requireStoredToken();
  } catch (error) {
    setStatus(error.message, "error");
    return;
  }

  saveButton.disabled = true;
  setStatus(entry.visibility === "private" ? "Encrypting and saving…" : "Saving to GitHub…", "working");

  try {
    const client = createGitHubClient(token);
    let result;

    if (entry.visibility === "private") {
      const password = privatePasswordInput.value || getStoredPassword();
      if (!password) {
        privatePasswordInput.focus();
        throw new Error("Enter the vault password or remember it on the setup page.");
      }
      result = await savePrivateEntry(client, password, entry);
      privatePasswordInput.value = "";
    } else {
      result = await client.putFile(
        publicEntryPath(entry),
        `${JSON.stringify(entry, null, 2)}\n`,
        { message: `Save reading-list entry: ${entry.title.slice(0, 80)}` },
      );
    }

    setStatus("Article saved.", "success");
    showResult(result, entry.visibility);
  } catch (error) {
    setStatus(error.message || "The article could not be saved.", "error");
  } finally {
    saveButton.disabled = false;
  }
});

prefillFromFragment();
updateVisibility();
updateArchiveLinks();

try {
  setupNotice.hidden = Boolean(getStoredToken());
} catch (error) {
  setupNotice.hidden = false;
  setStatus(error.message, "error");
}
