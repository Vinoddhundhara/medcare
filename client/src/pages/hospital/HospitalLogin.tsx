import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";

export default function HospitalLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, loginPending, loginError, isAuthenticated } = useHospitalAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation("/hospital/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-xl shadow-blue-900/50">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Hospital Portal</h1>
          <p className="text-slate-400 mt-1">Sign in to manage your hospital</p>
        </div>

        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-sm shadow-2xl">
          <CardHeader>
            <CardTitle className="text-white">Sign In</CardTitle>
            <CardDescription className="text-slate-400">
              Enter your hospital admin credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-slate-300">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@hospital.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-slate-300">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              {loginError && (
                <p className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                  {loginError.message}
                </p>
              )}

              <Button
                type="submit"
                disabled={loginPending}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
              >
                {loginPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Sign In
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              New hospital?{" "}
              <Link href="/hospital/register">
                <a className="text-blue-400 hover:text-blue-300 font-medium">Register here</a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
