// debug/activeHandles.ts
export function printActiveHandles(tag = "handles") {
  // @ts-ignore private API; fine for debugging
  const handles = (process as any)._getActiveHandles?.() ?? [];
  console.error(
    `[${tag}] Active handles:`,
    handles.map((h: any) => ({
      type: h?.constructor?.name,
      details:
        h?.constructor?.name === "TLSSocket"
          ? {
              local: h.localAddress + ":" + h.localPort,
              remote: h.remoteAddress + ":" + h.remotePort,
            }
          : h?.constructor?.name === "Timeout"
          ? { _idleTimeout: (h as any)._idleTimeout }
          : undefined,
    }))
  );
}

// in your runner:
setTimeout(() => printActiveHandles("before-exit"), 8000);

export function logStep<T>(label: string, p: Promise<T>): Promise<T> {
  console.time(label);
  return p.finally(() => console.timeEnd(label));
}
