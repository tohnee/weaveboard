<div align="center">

# Weaveboard

**Offline-first project management for technical teams — in a single HTML file.**

WBS · CPM Critical Path · Risk Register · ADR Decisions · Kanban · Excel/Word Export

[![License: MIT](https://img.shields.io/badge/License-MIT-245d4d.svg)](LICENSE)
[![No Dependencies](https://img.shields.io/badge/dependencies-0-6b8f7a.svg)](#)
[![Single File](https://img.shields.io/badge/deliverable-1%20HTML%20file-f4b860.svg)](#)

**[🌐 Live Demo](https://tohnee.github.io/weaveboard/)** · **[中文文档](README.zh-CN.md)**

</div>

---

![Dashboard](docs/assets/dashboard.png)

Most PM tools want an account, a server, and your data. Weaveboard is the opposite: **one HTML file, zero dependencies, data never leaves the machine**. Double-click it and you get a full technical-PM cockpit — work breakdown, dependency network, CPM critical path, a risk register, decision records, and real Excel/Word export. It also ships as an **agent skill**, so an AI assistant can turn a project brief into a working board.

## Why you might like it

- **Truly offline.** No install, no build, no network. Email the file, put it on a USB stick — it just works, even from `file://`.
- **Real PM mechanics, not checkboxes.** FS/SS/FF/SF dependencies with lag, forward/backward-pass critical path with float, probability×impact risk scoring, ADR status machine.
- **One artifact, whole project.** Board JSON is embedded in the file and lives in your browser; export to `.xlsx`/`.docx` (hand-written OOXML — still zero dependencies) whenever you need to report.

## Feature tour

| | |
|---|---|
| **Spatial canvas** — cards connected by physics-simulated ropes; the critical path glows red and ropes never cross a card. | ![Space view](docs/assets/space.png) |
| **WBS + Gantt** — auto-numbered breakdown, weighted progress rollup, float tooltips, critical rows highlighted. | ![WBS view](docs/assets/wbs.png) |
| **Status kanban** — four-column flow with one-click status advance and critical-path badges. | ![Kanban view](docs/assets/kanban.png) |
| **Project cockpit** — progress, blockers, high risks, due-soon, hours invested, and the critical chain at a glance. | ![Dashboard](docs/assets/dashboard.png) |

Plus: timeline & graph views, travel-planning template (itinerary by day, budget by currency, booking status), LocalStorage autosave with 12 snapshots, undo/redo (40 steps), multi-select group drag, keyboard-first UX, `prefers-reduced-motion` support.

## Quick start

1. Download [`weaveboard-offline.html`](weaveboard-offline.html) (or try the [live demo](https://tohnee.github.io/weaveboard/)).
2. Double-click it. A sample project loads — explore 概览/空间/WBS/看板 views.
3. Make it yours: edit cards in the right panel, or **模板** to start fresh.

Export at any time from **数据与备份**: Excel workbook (5 sheets: overview / tasks / risks / decisions / dependencies), Word report (6 sections), JSON, or a full ZIP with attachments.

## The agent skill

The [`skills/weaveboard-pm/`](skills/weaveboard-pm/) directory is a complete agent skill: give an AI assistant your project brief and it generates a validated board file you can open directly.

```bash
# Install into your agent's skill directory (ZCode / Claude Code style)
cp -r skills/weaveboard-pm ~/.zcode/skills/        # or ~/.claude/skills/
```

The skill enforces a hard verification loop — generated data must pass `validate_board.mjs` (15+ schema rules + a headless CPM recomputation) before a board file is produced:

```bash
node scripts/validate_board.mjs examples/api-refactor.weaveboard.json
node scripts/new_board.mjs  examples/api-refactor.weaveboard.json -o my-board.html
```

Data contract: [`skills/weaveboard-pm/references/schema.md`](skills/weaveboard-pm/references/schema.md) · Authoring guide: [`authoring.md`](skills/weaveboard-pm/references/authoring.md)

## Data model in 30 seconds

```jsonc
{
  "board": { "name": "交易链路重构", "template": "tech", "view": "dashboard" },
  "cards": [ { "id": "writepath", "kind": "task", "parentId": "m1",
               "status": "in-progress", "startDate": "2026-07-21", "dueDate": "2026-08-07",
               "estimateHours": 96, "assignee": "郑", "progress": 45 } ],
  "edges": [ { "id": "e2", "from": "contract", "to": "writepath",
               "dependencyType": "FS", "lagDays": 0 } ]
}
```

Ten card kinds (task / milestone / blocker / risk / decision / person / document / note / place / image), four dependency types, risk = probability × impact (1–9). Everything is a flat, enumerable schema — friendly to humans, scripts, and LLMs alike.

## Roadmap

- [ ] Script-side export (generate xlsx/docx without opening the app)
- [ ] Markdown-brief → board one-shot conversion
- [ ] Baseline snapshots & SPI/CPI earned-value metrics
- [ ] Plugin packaging for skill marketplaces

## License

[MIT](LICENSE) © 2026
