import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useHospitalAuth } from "@/hooks/use-hospital-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "wouter";
import { Loader2, User, Building2, Stethoscope } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// ── User login schema (patient / doctor / admin) ──────────────────────────────
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// ── Hospital login schema ─────────────────────────────────────────────────────
const hospitalLoginSchema = z.object({
  email:    z.string().email("Valid email required"),
  password: z.string().min(1, "Password is required"),
});

// ── User login form ───────────────────────────────────────────────────────────
function UserLoginForm() {
  const { login, isLoggingIn } = useAuth();
  const { t } = useLanguage();
  const au = t.auth;

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => login(v))} className="space-y-5">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{au.email}</FormLabel>
              <FormControl>
                <Input placeholder="username or email" {...field} className="h-11 bg-background" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{au.password}</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} className="h-11 bg-background" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={isLoggingIn}>
          {isLoggingIn && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {isLoggingIn ? au.signingIn : au.signIn}
        </Button>
      </form>
    </Form>
  );
}

// ── Hospital login form ───────────────────────────────────────────────────────
function HospitalLoginForm() {
  const { login, loginPending, loginError } = useHospitalAuth();

  const form = useForm<z.infer<typeof hospitalLoginSchema>>({
    resolver: zodResolver(hospitalLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((v) => login(v).catch(() => {}))} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hospital Admin Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="admin@hospital.com" {...field} className="h-11 bg-background" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} className="h-11 bg-background" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {loginError && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            {loginError.message}
          </p>
        )}
        <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={loginPending}>
          {loginPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          {loginPending ? "Signing in…" : "Sign in as Hospital"}
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          New hospital?{" "}
          <Link href="/register?role=hospital" className="text-primary font-semibold hover:underline">
            Register your hospital
          </Link>
        </p>
      </form>
    </Form>
  );
}

// ── Main Login page ───────────────────────────────────────────────────────────
export default function Login() {
  const { user } = useAuth();
  const { hospital } = useHospitalAuth();
  const [, setLocation] = useLocation();
  const { t } = useLanguage();
  const au = t.auth;

  // Redirect if already logged in
  if (user)     { setLocation("/dashboard");          return null; }
  if (hospital) { setLocation("/hospital/dashboard"); return null; }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl border-primary/10">
        <CardHeader className="space-y-2 text-center pb-2">
          <CardTitle className="text-3xl font-bold text-primary">{au.loginTitle}</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <Tabs defaultValue="user">
            <TabsList className="grid grid-cols-2 w-full mb-6">
              <TabsTrigger value="user" className="gap-2">
                <User className="w-4 h-4" /> Patient / Doctor
              </TabsTrigger>
              <TabsTrigger value="hospital" className="gap-2">
                <Building2 className="w-4 h-4" /> Hospital
              </TabsTrigger>
            </TabsList>

            <TabsContent value="user">
              <UserLoginForm />
            </TabsContent>

            <TabsContent value="hospital">
              <HospitalLoginForm />
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="justify-center border-t p-6 bg-muted/10">
          <p className="text-sm text-muted-foreground">
            {au.noAccount}{" "}
            <Link href="/register" className="text-primary font-semibold hover:underline">
              {au.createAccount}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
