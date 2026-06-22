#!/usr/bin/env node
// Fetch the Claude Code native binary and place it where Tauri picks it up as a
// bundled sidecar (`externalBin`). This is what lets the app ship Claude Code
// inside it — no install step, no runtime download for the user.
//
// Usage:
//   node scripts/fetch-claude.mjs                      # host platform → binaries/claude-<host-triple>
//   node scripts/fetch-claude.mjs --platform darwin-arm64 --out /tmp/claude-arm64
//
// The pinned version lives in src-tauri/claude-code-version (single source of
// truth, shared with CI). Bump that file + cut a Bunshin release to upgrade.
//
// Set BUNSHIN_SKIP_CLAUDE_FETCH=1 to make the no-arg (host) invocation a no-op —
// CI uses this because it downloads/lipos the binaries in an explicit step.

import { createHash } from 'node:crypto'
import {
  mkdirSync,
  writeFileSync,
  chmodSync,
  existsSync,
  readFileSync,
  createWriteStream,
  renameSync,
  rmSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { arch, platform } from 'node:os'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const BASE = 'https://downloads.claude.ai/claude-code-releases'
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// Claude Code platform id  ->  Rust target triple Tauri expects in the file name.
const TRIPLE = {
  'darwin-arm64': 'aarch64-apple-darwin',
  'darwin-x64': 'x86_64-apple-darwin',
  'win32-x64': 'x86_64-pc-windows-msvc',
  'win32-arm64': 'aarch64-pc-windows-msvc',
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
}

function hostPlatform() {
  const a = arch() === 'arm64' ? 'arm64' : 'x64'
  const p = platform()
  if (p === 'darwin') return `darwin-${a}`
  if (p === 'win32') return `win32-${a}`
  if (p === 'linux') return `linux-${a}`
  throw new Error(`unsupported host platform: ${p}`)
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform') out.platform = args[++i]
    else if (args[i] === '--out') out.out = args[++i]
  }
  return out
}

async function fetchBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

// Stream a (large) download to disk while computing its sha256, so we never hold
// the ~210MB binary in memory. Returns the hex digest.
async function downloadToFile(url, dest) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}`)
  const hash = createHash('sha256')
  const tmp = `${dest}.partial`
  const body = Readable.fromWeb(res.body)
  body.on('data', (chunk) => hash.update(chunk))
  await pipeline(body, createWriteStream(tmp))
  return { digest: hash.digest('hex'), tmp }
}

async function main() {
  const { platform: plat, out } = parseArgs()
  const isHostInvocation = !plat

  if (isHostInvocation && process.env.BUNSHIN_SKIP_CLAUDE_FETCH === '1') {
    console.log('[fetch-claude] BUNSHIN_SKIP_CLAUDE_FETCH=1 — skipping')
    return
  }

  const claudePlatform = plat || hostPlatform()
  const triple = TRIPLE[claudePlatform]
  if (!triple) throw new Error(`no target triple mapping for ${claudePlatform}`)

  const version = readFileSync(join(ROOT, 'src-tauri', 'claude-code-version'), 'utf8').trim()
  const isWindows = claudePlatform.startsWith('win32')
  const remoteName = isWindows ? 'claude.exe' : 'claude'

  const outPath = out
    ? resolve(out)
    : join(ROOT, 'src-tauri', 'binaries', `claude-${triple}${isWindows ? '.exe' : ''}`)

  // Verify the pinned version against any binary already on disk; skip the
  // ~210MB download when it's already the right one.
  const stamp = `${outPath}.version`
  if (existsSync(outPath) && existsSync(stamp) && readFileSync(stamp, 'utf8').trim() === version) {
    console.log(`[fetch-claude] ${claudePlatform} v${version} already present → ${outPath}`)
    return
  }

  console.log(`[fetch-claude] downloading Claude Code v${version} (${claudePlatform})…`)
  const manifest = JSON.parse(await fetchBuffer(`${BASE}/${version}/manifest.json`))
  const entry = manifest.platforms?.[claudePlatform]
  if (!entry) throw new Error(`manifest has no platform ${claudePlatform} for v${version}`)

  mkdirSync(dirname(outPath), { recursive: true })
  const { digest, tmp } = await downloadToFile(`${BASE}/${version}/${claudePlatform}/${remoteName}`, outPath)
  if (digest !== entry.checksum) {
    rmSync(tmp, { force: true })
    throw new Error(`checksum mismatch for ${claudePlatform}: got ${digest}, expected ${entry.checksum}`)
  }

  renameSync(tmp, outPath)
  if (!isWindows) chmodSync(outPath, 0o755)
  writeFileSync(stamp, version)
  console.log(`[fetch-claude] ✓ ${outPath} (${(entry.size / 1048576).toFixed(0)} MB, sha256 ok)`)
}

main().catch((err) => {
  console.error(`[fetch-claude] ${err.message}`)
  process.exit(1)
})
