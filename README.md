<div align="center">

<img src="./assets/hero-banner.svg" alt="RepoMap Banner" width="100%" />

<br/><br/>

<a href="https://github.com/AtharvDoiphode/Repomap">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=19&pause=1800&color=10B981&center=true&vCenter=true&width=620&lines=Zero-Config+GitHub+Architecture+Telemetry;Single-Call+Tree+Traversal+%7C+95%25+Fewer+API+Calls;DFS+Circular+Dependency+Detection;Interactive+React+Flow+Canvas+%2B+Mermaid.js+Export" alt="RepoMap Typing SVG" />
</a>

<br/>

<!-- Prominent Live Production Action Badges -->
<p align="center">
  <a href="https://repomap-eta.vercel.app">
    <img src="https://img.shields.io/badge/LIVE_DEMO-repomap--eta.vercel.app-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  &nbsp;
  <a href="https://repomap-eta.vercel.app/?repo=AtharvDoiphode/Repomap">
    <img src="https://repomap-qut7.onrender.com/api/badge/AtharvDoiphode/Repomap" alt="RepoMap Arch Score" height="28" />
  </a>
</p>

<p align="center">
  <b>Instant GitHub module dependency visualizer, architecture health audit engine, and native Mermaid.js diagram generator for your project README.</b>
</p>

<!-- Flat Square Stack Badges -->
<p align="center">
  <img src="https://img.shields.io/badge/React_19-09090b?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite_6-09090b?style=for-the-badge&logo=vite&logoColor=646CFF" alt="Vite 6" />
  <img src="https://img.shields.io/badge/Node.js-09090b?style=for-the-badge&logo=node.js&logoColor=339933" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-09090b?style=for-the-badge&logo=express&logoColor=ffffff" alt="Express" />
  <img src="https://img.shields.io/badge/MongoDB-09090b?style=for-the-badge&logo=mongodb&logoColor=47A248" alt="MongoDB" />
  <img src="https://img.shields.io/badge/@xyflow/react-09090b?style=for-the-badge&logo=reacttable&logoColor=FF4154" alt="React Flow" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-09090b?style=for-the-badge&logo=tailwindcss&logoColor=38BDF8" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Framer_Motion-09090b?style=for-the-badge&logo=framer&logoColor=0055FF" alt="Framer Motion" />
</p>

</div>

---

## ⚡ Key Engineering Highlights

### 1. Single-Call Tree Traversal (95% Fewer API Calls)
Traditional code visualizers make 50+ recursive REST calls, quickly depleting GitHub's 60 req/hr unauthenticated rate limit. RepoMap pulls the full repository tree in a **single call** via `GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1`, and ingests manifests directly from `raw.githubusercontent.com` concurrently via `Promise.allSettled`.

### 2. DFS Circular Dependency Detector
A built-in Depth-First Search (`DFS`) cycle-detection engine analyzes statically resolved edges using recursion-stack back-edge tracking. Circular import chains (e.g. `a.js → b.js → a.js`) are flagged in the 0–100 architecture health audit, highlighted with amber-dashed lines on the canvas, and listed in the inspection telemetry panel.

### 3. Dynamic Live SVG Architecture Badge Endpoint
Embed a real-time, zero-dependency obsidian badge in any GitHub README using our live production SVG endpoint:
```markdown
[![RepoMap Architecture](https://repomap-qut7.onrender.com/api/badge/<owner>/<repo>)](https://repomap-eta.vercel.app/?repo=<owner>/<repo>)
```
Serves a self-contained, cache-controlled (`max-age=3600`) `196x26` vector badge color-coded by health score:
- **`#10b981` (Emerald)**: Score $\ge 75$
- **`#f59e0b` (Amber)**: Score $50 - 74$
- **`#ef4444` (Rose)**: Score $< 50$

### 4. Interactive Obsidian Canvas & High-Res Export
- **React Flow v12 + Dagre Layout:** Seamlessly switch between Horizontal (`LR`) and Vertical (`TB`) DAG layouts with node selection spotlighting.
- **Viral Export Engine:** 1-click generation of native Mermaid.js flowchart markdown, high-res 2x PNG snapshots (`html-to-image`), raw JSON AST telemetry, and Shields.io badges.

---

## 🛡️ Embed Your Own Live Architecture Badge

Add dynamic architecture health telemetry to your repository README with one line of Markdown:

```markdown
<!-- Replace :owner and :repo with your GitHub repository -->
[![RepoMap Architecture Health](https://repomap-qut7.onrender.com/api/badge/:owner/:repo)](https://repomap-eta.vercel.app/?repo=:owner/:repo)
```

**Live Example (RepoMap):**

[![RepoMap Architecture Health](https://repomap-qut7.onrender.com/api/badge/AtharvDoiphode/Repomap)](https://repomap-eta.vercel.app/?repo=AtharvDoiphode/Repomap)

---

## 📊 System Architecture

```mermaid
%% Generated via RepoMap Architecture Telemetry
flowchart LR
    classDef hub fill:#09090b,stroke:#10b981,stroke-width:2px,color:#10b981,font-family:monospace,font-size:11px;
    classDef node fill:#111113,stroke:#27272a,stroke-width:1px,color:#f4f4f5,font-family:monospace,font-size:11px;

    UI["Vercel Production Client"]:::hub
    API["Render Production API"]:::hub
    DB[("MongoDB Atlas 24h TTL Cache")]:::node
    GH["GitHub Tree API + Raw CDN"]:::node
    PARSER["Static AST & DFS Cycle Engine"]:::node
    CANVAS["React Flow + Dagre Matrix"]:::node
    EXPORTER["Mermaid & Live SVG Badge"]:::node

    UI -->|"POST /api/analyze"| API
    API -->|"Check Cache"| DB
    API -->|"Fetch Index (1 Call)"| GH
    GH -->|"Concurrent Raw Files"| PARSER
    PARSER -->|"Nodes, Edges, Health & Cycles"| API
    API -->|"Topology Stream"| CANVAS
    CANVAS --> EXPORTER
```

---

## 🚀 3-Step Local Setup

### 1. Clone & Configure
```bash
git clone https://github.com/AtharvDoiphode/Repomap.git
cd Repomap
cp server/.env.example server/.env
```

### 2. Start Backend
```bash
cd server
npm install
node src/index.js
# Expected: ✅ Connected to MongoDB | 🚀 Server running on http://localhost:5000
```

### 3. Start Frontend Studio
```bash
cd ../client
npm install
npm run dev
# Open http://localhost:5173
```

---

<div align="center">
  <sub>MIT License © 2026 <a href="https://github.com/AtharvDoiphode">Atharv Doiphode</a>. Built for developers and engineering teams.</sub>
</div>
