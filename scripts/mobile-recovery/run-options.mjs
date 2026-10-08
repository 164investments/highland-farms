import { accessSync, constants, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';

/** Use only the caller's explicit existing browser, or Playwright's normal selection. */
export async function launchReviewBrowser(chromium) {
  if (process.env.CODEX_SANDBOX) throw new Error('Refusing browser launch under CODEX_SANDBOX. Run in an unsandboxed execution context.');
  const executablePath = process.env.HF_REVIEW_BROWSER_EXECUTABLE;
  if (executablePath !== undefined) {
    if (!path.isAbsolute(executablePath)) throw new Error('HF_REVIEW_BROWSER_EXECUTABLE must be an absolute path to an existing executable file.');
    if (!existsSync(executablePath) || !statSync(executablePath).isFile()) throw new Error('HF_REVIEW_BROWSER_EXECUTABLE does not identify an existing file.');
    accessSync(executablePath, constants.X_OK);
    return chromium.launch({ executablePath });
  }
  return chromium.launch().catch(() => chromium.launch({ channel: 'chromium' }));
}

/** Explicit existing server and new evidence directory; never starts a server. */
export function prepareRun(script, args = process.argv.slice(2)) {
  if (process.env.CODEX_SANDBOX) throw new Error('Refusing browser launch under CODEX_SANDBOX. Run in an unsandboxed execution context.');
  const [baseArg, outArg] = args;
  if (!baseArg || !outArg || args.length !== 2) throw new Error(`Usage: node scripts/mobile-recovery/${script} BASE_URL NEW_OUTPUT_DIRECTORY`);
  const url = new URL(baseArg);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTP(S) base URL without credentials, query or fragment.');
  }
  const out = path.resolve(outArg);
  if (existsSync(out)) throw new Error('Refusing to overwrite evidence: output directory already exists. Supply a fresh path.');
  mkdirSync(out, { recursive: true });
  return { base: url.href, out };
}
