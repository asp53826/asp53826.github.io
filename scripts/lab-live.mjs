// Snapshot of recent GitHub activity for /lab/'s shipping log, written at
// build time so the page never calls the API from a visitor's browser.
// Usage: node scripts/lab-live.mjs <out.json>   (GH_TOKEN optional, raises the rate limit)
// LAB_REPOS=a,b,c limits the snapshot to those repositories.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const USER = process.env.LAB_USER || 'asp53826';
const OUT = process.argv[2] || 'dist/lab/data/live.json';
const DAYS = 26 * 7, MAX_REPOS = 24, SKIP = new Set([`${USER}.github.io`]);
const since = new Date(Date.now() - DAYS * 864e5);

async function gh(path) {
  const res = await fetch('https://api.github.com' + path, {
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'lab-live',
      ...(process.env.GH_TOKEN ? { authorization: 'Bearer ' + process.env.GH_TOKEN } : {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function listRepos() {
  if (process.env.LAB_REPOS) {
    return Promise.all(process.env.LAB_REPOS.split(',').map((r) => gh(`/repos/${r.includes('/') ? r : USER + '/' + r}`)));
  }
  const all = await gh(`/users/${USER}/repos?type=owner&sort=pushed&per_page=100`);
  return all.filter((r) => !r.fork && !r.archived && !SKIP.has(r.name));
}

async function commitsSince(repo) {
  const out = [];
  for (let page = 1; page <= 3; page++) {
    const batch = await gh(`/repos/${repo.full_name}/commits?since=${since.toISOString()}&per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

async function latestRun(repo) {
  const r = await gh(`/repos/${repo.full_name}/actions/runs?branch=${encodeURIComponent(repo.default_branch)}&per_page=1&exclude_pull_requests=true`);
  const run = r.workflow_runs?.[0];
  return run ? { name: run.name, status: run.status, conclusion: run.conclusion, url: run.html_url, at: run.updated_at } : null;
}

const repos = (await listRepos()).filter((r) => new Date(r.pushed_at) >= since).slice(0, MAX_REPOS);
const perDay = new Map(), recent = [], rows = [];
for (const repo of repos) {
  try {
    const [commits, ci] = await Promise.all([commitsSince(repo), latestRun(repo).catch(() => null)]);
    for (const c of commits) {
      const at = c.commit.author?.date || c.commit.committer?.date; if (!at) continue;
      const d = at.slice(0, 10); perDay.set(d, (perDay.get(d) || 0) + 1);
      recent.push({ repo: repo.name, sha: c.sha.slice(0, 7), msg: c.commit.message.split('\n')[0].slice(0, 120), at, url: c.html_url });
    }
    rows.push({ name: repo.name, url: repo.html_url, description: repo.description, language: repo.language, pushed_at: repo.pushed_at, commits: commits.length, ci });
  } catch (e) {
    console.warn('lab-live: skipping', repo.full_name, e.message);
  }
}

const days = [];
for (let i = DAYS - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10); days.push([d, perDay.get(d) || 0]); }
recent.sort((a, b) => b.at.localeCompare(a.at));
rows.sort((a, b) => b.pushed_at.localeCompare(a.pushed_at));

const snapshot = { generated: new Date().toISOString(), user: USER, days, repos: rows, recent: recent.slice(0, 10) };
await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify(snapshot));
console.log(`lab-live: ${rows.length} repos, ${recent.length} commits in ${DAYS} days → ${OUT}`);
