// Build-time identity, never inferred from a URL or copied backup.
export const CHANNEL=typeof __SETKA_CHANNEL__==='undefined'?'unstable':__SETKA_CHANNEL__;
export const VERSION=typeof __SETKA_VERSION__==='undefined'?'0.4.0-unstable.3':__SETKA_VERSION__;
export const storageKey=name=>CHANNEL==='stable'?`setka.${name}`:`setka.unstable.${name}`;
