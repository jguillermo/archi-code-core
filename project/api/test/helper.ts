export function getJwtPayload(token: string): any {
  const parts = token.split('.');

  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payloadB64 = parts[1];

  try {
    const payloadJson = Buffer.from(payloadB64, 'base64').toString('utf8');
    return JSON.parse(payloadJson);
  } catch (error) {
    throw new Error('Failed to parse JWT payload');
  }
}
