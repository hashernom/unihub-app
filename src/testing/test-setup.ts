// Polyfill BroadcastChannel for jsdom
if (typeof BroadcastChannel === 'undefined') {
  class BroadcastChannelMock {
    private listeners: ((event: MessageEvent) => void)[] = [];
    constructor(public name: string) {}
    postMessage(message: unknown): void {
      this.listeners.forEach((l) => l({ data: message } as MessageEvent));
    }
    addEventListener(_type: string, listener: (event: MessageEvent) => void): void {
      this.listeners.push(listener);
    }
    removeEventListener(_type: string, listener: (event: MessageEvent) => void): void {
      this.listeners = this.listeners.filter((l) => l !== listener);
    }
    close(): void {
      this.listeners = [];
    }
  }
  globalThis.BroadcastChannel = BroadcastChannelMock as unknown as typeof BroadcastChannel;
}

// Polyfill crypto.randomUUID
if (!globalThis.crypto?.randomUUID) {
  globalThis.crypto = {
    ...globalThis.crypto,
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).slice(2),
  } as Crypto;
}

// Suppress Ionic console.error noise in jsdom
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (process.env['DEBUG_TESTS'] === 'true') originalConsoleError(...args);
};
