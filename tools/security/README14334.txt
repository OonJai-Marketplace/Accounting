Vendored cipher: @noble/ciphers 2.4.0 (MIT)
Input module: export { gcm } from '@noble/ciphers/aes.js';
Build: esbuild 0.25.12 --bundle --format=iife --global-name=OjmCipher14334 --minify
Output: assets/vendor/noble-gcm14334.js
License: assets/vendor/noble-gcm14334.LICENSE.txt

Only the synchronous cipher is bundled for existing synchronous Web Storage writes.
Password derivation uses native Web Crypto PBKDF2-SHA-256.
No home-grown cipher or password hash is used.

Do not use the older full desktop builder for this release.
sync-segments14334.py synchronizes only explicitly changed packed source segments.
