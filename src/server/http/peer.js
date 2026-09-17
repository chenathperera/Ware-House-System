import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { channel } from "node:diagnostics_channel";

// Web Requests omit sockets. Capture the actual Node peer before Next adapts
// the request, preserving Express's trust-proxy=false IP semantics.
const state = (globalThis.__warehousePeer ??= {
  storage: new AsyncLocalStorage(),
  registered: false,
});
export function registerPeerContext() {
  if (state.registered) return;
  channel("http.server.request.start").subscribe(({ request }) => {
    state.storage.enterWith(request.socket.remoteAddress);
  });
  state.registered = true;
}
export function getPeerAddress() {
  const address = state.storage.getStore();
  if (!address) throw new Error("Node request peer context is unavailable");
  return address;
}
