import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, Activity, Shield, Users } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function Home() {
  const { user } = useAuth();

  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <header className="py-4 px-6 md:px-12 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/40">
        <div className="flex items-center gap-2 font-display font-bold text-2xl text-primary">
          <Activity className="w-8 h-8" />
          MedCare
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-semibold">Log In</Button>
          </Link>
          <Link href="/register">
            <Button className="font-semibold shadow-lg shadow-primary/20">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-12 py-20 gap-12 max-w-7xl mx-auto">
        <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-block px-4 py-2 rounded-full bg-accent text-accent-foreground font-semibold text-sm mb-4">
            New: Telemedicine Services Available
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight text-foreground">
            Healthcare <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Reimagined
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
            Book appointments, manage prescriptions, and connect with top doctors—all in one secure platform.
          </p>
          <div className="flex gap-4 pt-4">
            <Link href="/register">
              <Button size="lg" className="rounded-full px-8 text-lg h-14 shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all">
                Find a Doctor <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Image */}
        <div className="flex-1 relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-70 animate-pulse"></div>
          {/* Medical team discussing patient file */}
          <img 
            src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1000"
            alt="Doctors checking tablet"
            className="relative rounded-3xl shadow-2xl border-4 border-white/50 aspect-[4/3] object-cover"
          />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Why Choose MedCare?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We combine advanced technology with compassionate care to provide the best experience for patients and doctors.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Shield,
                title: "Secure & Private",
                desc: "Your health data is encrypted and protected with enterprise-grade security standards."
              },
              {
                icon: Users,
                title: "Top Specialists",
                desc: "Access a network of board-certified doctors across 30+ medical specializations."
              },
              {
                icon: Activity,
                title: "Real-time Tracking",
                desc: "Track your appointments, prescriptions, and medical history in real-time."
              }
            ].map((feature, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
