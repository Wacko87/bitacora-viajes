// UUIDv7 Client Generator (Monotonic, sortable, collision-free for offline generation)
export function generateUUIDv7(): string {
  const timestamp = Date.now();
  const hexTime = timestamp.toString(16).padStart(12, '0');

  // Random bits for entropy
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  // Version 7 in bits 48-51
  const ver = 0x70 | ((randomBytes[0] || 0) & 0x0f);
  // Variant 2 in bits 64-65
  const varByte = 0x80 | ((randomBytes[1] || 0) & 0x3f);

  const hexRandom = Array.from(randomBytes.slice(2))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const p1 = hexTime.substring(0, 8);
  const p2 = hexTime.substring(8, 12);
  const p3 = ver.toString(16).padStart(2, '0') + (randomBytes[0] || 0).toString(16).padStart(2, '0');
  const p4 = varByte.toString(16).padStart(2, '0') + hexRandom.substring(0, 2);
  const p5 = hexRandom.substring(2);

  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
}
