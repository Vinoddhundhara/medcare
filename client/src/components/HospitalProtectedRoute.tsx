import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { Redirect } from "wouter";
import { Loader2 } from "lucide-react";

interface Props {
  component: React.ComponentType;
}

export function HospitalProtectedRoute({ component: Component }: Props) {
  const { isAuthenticated, isLoading } = useHospitalAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Redirect to="/hospital/login" />;
  }

  return <Component />;
}
