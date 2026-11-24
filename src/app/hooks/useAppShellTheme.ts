import { useLayoutEffect } from "react";

/**
 * Marks the document while a shared shell is on screen:
 *   "app"     data-lagda-app     the signed-in shells (PlatformLayout, EnotaryLayout)
 *   "public"  data-lagda-public  the public site and its sign-in pages
 *             (PublicLayout, AuthLayout, CreateAccountLayout)
 *
 * The marks sit on <html>. Everything in styles/app-shell.css is scoped to
 * them (the navy accents, the wave backdrop's colours), and
 * styles/public-shell.css to the public one (type, section bands, motion).
 * Putting them on <html> rather than on the shell's own box is what lets
 * dialogs and menus, which render in portals outside that box, follow the
 * same accents. Onboarding and signing links mount neither shell, so they
 * carry neither mark.
 *
 * A layout effect, so the mark is in place before the shell first paints.
 * Moving between two shells removes one mark and sets the other in one commit.
 */
export function useAppShellTheme(kind: "app" | "public" = "app"): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const mark = kind === "public" ? "data-lagda-public" : "data-lagda-app";
    root.setAttribute(mark, "");
    return () => { root.removeAttribute(mark); };
  }, [kind]);
}
