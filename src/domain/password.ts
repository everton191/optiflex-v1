// Credenciais locais (F7-02 — issue #117). Armazenamento: hash SHA-256 com salt
// por usuário, em `User.passwordHash`/`User.passwordSalt` (IndexedDB local).
// Ameaça coberta: identidade verificável no mesmo dispositivo. Auth em nuvem/MFA = F5-02.
// Regra: nunca logar/imprimir senha (SECURITY_PLAN.md).

const MIN_PASSWORD_LENGTH = 8;

export function assertPasswordStrength(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`A senha deve ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`);
}

export function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  return (await hashPassword(password, salt)) === expectedHash;
}
