/* ============================================================
   SANCTUARY — purge media binaries from ALL git history
   ------------------------------------------------------------
   WHY: the repo contains assets/img/* + assets/audio/* in its
   history (commit 4879424). A public repo would expose every
   photo/MP3 forever — deletion in a new commit is NOT enough.

   WHAT: rewrites every commit so no media binary under assets/
   exists anywhere in history. Code, docs and everything else
   are untouched. History SHAs change (that's the point).

   HOW: `git fast-export --all` → byte-safe protocol parser →
   `git fast-import`. The parser copies `data <n>` blob blocks
   through as raw bytes (a naive line-based pass would corrupt
   binary blobs); it only drops the ASCII `M … <path>` file
   entries whose path matches the kill-list.

   BEFORE: backups already exist outside the repo:
     love-backup-*.bundle · love-backup-*-worktree.tar.gz
   Verify with: git bundle verify ../love-backup-*.bundle

   AFTER (printed again at the end):
     git push --force origin <branch>
     then re-clone on every other machine.
   ============================================================ */
import { spawn, spawnSync } from "node:child_process";

// ANY media binary anywhere in history (repo had root-level files in early
// commits AND assets/img|audio later; no legit media lives anywhere else)
const KILL_RE = /\.(jpe?g|png|webp|gif|mp3|wav|m4a)$/i;

function git(args, opts = {}) {
  const r = spawnSync("git", args, { encoding: "utf8", ...opts });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} → exit ${r.status}\n${r.stderr}`);
  return r.stdout;
}

const branch = git(["branch", "--show-current"]).trim();
if (!branch) { console.error("✗ detached HEAD — checkout a branch first"); process.exit(1); }
const dirty = git(["status", "--porcelain"]).trim();
if (dirty) { console.error("✗ working tree dirty — commit or stash first"); process.exit(1); }

// sanity: old history still has the binaries
const inHistory = git(["log", "--all", "--oneline", "--", "assets/img", "assets/audio"]).trim();
console.log(`• branch '${branch}' · media commits in current history: ${inHistory ? inHistory.split("\n").length : 0}`);

console.log("→ streaming fast-export…");
const ex = spawn("git", ["fast-export", "--all"], { cwd: process.cwd() });
const parts = []; // Buffer chunks
ex.stdout.on("data", d => parts.push(d));
ex.stderr.on("data", d => process.stderr.write(d));

ex.on("close", code => {
  if (code !== 0) { console.error("✗ fast-export failed"); process.exit(1); }
  const src = Buffer.concat(parts);

  // ---- byte-safe transform ----
  const out = [];
  let p = 0, stripped = 0, blobs = 0;
  function findLine(end) {
    const i = src.indexOf(0x0a, p); // \n
    return i === -1 || i > end ? end : i;
  }
  while (p < src.length) {
    const nl = findLine(src.length);
    const line = src.slice(p, nl);
    const text = line.toString("latin1"); // byte-preserving for ASCII protocol lines

    if (text.startsWith("data ")) {
      const n = parseInt(text.slice(5).trim(), 10);
      blobs++;
      const bodyStart = nl + 1, bodyEnd = bodyStart + n;
      out.push(line, Buffer.from([0x0a]), src.slice(bodyStart, bodyEnd));
      p = bodyEnd;
      // fast-import tolerates a missing trailing newline after blob data,
      // fast-export always writes one — keep it if present
      if (src[p] === 0x0a) { out.push(Buffer.from([0x0a])); p++; }
      continue;
    }
    if (text.startsWith("M ")) {
      const pathToken = text.slice(text.lastIndexOf(" ") + 1);
      if (KILL_RE.test(pathToken)) { stripped++; p = nl + 1; continue; }
    }
    out.push(line, Buffer.from([0x0a]));
    p = nl + 1;
  }

  console.log(`• parsed ${blobs} blob(s); stripped ${stripped} media file entr${stripped === 1 ? "y" : "ies"} from history`);
  if (stripped === 0) { console.log("nothing to strip — aborting without changes"); process.exit(0); }

  // ---- fast-import the cleaned stream ----
  const imp = spawn("git", ["fast-import", "--force", "--quiet"], { cwd: process.cwd() });
  imp.stdin.write(Buffer.concat(out));
  imp.stdin.end();
  imp.on("close", code2 => {
    if (code2 !== 0) { console.error("✗ fast-import FAILED — repo may need restore from backup bundle"); process.exit(1); }
    spawnSync("git", ["reset", "--hard", branch]);
    console.log("✓ history rewritten");
    console.log("\n--- verify locally (expect NO output from both) ---");
    console.log("git log --all --oneline -- assets/img assets/audio");
    console.log("git rev-list --all --objects | grep -Ei '\\.(jpg|jpeg|png|webp|gif|mp3|wav|m4a)$'");
    console.log("\n--- then make it permanent ---");
    console.log(`git push --force origin ${branch}`);
    console.log("git reflog expire --expire=now --all && git gc --prune=now --aggressive");
    console.log("(re-clone on any other machine — old clones still hold the blobs)");
  });
});
