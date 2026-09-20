import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("users, roles, and profile retain their original page-level contracts", async () => {
  const users = await readFile(new URL("../src/app/(erp)/users/page.jsx", import.meta.url), "utf8");
  const roles = await readFile(new URL("../src/app/(erp)/roles/page.jsx", import.meta.url), "utf8");
  const profile = await readFile(new URL("../src/app/(erp)/profile/page.jsx", import.meta.url), "utf8");
  const modal = await readFile(new URL("../src/client/features/users/UserFormModal.jsx", import.meta.url), "utf8");

  assert.match(users, /Manage team members and their access levels/);
  assert.match(users, /Search by name or email/);
  assert.match(users, /Their historical records \(orders, approvals\) remain intact/);
  assert.match(roles, /How roles work:/);
  assert.match(roles, /Capabilities/);
  assert.match(profile, /Password &amp; Security/);
  assert.match(profile, /Password changed successfully/);
  assert.match(modal, /type="button" variant="outline" onClick=\{onClose\}/);
});
