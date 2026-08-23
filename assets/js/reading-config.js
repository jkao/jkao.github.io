export const REPOSITORY_OWNER = "jkao";
export const REPOSITORY_NAME = "jkao.github.io";
export const REPOSITORY_BRANCH = "master";
export const PRIVATE_VAULT_PATH = "assets/data/reading-private.json";

export const TOKEN_STORAGE_KEY = "jeff-reading.github-token.v1";
export const PASSWORD_STORAGE_KEY = "jeff-reading.vault-password.v1";

function readStorage(key) {
  try {
    return window.localStorage.getItem(key) || "";
  } catch (error) {
    throw new Error("Browser storage is unavailable. Allow local storage for jeffkao.ca and try again.", {
      cause: error,
    });
  }
}

function writeStorage(key, value) {
  try {
    if (value) {
      window.localStorage.setItem(key, value);
    } else {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    throw new Error("Browser storage is unavailable. Allow local storage for jeffkao.ca and try again.", {
      cause: error,
    });
  }
}

export function getStoredToken() {
  return readStorage(TOKEN_STORAGE_KEY);
}

export function getStoredPassword() {
  return readStorage(PASSWORD_STORAGE_KEY);
}

export function storeSettings({ token, password, rememberPassword }) {
  writeStorage(TOKEN_STORAGE_KEY, token.trim());
  writeStorage(PASSWORD_STORAGE_KEY, rememberPassword ? password : "");
}

export function clearStoredSettings() {
  writeStorage(TOKEN_STORAGE_KEY, "");
  writeStorage(PASSWORD_STORAGE_KEY, "");
}

export function requireStoredToken() {
  const token = getStoredToken();

  if (!token) {
    throw new Error("Set up your GitHub token before saving an article.");
  }

  return token;
}

export function bookmarkletCode() {
  const target = "https://jeffkao.ca/reading/add/";

  return `javascript:(()=>{const c=document.querySelector('link[rel~="canonical"]');const q=new URLSearchParams({url:location.href,title:document.title,canonical:c?.href||'',selection:String(getSelection()).slice(0,1000)});window.open('${target}#'+q,'_blank','noopener,noreferrer')})()`;
}
