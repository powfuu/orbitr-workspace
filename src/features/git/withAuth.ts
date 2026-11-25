import { remoteService } from "../../services/git";
import { askCredentials } from "../../components/git/CredentialsDialog";

const AUTH = /could not read (password|username)|terminal prompts disabled|authentication failed|invalid username or password|access denied/i;

/**
 * Runs a git network operation; if it fails for lack of credentials, asks for them (in-app),
 * saves them in the keychain via git's credential helper and tries once more.
 */
export async function withAuth<T>(repo: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (!AUTH.test(String(e))) throw e;
    const remotes = await remoteService.list(repo).catch(() => []);
    const remote = remotes.find((r) => r.name === "origin" && /^https?:\/\//.test(r.url)) ?? remotes.find((r) => /^https?:\/\//.test(r.url));
    if (!remote) throw e;
    const authority = remote.url.replace(/^https?:\/\//, "").split("/")[0] ?? "";
    const host = authority.split("@").pop() ?? authority;
    const user = authority.includes("@") ? authority.split("@")[0]!.split(":")[0]! : "";
    const creds = await askCredentials(host, user);
    if (!creds) throw new Error("Sign-in cancelled.");
    await remoteService.storeCredential(repo, remote.url, creds.username, creds.password);
    return await fn();
  }
}
