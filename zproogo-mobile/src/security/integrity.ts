import { sha256 } from 'js-sha256';
import { Config } from '../config';
import { SecurityNative } from './native';
import { installId } from './secureStore';

let prepared: Promise<boolean> | null = null;

export function prepareIntegrity() {
  if (!SecurityNative || !Config.CLOUD_PROJECT_NUMBER) return Promise.resolve(false);
  prepared ??= SecurityNative.prepareIntegrity(Config.CLOUD_PROJECT_NUMBER).catch(() => false);
  return prepared;
}

/**
 * requestHash = base64url(sha256(METHOD \n PATH \n INSTALL_ID \n sha256hex(body)))  - identical to the server.
 * Binding the token to the exact request stops attackers replaying a token on another request.
 */
export async function integrityToken(method: string, path: string, body: string): Promise<string | null> {
  if (!(await prepareIntegrity()) || !SecurityNative) return null;
  const raw = sha256.array(`${method.toUpperCase()}\n${path}\n${installId()}\n${sha256(body)}`);
  const b64 = toBase64(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  try { return await SecurityNative.integrityToken(b64); } catch { return null; }
}

function toBase64(bytes: number[]) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a, b = 0, c = 0] = [bytes[i], bytes[i + 1], bytes[i + 2]];
    const n = (a << 16) | (b << 8) | c;
    out += chars[(n >> 18) & 63] + chars[(n >> 12) & 63] + (i + 1 < bytes.length ? chars[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? chars[n & 63] : '=');
  }
  return out;
}
