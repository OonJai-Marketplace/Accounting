/* Password-wrapped per-account device storage. Business data is encrypted at rest;
   code running in an unlocked origin can still access it. No password is stored. */
(() => {
  "use strict";
  if (window.parent !== window && window.parent.deviceVault14334) {
    window.deviceVault14334 = window.parent.deviceVault14334;
    Object.defineProperty(window, "localStorage", {
      value: window.parent.localStorage,
    });
    Object.defineProperty(window, "sessionStorage", {
      value: window.parent.sessionStorage,
    });
    for (const e of ["pointerdown", "keydown", "touchstart", "wheel"])
      window.addEventListener(e, (event) => {
        if (event.isTrusted) window.deviceVault14334.touch();
      }, {
        passive: true,
        capture: true,
      });
    return;
  }
  const rawLocal = window.localStorage,
    rawSession = window.sessionStorage,
    nativeFetch = window.fetch.bind(window);
  const scope = String(
      window.OJM_SUPABASE_URL ||
        window.OJM_DEPLOYMENT?.supabase?.url ||
        location.origin,
    ),
    P = "ojm-vault14334:" + encodeURIComponent(scope) + ":",
    DAY = 86400000,
    ITERATIONS = 600000;
  const encoder = new TextEncoder(),
    decoder = new TextDecoder(),
    random = (n) => crypto.getRandomValues(new Uint8Array(n));
  const b64 = (b) => {
      let s = "";
      for (let i = 0; i < b.length; i += 8192)
        s += String.fromCharCode(...b.subarray(i, i + 8192));
      return btoa(s);
    },
    un64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  let actor = "",
    secret = null,
    pending = false,
    offline = false,
    locked = false,
    signingOut = false,
    client = null;
  const ephemeral = [new Map(), new Map()],
    isLegacy = (k) =>
      /^(?:ojm[_-]|oonjai[_-]|sb-)/i.test(k) || k.startsWith(scope + ":");
  const physical = (kind, key) => P + actor + ":" + kind + ":" + key;
  function sealWith(key, value, aad) {
    const iv = random(12);
    return {
      vault14334: 1,
      iv: b64(iv),
      data: b64(
        OjmCipher14334.gcm(key, iv, encoder.encode(aad)).encrypt(
          encoder.encode(JSON.stringify(value)),
        ),
      ),
    };
  }
  function openWith(key, value, aad) {
    if (value?.vault14334 !== 1)
      throw Error("Protected device data is invalid.");
    return JSON.parse(
      decoder.decode(
        OjmCipher14334.gcm(key, un64(value.iv), encoder.encode(aad)).decrypt(
          un64(value.data),
        ),
      ),
    );
  }
  function requireKey() {
    if (!secret || locked)
      throw Error("Sign in to unlock the saved data on this device.");
    if (expired()) {
      void lock("One day without activity. Sign in again to continue.");
      throw Error("Your device session expired. Sign in again.");
    }
  }
  function pack(value, label) {
    requireKey();
    if (!String(label).includes(actor))
      throw Error("The account changed before device storage completed.");
    return {
      ...sealWith(secret, value, scope + ":" + actor + ":" + label),
      actor,
    };
  }
  function unpack(value, label) {
    requireKey();
    if (value === undefined || value === null) return value;
    if (value.vault14334 === 1) {
      if (value.actor !== actor) return undefined;
      return openWith(secret, value, scope + ":" + actor + ":" + label);
    }
    return value;
  }
  function session() {
    try {
      return JSON.parse(rawSession.getItem(P + "session") || "null");
    } catch {
      return null;
    }
  }
  function activity() {
    try {
      return Number(rawLocal.getItem(P + actor + ":activity") || 0);
    } catch {
      return 0;
    }
  }
  function expired() {
    const s = session(),
      now = Date.now(),
      at = Math.max(s?.at || 0, activity());
    return (
      !s ||
      s.actor !== actor ||
      !at ||
      now - at >= DAY ||
      at > now + 60000 ||
      s.generation !== rawLocal.getItem(P + actor + ":generation")
    );
  }
  function checkDeadline() {
    if (secret && !locked && expired())
      void lock("One day without activity. Sign in again to continue.");
  }
  function touch() {
    if (!secret || locked) return;
    if (expired()) {
      void lock("One day without activity. Sign in again to continue.");
      return;
    }
    if (document.hidden) return;
    const now = Date.now();
    const s = session();
    s.at = now;
    rawSession.setItem(P + "session", JSON.stringify(s));
    rawLocal.setItem(P + actor + ":activity", String(now));
  }
  function activate(id, key) {
    actor = id;
    secret = key;
    locked = false;
    const now = Date.now(),
      generation =
        rawLocal.getItem(P + id + ":generation") || crypto.randomUUID();
    rawLocal.setItem(P + id + ":generation", generation);
    rawLocal.setItem(P + id + ":activity", String(now));
    rawSession.setItem(
      P + "session",
      JSON.stringify({ actor: id, key: b64(key), at: now, generation }),
    );
    ephemeral.forEach((m) => m.clear());
  }
  try {
    const s = session();
    if (s?.actor) {
      actor = s.actor;
      if (!expired()) {
        secret = un64(s.key);
        if (secret.length !== 32) throw Error("Invalid key");
      } else {
        rawSession.removeItem(P + "session");
        rawSession.setItem(P + "notice", "One day without activity. Sign in again to continue.");
      }
    }
  } catch {
    secret = null;
    rawSession.removeItem(P + "session");
  }
  function logicalKeys(raw, kind) {
    if (!secret) return [...ephemeral[kind].keys()];
    const prefix = physical(kind, "");
    return Array.from({ length: raw.length }, (_, i) => raw.key(i))
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
  }
  function adapter(raw, kind) {
    const methods = {
      getItem(key) {
        key = String(key);
        if (!secret) return ephemeral[kind].get(key) ?? null;
        requireKey();
        const name = physical(kind, key),
          v = raw.getItem(name);
        if (v === null) return null;
        return openWith(secret, JSON.parse(v), name);
      },
      setItem(key, value) {
        key = String(key);
        value = String(value);
        if (!secret) {
          ephemeral[kind].set(key, value);
          return;
        }
        requireKey();
        const name = physical(kind, key);
        raw.setItem(name, JSON.stringify(sealWith(secret, value, name)));
      },
      removeItem(key) {
        key = String(key);
        if (!secret) {
          ephemeral[kind].delete(key);
          return;
        }
        requireKey();
        raw.removeItem(physical(kind, key));
      },
      clear() {
        for (const k of logicalKeys(raw, kind)) methods.removeItem(k);
      },
      key(i) {
        return logicalKeys(raw, kind)[i] ?? null;
      },
    };
    return new Proxy(
      {},
      {
        get(_, k) {
          if (k === "length") return logicalKeys(raw, kind).length;
          if (k === Symbol.toStringTag) return "Storage";
          return methods[k] || methods.getItem(k);
        },
        set(_, k, v) {
          methods.setItem(k, v);
          return true;
        },
        deleteProperty(_, k) {
          methods.removeItem(k);
          return true;
        },
        ownKeys() {
          return logicalKeys(raw, kind);
        },
        getOwnPropertyDescriptor(_, k) {
          return logicalKeys(raw, kind).includes(k)
            ? {
                enumerable: true,
                configurable: true,
                value: methods.getItem(k),
                writable: true,
              }
            : undefined;
        },
      },
    );
  }
  Object.defineProperty(window, "localStorage", {
    value: adapter(rawLocal, 0),
  });
  Object.defineProperty(window, "sessionStorage", {
    value: adapter(rawSession, 1),
  });
  const authKey = () =>
    "sb-" +
    new URL(window.OJM_SUPABASE_URL || scope).hostname.split(".")[0] +
    "-auth-token";
  async function passwordKey(password, salt) {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"],
    );
    return new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          hash: "SHA-256",
          iterations: ITERATIONS,
          salt: un64(salt),
        },
        key,
        256,
      ),
    );
  }
  async function metaKey(email) {
    return (
      P +
      "account:" +
      b64(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            encoder.encode(email.trim().toLowerCase()),
          ),
        ),
      )
    );
  }
  async function metadata(email) {
    return JSON.parse(rawLocal.getItem(await metaKey(email)) || "null");
  }
  async function unlock(email, password) {
    const m = await metadata(email);
    if (!m)
      throw Error(
        "Sign in online once on this device to prepare protected offline access.",
      );
    if (m.revoked)
      throw Error(
        "Online sign-in is required for this account. Your encrypted work is retained.",
      );
    let key;
    try {
      key = un64(
        openWith(
          await passwordKey(password, m.salt),
          m.wrapped,
          scope + ":wrap:" + m.actor,
        ),
      );
    } catch {
      throw Error(
        "The password did not unlock this device. Use the password last verified here.",
      );
    }
    activate(m.actor, key);
    return m;
  }
  const ownLegacy = (k) =>
    !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(k) ||
    k.includes(actor);
  async function migrate(role) {
    for (const [kind, raw, target] of [
      [0, rawLocal, localStorage],
      [1, rawSession, sessionStorage],
    ])
      for (const k of Array.from({ length: raw.length }, (_, i) =>
        raw.key(i),
      )) {
        if (k.startsWith("ojm-vault14334:") || !isLegacy(k) || !ownLegacy(k))
          continue;
        if (
          role !== "admin" &&
          !k.includes(actor) &&
          !k.startsWith("sb-") &&
          !k.endsWith(":verified-device-session14333")
        )
          continue;
        const old = raw.getItem(k);
        if (old === null) continue;
        if (k.startsWith("sb-") && k !== authKey()) continue;
        if (target.getItem(k) === null) target.setItem(k, old);
        raw.removeItem(k);
      }
    // Only this account's records migrate; another account's pending data is never reassigned.
    const existing =
      typeof indexedDB.databases === "function"
        ? await indexedDB.databases()
        : null;
    for (const [name, store] of [
      ["ojm-offline14239", "snapshots"],
      ["ojm-local14333", "state"],
      ["ojm-phone14242", "accounts"],
      ["oonjai-documents105", "drafts"],
      ["oonjai-reconciliation-v1", "reports"],
      ["oonjai-audit-only14232", "working_files"],
    ]) {
      if (existing && !existing.some((x) => x.name === name)) continue;
      const d = await new Promise((resolve, reject) => {
        const r = indexedDB.open(name);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      if (!d.objectStoreNames.contains(store)) {
        d.close();
        continue;
      }
      await new Promise((resolve, reject) => {
        const tx = d.transaction(store, "readwrite"),
          r = tx.objectStore(store).openCursor();
        r.onsuccess = () => {
          const c = r.result;
          if (!c) return;
          try {
            if (
              (String(c.key).includes(actor) || c.value?.owner === actor) &&
              c.value?.vault14334 !== 1
            ) {
              const value = pack(c.value, name + ":" + String(c.key));
              if (store === "reports") value.key = c.key;
              if (store === "working_files") value.id = c.key;
              c.update(value);
            }
            c.continue();
          } catch (e) {
            tx.abort();
            reject(e);
          }
        };
        tx.oncomplete = resolve;
        tx.onabort = tx.onerror = () =>
          reject(tx.error || Error("Could not protect existing device data."));
      });
      d.close();
    }
  }
  async function provision(email, password, id, role) {
    let m = await metadata(email);
    if (m) {
      if (m.actor !== id)
        throw Error(
          "Account identity changed. Existing encrypted work has been retained.",
        );
      m.revoked = false;
      rawLocal.setItem(await metaKey(email), JSON.stringify(m));
      try {
        await unlock(email, password);
      } catch (error) {
        const old = document.getElementById("devicePreviousPassword14334");
        if (!old) {
          const form = document.getElementById("loginForm");
          if (form) {
            const label = document.createElement("label");
            label.textContent = "Previous password used on this device";
            const input = document.createElement("input");
            input.id = "devicePreviousPassword14334";
            input.type = "password";
            input.autocomplete = "off";
            label.append(input);
            form.append(label);
          }
          throw Error(
            "Your online password was accepted. Enter the previous device password to unlock existing drafts and update offline sign-in.",
          );
        }
        await unlock(email, old.value);
        old.value = "";
      }
      await rewrap(email, password);
    } else {
      const key = random(32),
        salt = b64(random(16));
      m = {
        actor: id,
        salt,
        wrapped: sealWith(
          await passwordKey(password, salt),
          b64(key),
          scope + ":wrap:" + id,
        ),
      };
      rawLocal.setItem(await metaKey(email), JSON.stringify(m));
      activate(id, key);
    }
    localStorage.setItem("ojm_device_role14334", role || "");
    await migrate(role);
    return m;
  }
  async function rewrap(email, password) {
    if (!secret) return;
    const m = await metadata(email);
    if (!m || m.actor !== actor) return;
    m.salt = b64(random(16));
    m.wrapped = sealWith(
      await passwordKey(password, m.salt),
      b64(secret),
      scope + ":wrap:" + actor,
    );
    m.revoked = false;
    rawLocal.setItem(await metaKey(email), JSON.stringify(m));
  }
  function revoke() {
    for (const k of Object.keys(rawLocal)) {
      if (!k.startsWith(P + "account:")) continue;
      try {
        const m = JSON.parse(rawLocal.getItem(k));
        if (m.actor === actor) {
          m.revoked = true;
          rawLocal.setItem(k, JSON.stringify(m));
        }
      } catch {}
    }
  }
  function transport(e) {
    return (
      navigator.onLine === false ||
      e?.name === "AbortError" ||
      e?.name === "TypeError" ||
      /fetch|network|timeout|connection/i.test(e?.message || "") ||
      Number(e?.status) >= 500
    );
  }
  function lockScreen() {
    if (!document.body || document.getElementById("deviceLock14334")) return;
    window.status118?.clear?.();
    document.querySelectorAll("dialog[open]").forEach(dialog => dialog.close());
    // Cover and disable the workspace before awaiting the SDK. Keep a complete
    // painted surface until the login document replaces it, including offline.
    for (const node of document.body.children) node.inert = true;
    const screen = document.createElement("section");
    screen.id = "deviceLock14334";
    screen.setAttribute("role", "status");
    screen.setAttribute("aria-label", "Returning to sign in");
    screen.style.cssText = "position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#fffaf1;color:#174c38;";
    screen.innerHTML = window.loading1444?.markup() || "";
    document.body.append(screen);
  }
  async function lock(
    message = "",
    broadcast = true,
  ) {
    if (locked) return;
    lockScreen();
    locked = true;
    const id = actor;
    rawSession.removeItem(P + "session");
    if (message) rawSession.setItem(P + "notice", message);
    if (broadcast && id)
      rawLocal.setItem(P + id + ":generation", crypto.randomUUID());
    secret?.fill(0);
    secret = null;
    ephemeral.forEach((m) => m.clear());
    try {
      window.invalidateRequests1430?.();
    } catch {}
    // Drop protected DOM without dropping the opaque loading surface. This also
    // prevents late callbacks or Back restoration from treating the old gate as
    // authenticated while the login document is on its way.
    const screen = document.getElementById("deviceLock14334");
    if (screen) document.body.replaceChildren(screen);
    location.reload();
  }
  async function attach(authClient) {
    client = authClient;
    // The SDK's default channel is shared by every account on the origin. Our
    // encrypted storage events and lock generation already synchronize same-account
    // tabs, without broadcasting another account's session into this workspace.
    client.auth.broadcastChannel?.close();
    client.auth.broadcastChannel = null;
    const auth = client.auth,
      signin = auth.signInWithPassword.bind(auth),
      get = auth.getSession.bind(auth),
      signout = auth.signOut.bind(auth);
    auth.getSession = async () => {
      if (pending || !secret) return { data: { session: null }, error: null };
      requireKey();
      if (offline || navigator.onLine === false) {
        const saved = JSON.parse(localStorage.getItem(authKey()) || "null");
        return { data: { session: saved }, error: null };
      }
      return get();
    };
    auth.signInWithPassword = async (credentials) => {
      pending = true;
      let verified = false,
        navigating = false;
      try {
        let result;
        if (navigator.onLine !== false) {
          try {
            result = await signin(credentials);
            if (result.error) throw result.error;
            const response = await nativeFetch(
              (window.OJM_SUPABASE_URL || scope) +
                "/rest/v1/profiles?select=id,status,role&id=eq." +
                encodeURIComponent(result.data.user.id),
              {
                headers: {
                  apikey: window.OJM_SUPABASE_ANON_KEY,
                  Authorization: "Bearer " + result.data.session.access_token,
                },
                signal: AbortSignal.timeout(12000),
              },
            );
            if (!response.ok)
              throw Object.assign(
                Error("Account authorization could not be verified."),
                { status: response.status },
              );
            const rows = await response.json();
            if (rows?.[0]?.status !== "active")
              throw Object.assign(Error("This account is inactive."), {
                status: 403,
              });
            verified = true;
            await provision(
              credentials.email,
              credentials.password,
              result.data.user.id,
              rows[0].role,
            );
            localStorage.setItem(
              authKey(),
              JSON.stringify(result.data.session),
            );
            localStorage.setItem(
              scope + ":verified-device-session14333",
              JSON.stringify({
                id: actor,
                verifiedAt: new Date().toISOString(),
              }),
            );
            offline = false;
          } catch (e) {
            if (verified || !transport(e)) throw e;
          }
        }
        if (!verified) {
          await unlock(credentials.email, credentials.password);
          await migrate(localStorage.getItem("ojm_device_role14334"));
          const saved = JSON.parse(localStorage.getItem(authKey()) || "null");
          if (saved?.user?.id !== actor || !saved.refresh_token)
            throw Error(
              "Offline sign-in has not been prepared. Sign in online once.",
            );
          offline = true;
          result = { data: { session: saved, user: saved.user }, error: null };
        }
        rawSession.setItem(P + "offline", offline ? "1" : "0");
        rawSession.setItem(P + "fresh", verified ? "1" : "0");
        credentials.password = "";
        navigating = true;
        location.reload();
        return result;
      } catch (e) {
        if (!verified && [400, 401, 403].includes(Number(e.status))) {
          const m = await metadata(credentials.email);
          if (m && e.status !== 400) {
            m.revoked = true;
            rawLocal.setItem(
              await metaKey(credentials.email),
              JSON.stringify(m),
            );
          }
        }
        return {
          data: { session: null, user: null },
          error: { message: e.message || "Sign-in could not finish." },
        };
      } finally {
        if (!navigating) pending = false;
      }
    };
    auth.signOut = async (options = { scope: "local" }) => {
      if (signingOut) return { error: null };
      signingOut = true;
      lockScreen();
      pending = true;
      let message = "";
      try {
        // Offline logout locks the password-wrapped copy; there is no server
        // connection to revoke. Online logout must still call the real SDK.
        if (navigator.onLine !== false && !offline && !window.sessionCache14333?.localMode) {
          const result = await signout(options);
          if (result?.error) throw result.error;
        }
      } catch (error) {
        message = "Server sign-out could not be confirmed. This device is locked. Sign in again when connected. " + (error.message || "");
      } finally {
        await lock(message);
      }
      return { error: null };
    };
    const update = auth.updateUser.bind(auth);
    auth.updateUser = async (attributes, ...args) => {
      const r = await update(attributes, ...args);
      if (!r.error && attributes.password && secret)
        await rewrap(r.data.user.email, attributes.password);
      return r;
    };
    auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && secret && !pending) {
        revoke();
        void lock("Your online session ended. Sign in again.");
      }
      if (event === "TOKEN_REFRESHED") {
        offline = false;
        rawSession.setItem(P + "offline", "0");
      }
    });
  }
  offline = rawSession.getItem(P + "offline") === "1";
  window.deviceVault14334 = {
    consumeFresh() {
      const fresh = rawSession.getItem(P + "fresh") === "1";
      rawSession.removeItem(P + "fresh");
      return fresh;
    },
    readSession() {
      return secret
        ? JSON.parse(localStorage.getItem(authKey()) || "null")
        : null;
    },
    rememberSession(session) {
      if (secret && session?.user?.id === actor)
        localStorage.setItem(authKey(), JSON.stringify(session));
    },
    finishRecovery() {
      rawSession.removeItem(P + "session");
      if (actor)
        rawLocal.setItem(P + actor + ":generation", crypto.randomUUID());
      secret?.fill(0);
      secret = null;
      ephemeral.forEach((m) => m.clear());
    },
    pack,
    unpack,
    attach,
    lock,
    touch,
    migrate,
    requireKey,
    rewrap,
    revoke,
    get pending() {
      return pending;
    },
    get unlocked() {
      return !!secret && !locked;
    },
    get actor() {
      return actor;
    },
    get offline() {
      return offline;
    },
    get ttl() {
      return DAY;
    },
  };
  for (const e of ["pointerdown", "keydown", "touchstart", "wheel"])
    window.addEventListener(e, (event) => { if (event.isTrusted) touch(); }, { passive: true, capture: true });
  window.addEventListener("pageshow", checkDeadline);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkDeadline();
  });
  setInterval(checkDeadline, 10000);
  const showLockReason = () => {
    const message = rawSession.getItem(P + "notice");
    rawSession.removeItem(P + "notice");
    if (message) window.loginNotice14293?.(message, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", showLockReason, { once: true });
  else showLockReason();
  window.addEventListener("storage", (e) => {
    if (!actor) return;
    if (e.key === P + actor + ":generation") {
      if (secret) void lock("Signed out in another tab.", false);
      return;
    }
    const prefix = physical(0, "");
    if (e.key?.startsWith(prefix))
      window.dispatchEvent(
        new StorageEvent("storage", { key: e.key.slice(prefix.length) }),
      );
  });
  window.addEventListener("online", async () => {
    if (!secret || !client || pending) return;
    checkDeadline();
    if (!secret || locked) return;
    try {
      const r = await client.auth.refreshSession();
      if (r.error) throw r.error;
      offline = false;
      rawSession.setItem(P + "offline", "0");
      window.dispatchEvent(new Event("session-online14333"));
      window.autoSync14256?.run();
      window.localFirst14333?.sync();
    } catch (e) {
      if (!transport(e)) {
        revoke();
        void lock(
          "Online authorization expired. Sign in again; your encrypted work is retained.",
        );
      }
    }
  });
})();
