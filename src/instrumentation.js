export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerPeerContext } = await import("./server/http/peer.js");
    registerPeerContext();
  }
}
