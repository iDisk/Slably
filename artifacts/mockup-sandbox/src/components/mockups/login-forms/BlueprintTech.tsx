import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Box } from "lucide-react";

export default function BlueprintTech() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans text-slate-900">
      {/* Blueprint Grid Background */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #dbeafe 1px, transparent 1px),
            linear-gradient(to bottom, #dbeafe 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Thicker major grid lines */}
      <div 
        className="absolute inset-0 z-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #bfdbfe 1px, transparent 1px),
            linear-gradient(to bottom, #bfdbfe 1px, transparent 1px)
          `,
          backgroundSize: '200px 200px'
        }}
      />

      <div className="relative z-10 w-full max-w-md bg-white border border-[#1e3a5f] shadow-sm">
        {/* Top Accent Bar */}
        <div className="h-1 w-full bg-[#0ea5e9]" />
        
        <div className="p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <Box className="w-8 h-8 text-[#1e3a5f]" />
              <span className="text-2xl font-bold tracking-widest text-[#1e3a5f]">SLABLY</span>
            </div>
            <div className="text-xs font-mono text-slate-500 uppercase tracking-widest mt-2 border-t border-slate-200 pt-2 w-full text-center">
              System Authorization
            </div>
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest text-[#1e3a5f]">
                Email Address
              </Label>
              <Input 
                type="email" 
                placeholder="operator@slably.com"
                className="rounded-none border-[#1e3a5f] focus-visible:ring-0 focus-visible:border-[#0ea5e9] bg-slate-50 font-mono text-sm h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-baseline">
                <Label className="text-xs font-mono uppercase tracking-widest text-[#1e3a5f]">
                  Security Key
                </Label>
                <a href="#" className="text-xs font-mono text-[#0ea5e9] hover:underline">
                  Reset
                </a>
              </div>
              <Input 
                type="password" 
                placeholder="••••••••"
                className="rounded-none border-[#1e3a5f] focus-visible:ring-0 focus-visible:border-[#0ea5e9] bg-slate-50 font-mono text-sm h-12 tracking-widest"
              />
            </div>

            <Button 
              className="w-full rounded-none bg-[#1e3a5f] hover:bg-[#1B3A5C] text-white font-mono uppercase tracking-widest h-12 mt-4"
            >
              Initialize Session →
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs font-mono text-slate-500">
              UNREGISTERED OPERATOR?{' '}
              <a href="#" className="text-[#0ea5e9] hover:underline font-bold">
                REQUEST ACCESS
              </a>
            </p>
          </div>
        </div>
      </div>
      
      {/* Corner crosshairs for technical feel */}
      <div className="fixed top-8 left-8 w-4 h-4 border-l border-t border-[#1e3a5f] opacity-50 pointer-events-none" />
      <div className="fixed top-8 right-8 w-4 h-4 border-r border-t border-[#1e3a5f] opacity-50 pointer-events-none" />
      <div className="fixed bottom-8 left-8 w-4 h-4 border-l border-b border-[#1e3a5f] opacity-50 pointer-events-none" />
      <div className="fixed bottom-8 right-8 w-4 h-4 border-r border-b border-[#1e3a5f] opacity-50 pointer-events-none" />
    </div>
  );
}