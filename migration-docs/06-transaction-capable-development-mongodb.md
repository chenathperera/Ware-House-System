# Transaction-capable development MongoDB

## Diagnosis

On 2026-09-22 the development URI was inspected without exposing credentials.
It targets local `127.0.0.1:27017`, database `warehouse_system_next`, with no
replica-set option. The MongoDB `hello` response has no `setName` and no
`msg: "isdbgrid"`, so this is a standalone local `mongod`, not Atlas, a replica
set, or `mongos`. A read-only transaction probe reproduced: `Transaction
numbers are only allowed on a replica set member or mongos`.

The original ERP uses `mongoose.startSession()` and `session.withTransaction()`
for stock and GRN workflows, but its checked-in environment example also names
a standalone local URI. It does not provide a replica-set setup. This is an
original environment gap, not an application-code defect.

## Required safe local fix

Configure the existing local MongoDB service as a one-member replica set named
`erpDevRs`. This retains the current database files; it does not delete, reset,
or migrate application collections. It requires an administrator because the
MongoDB service configuration is under `C:\Program Files`.

First stop all local ERP/Next processes that use MongoDB. In an elevated
PowerShell session, make a non-destructive backup before changing service
configuration:

```powershell
mongodump --uri "mongodb://127.0.0.1:27017/warehouse_system_next" --out "$env:USERPROFILE\mongodb-backups\warehouse-system-before-replica-set"
Copy-Item "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg" "$env:USERPROFILE\mongodb-backups\mongod.cfg.before-replica-set"
```

Open the configuration file as administrator:

```powershell
notepad "C:\Program Files\MongoDB\Server\8.2\bin\mongod.cfg"
```

Replace the commented `#replication:` line with:

```yaml
replication:
  replSetName: erpDevRs
```

Restart the existing service, then initialize it once:

```powershell
Restart-Service MongoDB
mongosh --host 127.0.0.1 --port 27017 --eval 'rs.initiate({_id: "erpDevRs", members: [{_id: 0, host: "127.0.0.1:27017"}]})'
mongosh --host 127.0.0.1 --port 27017 --eval 'db.hello()'
```

After `db.hello()` reports `setName: "erpDevRs"` and
`isWritablePrimary: true`, update the user-owned `.env.local` manually:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017/warehouse_system_next?replicaSet=erpDevRs
```

Restart Next.js. Do not run `rs.initiate()` a second time after the replica set
is initialized. If the service fails to restart, restore the copied `mongod.cfg`
and investigate the MongoDB service log before retrying.

## Verification after user action

Run a transaction-capability probe, then use the normal browser flow for
Opening Stock. A successful entry must create its `StockItem` quantity update
and matching `StockMovement` together. GRN receiving uses the same transaction
requirement and is ready once this replica-set configuration is active.

### Completed local configuration — 2026-09-22

The local MongoDB service was converted to the `erpDevRs` single-node replica
set without deleting application data. `rs.initiate()` succeeded and the node
became PRIMARY. The user-owned development URI now explicitly includes
`replicaSet=erpDevRs`. A read-only transaction probe through that exact URI
succeeded, confirming that Opening Stock and GRN can retain their required
transaction semantics. No stock, movement, GRN, or other ERP document was
created or changed during this verification.

## Regression evidence

The separate, existing `stockTestRs` one-member replica set passed Stock API
and rollback tests (7/7) and GRN transactional receiving tests (7/7). Stock
service tests also passed (1/1). These prove the application transactions; the
live local development deployment remains blocked until the user applies the
safe service configuration above.
