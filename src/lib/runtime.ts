/** Compile-time edition switch; never enables a provider or exposes credentials. */
export const OFFLINE_EDITION = import.meta.env.VITE_OFFLINE === 'true'
