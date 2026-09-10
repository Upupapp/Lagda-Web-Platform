import type { ReactNode } from "react";
import { Link } from "react-router";
import { usePageMeta } from "../hooks/usePageMeta";
import lagdaLogo from "../../brand elements/svg/LagdaLogoPrimaryHorizontalFullColor.svg";

export function CreateAccountLayout({ children }: { children: ReactNode }) {
  usePageMeta();

  return (
    <div className="create-account-shell">
      <div className="create-account-frame">
        <Link
          to="/esignature"
          className="create-account-back"
          aria-label="Go back to the LAGDA eSignature page"
        >
          <span aria-hidden="true">←</span> Back to LAGDA eSignature
        </Link>
        <main className="create-account-main">
          <section
            className="create-account-card"
            aria-label="Create account form"
          >
            <div className="create-account-card-header">
              <img src={lagdaLogo} alt="LAGDA" />
              <h1>Set Up Your Digital Signing Workspace</h1>
            </div>
            {children}
          </section>
        </main>
        <footer className="create-account-footer">
          <img
            className="create-account-footer-logo"
            src={lagdaLogo}
            alt="LAGDA"
          />
          <p className="create-account-footer-description">
            The Philippine-first electronic signature and document verification
            platform for legal, business, and institutional workflows.
          </p>
          <p className="create-account-footer-product">
            A product of UpUp Technologies
          </p>
          <p className="create-account-footer-copyright">
            © 2026 UpUp Technologies. LAGDA and the LAGDA shield mark are
            trademarks of UpUp Technologies.
          </p>
        </footer>
      </div>
      <style>{`
				.create-account-shell { min-height: 100vh; background: #f8fbff; color: #07111f; font-family: 'Geist', 'Inter', sans-serif; padding: 24px clamp(20px, 5vw, 72px); }
				.create-account-frame { max-width: 1080px; min-height: calc(100vh - 48px); margin: 0 auto; }
				.create-account-back { display: inline-flex; align-items: center; gap: 8px; color: #0078d4; font-size: 12px; font-weight: 700; text-decoration: none; }
				.create-account-back span { font-size: 18px; line-height: 0; }
				.create-account-main { display: flex; justify-content: center; padding: 36px 0; }
				.create-account-card { width: 100%; box-sizing: border-box; background: #ffffff; border: 1px solid #dbeafe; border-radius: 18px; padding: 36px 48px 42px; box-shadow: 0 18px 50px rgba(7,17,31,0.08); }
				.create-account-card-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin-bottom: 28px; }
				.create-account-card-header img { display: block; width: 273px; height: 78px; object-fit: cover; object-position: left center; }
				.create-account-card-header h1 { color: #050505; font-family: 'Palatino Linotype', Palatino, Georgia, serif; font-size: 22px; font-weight: 700; line-height: 1.08; letter-spacing: -0.015em; text-align: right; text-transform: uppercase; max-width: 330px; margin: 0; }
				.create-account-footer { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 28px 12px 4px; color: #64748b; font-size: 11px; text-align: center; }
				.create-account-footer-logo { display: block; width: 205px; height: 65px; object-fit: cover; margin-bottom: 3px; position: relative; top: 13px; }
				.create-account-footer p { max-width: 680px; margin: 0; line-height: 1.55; }
				.create-account-footer-description { color: #334155; font-size: 12px; }
				.create-account-footer-product { color: #64748b; font-weight: 600; }
				.create-account-footer-copyright { color: #94a3b8; font-size: 10px; }
				.create-account-back:focus-visible { outline: 2px solid #0078d4; outline-offset: 4px; border-radius: 4px; }
				@media (max-width: 640px) {
					.create-account-shell { padding: 16px; }
					.create-account-main { padding: 24px 0; }
					  .create-account-card { padding: 24px 20px 30px; }
					  .create-account-card-header { flex-direction: column; gap: 4px; margin-bottom: 20px; flex-wrap: wrap; justify-content: center; align-items: center; }
					  .create-account-card-header img { width: 220px; height: 70px; }
					  .create-account-card-header h1 { font-size: 17px; text-align: center; max-width: none; }
					  .create-account-footer { padding-top: 24px; }
					  .create-account-footer-logo { width: 189px; height: 60px; top: 17px; position: relative; }
				}
			`}</style>
    </div>
  );
}
