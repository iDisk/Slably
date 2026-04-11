import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardHat } from "lucide-react";

export function FieldSun() {
  return (
    <div className="min-h-screen w-full flex bg-[#fdf6ec] font-sans selection:bg-[#c2622d] selection:text-white">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32 py-12">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="bg-[#c2622d] p-2.5 rounded-xl text-white shadow-sm">
              <HardHat className="w-6 h-6" />
            </div>
            <span className="font-bold text-2xl tracking-tight text-[#4a3b32]">
              SLABLY
            </span>
          </div>

          {/* Header */}
          <div className="space-y-3 pt-4">
            <h1 className="text-4xl font-semibold tracking-tight text-[#3d2f26]">
              Welcome back
            </h1>
            <p className="text-[#8c7a6b] text-lg">
              Sign in to manage your projects and crews.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-6 pt-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#5a4a40] font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="h-14 bg-white/60 border-[#e8dccb] rounded-2xl px-4 text-lg focus-visible:ring-[#c2622d] focus-visible:border-[#c2622d] transition-all"
                />
              </div>
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#5a4a40] font-medium">
                    Password
                  </Label>
                  <a
                    href="#"
                    className="text-sm font-medium text-[#c2622d] hover:text-[#a04e22] transition-colors"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-14 bg-white/60 border-[#e8dccb] rounded-2xl px-4 text-lg focus-visible:ring-[#c2622d] focus-visible:border-[#c2622d] transition-all"
                />
              </div>
            </div>

            <Button className="w-full h-14 bg-[#c2622d] hover:bg-[#a04e22] text-white rounded-2xl text-lg font-medium shadow-md shadow-[#c2622d]/20 transition-all hover:shadow-lg hover:-translate-y-0.5">
              Sign in
            </Button>
          </div>

          {/* Footer */}
          <div className="pt-8 text-center text-[#8c7a6b]">
            Don't have an account?{" "}
            <a
              href="#"
              className="font-semibold text-[#c2622d] hover:text-[#a04e22] transition-colors"
            >
              Register here
            </a>
          </div>
        </div>
      </div>

      {/* Right Panel - Visual */}
      <div className="hidden lg:flex w-1/2 p-4">
        <div className="w-full h-full relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#c2622d] to-[#7a3b1a] shadow-xl">
          {/* Abstract texture background image */}
          <img
            src="/__mockup/images/fieldsun-bg.png"
            alt="Warm construction abstract"
            className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
          />
          
          {/* Overlay gradient to ensure text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#3d2f26]/80 via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 p-16 flex flex-col justify-end">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl max-w-lg">
              <svg
                className="w-10 h-10 text-[#fdf6ec]/60 mb-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <blockquote className="text-2xl font-medium text-[#fdf6ec] leading-snug mb-8">
                "Slably makes my mornings simple. I open it up with my coffee, and I know exactly where my crews need to be and what materials are arriving today."
              </blockquote>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#fdf6ec]/20 flex items-center justify-center font-bold text-[#fdf6ec] border border-[#fdf6ec]/30">
                  MJ
                </div>
                <div>
                  <div className="font-semibold text-[#fdf6ec] text-lg">Marcus Johnson</div>
                  <div className="text-[#fdf6ec]/70">Field Superintendent, Apex Builders</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FieldSun;
