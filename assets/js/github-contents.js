import {
  REPOSITORY_BRANCH,
  REPOSITORY_NAME,
  REPOSITORY_OWNER,
} from "./reading-config.js";

const API_ROOT = "https://api.github.com";

export class GitHubApiError extends Error {
  constructor(message, { status = 0, responseBody = null } = {}) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

function encodedPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function encodeBase64Utf8(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return window.btoa(binary);
}

function decodeBase64Utf8(value) {
  const binary = window.atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function friendlyApiMessage(status, body) {
  if (status === 401) return "GitHub rejected the token. Create a new token and update setup.";
  if (status === 403) return "The token cannot write this repository, or GitHub has rate-limited it.";
  if (status === 409) return "The file changed while it was being saved.";
  if (status === 422) return "GitHub rejected the file update. Check the token and repository settings.";
  return body?.message ? `GitHub: ${body.message}` : `GitHub request failed (${status}).`;
}

export function createGitHubClient(token) {
  const repositoryRoot = `${API_ROOT}/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/contents`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
  };

  async function request(url, options = {}) {
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });
    } catch (error) {
      throw new GitHubApiError("Could not reach GitHub. Check your connection and try again.", {
        responseBody: error,
      });
    }

    if (response.status === 204) return null;

    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new GitHubApiError(friendlyApiMessage(response.status, body), {
        status: response.status,
        responseBody: body,
      });
    }

    return body;
  }

  async function requestText(url, options = {}) {
    let response;

    try {
      response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });
    } catch (error) {
      throw new GitHubApiError("Could not reach GitHub. Check your connection and try again.", {
        responseBody: error,
      });
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new GitHubApiError(friendlyApiMessage(response.status, body), {
        status: response.status,
        responseBody: body,
      });
    }

    return response.text();
  }

  async function getFile(path, { allowMissing = false } = {}) {
    try {
      const url = `${repositoryRoot}/${encodedPath(path)}?ref=${encodeURIComponent(REPOSITORY_BRANCH)}`;
      const body = await request(url);

      if (!body || body.type !== "file" || typeof body.content !== "string") {
        throw new GitHubApiError(`GitHub did not return a file for ${path}.`);
      }

      // GitHub omits inline content once a file grows past 1 MB. Fetching the
      // same API URL with the raw media type keeps a single encrypted vault
      // readable without sending the token to a different host.
      const text = body.encoding === "none" && body.size > 0
        ? await requestText(url, {
          headers: { Accept: "application/vnd.github.raw+json" },
        })
        : decodeBase64Utf8(body.content);

      return {
        path,
        sha: body.sha,
        text,
        htmlUrl: body.html_url,
      };
    } catch (error) {
      if (allowMissing && error instanceof GitHubApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async function putFile(path, text, { message, sha } = {}) {
    const body = {
      message: message || `Update ${path}`,
      branch: REPOSITORY_BRANCH,
      content: encodeBase64Utf8(text),
    };

    if (sha) body.sha = sha;

    const result = await request(`${repositoryRoot}/${encodedPath(path)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return {
      commitUrl: result?.commit?.html_url || "",
      contentUrl: result?.content?.html_url || "",
      sha: result?.content?.sha || "",
    };
  }

  async function validateAccess() {
    const repository = await request(
      `${API_ROOT}/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}`,
    );

    if (repository?.permissions?.push !== true) {
      throw new GitHubApiError(
        "The token can read this repository but cannot write it. Give the token Contents: Read and write access.",
        { status: 403, responseBody: repository },
      );
    }

    await getFile("_config.yml");
    return repository;
  }

  return { getFile, putFile, validateAccess };
}
