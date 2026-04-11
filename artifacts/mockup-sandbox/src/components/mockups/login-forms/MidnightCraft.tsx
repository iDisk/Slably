import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardHat, ArrowRight } from "lucide-react";

export default function MidnightCraft() {
  return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-4 text-slate-200 font-sans selection:bg-amber-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-[#0f1117] to-[#0f1117] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 p-2 rounded-lg">
              <HardHat className="w-6 h-6 text-[#0f1117]" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">SLABLY</span>
          </div>
        </div>

        <div className="bg-[#151821]/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-semibold text-white mb-2 tracking-tight">Welcome back</h1>
              <p className="text-slate-400 text-sm">Sign in to your account to continue</p>
            </div>

            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm font-medium">Email address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  className="bg-[#0a0c10] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/50 h-11"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300 text-sm font-medium">Password</Label>
                  <a href="#" className="text-sm font-medium text-amber-500 hover:text-amber-400 transition-colors">
                    Forgot password?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="bg-[#0a0c10] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/50 focus-visible:border-amber-500/50 h-11"
                />
              </div>

              <Button className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-[#0f1117] font-semibold text-base transition-all mt-2 group">
                Sign in
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </div>
          
          <div className="p-6 border-t border-white/5 bg-[#1a1d27]/50 text-center">
            <p className="text-sm text-slate-400">
              Don't have an account?{" "}
              <a href="#" className="font-medium text-amber-500 hover:text-amber-400 transition-colors">
                Register here
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
