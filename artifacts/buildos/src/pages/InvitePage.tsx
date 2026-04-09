import { useRoute } from "wouter";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useGetInvitationInfo, useAccessInvitation, getInvitationInfoQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function InvitePage() {
  const [, params] = useRoute("/invite/:token");
  const token = params?.token ?? "";

  const { data: info, isLoading, isError } = useGetInvitationInfo(token, {
    query: { queryKey: getInvitationInfoQueryKey(token), enabled: !!token, retry: false },
  });

  const accessMutation = useAccessInvitation(token);

  const handleAccess = () => {
    accessMutation.mutate(undefined, {
      onSuccess: (data) => {
        localStorage.setItem("slably_token", data.token);
        const base = import.meta.env.BASE_URL.replace(/\/$/, "");
        window.location.href = `${base}/projects/${data.project_id}`;
      },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading your project...</p>
        </div>
      </div>
    );
  }

  if (isError || !info) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <p className="font-semibold text-foreground text-lg">
            This link is not valid or has expired.
          </p>
          <p className="text-sm text-muted-foreground">
            Please ask your contractor to send you a new link.
          </p>
        </div>
      </div>
    );
  }

  const displayName = info.builder_company ?? info.builder_name;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-[480px]">
        <Card className="overflow-hidden shadow-lg border-0">
          <div className="bg-[#1B3A5C] px-8 py-7 flex items-center">
            <img src="/slably-logo.png" alt="Slably" className="h-8" />
          </div>

          <CardContent className="p-8">
            <p className="text-sm text-muted-foreground mb-1">
              <span className="font-semibold text-foreground">{displayName}</span>
              {" "}has invited you to track the progress of
            </p>
            <h1 className="text-2xl font-bold text-foreground mt-1 mb-5">
              {info.project_name}
            </h1>

            <div className="border-t border-slate-100 my-5" />

            <ul className="space-y-2.5 mb-7">
              {[
                "Real-time project progress",
                "Photos of the work",
                "Documents and contracts",
                "Direct updates from the team",
              ].map(item => (
                <li key={item} className="flex items-center gap-2.5 text-sm text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Button
              onClick={handleAccess}
              disabled={accessMutation.isPending}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12 text-base"
            >
              {accessMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Accessing your project...</>
              ) : (
                "View my project →"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
