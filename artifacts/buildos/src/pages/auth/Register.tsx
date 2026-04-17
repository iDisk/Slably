import React, { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowRight, ArrowLeft, Loader2, Briefcase, Home, Calculator,
  Store, Building2, X, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "@/hooks/use-auth";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

type Step = "role" | "mainCategory" | "specialty" | "form";

const registerSchema = z.object({
  name:          z.string().min(2, "Name is required"),
  email:         z.string().email("Please enter a valid email"),
  password:      z.string().min(6, "Password must be at least 6 characters"),
  role:          z.enum(["builder", "client", "subcontractor", "supplier", "accountant", "realtor"]),
  companyName:   z.string().optional(),
  state:         z.string().optional(),
  phone:         z.string().optional(),
  category:      z.string().optional(),
  serviceCity:   z.string().optional(),
  serviceRadius: z.coerce.number().optional(),
  firmName:      z.string().optional(),
  brokerage:     z.string().optional(),
  licenseNumber: z.string().optional(),
  termsAccepted: z.boolean().refine(v => v === true, {
    message: "You must accept the Terms of Service and Privacy Policy to continue",
  }),
}).superRefine((data, ctx) => {
  if (data.role === "builder") {
    if (!data.companyName || data.companyName.trim().length < 2)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company name is required", path: ["companyName"] });
    if (!data.state)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required", path: ["state"] });
  }
  if (data.role === "subcontractor") {
    if (!data.category)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required", path: ["category"] });
    if (!data.serviceCity || data.serviceCity.trim().length < 2)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Primary city is required", path: ["serviceCity"] });
    if (!data.state)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required", path: ["state"] });
  }
  if (data.role === "supplier") {
    if (!data.companyName || data.companyName.trim().length < 2)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company name is required", path: ["companyName"] });
    if (!data.serviceCity || data.serviceCity.trim().length < 2)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City is required", path: ["serviceCity"] });
    if (!data.state)
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required", path: ["state"] });
  }
});

type RegisterForm = z.infer<typeof registerSchema>;

interface RoleOption {
  role: "builder" | "client" | "subcontractor" | "supplier" | "accountant" | "realtor";
  Icon: React.ElementType;
  label: string;
  subtitle: string;
  isPro?: boolean;
}

const ROLE_OPTIONS: RoleOption[] = [
  { role: "subcontractor", Icon: Briefcase,  label: "I'm a Pro",        subtitle: "Contractor, specialist or any service provider", isPro: true },
  { role: "client",        Icon: Home,       label: "I'm a Home Owner",  subtitle: "I have a project or need a service" },
  { role: "accountant",    Icon: Calculator, label: "I'm a Tax Pro",     subtitle: "Accountant, CPA or tax preparer" },
  { role: "supplier",      Icon: Store,      label: "I'm a Supplier",    subtitle: "I sell materials, products or equipment" },
  { role: "realtor",       Icon: Building2,  label: "I'm a Realtor",     subtitle: "Real estate agent or broker" },
];

const PRO_CATEGORIES = [
  { id: "construction", emoji: "🔨", label: "Construction",              desc: "Building, remodeling and trades" },
  { id: "outdoor",      emoji: "🌿", label: "Outdoor & Landscaping",     desc: "Pools, gardens and outdoor spaces" },
  { id: "cleaning",     emoji: "🧹", label: "Cleaning & Site Services",  desc: "Post-construction and maintenance" },
  { id: "technology",   emoji: "💻", label: "Technology & Digital",      desc: "BIM, smart systems and construction tech" },
  { id: "advanced",     emoji: "🔩", label: "Advanced Specialists",      desc: "Energy, environmental and complex systems" },
  { id: "other",        emoji: "📋", label: "Other",                     desc: "My specialty is not listed above" },
];

const SPECIALTIES: Record<string, string[]> = {
  construction: [
    "Concrete Contractor", "Foundation Specialist", "Framer", "Mason (Brick, Block, Stone)",
    "Demolition Contractor", "Excavation Contractor", "Electrician", "Plumber", "HVAC Technician",
    "Fire Sprinkler Installer", "Finish Carpenter", "Cabinet Maker", "Door Installer",
    "Drywall Installer", "Painter (Interior / Exterior)", "Tile Installer", "Hardwood Floor Installer",
    "Vinyl / LVP Installer", "Carpet Installer", "Countertop Installer", "Roofer",
    "Waterproofing Contractor", "Siding Contractor", "Window Installer", "Gutter Installer",
    "General Contractor", "Remodeling Contractor", "Other Construction",
  ],
  outdoor: [
    "Pool Builder", "Pool Remodeling Specialist", "Spa / Jacuzzi Builder", "Landscape Contractor",
    "Irrigation Specialist", "Drainage Specialist", "Tree Service", "Masonry / Hardscape",
    "Outdoor Fireplace Builder", "Retaining Wall Specialist", "Paver Installer", "Deck Builder",
    "Pergola / Patio Cover Builder", "Outdoor Kitchen Builder", "Fence Contractor",
    "Landscape Lighting Installer", "Other Outdoor",
  ],
  cleaning: [
    "Post-Construction Cleaning", "Pressure Washing", "Window Cleaning", "Debris Removal",
    "Dumpster / Waste Removal", "Hazardous Material Cleanup", "Other Cleaning",
  ],
  technology: [
    "BIM Modeler", "CAD Designer / Draftsman", "3D Rendering Artist", "Drone Operator",
    "Smart Home Integrator", "Security Systems Installer", "Construction Software Specialist",
    "Other Technology",
  ],
  advanced: [
    "Solar Panel Installer", "EV Charger Installer", "Energy Efficiency Consultant",
    "Elevator / Lift Contractor", "Environmental Consultant", "Hazardous Materials Specialist",
    "Other Specialist",
  ],
};

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const registerMutation = useRegister();

  const [step, setStep]               = useState<Step>("role");
  const [proCategory, setProCategory] = useState<string | null>(null);
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [categorySearch, setCategorySearch]   = useState("");
  const [specialtySearch, setSpecialtySearch] = useState("");

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "subcontractor", termsAccepted: false },
  });

  const selectedRole     = watch("role");
  const selectedCategory = watch("category");

  const selectedRoleOption = ROLE_OPTIONS.find(r => r.role === selectedRole);

  const onSubmit = (data: RegisterForm) => {
    const finalCategory = proCategory === "other" ? customSpecialty || "other" : data.category;
    registerMutation.mutate(
      {
        data: {
          name:          data.name,
          email:         data.email,
          password:      data.password,
          role:          data.role as any,
          companyName:   data.companyName   || undefined,
          state:         data.state         || undefined,
          phone:         data.phone         || undefined,
          category:      finalCategory      || undefined,
          serviceCity:   data.serviceCity   || undefined,
          serviceRadius: data.serviceRadius || undefined,
          firmName:      data.firmName      || undefined,
          brokerage:     data.brokerage     || undefined,
          licenseNumber: data.licenseNumber || undefined,
          termsAccepted: true,
        },
      },
      {
        onSuccess: (res) => {
          login(res.token);
          toast.success("Account created successfully!");
          const role = res.user.role;
          setLocation(
            role === "builder" || role === "supplier" || role === "realtor" ? "/dashboard"
            : role === "subcontractor" ? "/sub-dashboard"
            : role === "accountant"   ? "/tax-pro"
            : "/client"
          );
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to register.");
        },
      }
    );
  };

  const slideVariants = {
    enter:  { x: 40, opacity: 0 },
    center: { x: 0,  opacity: 1 },
    exit:   { x: -40, opacity: 0 },
  };

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[580px] lg:px-12 xl:px-20 border-r border-border bg-white z-10 shadow-2xl overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mx-auto w-full max-w-md py-10"
        >
          <div className="flex items-center gap-3 mb-8">
            <Link href="/" className="cursor-pointer">
              <img src="/slably-logo.png" alt="Slably" className="h-12 w-auto" />
            </Link>
          </div>

          <AnimatePresence mode="wait">
            {/* ═══════════════ PASO A — ROLE CARDS ═══════════════ */}
            {step === "role" && (
              <motion.div
                key="role"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-2xl font-display font-bold text-foreground">Create your account</h2>
                <p className="mt-1 text-sm text-muted-foreground mb-6">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:text-accent transition-colors">
                    Sign in
                  </Link>
                </p>

                <div className="space-y-3">
                  {ROLE_OPTIONS.map((opt) => {
                    const { Icon } = opt;
                    return (
                      <button
                        key={opt.role}
                        type="button"
                        onClick={() => {
                          setValue("role", opt.role as any);
                          if (opt.isPro) {
                            setStep("mainCategory");
                          } else {
                            setStep("form");
                          }
                        }}
                        className="w-full flex items-center gap-4 border-2 border-border rounded-xl px-5 py-4 text-left hover:border-primary/50 hover:bg-primary/3 transition-all group"
                      >
                        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-foreground">{opt.label}</div>
                          <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{opt.subtitle}</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══════════════ PASO B — MAIN CATEGORY ═══════════════ */}
            {step === "mainCategory" && (
              <motion.div
                key="mainCategory"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => setStep("role")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <h2 className="text-2xl font-display font-bold text-foreground">What type of work do you do?</h2>
                <p className="mt-1 text-sm text-muted-foreground mb-4">Select your main category</p>

                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {PRO_CATEGORIES.filter(c =>
                    c.label.toLowerCase().includes(categorySearch.toLowerCase()) ||
                    c.desc.toLowerCase().includes(categorySearch.toLowerCase())
                  ).map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setProCategory(cat.id);
                        setStep("specialty");
                      }}
                      className="flex flex-col items-start gap-1.5 border-2 border-border rounded-xl px-4 py-4 text-left hover:border-primary/50 hover:bg-primary/3 transition-all group"
                    >
                      <span className="text-xl">{cat.emoji}</span>
                      <span className="font-semibold text-sm text-foreground leading-tight">{cat.label}</span>
                      <span className="text-[11px] text-muted-foreground leading-snug">{cat.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ═══════════════ PASO C — SPECIALTY ═══════════════ */}
            {step === "specialty" && (
              <motion.div
                key="specialty"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => setStep("mainCategory")}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <h2 className="text-2xl font-display font-bold text-foreground">What's your specialty?</h2>
                <p className="mt-1 text-sm text-muted-foreground mb-4">
                  Select the option that best describes your work
                </p>

                {proCategory === "other" ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customSpecialty">Describe your specialty</Label>
                      <Input
                        id="customSpecialty"
                        placeholder="Describe your specialty"
                        value={customSpecialty}
                        onChange={(e) => setCustomSpecialty(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full"
                      disabled={!customSpecialty.trim()}
                      onClick={() => {
                        setValue("category", customSpecialty);
                        setStep("form");
                      }}
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search your specialty..."
                        value={specialtySearch}
                        onChange={e => setSpecialtySearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    {(() => {
                      const all = SPECIALTIES[proCategory ?? ""] ?? [];
                      const filtered = all.filter(s =>
                        s.toLowerCase().includes(specialtySearch.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return (
                          <p className="text-center text-muted-foreground text-sm py-4">
                            No results for "{specialtySearch}". Try a different search or select "Other" below.
                          </p>
                        );
                      }
                      return (
                        <div className="grid grid-cols-2 gap-2 max-h-[380px] overflow-y-auto pr-1">
                          {filtered.map((spec) => {
                            const isSelected = selectedCategory === spec;
                            return (
                              <button
                                key={spec}
                                type="button"
                                onClick={() => {
                                  setValue("category", spec);
                                  setStep("form");
                                }}
                                className={`text-left border-2 rounded-lg px-3 py-2.5 text-xs font-medium leading-tight transition-all ${
                                  isSelected
                                    ? "border-primary bg-primary/5 text-primary"
                                    : "border-border hover:border-primary/40 text-foreground hover:bg-muted/40"
                                }`}
                              >
                                {spec}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </motion.div>
            )}

            {/* ═══════════════ PASO D — FORM ═══════════════ */}
            {step === "form" && (
              <motion.div
                key="form"
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (selectedRoleOption?.isPro) {
                      setStep("specialty");
                    } else {
                      setStep("role");
                    }
                  }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </button>

                <h2 className="text-2xl font-display font-bold text-foreground">
                  {selectedRoleOption?.label ?? "Create your account"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground mb-5">
                  Already have an account?{" "}
                  <Link href="/login" className="font-semibold text-primary hover:text-accent transition-colors">
                    Sign in
                  </Link>
                </p>

                {/* Specialty badge (Pro only) */}
                {selectedRoleOption?.isPro && selectedCategory && (
                  <div className="flex items-center gap-2 bg-primary/6 border border-primary/20 rounded-lg px-3 py-2 mb-5 text-sm">
                    <span className="text-primary">🔨</span>
                    <span className="font-medium text-primary flex-1">{selectedCategory}</span>
                    <button
                      type="button"
                      onClick={() => setStep("specialty")}
                      className="text-xs text-muted-foreground hover:text-primary underline underline-offset-2 transition-colors"
                    >
                      Change
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="John Doe" {...register("name")} />
                    {errors.name && <p className="text-xs text-destructive font-medium">{errors.name.message}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email address *</Label>
                    <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
                    {errors.email && <p className="text-xs text-destructive font-medium">{errors.email.message}</p>}
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="password">Password *</Label>
                    <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
                    {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
                  </div>

                  {/* Phone — all roles */}
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">
                      Phone <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input id="phone" placeholder="(555) 123-4567" {...register("phone")} />
                  </div>

                  {/* ─── Pro fields ─── */}
                  {selectedRole === "subcontractor" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="serviceCity">Primary City *</Label>
                        <Input id="serviceCity" placeholder="Houston" {...register("serviceCity")} />
                        {errors.serviceCity && <p className="text-xs text-destructive font-medium">{errors.serviceCity.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="state">State *</Label>
                        <Select id="state" {...register("state")}>
                          <option value="">Select...</option>
                          {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </Select>
                        {errors.state && <p className="text-xs text-destructive font-medium">{errors.state.message}</p>}
                      </div>
                    </div>
                  )}

                  {/* ─── Tax Pro fields ─── */}
                  {selectedRole === "accountant" && (
                    <div className="space-y-1.5">
                      <Label htmlFor="firmName">
                        Firm Name <span className="text-muted-foreground text-xs">(optional)</span>
                      </Label>
                      <Input id="firmName" placeholder="Smith Tax Services" {...register("firmName")} />
                    </div>
                  )}

                  {/* ─── Supplier fields ─── */}
                  {selectedRole === "supplier" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="companyName">Company Name *</Label>
                        <Input id="companyName" placeholder="Smith Supply Co." {...register("companyName")} />
                        {errors.companyName && <p className="text-xs text-destructive font-medium">{errors.companyName.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="serviceCity">City *</Label>
                          <Input id="serviceCity" placeholder="Houston" {...register("serviceCity")} />
                          {errors.serviceCity && <p className="text-xs text-destructive font-medium">{errors.serviceCity.message}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="state">State *</Label>
                          <Select id="state" {...register("state")}>
                            <option value="">Select...</option>
                            {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </Select>
                          {errors.state && <p className="text-xs text-destructive font-medium">{errors.state.message}</p>}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ─── Realtor fields ─── */}
                  {selectedRole === "realtor" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="brokerage">
                          Brokerage / Agency <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input id="brokerage" placeholder="Keller Williams, RE/MAX..." {...register("brokerage")} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="licenseNumber">
                          License # <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input id="licenseNumber" placeholder="TX-12345678" {...register("licenseNumber")} />
                      </div>
                    </>
                  )}

                  {/* ─── Legal consent checkbox ─── */}
                  <div className="space-y-1">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        id="termsAccepted"
                        {...register("termsAccepted")}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground leading-relaxed">
                        I agree to the{" "}
                        <Link
                          href="/terms"
                          target="_blank"
                          className="underline underline-offset-2 text-foreground hover:text-primary transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                          href="/privacy"
                          target="_blank"
                          className="underline underline-offset-2 text-foreground hover:text-primary transition-colors"
                          onClick={e => e.stopPropagation()}
                        >
                          Privacy Policy
                        </Link>
                      </span>
                    </label>
                    {errors.termsAccepted && (
                      <p className="text-xs text-destructive font-medium pl-7">
                        {errors.termsAccepted.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-base h-12 mt-1"
                    disabled={registerMutation.isPending || !watch("termsAccepted")}
                  >
                    {registerMutation.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <>Create Account <ArrowRight className="ml-2 h-5 w-5" /></>
                    )}
                  </Button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
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
