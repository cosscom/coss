---
"coss-cli": minor
---

`coss init` sets a project up: it installs `coss` with the project's package manager and writes a new development key, approved in the dashboard and named after the project, to `.env.local` (Next.js) or `.env`. `coss profiles list` and `coss use <profile>` show and switch the saved profiles, and `coss open [page]` opens the environment's dashboard page. A daily update notice says when a newer coss-cli exists (`COSS_NO_UPDATE_CHECK=1` turns it off), and completion offers saved profile names.
