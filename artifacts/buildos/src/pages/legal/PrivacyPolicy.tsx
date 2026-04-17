import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-[hsl(222,47%,11%)] px-6 py-3">
        <Link href="/">
          <img src="/slably-logo.png" alt="Slably" className="h-11 cursor-pointer" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto py-12 px-6 prose prose-slate">
          <h1 className="text-3xl font-bold text-foreground">Privacy Policy</h1>
          <p className="text-muted-foreground">Effective Date: April 13, 2026</p>
          <hr className="my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Slably, Inc. operates Slably. This policy explains how we collect,
              use and protect your information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Account info: name, email, phone, company, license number</li>
              <li>Project data: contracts, invoices, expenses, photos</li>
              <li>Usage data: IP address, device info, pages visited</li>
              <li>Audio recordings from daily logs</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Provide platform features</li>
              <li>AI processing (OCR, contracts, transcription via OpenAI)</li>
              <li>Send transactional emails</li>
              <li>Detect fraud and ensure security</li>
              <li>Meet legal obligations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">4. How We Share Your Information</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your data. We share only with service providers: OpenAI (AI),
              Stripe (payments), Cloudflare R2 (storage), Resend (email). Public profiles
              are visible to other users.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Data Security</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>TLS/HTTPS encryption in transit</li>
              <li>AES-256 for sensitive data at rest</li>
              <li>Role-based access controls</li>
              <li>JWT authentication</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Account data: until deletion + 30 days</li>
              <li>Signed contracts: 7 years</li>
              <li>Audio recordings: 90 days</li>
              <li>Financial records: 7 years</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Access, correct or delete your data anytime. California residents have CCPA rights.
              Contact hello@slably.app. We respond within 30 days.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">8. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              Essential cookies only for session management. No advertising cookies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">9. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Slably is not for users under 18.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">10. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              Slably, Inc.<br />
              The Woodlands, Texas<br />
              hello@slably.app · slably.app
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-8 border-t">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a href="/terms" className="hover:underline">Terms of Service</a>
          <span>·</span>
          <a href="/privacy" className="hover:underline">Privacy Policy</a>
          <span>·</span>
          <span>© 2026 Slably · Slably, Inc.</span>
        </div>
      </footer>
    </div>
  );
}
