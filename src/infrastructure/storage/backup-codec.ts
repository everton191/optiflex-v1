import type { BackupCodec } from "../../domain/backup";

const iterations = 600_000;
const maxLength = 40 * 1024 * 1024;
const encode = (bytes: Uint8Array) => {
  let result = "";
  for (let index = 0; index < bytes.length; index += 8192) result += String.fromCharCode(...bytes.subarray(index, index + 8192));
  return btoa(result);
};
const decode = (text: string) => Uint8Array.from(atob(text), (character) => character.charCodeAt(0));
async function key(password: string, salt: Uint8Array<ArrayBuffer>) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

// Web Crypto, no custom cipher. Reference: https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey
export class EncryptedBackupCodec implements BackupCodec {
  async encrypt(value: string, password: string) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(password, salt), new TextEncoder().encode(value));
    const output = JSON.stringify({ format: "opticore-encrypted", version: 1, salt: encode(salt), iv: encode(iv), data: encode(new Uint8Array(encrypted)) });
    if (output.length > maxLength) throw new Error("O backup excede o limite de 40 MB desta versão.");
    return output;
  }
  async decrypt(value: string, password: string) {
    if (value.length > maxLength) throw new Error("Arquivo maior que 40 MB.");
    try {
      const envelope = JSON.parse(value);
      if (envelope.format !== "opticore-encrypted" || envelope.version !== 1 || typeof envelope.salt !== "string" || typeof envelope.iv !== "string" || typeof envelope.data !== "string") throw new Error();
      const salt = decode(envelope.salt), iv = decode(envelope.iv);
      if (salt.length !== 16 || iv.length !== 12) throw new Error();
      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(password, salt), decode(envelope.data));
      return new TextDecoder().decode(decrypted);
    } catch { throw new Error("Não foi possível abrir o backup. Confira a senha e a integridade do arquivo."); }
  }
}
