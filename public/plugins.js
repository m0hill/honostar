// src/honostar/client/prefetch.ts
var PREFETCH_DISABLE_VALUE = "off";
function isSameOrigin(url) {
  return url.origin === location.origin;
}
function shouldThrottleByNetwork(policy) {
  const conn = navigator.connection;
  const saveData = Boolean(conn && conn.saveData);
  const slow = Boolean(conn && (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g"));
  if (policy.respectDataSaver && saveData)
    return true;
  if (policy.respectSlowConnections && slow)
    return true;
  return false;
}
function absUrl(href) {
  try {
    return new URL(href, location.href);
  } catch {
    return null;
  }
}
function onIdle(cb) {
  const win = window;
  if (typeof win.requestIdleCallback === "function") {
    win.requestIdleCallback(() => cb(), { timeout: 1000 });
    return;
  }
  setTimeout(cb, 0);
}
function parsePrefetchStrategy(value) {
  switch (value) {
    case "none":
    case "hover":
    case "intent":
    case "visible":
    case "immediate":
    case "tap":
      return value;
    default:
      return null;
  }
}
function parsePrefetchMethod(value) {
  return value === "link" || value === "fetch" ? value : undefined;
}
function parsePrefetchPriority(value) {
  return value === "high" || value === "low" || value === "auto" ? value : undefined;
}
function parsePrefetchTarget(value) {
  switch (value) {
    case "document":
    case "script":
    case "style":
    case "image":
    case "font":
    case "fetch":
      return value;
    default:
      return;
  }
}

class PrefetchClient {
  policy;
  cache = new Map;
  seen = new WeakSet;
  linkObserver = null;
  mutationObserver = null;
  cleanupFns = [];
  constructor(config) {
    this.policy = {
      enabled: true,
      onlySameOrigin: true,
      respectDataSaver: true,
      respectSlowConnections: true,
      defaultStrategy: "hover",
      attachAllAnchors: true,
      hoverDelayMs: 40,
      intentDelayMs: 120,
      visibleRootMargin: "200px",
      maxEntries: 200,
      defaultTTLms: 5 * 60 * 1000,
      useLinkRel: true,
      watchMutations: true,
      ...config
    };
  }
  configure(config) {
    this.policy = { ...this.policy, ...config };
  }
  isPrefetched(url) {
    const u = absUrl(url);
    if (!u)
      return false;
    const entry = this.cache.get(u.href);
    if (!entry)
      return false;
    return entry.state === "done" && entry.expiresAt > Date.now();
  }
  invalidate(where) {
    for (const key of this.cache.keys()) {
      if (typeof where === "string") {
        if (key === absUrl(where)?.href)
          this.cache.delete(key);
      } else if (where(key)) {
        this.cache.delete(key);
      }
    }
  }
  preconnect(origin) {
    try {
      const url = new URL(origin);
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = url.origin;
      link.crossOrigin = "";
      document.head.appendChild(link);
    } catch {}
  }
  async prefetch(href, opts = {}) {
    if (!this.policy.enabled)
      return;
    const u = absUrl(href);
    if (!u)
      return;
    if (!isSameOrigin(u) && this.policy.onlySameOrigin && !opts.allowCrossOrigin)
      return;
    if (shouldThrottleByNetwork(this.policy))
      return;
    if (opts.signal?.aborted)
      return;
    const key = u.href;
    const existing = this.cache.get(key);
    const ttl = opts.ttlMs ?? this.policy.defaultTTLms;
    if (existing && existing.expiresAt > Date.now()) {
      return existing.promise ?? Promise.resolve();
    }
    if (this.cache.size >= this.policy.maxEntries) {
      let oldestKey = null;
      let oldest = Infinity;
      for (const [k, v] of this.cache) {
        if (v.expiresAt < oldest) {
          oldest = v.expiresAt;
          oldestKey = k;
        }
      }
      if (oldestKey)
        this.cache.delete(oldestKey);
    }
    const method = opts.method ?? (this.policy.useLinkRel ? "link" : "fetch");
    const entry = {
      url: key,
      expiresAt: Date.now() + ttl,
      state: "pending",
      method
    };
    this.cache.set(key, entry);
    const done = () => {
      entry.state = "done";
      entry.expiresAt = Date.now() + ttl;
    };
    const fail = () => {
      entry.state = "error";
      entry.expiresAt = Date.now() + 1e4;
    };
    if (method === "link") {
      entry.promise = new Promise((resolve) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        const kind = opts.kind ?? "document";
        if (kind !== "document") {
          link.as = kind;
        }
        link.href = key;
        if (opts.crossOrigin)
          link.crossOrigin = opts.crossOrigin;
        if (opts.priority) {
          link.setAttribute("importance", opts.priority);
        }
        link.addEventListener("load", () => {
          done();
          resolve();
        });
        link.addEventListener("error", () => {
          fail();
          resolve();
        });
        document.head.appendChild(link);
        onIdle(() => {
          if (entry.state === "pending") {
            done();
            resolve();
          }
        });
      });
      return entry.promise;
    }
    const controller = new AbortController;
    entry.abort = controller;
    const abortSignal = opts.signal;
    let abortCleanup;
    if (abortSignal) {
      const onAbort = () => controller.abort();
      abortSignal.addEventListener("abort", onAbort, { once: true });
      abortCleanup = () => abortSignal.removeEventListener("abort", onAbort);
    }
    const promise = fetch(key, {
      method: "GET",
      credentials: "same-origin",
      cache: "default",
      mode: isSameOrigin(u) ? "same-origin" : "cors",
      signal: controller.signal,
      keepalive: true
    }).then(() => {
      done();
    }).catch(() => {
      fail();
    });
    if (abortCleanup) {
      promise.finally(abortCleanup);
    }
    entry.promise = promise;
    return promise;
  }
  bindAnchors(root) {
    const container = root ?? document;
    const anchors = Array.from(container.querySelectorAll("a[href]"));
    const listenHover = (a, delay) => {
      let t = null;
      const onEnter = () => {
        if (t !== null)
          return;
        t = window.setTimeout(() => {
          const { url, options } = this.optsFromDataset(a);
          this.prefetch(url, options);
        }, delay);
      };
      const clear = () => {
        if (t !== null) {
          clearTimeout(t);
          t = null;
        }
      };
      a.addEventListener("pointerenter", onEnter, { passive: true });
      a.addEventListener("pointerleave", clear, { passive: true });
      return () => {
        a.removeEventListener("pointerenter", onEnter);
        a.removeEventListener("pointerleave", clear);
      };
    };
    const listenIntent = (a, delay) => {
      const onDown = () => {
        const fire = () => {
          const { url, options } = this.optsFromDataset(a);
          this.prefetch(url, options);
        };
        if (delay <= 0)
          fire();
        else
          setTimeout(fire, delay);
      };
      a.addEventListener("pointerdown", onDown, { passive: true });
      a.addEventListener("touchstart", onDown, { passive: true });
      return () => {
        a.removeEventListener("pointerdown", onDown);
        a.removeEventListener("touchstart", onDown);
      };
    };
    const io = this.linkObserver ?? new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting)
          continue;
        const target = e.target;
        if (!(target instanceof HTMLAnchorElement))
          continue;
        this.linkObserver?.unobserve(target);
        const { url, options } = this.optsFromDataset(target);
        this.prefetch(url, options);
      }
    }, { rootMargin: this.policy.visibleRootMargin });
    this.linkObserver = io;
    const unsubs = [];
    for (const a of anchors) {
      if (a.target || a.hasAttribute("download"))
        continue;
      const href = a.getAttribute("href") || "";
      if (!href)
        continue;
      if (!absUrl(href))
        continue;
      const explicitRaw = a.getAttribute("data-prefetch");
      const disabled = explicitRaw === PREFETCH_DISABLE_VALUE;
      const explicit = parsePrefetchStrategy(explicitRaw);
      const strategy = disabled ? "none" : explicit ?? (this.policy.attachAllAnchors ? this.policy.defaultStrategy : "none");
      if (!strategy || strategy === "none")
        continue;
      if (this.seen.has(a))
        continue;
      this.seen.add(a);
      switch (strategy) {
        case "hover":
          unsubs.push(listenHover(a, this.policy.hoverDelayMs));
          break;
        case "intent":
        case "tap":
          unsubs.push(listenIntent(a, this.policy.intentDelayMs));
          break;
        case "visible":
          io.observe(a);
          break;
        case "immediate":
          onIdle(() => {
            const { url, options } = this.optsFromDataset(a);
            this.prefetch(url, options);
          });
          break;
        default:
          break;
      }
    }
    this.cleanupFns.push(() => unsubs.forEach((u) => u()));
  }
  optsFromDataset(a) {
    const urlOverride = a.getAttribute("data-prefetch-url");
    const url = urlOverride ?? a.href;
    const method = parsePrefetchMethod(a.getAttribute("data-prefetch-method"));
    const ttlStr = a.getAttribute("data-prefetch-ttl");
    const ttlVal = ttlStr ? Number(ttlStr) : undefined;
    const priority = parsePrefetchPriority(a.getAttribute("data-prefetch-priority"));
    const kind = parsePrefetchTarget(a.getAttribute("data-prefetch-kind")) ?? "document";
    const allowCrossOriginAttr = a.getAttribute("data-prefetch-allow-cross-origin");
    const allowCrossOrigin = allowCrossOriginAttr === "" || allowCrossOriginAttr === "true" || allowCrossOriginAttr === "1";
    const options = { kind };
    if (method)
      options.method = method;
    if (typeof ttlVal === "number" && Number.isFinite(ttlVal)) {
      options.ttlMs = ttlVal;
    }
    if (priority)
      options.priority = priority;
    if (allowCrossOrigin)
      options.allowCrossOrigin = true;
    return { url, options };
  }
  observeMutations(root) {
    if (!this.policy.watchMutations)
      return;
    const container = root ?? document;
    const mo = this.mutationObserver ?? new MutationObserver((muts) => {
      let needsBind = false;
      for (const m of muts) {
        if (m.type === "childList" && (m.addedNodes?.length ?? 0) > 0) {
          needsBind = true;
          break;
        }
      }
      if (needsBind)
        this.bindAnchors(container);
    });
    this.mutationObserver = mo;
    mo.observe(container, { childList: true, subtree: true });
    this.cleanupFns.push(() => mo.disconnect());
  }
  start(root) {
    if (!this.policy.enabled)
      return;
    this.bindAnchors(root);
    this.observeMutations(root);
  }
  stop() {
    this.cleanupFns.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
    this.cleanupFns = [];
    this.linkObserver?.disconnect();
    this.linkObserver = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.seen = new WeakSet;
  }
}
// src/honostar/client/runtime/plugins.ts
function registerRuntimePlugin(name, handler) {
  if (typeof window === "undefined")
    return;
  if (window.Honostar?.plugins) {
    window.Honostar.plugins.register(name, handler);
    return;
  }
  (window.__honostarPendingPluginRegistrations ??= []).push({
    name,
    handler
  });
}
// src/honostar/common/theme.ts
var DEFAULT_THEME_CONFIG = {
  attribute: "class",
  defaultTheme: "system",
  storageKey: "honostar-ui-theme",
  respectSystemPreference: true,
  disableTransitionClass: "theme-is-changing",
  rootSelector: "html",
  systemFallback: "dark"
};
function sanitizeInlineScript(payload) {
  return payload.replace(/<\//g, "<\\/").replace(/<!--/g, "\\u003c!--");
}
function createThemeBootstrapScript(config) {
  const serializedConfig = JSON.stringify(config).replace(/</g, "\\u003c");
  return sanitizeInlineScript(`
;(() => {
  const cfg = ${serializedConfig};
  const doc = document;
  const root = doc.querySelector(cfg.rootSelector) || doc.documentElement;
  if (!root) return;

  const readStoredPreference = () => {
    try {
      const value = localStorage.getItem(cfg.storageKey);
      return value === 'light' || value === 'dark' || value === 'system' ? value : null;
    } catch {
      return null;
    }
  };

  const prefersDark = () => {
    if (!cfg.respectSystemPreference || typeof window.matchMedia !== 'function') {
      return cfg.systemFallback === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const resolveValue = pref => {
    if (pref === 'system') {
      return prefersDark() ? 'dark' : 'light';
    }
    return pref;
  };

  const applyTheme = pref => {
    const resolved = resolveValue(pref);
    if (cfg.attribute === 'class') {
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    } else {
      root.setAttribute(cfg.attribute, resolved);
    }
    root.dataset.themePreference = pref;
    root.dataset.themeResolved = resolved;
  };

  applyTheme(readStoredPreference() || cfg.defaultTheme);
})();
  `);
}
function resolveThemeProvider(options, cookiePreference) {
  const config = {
    ...DEFAULT_THEME_CONFIG,
    ...options
  };
  let effectiveDefault = config.defaultTheme;
  if (cookiePreference === "light" || cookiePreference === "dark" || cookiePreference === "system") {
    effectiveDefault = cookiePreference;
  }
  const initialClass = effectiveDefault === "system" ? config.systemFallback : effectiveDefault;
  return {
    config,
    initialClass,
    bootstrapScript: createThemeBootstrapScript(config)
  };
}

// src/honostar/client/runtime/runtime-data.ts
var FALLBACK_THEME_CONFIG = resolveThemeProvider().config;
// src/plugins/clipboard.ts
registerRuntimePlugin("clipboard", async (ctx, text) => {
  if (!navigator.clipboard) {
    return ctx.error("Clipboard API not supported in this browser");
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error("Failed to copy to clipboard"));
  }
});

// src/plugins/focus.ts
registerRuntimePlugin("focus", (ctx, selector) => {
  const target = document.querySelector(selector);
  if (!target) {
    return ctx.error(`Element not found: ${selector}`);
  }
  if (!(target instanceof HTMLElement)) {
    return ctx.error(`Element is not focusable: ${selector}`);
  }
  try {
    target.focus();
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error("Failed to focus element"));
  }
});

// src/plugins/scroll.ts
registerRuntimePlugin("scroll", (ctx, selector, behavior = "smooth", block = "start") => {
  const target = document.querySelector(selector);
  if (!target) {
    return ctx.error(`Element not found: ${selector}`);
  }
  try {
    target.scrollIntoView({
      behavior,
      block,
      inline: "nearest"
    });
  } catch (err) {
    ctx.error(err instanceof Error ? err : new Error("Failed to scroll to element"));
  }
});

// src/plugins/toast.ts
var DEFAULT_DURATION = 3000;
registerRuntimePlugin("toast", (ctx, message, type = "info", options = {}) => {
  const container = document.getElementById("toast-container");
  if (!container) {
    return ctx.error('Toast container not found. Add <div id="toast-container"></div> to your layout.');
  }
  const { duration = DEFAULT_DURATION, dismissible = true } = options;
  const toast = document.createElement("div");
  toast.className = getToastClasses(type);
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "polite");
  const messageEl = document.createElement("span");
  messageEl.textContent = message;
  toast.appendChild(messageEl);
  if (dismissible) {
    const dismissBtn = document.createElement("button");
    dismissBtn.innerHTML = "&times;";
    dismissBtn.className = "ml-2 font-bold opacity-70 hover:opacity-100";
    dismissBtn.setAttribute("aria-label", "Dismiss");
    dismissBtn.addEventListener("click", () => removeToast(toast));
    toast.appendChild(dismissBtn);
  }
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.animation = "slideIn 0.3s ease-out";
  });
  if (duration > 0) {
    setTimeout(() => removeToast(toast), duration);
  }
});
function getToastClasses(type) {
  const base = "flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity";
  const typeClasses = {
    info: "bg-blue-500 text-white",
    success: "bg-green-500 text-white",
    warning: "bg-yellow-500 text-black",
    error: "bg-red-500 text-white"
  };
  return `${base} ${typeClasses[type]}`;
}
function removeToast(toast) {
  toast.style.animation = "slideOut 0.3s ease-in";
  setTimeout(() => toast.remove(), 300);
}
if (typeof document !== "undefined") {
  const styleId = "honostar-toast-animations";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(100%);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      
      @keyframes slideOut {
        from {
          opacity: 1;
          transform: translateX(0);
        }
        to {
          opacity: 0;
          transform: translateX(100%);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
