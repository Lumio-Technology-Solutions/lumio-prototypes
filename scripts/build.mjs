#!/usr/bin/env node
// Encrypts every page from src/ into the published site.
//
// Usage: node scripts/build.mjs
//
// Reads src/config.json for passwords (src/ is git-ignored, never commit it).
// - src/prototypes.html        -> embedded in index.html (index password)
// - src/<project dir>/*.html   -> <project dir>/*.html as a sign-in page (project password)
//
// Pages are encrypted with AES-256-GCM using a PBKDF2-SHA256 key. Each project
// shares one salt, so one sign-in unlocks all of its pages for the browser tab.

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src');
const ITERATIONS = 600000;
const PAYLOAD_START = '<script type="application/json" id="payload">';
const PAYLOAD_END = '</script>';

const b64 = bytes => Buffer.from(bytes).toString('base64');

async function makeKey(password, salt) {
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

async function encrypt(key, salt, plaintext, extra = {}) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext));
  return JSON.stringify({ v: 1, ...extra, iterations: ITERATIONS, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(data)) });
}

const config = JSON.parse(await readFile(path.join(SRC, 'config.json'), 'utf8'));
const lockPage = await readFile(path.join(ROOT, 'scripts/lock-page.html'), 'utf8');

// Root index
{
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await makeKey(config.index.password, salt);
  const payload = await encrypt(key, salt, await readFile(path.join(SRC, 'prototypes.html'), 'utf8'));
  const target = path.join(ROOT, 'index.html');
  const html = await readFile(target, 'utf8');
  const from = html.indexOf(PAYLOAD_START);
  const to = html.indexOf(PAYLOAD_END, from);
  if (from === -1 || to === -1) throw new Error(`Could not find ${PAYLOAD_START} in index.html`);
  await writeFile(target, html.slice(0, from + PAYLOAD_START.length) + payload + html.slice(to));
  console.log('index.html');
}

// Prototypes
for (const project of config.projects) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await makeKey(project.password, salt);
  const pages = (await readdir(path.join(SRC, project.dir))).filter(f => f.endsWith('.html'));
  for (const page of pages) {
    const source = await readFile(path.join(SRC, project.dir, page), 'utf8');
    const payload = await encrypt(key, salt, source, { project: project.dir });
    const html = lockPage.replaceAll('{{NAME}}', project.name).replace('{{PAYLOAD}}', () => payload);
    await writeFile(path.join(ROOT, project.dir, page), html);
    console.log(path.join(project.dir, page));
  }
}
