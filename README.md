# Ware-House-System

This repository is the isolated Next.js migration target for the original
Warehouse System. The original application remains in the sibling
`Ware-House-System-main` directory and is used only as a read-only reference.

## Local setup

1. Run `npm install`.
2. Ensure `.env.local` contains local development values for `MONGODB_URI`,
   `JWT_SECRET`, and `JWT_EXPIRES_IN`. Use `.env.example` as the safe template.
3. Run `npm run dev` and open the displayed local URL.

Use only the local migration database at
`mongodb://127.0.0.1:27017/warehouse_system_next`. Never point local work at a
production database. `.env.local` is ignored by Git; `.env.example` contains
only safe placeholder values.

## Commands

- `npm run dev` starts the local development server.
- `npm run build` creates the production build.
- `npm run start` serves the production build.
- `npm run lint` checks the project with ESLint.

The current application is only the migration foundation. It provides the App
Router shell and the preserved `GET /api/health` response contract; no
authentication or ERP module has been migrated yet.
