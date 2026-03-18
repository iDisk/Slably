import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Building2, ArrowRight, Loader2, User, HardHat } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/hooks/use-auth";
import { useRegister, RegisterBody, RegisterBodyRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const registerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["builder", "client"]),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const registerMutation = useRegister();

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterBody>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'builder' }
  });

  const selectedRole = watch("role");

  const onSubmit = (data: RegisterBody) => {
    registerMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token);
        toast.success("Account created successfully!");
        setLocation(res.user.role === 'builder' ? '/dashboard' : '/client');
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to register.");
      }
    });
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[540px] lg:px-12 xl:px-24 border-r border-border bg-white z-10 shadow-2xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mx-auto w-full max-w-sm lg:w-[400px]">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="text-primary-foreground h-7 w-7" />
            </div>
            <span className="text-foreground font-display font-extrabold text-3xl tracking-tight">BuildOS</span>
          </div>

          <h2 className="text-3xl font-display font-bold text-foreground">Create an account</h2>
          <p className="mt-2 text-sm text-muted-foreground mb-8">
            Already have an account? <Link href="/login" className="font-semibold text-primary hover:text-accent transition-colors">Sign in</Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div 
                onClick={() => setValue("role", "builder")}
                className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${selectedRole === 'builder' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30 text-muted-foreground'}`}
              >
                <HardHat className="h-6 w-6" />
                <span className="font-semibold text-sm">Builder</span>
              </div>
              <div 
                onClick={() => setValue("role", "client")}
                className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${selectedRole === 'client' ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:border-primary/30 text-muted-foreground'}`}
              >
                <User className="h-6 w-6" />
                <span className="font-semibold text-sm">Client</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive font-medium">{errors.name.message}</p>}
            </div>

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

            <Button type="submit" className="w-full text-base h-12 mt-2" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Create Account"}
              {!registerMutation.isPending && <ArrowRight className="ml-2 h-5 w-5" />}
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
      </div>
    </div>
  );
}
