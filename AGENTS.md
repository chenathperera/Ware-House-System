# Migration rules

- Treat `../Ware-House-System-main` as read-only. Never edit, delete, rename, move, format, or generate files in it.
- Make all migration changes only in this `Ware-House-System` directory.
- Preserve established business behaviour, including calculations, validation, workflow, authorization, database, reporting, and error behaviour.
- Do not make unrelated redesigns or refactors while migrating a module.
- Migrate one module at a time, using the original implementation and migration contracts as the source of truth.
- Run appropriate lint, build, and test checks before declaring a migration task complete.
- Never run original seed, setup, maintenance, or test scripts.
- Never connect development or test work to a production database.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
