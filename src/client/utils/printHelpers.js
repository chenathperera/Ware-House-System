"use client";

/** Builds the custom URL consumed by the Bluetooth Print Android companion app. */
export function getBluetoothPrintUrl(invoiceId) {
  let apiUrl = "/api";

  if (apiUrl.startsWith("/")) apiUrl = `${window.location.origin}${apiUrl}`;

  if (apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
    apiUrl = apiUrl
      .replace("localhost", window.location.hostname)
      .replace("127.0.0.1", window.location.hostname);
  }

  return `my.bluetoothprint.scheme://${apiUrl}/invoices/${invoiceId}/print-json`;
}
