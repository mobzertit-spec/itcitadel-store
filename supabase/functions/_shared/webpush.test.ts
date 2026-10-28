import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { b64url, encrypt, fromB64url, generateVapidKeys, vapidHeader } from './webpush.ts'

const utf8 = (s: string) => new TextEncoder().encode(s)

// A known message, encrypted by the http_ece reference library (the one behind the web-push package)
const VECTOR = {
  plaintext: 'When I grow up, I want to be a watermelon',
  uaPrivate: 'i6St1mUvquRvLkmG8uc_966iJFqboBJ3Re9JBarqlFI',
  uaPublic: 'BGwgweIbrGq_CTQ_8rd_r2kp91axylwg0X5nVyyZgUn9qXBAz6ju2vl3fPZ2_eT7g81KR2_t0mIMi1QKN_a0bRc',
  senderPrivate: 'UiStXQo_bCdKlq5C2jkTiE9nFrubRRQ9PiogrjwJFjc',
  senderPublic: 'BKVjW8HlTIaIUx_GDH_m7fGEebfoRxb031yCrFlQwz9nKBVot2VYefv-z_Jk5Fwr3MAHyDRiJWXwYvSW88Fp69s',
  auth: 'QfJjxt3kamWv_W5p45ji4w',
  salt: 'Ew48pWo5Cs5Qg-vwAHeikA',
  expected:
    'Ew48pWo5Cs5Qg-vwAHeikAAAEABBBKVjW8HlTIaIUx_GDH_m7fGEebfoRxb031yCrFlQwz9nKBVot2VYefv-z_Jk5Fwr3MAHyDRiJWXwYvSW88Fp69sYI0Ca_llDxJr8hLcJw3D9uCKiOzieujTF79p2vAFZkaV0uHErXSScXJCsEt_7Txr1ALcpdOzMgscE',
}

/** A P-256 key as WebCrypto wants it, from its raw public point (and private scalar). */
function jwk(publicKey: string, privateKey?: string): JsonWebKey {
  const point = fromB64url(publicKey)
  return { kty: 'EC', crv: 'P-256', x: b64url(point.subarray(1, 33)), y: b64url(point.subarray(33, 65)), ...(privateKey ? { d: privateKey } : {}) }
}

/** What the customer's browser does with the message: the other half of RFC 8291. */
async function decrypt(message: Uint8Array, uaPublic: string, uaPrivate: string, auth: string) {
  const salt = message.slice(0, 16)
  const idlen = message[20]
  const asPublic = message.slice(21, 21 + idlen)
  const ecdh = { name: 'ECDH', namedCurve: 'P-256' }
  const me = await crypto.subtle.importKey('jwk', jwk(uaPublic, uaPrivate), ecdh, false, ['deriveBits'])
  const them = await crypto.subtle.importKey('raw', asPublic, ecdh, false, [])
  const secret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: them }, me, 256))
  const hkdf = async (s: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, n: number) =>
    new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']), n * 8))
  const ikm = await hkdf(fromB64url(auth), secret, new Uint8Array([...utf8('WebPush: info\0'), ...fromB64url(uaPublic), ...asPublic]), 32)
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12)
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const padded = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, message.slice(21 + idlen)))
  assert.equal(padded.at(-1), 2, 'last record delimiter')
  return new TextDecoder().decode(padded.slice(0, -1))
}

describe('encrypt', () => {
  it('gives exactly what the reference implementation gives for the same keys and salt', async () => {
    const ecdh = { name: 'ECDH', namedCurve: 'P-256' }
    const sender = {
      privateKey: await crypto.subtle.importKey('jwk', jwk(VECTOR.senderPublic, VECTOR.senderPrivate), ecdh, true, ['deriveBits']),
      publicKey: await crypto.subtle.importKey('jwk', jwk(VECTOR.senderPublic), ecdh, true, []),
    }
    const message = await encrypt(utf8(VECTOR.plaintext), VECTOR.uaPublic, VECTOR.auth, { salt: fromB64url(VECTOR.salt), sender })
    assert.equal(b64url(message), VECTOR.expected)
  })

  it('can be read back by the browser it was encrypted for, with a fresh key and salt each time', async () => {
    const one = await encrypt(utf8('{"title":"#1007"}'), VECTOR.uaPublic, VECTOR.auth)
    const two = await encrypt(utf8('{"title":"#1007"}'), VECTOR.uaPublic, VECTOR.auth)
    assert.notEqual(b64url(one), b64url(two))
    assert.equal(await decrypt(one, VECTOR.uaPublic, VECTOR.uaPrivate, VECTOR.auth), '{"title":"#1007"}')
    // header: salt, record size 4096, then the sender's 65-byte public key
    assert.equal(new DataView(one.buffer).getUint32(16), 4096)
    assert.equal(one[20], 65)
  })
})

describe('vapidHeader', () => {
  it('signs a 12-hour token for the push service, which the public key verifies', async () => {
    const keys = await generateVapidKeys()
    assert.equal(fromB64url(keys.publicKey).length, 65)
    const now = Date.UTC(2026, 9, 28, 10)
    const header = await vapidHeader('https://fcm.googleapis.com/fcm/send/abc:def', keys, 'mailto:contact@itcitadel.dz', now)
    const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!
    assert.equal(k, keys.publicKey)

    const [head, claims, signature] = jwt.split('.')
    assert.deepEqual(JSON.parse(new TextDecoder().decode(fromB64url(head))), { typ: 'JWT', alg: 'ES256' })
    const c = JSON.parse(new TextDecoder().decode(fromB64url(claims)))
    assert.equal(c.aud, 'https://fcm.googleapis.com')
    assert.equal(c.sub, 'mailto:contact@itcitadel.dz')
    assert.equal(c.exp - now / 1000, 12 * 3600)

    const verifier = await crypto.subtle.importKey('raw', fromB64url(keys.publicKey), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    assert.ok(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, verifier, fromB64url(signature), utf8(`${head}.${claims}`)))
  })
})
