import { useEffect } from "react";

/** Opt task flows into safe areas/keyboard resizing without changing other routes or disabling zoom. */
export function useFlowViewport() {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    const created = meta === null;
    if (meta === null) {
      meta = document.createElement("meta");
      meta.name = "viewport";
      document.head.append(meta);
    }
    const previous = meta.getAttribute("content");
    const base = previous ?? "width=device-width, initial-scale=1";
    const directives = base.split(",").map(s => s.trim()).filter(s => !/^(viewport-fit|interactive-widget)\s*=/i.test(s));
    const owned = [...directives, "viewport-fit=cover", "interactive-widget=resizes-content"].join(", ");
    meta.content = owned;
    // These flows use a light header even when the operating system is dark.
    let theme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const createdTheme = theme === null;
    if (theme === null) { theme = document.createElement("meta"); theme.name = "theme-color"; document.head.append(theme); }
    const previousTheme = theme.getAttribute("content");
    theme.content = "#FFFFFF";
    return () => {
      if (theme.content === "#FFFFFF") {
        if (createdTheme) theme.remove();
        else if (previousTheme === null) theme.removeAttribute("content");
        else theme.content = previousTheme;
      }
      if (meta.content !== owned) return;
      if (created) meta.remove();
      else if (previous === null) meta.removeAttribute("content");
      else meta.content = previous;
    };
  }, []);
}
