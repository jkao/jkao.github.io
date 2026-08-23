import { createGitHubClient } from "./github-contents.js";
import {
  bookmarkletCode,
  clearStoredSettings,
  getStoredPassword,
  getStoredToken,
  PRIVATE_VAULT_PATH,
  storeSettings,
} from "./reading-config.js";
import { createVault, decryptVault, reencryptVault } from "./reading-crypto.js";

const form = document.querySelector("#setup-form");
const tokenInput = document.querySelector("#github-token");
const passwordInput = document.querySelector("#vault-password");
const passwordConfirmInput = document.querySelector("#vault-password-confirm");
const rememberPasswordInput = document.querySelector("#remember-password");
const saveButton = document.querySelector("#save-settings");
const forgetButton = document.querySelector("#forget-settings");
const setupStatus = document.querySelector("#setup-status");
const tokenSavedStatus = document.querySelector("#token-saved-status");
const bookmarkletLink = document.querySelector("#bookmarklet-link");
const bookmarkletTextarea = document.querySelector("#bookmarklet-code");
const copyButton = document.querySelector("#copy-bookmarklet");
const copyStatus = document.querySelector("#copy-status");

function setStatus(element, message, state = "") {
  element.textContent = message;
  element.dataset.state = state;
}

function refreshSavedStatus() {
  try {
    const hasToken = Boolean(getStoredToken());
    const hasPassword = Boolean(getStoredPassword());
    tokenSavedStatus.textContent = hasToken
      ? `A token is remembered${hasPassword ? ", along with the vault password" : ""}.`
      : "No token is remembered by this browser.";
  } catch (error) {
    setStatus(setupStatus, error.message, "error");
  }
}

function parseVault(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The existing private vault is not valid JSON. It was not changed.");
  }
}

async function initializeOrVerifyVault(client, password) {
  const currentFile = await client.getFile(PRIVATE_VAULT_PATH, { allowMissing: true });

  if (currentFile) {
    const currentVault = parseVault(currentFile.text);
    const payload = await decryptVault(password, currentVault);
    const refreshedVault = await reencryptVault(password, currentVault, payload.items);
    const result = await client.putFile(
      PRIVATE_VAULT_PATH,
      `${JSON.stringify(refreshedVault, null, 2)}\n`,
      {
        message: "Verify encrypted reading vault access",
        sha: currentFile.sha,
      },
    );
    return { initialized: false, commitUrl: result.commitUrl };
  }

  const vault = await createVault(password, []);
  const result = await client.putFile(
    PRIVATE_VAULT_PATH,
    `${JSON.stringify(vault, null, 2)}\n`,
    { message: "Initialize encrypted reading vault" },
  );

  return { initialized: true, commitUrl: result.commitUrl };
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus(setupStatus, "", "");

  let storedToken = "";
  let storedPassword = "";
  try {
    storedToken = getStoredToken();
    storedPassword = getStoredPassword();
  } catch (error) {
    setStatus(setupStatus, error.message, "error");
    return;
  }

  const token = tokenInput.value.trim() || storedToken;
  const enteredPassword = passwordInput.value;
  const password = enteredPassword || storedPassword;

  if (!token) {
    setStatus(setupStatus, "Enter a fine-grained GitHub token.", "error");
    tokenInput.focus();
    return;
  }

  if (!password) {
    setStatus(setupStatus, "Choose a vault password.", "error");
    passwordInput.focus();
    return;
  }

  if (enteredPassword && enteredPassword !== passwordConfirmInput.value) {
    setStatus(setupStatus, "The vault passwords do not match.", "error");
    passwordConfirmInput.focus();
    return;
  }

  saveButton.disabled = true;
  forgetButton.disabled = true;
  setStatus(setupStatus, "Testing the token and encrypted vault…", "working");

  try {
    const client = createGitHubClient(token);
    await client.validateAccess();
    const vaultResult = await initializeOrVerifyVault(client, password);

    storeSettings({
      token,
      password,
      rememberPassword: rememberPasswordInput.checked,
    });

    tokenInput.value = "";
    passwordInput.value = "";
    passwordConfirmInput.value = "";
    refreshSavedStatus();
    setStatus(
      setupStatus,
      vaultResult.initialized
        ? "Settings saved. The encrypted vault was created; GitHub Pages may take a minute to publish it."
        : "Settings saved. Token write access and the vault password were verified.",
      "success",
    );
  } catch (error) {
    setStatus(setupStatus, error.message || "Setup could not be completed.", "error");
  } finally {
    saveButton.disabled = false;
    forgetButton.disabled = false;
  }
});

forgetButton.addEventListener("click", () => {
  try {
    clearStoredSettings();
    tokenInput.value = "";
    passwordInput.value = "";
    passwordConfirmInput.value = "";
    refreshSavedStatus();
    setStatus(setupStatus, "This browser forgot the token and vault password. Remote reading data was not changed.", "success");
  } catch (error) {
    setStatus(setupStatus, error.message, "error");
  }
});

const code = bookmarkletCode();
bookmarkletLink.href = code;
bookmarkletTextarea.value = code;

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(code);
    setStatus(copyStatus, "Bookmarklet copied.", "success");
  } catch {
    bookmarkletTextarea.focus();
    bookmarkletTextarea.select();
    setStatus(copyStatus, "Clipboard access was blocked. The code is selected; copy it manually.", "error");
  }
});

refreshSavedStatus();
