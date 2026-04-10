import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowRight, Loader2, User, HardHat, Wrench, Store } from "lucide-react";
import { motion } from "framer-motion";

import { useAuth } from "@/hooks/use-auth";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";

const registerSchema = z.object({
  name:          z.string().min(2, "Name is required"),
  email:         z.string().email("Please enter a valid email"),
  password:      z.string().min(6, "Password must be at least 6 characters"),
  role:          z.enum(["builder", "client", "subcontractor", "supplier"]),
  companyName:   z.string().optional(),
  state:         z.string().optional(),
  phone:         z.string().optional(),
  category:      z.string().optional(),
  serviceCity:   z.string().optional(),
  serviceRadius: z.coerce.number().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "builder") {
    if (!data.companyName || data.companyName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company name is required", path: ["companyName"] });
    }
    if (!data.state) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "State is required", path: ["state"] });
    }
  }
  if (data.role === "subcontractor") {
    if (!data.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required", path: ["category"] });
    }
    if (!data.serviceCity || data.serviceCity.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Service city is required", path: ["serviceCity"] });
    }
  }
  if (data.role === "supplier") {
    if (!data.companyName || data.companyName.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Company name is required", path: ["companyName"] });
    }
    if (!data.category) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Category is required", path: ["category"] });
    }
    if (!data.serviceCity || data.serviceCity.trim().length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "City is required", path: ["serviceCity"] });
    }
  }
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const registerMutation = useRegister();

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "builder", serviceRadius: 25 },
  });

  const selectedRole = watch("role");

  const onSubmit = (data: RegisterForm) => {
    registerMutation.mutate(
      {
        data: {
          name:        data.name,
          email:       data.email,
          password:    data.password,
          role:          data.role as "builder" | "client" | "subcontractor" | "supplier",
          companyName:   data.companyName   || undefined,
          state:         data.state         || undefined,
          phone:         data.phone         || undefined,
          category:      data.category      || undefined,
          serviceCity:   data.serviceCity   || undefined,
          serviceRadius: data.serviceRadius || undefined,
        },
      },
      {
        onSuccess: (res) => {
          login(res.token);
          toast.success("Account created successfully!");
          setLocation(
            res.user.role === "builder" ? "/dashboard"
            : res.user.role === "client" ? "/client"
            : "/network"
          );
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to register.");
        },
      }
    );
  };

  const roleCards = [
    { value: "builder",       icon: HardHat, label: "Builder",    subtitle: "Construyo y administro proyectos" },
    { value: "subcontractor", icon: Wrench,  label: "Sub",        subtitle: "Ofrezco servicios de construcción" },
    { value: "client",        icon: User,    label: "Cliente",    subtitle: "Tengo un proyecto en construcción" },
    { value: "supplier",      icon: Store,   label: "Supplier",   subtitle: "I sell materials and equipment" },
  ] as const;

  return (
    <div className="min-h-screen flex bg-background">
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-[540px] lg:px-12 xl:px-24 border-r border-border bg-white z-10 shadow-2xl">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mx-auto w-full max-w-sm lg:w-[400px]">
          <div className="flex items-center gap-3 mb-8">
            <img src="/slably-logo.png" alt="Slably" className="h-12 w-auto" />
          </div>

          <h2 className="text-3xl font-display font-bold text-foreground">Create an account</h2>
          <p className="mt-2 text-sm text-muted-foreground mb-8">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:text-accent transition-colors">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Role selector — 2×2 grid */}
            <div className="grid grid-cols-2 gap-3 mb-2">
              {roleCards.map(({ value, icon: Icon, label }) => (
                <div
                  key={value}
                  onClick={() => setValue("role", value)}
                  className={`cursor-pointer border-2 rounded-xl p-4 flex flex-col items-center gap-2 transition-all ${
                    selectedRole === value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/30 text-muted-foreground"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-semibold text-sm">{label}</span>
                </div>
              ))}
            </div>

            {/* Subcontractor fields */}
            {selectedRole === "subcontractor" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="category">Trade / Category *</Label>
                  <Select id="category" {...register("category")}>
                    <option value="">Select category...</option>
                    <optgroup label="General Contractors">
                      <option value="general_contractor">General Contractor</option>
                      <option value="commercial">Commercial Builder</option>
                      <option value="pool">Pool Builder</option>
                      <option value="remodeler">Remodeler</option>
                    </optgroup>
                    <optgroup label="Trade Specialists">
                      <option value="framer">Framer</option>
                      <option value="electrician">Electrician</option>
                      <option value="plumber">Plumber</option>
                      <option value="hvac">HVAC</option>
                      <option value="painter">Painter</option>
                      <option value="concrete">Concrete</option>
                      <option value="roofer">Roofer</option>
                      <option value="drywall">Drywall</option>
                      <option value="tile">Tile / Flooring</option>
                      <option value="carpenter">Carpenter</option>
                      <option value="landscaper">Landscaper</option>
                      <option value="other">Other</option>
                    </optgroup>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive font-medium">{errors.category.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceCity">Service City *</Label>
                  <Input id="serviceCity" placeholder="Ciudad donde trabajas (ej. Houston, TX)" {...register("serviceCity")} />
                  {errors.serviceCity && <p className="text-sm text-destructive font-medium">{errors.serviceCity.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="serviceRadius">Service Radius</Label>
                  <Select id="serviceRadius" {...register("serviceRadius", { valueAsNumber: true })}>
                    <option value={10}>10 miles</option>
                    <option value={25}>25 miles</option>
                    <option value={50}>50 miles</option>
                    <option value={100}>100 miles</option>
                  </Select>
                </div>
              </>
            )}

            {/* Supplier fields */}
            {selectedRole === "supplier" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company name *</Label>
                  <Input id="companyName" placeholder="González Supply Co." {...register("companyName")} />
                  {errors.companyName && <p className="text-sm text-destructive font-medium">{errors.companyName.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Product category *</Label>
                  <Select id="category" {...register("category")}>
                    <option value="">Select category...</option>
                    <option value="materiales">Construction materials</option>
                    <option value="equipos">Equipment & machinery</option>
                    <option value="herramientas">Tools</option>
                    <option value="varios">General / Other</option>
                  </Select>
                  {errors.category && <p className="text-sm text-destructive font-medium">{errors.category.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="serviceCity">Ciudad principal *</Label>
                    <Input id="serviceCity" placeholder="Houston, TX" {...register("serviceCity")} />
                    {errors.serviceCity && <p className="text-sm text-destructive font-medium">{errors.serviceCity.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" placeholder="(555) 123-4567" {...register("phone")} />
                  </div>
                </div>
              </>
            )}

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" {...register("name")} />
              {errors.name && <p className="text-sm text-destructive font-medium">{errors.name.message}</p>}
            </div>

            {/* Builder fields */}
            {selectedRole === "builder" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la empresa *</Label>
                  <Input id="companyName" placeholder="López Construction" {...register("companyName")} />
                  {errors.companyName && <p className="text-sm text-destructive font-medium">{errors.companyName.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Select id="state" {...register("state")}>
                      <option value="">Seleccionar...</option>
                      <option value="TX">Texas (TX)</option>
                      <option value="FL">Florida (FL)</option>
                      <option value="CA">California (CA)</option>
                      <option value="NY">New York (NY)</option>
                      <option value="AZ">Arizona (AZ)</option>
                      <option value="NV">Nevada (NV)</option>
                      <option value="CO">Colorado (CO)</option>
                      <option value="other">Otro</option>
                    </Select>
                    {errors.state && <p className="text-sm text-destructive font-medium">{errors.state.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" placeholder="(555) 123-4567" {...register("phone")} />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive font-medium">{errors.email.message}</p>}
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive font-medium">{errors.password.message}</p>}
            </div>

            <Button type="submit" className="w-full text-base h-12 mt-2" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                "Create Account"
              )}
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
