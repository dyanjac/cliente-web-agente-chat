function getCryptoObject() {
  if (typeof globalThis !== 'undefined' && 'crypto' in globalThis) {
    return globalThis.crypto;
  }

  return undefined;
}

export function generateId() {
  const cryptoObject = getCryptoObject();

  if (cryptoObject && typeof cryptoObject.randomUUID === 'function') {
    return cryptoObject.randomUUID();
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);

  return `id-${timestamp}-${random}`;
}
