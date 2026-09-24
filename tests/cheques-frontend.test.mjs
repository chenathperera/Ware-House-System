import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Cheque Registry client API and hooks preserve source routes, keys, feedback, and cache refreshes", async () => {
  const api = await read("../src/client/features/cheques/chequesApi.js");
  const hooks = await read("../src/client/features/cheques/useCheques.js");
  const paymentHooks = await read(
    "../src/client/features/payments/usePayments.js",
  );

  for (const endpoint of [
    'api.get("/cheques", { params })',
    "api.put(`/cheques/${id}/status`, data)",
    "api.delete(`/cheques/${id}`)",
  ]) {
    assert.ok(api.includes(endpoint));
  }

  assert.match(hooks, /queryKey: \["cheques", filters\]/);
  assert.match(hooks, /Cheque status updated/);
  assert.match(hooks, /Cheque record deleted/);
  assert.match(hooks, /Delete failed/);
  const bankAccountInvalidations = hooks.match(
    /queryClient\.invalidateQueries\(\{ queryKey: \["bank-accounts"\] \}\)/g,
  );
  assert.equal(bankAccountInvalidations?.length, 2);
  assert.match(paymentHooks, /"cheques"/);
});

test("Cheque Registry page preserves source cards, filters, actions, modal fields, and unsupported paths", async () => {
  const page = await read("../src/app/(erp)/cheques/page.jsx");

  for (const value of [
    "Cheque Management",
    "Track and manage incoming and outgoing cheques",
    "Pending",
    "Cleared",
    "Bounced",
    "Incoming",
    "Search cheques...",
    "All Statuses",
    "All Types",
    "Loading cheques...",
    "Update Status",
    "Deposit To Account",
    "Reason for Bouncing",
    "Delete this cheque record?",
  ]) {
    assert.ok(page.includes(value));
  }

  assert.match(page, /router\.push\(`\/payments\/\$\{cheque\.paymentId/);
  assert.match(page, /useDeleteCheque/);
  assert.match(page, /newStatus === "cleared"/);
  assert.match(page, /newStatus === "bounced"/);
  assert.ok(!page.includes('value: "deposited"'));
  assert.ok(!page.includes('value: "returned"'));
});

test("Cheque Registry preserves the original unsupported delete request without a delete route", async () => {
  const api = await read("../src/client/features/cheques/chequesApi.js");
  const hooks = await read("../src/client/features/cheques/useCheques.js");
  const service = await read("../src/server/services/chequeApiService.js");

  assert.match(api, /api\.delete\(`\/cheques\/\$\{id\}`\)/);
  assert.match(hooks, /mutationFn: chequesApi\.remove/);
  assert.match(hooks, /Delete failed/);
  assert.doesNotMatch(service, /deleteCheque/);
  await assert.rejects(
    access(new URL("../src/app/api/cheques/[id]/route.js", import.meta.url)),
    { code: "ENOENT" },
  );
});
