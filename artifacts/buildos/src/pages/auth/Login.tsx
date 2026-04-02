import { useLocation, Link, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/hooks/use-auth";
import { useLogin, LoginBody } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const sessionExpired = new URLSearchParams(search).get("reason") === "session_expired";
  const { login } = useAuth();
  const loginMutation = useLogin();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginBody>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = (data: LoginBody) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token);
        toast.success("Welcome back!");
        const next = new URLSearchParams(window.location.search).get("next");
        if (next) {
          window.location.href = decodeURIComponent(next);
        } else {
          setLocation(res.user.role === 'builder' ? '/dashboard' : '/client');
        }
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to login. Please check credentials.");
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[480px] lg:px-12 xl:px-24 border-r border-border bg-white z-10 shadow-2xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex items-center gap-3 mb-10">
            <img src="/slably-logo.png" alt="Slably" className="h-12 w-auto" />
          </div>

          {sessionExpired && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Tu sesión expiró. Por favor inicia sesión de nuevo.</span>
            </div>
          )}

          <h2 className="text-3xl font-display font-bold text-foreground">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground mb-8">
            Don't have an account? <Link href="/register" className="font-semibold text-primary hover:text-accent transition-colors">Register here</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive font-medium">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive font-medium">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full text-base h-12" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Sign in"}
              {!loginMutation.isPending && <ArrowRight className="ml-2 h-5 w-5" />}
            </Button>
          </form>
        </motion.div>
      </div>
      
      <div className="hidden lg:block relative w-full flex-1 bg-sidebar">
        <img
          className="absolute inset-0 h-full w-full object-cover opacity-80 mix-blend-overlay"
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Architectural Blueprint"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sidebar via-sidebar/50 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-sidebar-foreground">
          <blockquote className="space-y-4">
            <p className="text-3xl font-display font-medium leading-tight">
              "Slably has completely transformed how we manage projects and communicate with our clients. Everything is in one place, beautiful and transparent."
            </p>
            <footer className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold text-lg">
                JD
              </div>
              <div>
                <p className="font-bold text-lg">John Doe</p>
                <p className="text-sidebar-foreground/70">Founder, Apex Construction</p>
              </div>
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
}
