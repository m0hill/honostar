import type {
  ThemeOptions,
  ThemeProviderArtifacts,
  ThemeRuntimeConfig,
  ThemeValue,
} from "../common/theme"

const DEFAULT_THEME_CONFIG: ThemeRuntimeConfig = {
  attribute: "class",
  defaultTheme: "system",
  storageKey: "honostar-ui-theme",
  respectSystemPreference: true,
  disableTransitionClass: "theme-is-changing",
  rootSelector: "html",
  systemFallback: "dark",
}

function sanitizeInlineScript(payload: string): string {
  return payload.replace(/<\//g, "<\\/").replace(/<!--/g, "\\u003c!--")
}

function createThemeBootstrapScript(config: ThemeRuntimeConfig): string {
  const serializedConfig = JSON.stringify(config).replace(/</g, "\\u003c")
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
  `)
}

export function resolveThemeProvider(
  options?: ThemeOptions,
  cookiePreference?: string | null
): ThemeProviderArtifacts {
  const config: ThemeRuntimeConfig = {
    ...DEFAULT_THEME_CONFIG,
    ...options,
  }

  // Use cookie preference if available and valid, otherwise use config default
  let effectiveDefault = config.defaultTheme
  if (
    cookiePreference === "light" ||
    cookiePreference === "dark" ||
    cookiePreference === "system"
  ) {
    effectiveDefault = cookiePreference
  }

  const initialClass: ThemeValue =
    effectiveDefault === "system" ? config.systemFallback : effectiveDefault

  return {
    config,
    initialClass,
    bootstrapScript: createThemeBootstrapScript(config),
  }
}
