import { useState } from "react";
import { useLocation, Link } from "wouter";
import { CheckCircle, Eye, EyeOff, Loader2, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token");

  const [newPassword, setNewPassword]           = useState("");
  const [confirmPassword, setConfirmPassword]   = useState("");
  const [showNew, setShowNew]                   = useState(false);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [success, setSuccess]                   = useState(false);
  const [error, setError]                       = useState("");

  if (!token) {
    setLocation("/login");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Something went wrong.");
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const isInvalidToken =
    error === "Invalid or expired reset token";

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

          {success ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <CheckCircle className="h-14 w-14 text-green-500" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                Password updated successfully!
              </h2>
              <p className="text-sm text-muted-foreground">
                You can now sign in with your new password.
              </p>
              <Button className="w-full h-12 text-base mt-2" onClick={() => setLocation("/login")}>
                Sign In
              </Button>
            </div>
          ) : isInvalidToken ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <XCircle className="h-14 w-14 text-destructive" />
              </div>
              <h2 className="text-2xl font-display font-bold text-foreground">
                Link invalid or expired
              </h2>
              <p className="text-sm text-muted-foreground">
                This reset link is invalid or has expired.
              </p>
              <Button
                className="w-full h-12 text-base mt-2"
                variant="outline"
                onClick={() => setLocation("/forgot-password")}
              >
                Request new link
              </Button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-display font-bold text-foreground">Create new password</h2>
              <p className="mt-2 text-sm text-muted-foreground mb-8">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password *</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {error && !isInvalidToken && (
                  <p className="text-sm text-destructive font-medium">{error}</p>
                )}

                <Button
                  type="submit"
                  className="w-full text-base h-12"
                  disabled={loading || !newPassword || !confirmPassword}
                >
                  {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Update Password"}
                </Button>
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
