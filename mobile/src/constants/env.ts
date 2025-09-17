import Constants from 'expo-constants';

function getDevServerIp(): string | undefined {
  const anyConstants = Constants as any;
  const hostUri: string | undefined =
    anyConstants?.expoConfig?.hostUri ||
    anyConstants?.manifest?.debuggerHost ||
    anyConstants?.manifest2?.extra?.expoClient?.hostUri;
  if (!hostUri) return undefined;
  const host = hostUri.split(':')[0];
  const ip = host.replace(/^.*\/\//, '');
  return ip || undefined;
}

function isLocalhostUrl(url?: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

const configuredApiUrl = (Constants.expoConfig?.extra?.apiUrl as string) || undefined;
const configuredWsUrl = (Constants.expoConfig?.extra?.websocketUrl as string) || undefined;

const devIp = getDevServerIp();
const fallbackApiUrl = devIp ? `http://${devIp}:8000/api` : 'http://localhost:8000/api';
const fallbackWsUrl = devIp ? `ws://${devIp}:8000/ws` : 'ws://localhost:8000/ws';

export const ENV = {
  apiUrl: isLocalhostUrl(configuredApiUrl) ? fallbackApiUrl : (configuredApiUrl as string),
  websocketUrl: isLocalhostUrl(configuredWsUrl) ? fallbackWsUrl : (configuredWsUrl as string),
  env: (Constants.expoConfig?.extra?.env as string) ?? 'development'
};
