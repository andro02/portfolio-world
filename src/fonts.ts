// Fonts for text drawn inside the 3D world (drei <Text>), served from
// public/fonts. Without a font, <Text> downloads one from a CDN on every page
// load; with our own files the site doesn't depend on another server.
// Both fonts are free to use and ship (SIL Open Font License, see
// public/fonts/LICENSE-*.txt).

const FONTS_URL = `${import.meta.env.BASE_URL}fonts/`;

// rounded and friendly: signposts and labels in the world
export const SIGN_FONT = `${FONTS_URL}nunito-latin-800-normal.woff`;

// monospace: text on computer screens
export const MONO_FONT = `${FONTS_URL}jetbrains-mono-latin-500-normal.woff`;
