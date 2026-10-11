// Builds the GitHub Pages site in docs/ from lessons/*.md.
// Usage: npm run site

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";

const REPO = "https://github.com/georgehanu/the-agent-loop";
const X = "https://x.com/georgehanu";
const SITE = "https://georgehanu.github.io/the-agent-loop/";
// The share image is built by the hub (georgehanu.github.io, scripts/og.mjs) from its guide
// data, so every guide's link preview uses the same template. The index and every lesson use it.
const OG_IMAGE = "https://georgehanu.github.io/og/guides/the-agent-loop.png";
const OG_IMAGE_ALT =
  "The Agent Loop: Build a mini coding agent in TypeScript and understand how the loop works. Coding with AI, by George Hanu.";
const root = new URL("../", import.meta.url);
const out = new URL("docs/", root);
mkdirSync(out, { recursive: true });

const marked = new Marked(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext";
      return hljs.highlight(code, { language }).value;
    },
  }),
);

// ── read the lessons ─────────────────────────────────────────────────────────
const lessons = readdirSync(new URL("lessons/", root))
  .filter((file) => file.endsWith(".md"))
  .sort()
  .map((file) => {
    const raw = readFileSync(new URL(`lessons/${file}`, root), "utf8");
    const [, front, body] = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const meta = Object.fromEntries(
      front.split("\n").map((line) => {
        const [key, ...rest] = line.split(":");
        return [key.trim(), rest.join(":").trim().replace(/^"|"$/g, "")];
      }),
    );
    return { file, slug: file.replace(/\.md$/, ""), ...meta, body };
  });

const summaries = {
  1: "Tool calling with no tools API. Just a prompt and an if.",
  2: "Schemas, tool_use, tool_result, and where one round runs out.",
  3: "Let the model take as many rounds as it needs.",
  4: "The checklist trick from coding agents, in one tool.",
  5: "Sandboxed paths, recoverable errors, approvals, limits.",
  6: "All of it together, fixing a real failing test.",
  7: "Workflows vs agents, and a 4-question checklist.",
};

// Links that work on GitHub need rewriting for the site.
function rewriteLinks(html) {
  return html
    .replace(/href="(\d\d-[a-z-]+)\.md"/g, 'href="$1.html"')
    .replace(/href="\.\.\/(src|playground)\/([^"]*)"/g, `href="${REPO}/blob/main/$1/$2"`);
}

const label = (lesson) => (lesson.lesson === "7" ? "Epilogue" : `Lesson ${lesson.lesson}`);

// ── page shell ───────────────────────────────────────────────────────────────
const attr = (text) => String(text).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function page({ title, description, body, current }) {
  const url = current === "index" ? SITE : `${SITE}${current}.html`;
  const social = `<meta property="og:type" content="website">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${attr(OG_IMAGE_ALT)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:creator" content="@georgehanu">
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="twitter:image" content="${OG_IMAGE}">
<meta name="twitter:image:alt" content="${attr(OG_IMAGE_ALT)}">`;
  const nav = lessons
    .map(
      (l) =>
        `<a href="${l.slug}.html"${l.slug === current ? ' aria-current="page"' : ""}><span>${
          l.lesson === "7" ? "+" : l.lesson
        }</span>${l.title}</a>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
${social}
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>↻</text></svg>">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
</head>
<body>
<header class="top">
  <a class="brand" href="index.html"><span class="loop">↻</span> The Agent Loop</a>
  <nav class="top-links">
    <a href="${REPO}">GitHub</a>
    <a class="follow" href="${X}">Follow @georgehanu</a>
  </nav>
</header>
${current === "index" ? body : `<div class="layout">
  <aside class="side"><div class="side-title">Lessons</div>${nav}</aside>
  <main class="lesson">${body}</main>
</div>`}
<footer class="foot">
  <p>Written by <a href="${X}">George Hanu</a>. I teach developers to build software with AI: small examples, explained clearly.</p>
  <p><a href="${X}">Follow on X</a> · <a href="${REPO}">Source on GitHub</a> · MIT licensed</p>
</footer>
</body>
</html>
`;
}

// ── lesson pages ─────────────────────────────────────────────────────────────
lessons.forEach((lesson, i) => {
  const prev = lessons[i - 1];
  const next = lessons[i + 1];
  const meta =
    lesson.run || lesson.code
      ? `<div class="meta">${lesson.run ? `<span>Run</span><code>${lesson.run}</code>` : ""}${
          lesson.code ? `<a href="${REPO}/blob/main/${lesson.code}">View the code →</a>` : ""
        }</div>`
      : "";
  const pager = `<nav class="pager">${
    prev ? `<a href="${prev.slug}.html"><small>← ${label(prev)}</small>${prev.title}</a>` : "<span></span>"
  }${next ? `<a class="next" href="${next.slug}.html"><small>${label(next)} →</small>${next.title}</a>` : ""}</nav>`;
  const cta = `<aside class="cta"><strong>Found this useful?</strong> I post small, practical AI coding examples most days.
  <a href="${X}">Follow @georgehanu on X</a></aside>`;

  const body = `${meta}${rewriteLinks(marked.parse(lesson.body))}${cta}${pager}`;
  writeFileSync(
    new URL(`${lesson.slug}.html`, out),
    page({
      title: `${label(lesson)}: ${lesson.title} · The Agent Loop`,
      description: `${lesson.title}. Part of The Agent Loop: build a mini coding agent in TypeScript, no framework.`,
      body,
      current: lesson.slug,
    }),
  );
});

// ── home page ────────────────────────────────────────────────────────────────
const cards = lessons
  .map(
    (l) => `<a class="card" href="${l.slug}.html">
      <span class="num">${l.lesson === "7" ? "+" : l.lesson}</span>
      <span class="card-title">${l.title}</span>
      <span class="card-sub">${summaries[l.lesson] ?? ""}</span>
    </a>`,
  )
  .join("\n");

const home = `
<main class="home">
  <section class="hero">
    <p class="eyebrow">Free · 6 lessons · TypeScript · No framework</p>
    <h1>You use coding agents every day.<br><em>Build one.</em></h1>
    <p class="lead">Six short lessons that take you from a single model call to a small coding agent that plans,
      reads your code, asks before it edits, and checks its work with your tests. The loop and its tools come to about 250 lines.</p>
    <div class="actions">
      <a class="btn primary" href="${lessons[0].slug}.html">Start lesson 1</a>
      <a class="btn" href="${REPO}">Get the code</a>
    </div>
  </section>

  <section class="terminal" aria-label="Example run">
    <div class="bar"><i></i><i></i><i></i><span>npm run agent</span></div>
<pre><span class="t-you">you</span>    The tests are failing. Find out why and fix it.

<span class="t-dim">── turn 1 ──────────────────────────────</span>
   <span class="t-yel">◐</span> Run the tests and find the failure
   <span class="t-dim">○</span> Read the code under test
   <span class="t-dim">○</span> Fix the bug
   <span class="t-dim">○</span> Run the tests again
<span class="t-dim">── turn 2 ──────────────────────────────</span>
<span class="t-cyan">tool →</span> run_tests()
<span class="t-green">tool ←</span> <span class="t-dim">5 pass, 1 fail: "shipping is free at exactly 50.00"</span>
<span class="t-dim">── turn 4 ──────────────────────────────</span>
<span class="t-mag">model</span>  The test is right and the code is wrong.
<span class="t-cyan">tool →</span> edit_file(src/cart.js)
<span class="t-red">       - return subtotal(items) &gt; FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;</span>
<span class="t-green">       + return subtotal(items) &gt;= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;</span>
<span class="t-yel">       Allow edit_file on src/cart.js? [y/N]</span> y
<span class="t-dim">── turn 5 ──────────────────────────────</span>
<span class="t-cyan">tool →</span> run_tests()
<span class="t-green">tool ←</span> <span class="t-dim">6 pass</span></pre>
  </section>

  <section class="points">
    <div><h3>No API key to start</h3><p>Every lesson runs in replay mode with pre-written model replies. The loop, the tools and the tests are real. Add a key to run it live against Claude.</p></div>
    <div><h3>No framework</h3><p>Just the official Anthropic SDK and a <code>while</code> loop. Once you know what frameworks do for you, picking one gets much easier.</p></div>
    <div><h3>Safe by default</h3><p>The agent works on a throwaway copy, can't leave the project folder, and asks you before every edit.</p></div>
  </section>

  <section>
    <h2>The lessons</h2>
    <div class="cards">${cards}</div>
  </section>

  <section class="start">
    <h2>Run it in a minute</h2>
<pre><code>git clone ${REPO}.git
cd the-agent-loop
npm install
npm run lesson1</code></pre>
    <p>Node.js 20 or newer. That's it.</p>
  </section>

  <section class="author">
    <div>
      <h2>Hi, I'm George.</h2>
      <p>I'm a senior web developer. I teach developers to build software with AI, from useful scripts to app features.
        Small examples, explained clearly. If this helped, the best thanks is a follow, and tell me what you built.</p>
      <a class="btn primary" href="${X}">Follow @georgehanu on X</a>
    </div>
  </section>
</main>`;

writeFileSync(
  new URL("index.html", out),
  page({
    title: "The Agent Loop · Build a mini coding agent in TypeScript",
    description:
      "Six short lessons: build a small coding agent in TypeScript with no framework. Runs without an API key. By George Hanu.",
    body: home,
    current: "index",
  }),
);

writeFileSync(new URL(".nojekyll", out), "");
writeFileSync(new URL("style.css", out), readFileSync(new URL("scripts/site.css", root), "utf8"));
console.log(`Built ${lessons.length + 1} pages in docs/`);
