import { createGitHubClient, GitHubApiError } from "./github-contents.js";
import {
  getStoredPassword,
  getStoredToken,
  PRIVATE_VAULT_PATH,
} from "./reading-config.js";
import { decryptVault } from "./reading-crypto.js";

const form = document.querySelector("#unlock-form");
const passwordInput = document.querySelector("#unlock-password");
const unlockButton = document.querySelector("#unlock-vault");
const lockButton = document.querySelector("#lock-vault");
const status = document.querySelector("#unlock-status");
const privateList = document.querySelector("#private-reading-list");

function setStatus(message, state = "") {
  status.textContent = message;
  status.dataset.state = state;
}

function parseVault(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The encrypted vault is not valid JSON.");
  }
}

async function loadPublishedVault() {
  const response = await fetch(`/${PRIVATE_VAULT_PATH}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("The encrypted vault could not be downloaded.");
  return parseVault(await response.text());
}

function canUsePublishedFallback(error) {
  return error instanceof GitHubApiError && (
    error.status === 0 ||
    error.status === 401 ||
    error.status === 403 ||
    error.status === 429 ||
    error.status >= 500
  );
}

async function loadVault() {
  let token = "";
  try {
    token = getStoredToken();
  } catch {
    // The public vault asset remains available when local storage is disabled.
  }

  if (token) {
    try {
      const current = await createGitHubClient(token).getFile(PRIVATE_VAULT_PATH, {
        allowMissing: true,
      });
      return {
        envelope: current ? parseVault(current.text) : null,
        source: "github",
      };
    } catch (error) {
      if (!canUsePublishedFallback(error)) throw error;
      return {
        envelope: await loadPublishedVault(),
        source: "published-fallback",
      };
    }
  }

  return {
    envelope: await loadPublishedVault(),
    source: "published",
  };
}

function safeHttpUrl(value) {
  if (typeof value !== "string") return "";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function element(name, className = "", text = "") {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function externalLink(label, href) {
  const link = element("a", "", label);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
}

function readableDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "Unknown date";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function renderItems(items) {
  privateList.replaceChildren();

  const validItems = items
    .filter((item) => item && typeof item === "object" && safeHttpUrl(item.url))
    .sort((left, right) => String(right.saved_at || "").localeCompare(String(left.saved_at || "")));

  if (validItems.length === 0) {
    privateList.append(element("p", "empty-state", "No private articles saved yet."));
    privateList.hidden = false;
    return 0;
  }

  const list = element("ol", "reading-list");
  for (const item of validItems) {
    const listItem = element("li", "reading-item");
    const article = document.createElement("article");
    const headingRow = element("div", "reading-item__heading");
    const heading = document.createElement("h3");
    const originalUrl = safeHttpUrl(item.url);
    const canonicalUrl = safeHttpUrl(item.canonical_url);
    heading.append(externalLink(String(item.title || "Untitled article"), canonicalUrl || originalUrl));
    headingRow.append(heading, element("span", "reading-state", String(item.state || "unread")));

    const meta = element("p", "reading-meta");
    const time = document.createElement("time");
    time.dateTime = String(item.saved_at || "");
    time.textContent = `Saved ${readableDate(item.saved_at)}`;
    meta.append(time);
    if (Array.isArray(item.tags) && item.tags.length > 0) {
      meta.append(document.createTextNode(" · "), document.createTextNode(item.tags.join(", ")));
    }

    article.append(headingRow, meta);
    if (typeof item.note === "string" && item.note) {
      article.append(element("p", "reading-note", item.note));
    }

    const links = element("div", "reading-links");
    links.append(externalLink("Original", originalUrl));
    if (canonicalUrl && canonicalUrl !== originalUrl) {
      links.append(externalLink("Canonical", canonicalUrl));
    }
    const archiveUrl = safeHttpUrl(item.archive_url);
    if (archiveUrl) links.append(externalLink("Archived copy", archiveUrl));
    article.append(links);
    listItem.append(article);
    list.append(listItem);
  }

  privateList.append(list);
  privateList.hidden = false;
  return validItems.length;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  let rememberedPassword = "";
  try {
    rememberedPassword = getStoredPassword();
  } catch {
    // The typed password still works when local storage is unavailable.
  }
  const password = passwordInput.value || rememberedPassword;

  if (!password) {
    setStatus("Enter the vault password.", "error");
    passwordInput.focus();
    return;
  }

  unlockButton.disabled = true;
  setStatus("Unlocking…", "working");

  try {
    const loaded = await loadVault();
    if (!loaded.envelope) {
      privateList.replaceChildren(element("p", "empty-state", "No encrypted vault exists yet. Complete setup to create it."));
      privateList.hidden = false;
      lockButton.hidden = false;
      setStatus("No vault found.", "success");
      return;
    }

    const payload = await decryptVault(password, loaded.envelope);
    const count = renderItems(payload.items);
    passwordInput.value = "";
    lockButton.hidden = false;
    const publishedNote = loaded.source === "github"
      ? ""
      : " from the published copy, which can lag recent saves";
    setStatus(
      `Unlocked ${count} private ${count === 1 ? "article" : "articles"}${publishedNote}.`,
      "success",
    );
  } catch (error) {
    privateList.replaceChildren();
    privateList.hidden = true;
    lockButton.hidden = true;
    setStatus(error.message || "The vault could not be unlocked.", "error");
  } finally {
    unlockButton.disabled = false;
  }
});

lockButton.addEventListener("click", () => {
  privateList.replaceChildren();
  privateList.hidden = true;
  lockButton.hidden = true;
  passwordInput.value = "";
  setStatus("Private articles locked.", "success");
});
