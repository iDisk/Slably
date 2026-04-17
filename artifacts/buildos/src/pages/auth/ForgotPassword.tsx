import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ForgotPassword() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Something went wrong.");
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] lg:px-12 xl:px-24 border-r border-border bg-white z-10 shadow-2xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto w-full max-w-sm lg:w-96"
        >
          <div className="flex items-center gap-3 mb-10">
            <Link href="/" className="cursor-pointer">
              <img src="/slably-logo.png" alt="Slably" className="h-12 w-auto" />
            </Link>
          </div>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-14 w-14 text-green-500" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We sent a reset link to <span className="font-semibold text-foreground">{email}</span>.
                Check your inbox and spam folder.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline mt-4"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-display font-bold text-foreground">Forgot your password?</h2>
              <p className="mt-2 text-sm text-muted-foreground mb-8">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="text-sm text-destructive font-medium">{error}</p>}

                <Button type="submit" className="w-full text-base h-12" disabled={loading || !email}>
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Send Reset Link"}
                </Button>

                <div className="text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back to Sign In
                  </Link>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>

      <div className="hidden lg:block relative w-full flex-1 bg-sidebar">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-80 mix-blend-overlay"
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Architectural Blueprint"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/50 to-transparent" />
      </div>
    </div>
  );
}
