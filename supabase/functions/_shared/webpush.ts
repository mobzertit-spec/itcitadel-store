/**
 * Web Push without a library: the message is encrypted for the customer's browser (RFC 8291, "aes128gcm") and the
 * request is signed with the store's VAPID key (RFC 8292). WebCrypto only, so it runs in Deno, Node and the tests.
 */

type Bytes = Uint8Array<ArrayBuffer>
export type VapidKeys = { publicKey: string; privateJwk: JsonWebKey }
export type PushTarget = { endpoint: string; p256dh: string; auth: string }

const utf8 = (s: string): Bytes => new TextEncoder().encode(s)

export function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromB64url(s: string): Bytes {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let at = 0
  for (const p of parts) {
    out.set(p, at)
    at += p.length
  }
  return out
}

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8))
}

/** A new VAPID key pair for the store: the public half goes to browsers, the private half signs each request. */
export async function generateVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
  return {
    publicKey: b64url(new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))),
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
  }
}

/** The Authorization header for one push service: a JWT for its origin, valid 12 hours, and the public key. */
export async function vapidHeader(endpoint: string, keys: VapidKeys, subject: string, now = Date.now()): Promise<string> {
  const part = (o: object) => b64url(utf8(JSON.stringify(o)))
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })}`
  const { key_ops: _ops, ...jwk } = keys.privateJwk
  const signer = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const signature = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signer, utf8(unsigned)))
  return `vapid t=${unsigned}.${b64url(signature)}, k=${keys.publicKey}`
}

/**
 * Encrypts a message for one browser subscription (RFC 8291): one aes128gcm record of size 4096, with a fresh
 * sender key and salt. `fixed` replaces them in tests, to compare with a known result.
 */
export async function encrypt(plaintext: Uint8Array, p256dh: string, auth: string, fixed?: { salt: Bytes; sender: CryptoKeyPair }): Promise<Bytes> {
  const uaPublic = fromB64url(p256dh)
  const sender = fixed?.sender ?? (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']))
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', sender.publicKey))
  const ua = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua }, sender.privateKey, 256))

  const ikm = await hkdf(fromB64url(auth), ecdhSecret, concat(utf8('WebPush: info\0'), uaPublic, asPublic), 32)
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12)

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // 0x02: the last (and only) record, no padding
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, concat(plaintext, new Uint8Array([2]))))
  const header = new Uint8Array(21)
  header.set(salt, 0)
  new DataView(header.buffer).setUint32(16, 4096)
  header[20] = asPublic.length
  return concat(header, asPublic, sealed)
}

/** Sends one notification (any JSON) to one subscription. Returns the push service's HTTP status (404/410: gone). */
export async function sendPush(target: PushTarget, payload: unknown, keys: VapidKeys, subject: string): Promise<number> {
  const body = await encrypt(utf8(JSON.stringify(payload)), target.p256dh, target.auth)
  const res = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(target.endpoint, keys, subject),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'normal',
    },
    body,
    signal: AbortSignal.timeout(10000),
  })
  await res.body?.cancel()
  return res.status
}
