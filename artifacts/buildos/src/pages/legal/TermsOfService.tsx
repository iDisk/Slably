import { Link } from "wouter";

export default function TermsOfService() {
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
          <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
          <p className="text-muted-foreground">Effective Date: April 13, 2026</p>
          <hr className="my-6" />

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By creating an account or using Slably, you agree to be bound by these Terms.
              Slably is operated by Slably, Inc., registered in Texas, USA.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Slably is a cloud-based platform providing project management, contracts,
              digital signatures, expense tracking, invoicing, and related services for
              construction professionals and property owners.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">3. Eligibility</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must be at least 18 years old to use Slably.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">4. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You must provide accurate information when registering. You are responsible
              for all activity under your account. We may suspend accounts for violations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
              <li>Use the Platform for unlawful purposes</li>
              <li>Upload false or fraudulent information</li>
              <li>Impersonate any person or entity</li>
              <li>Attempt unauthorized access</li>
              <li>Upload malicious code</li>
              <li>Violate applicable laws</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">6. Digital Signatures</h2>
            <p className="text-muted-foreground leading-relaxed">
              Electronic signatures created through Slably are legally binding under the ESIGN Act.
              Slably records IP address, timestamp and device information for each signature.
              Slably is not a law firm and does not provide legal advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">7. Payments and Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed">
              Paid plans are billed monthly or annually. Payments processed by Stripe.
              Cancel anytime — takes effect end of billing period. No refunds for partial
              periods. Price changes with 30 days notice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">8. AI-Generated Content</h2>
            <p className="text-muted-foreground leading-relaxed">
              AI features are for informational purposes only. Review all AI-generated
              content before use. AI contracts are not a substitute for legal advice.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">9. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground leading-relaxed uppercase font-medium">
              THE PLATFORM IS PROVIDED AS IS. SLABLY DOES NOT WARRANT UNINTERRUPTED
              OR ERROR-FREE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed uppercase font-medium">
              SLABLY SHALL NOT BE LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES.
              TOTAL LIABILITY LIMITED TO AMOUNTS PAID IN THE PRIOR 12 MONTHS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">11. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              Governed by Texas law. Disputes resolved by arbitration in Houston, TX.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-2">12. Contact</h2>
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
