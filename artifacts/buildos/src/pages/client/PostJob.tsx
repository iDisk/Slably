import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const BUDGET_RANGES: Record<string, { min: number | null; max: number | null }> = {
  prefer_not: { min: null,   max: null   },
  under_5k:   { min: 0,     max: 5000   },
  "5k_15k":   { min: 5000,  max: 15000  },
  "15k_30k":  { min: 15000, max: 30000  },
  "30k_60k":  { min: 30000, max: 60000  },
  "60k_100k": { min: 60000, max: 100000 },
  over_100k:  { min: 100000, max: null  },
};

export default function PostJob() {
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);

  const [jobType, setJobType]           = useState("");
  const [description, setDescription]   = useState("");
  const [city, setCity]                 = useState("");
  const [budgetRange, setBudgetRange]   = useState("prefer_not");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jobType)            { toast.error("Please select a job type.");    return; }
    if (!description.trim()) { toast.error("Please describe your project."); return; }
    if (!city.trim())        { toast.error("Please enter your city.");       return; }

    const { min, max } = BUDGET_RANGES[budgetRange] ?? { min: null, max: null };

    setSubmitting(true);
    try {
      const r = await fetch(`${BASE}/api/network/rfqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:       `${jobType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())} — ${city}`,
          description: description.trim(),
          specialty:   jobType,
          city:        city.trim(),
          budget_min:  min,
          budget_max:  max,
        }),
      });
      if (!r.ok) throw new Error();
      toast.success("Your project has been posted! Professionals in your area will reach out to you soon.");
      navigate("/client");
    } catch {
      toast.error("Failed to post your project. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-[#1B3A5C] px-4 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate("/client")}
          className="text-white/70 hover:text-white flex items-center gap-1 text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <Link href="/" className="cursor-pointer">
          <img src="/slably-logo-dark.png" alt="Slably" className="h-7 w-auto" />
        </Link>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-foreground">Post Your Project</h1>
          <p className="text-muted-foreground mt-2">
            Describe your project and professionals in your area will contact you.
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Job type */}
              <div className="space-y-2">
                <Label htmlFor="jobType">Job type <span className="text-red-500">*</span></Label>
                <Select
                  id="jobType"
                  value={jobType}
                  onChange={e => setJobType(e.target.value)}
                >
                  <option value="">Select a job type...</option>
                  <option value="bathroom_remodel">Bathroom Remodel</option>
                  <option value="kitchen_remodel">Kitchen Remodel</option>
                  <option value="full_remodel">Full Remodel</option>
                  <option value="new_construction">New Construction</option>
                  <option value="painting">Painting</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="handyman">Handyman</option>
                  <option value="other">Other</option>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Project description <span className="text-red-500">*</span></Label>
                <Textarea
                  id="description"
                  rows={5}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe your project in detail. What needs to be done, size of the space, materials preferences, timeline..."
                  className="resize-none"
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                <Input
                  id="city"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Houston"
                />
              </div>

              {/* Budget range */}
              <div className="space-y-2">
                <Label htmlFor="budget">Budget range <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Select
                  id="budget"
                  value={budgetRange}
                  onChange={e => setBudgetRange(e.target.value)}
                >
                  <option value="prefer_not">I prefer not to say</option>
                  <option value="under_5k">Under $5,000</option>
                  <option value="5k_15k">$5,000 – $15,000</option>
                  <option value="15k_30k">$15,000 – $30,000</option>
                  <option value="30k_60k">$30,000 – $60,000</option>
                  <option value="60k_100k">$60,000 – $100,000</option>
                  <option value="over_100k">Over $100,000</option>
                </Select>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-[#F97316] hover:bg-[#ea6c0e] text-white font-semibold text-base"
              >
                {submitting
                  ? <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Posting...</>
                  : "Post Your Project"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
