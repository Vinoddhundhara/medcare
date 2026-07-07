import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Activity, Shield, Users, Star, CheckCircle,
  Calendar, FileText, Video, Brain, Bell, ChevronDown, ChevronUp,
  Phone, Mail, MapPin, Clock, Stethoscope, Heart, Pill,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { useState } from "react";

// ─── FAQ data ────────────────────────────────────────────────────────────────
const faqs = [
  {
    q: "How do I book an appointment?",
    a: "After registering, go to 'Find Doctors', choose a specialist, pick a time slot, and confirm. You'll receive an email and SMS confirmation instantly.",
  },
  {
    q: "Is my health data safe on MedCare?",
    a: "Yes. All data is encrypted end-to-end using enterprise-grade AES-256 encryption. We never share your information with third parties.",
  },
  {
    q: "Can I consult doctors online?",
    a: "Absolutely. MedCare supports video consultations. Once your appointment is confirmed, your doctor will share a secure video call link.",
  },
  {
    q: "How do medicine reminders work?",
    a: "Set your medicine name, dosage, and time in AI Assistant → Medicine Reminders. You'll get an SMS and browser push notification at the exact time every day.",
  },
  {
    q: "What specializations are available?",
    a: "We have doctors across 30+ specializations including Cardiology, Pediatrics, Neurology, General Medicine, Dermatology, Orthopedics, and more.",
  },
  {
    q: "Is MedCare free to use?",
    a: "Registration and browsing doctors is free. Consultation fees depend on the individual doctor and are shown clearly before you book.",
  },
];

// ─── Testimonials data ────────────────────────────────────────────────────────
const testimonials = [
  {
    name: "Priya Sharma",
    role: "Patient",
    avatar: "P",
    text: "MedCare made booking appointments so easy. I found a cardiologist within minutes and got a confirmed slot the same day. The video consultation feature is a game changer!",
    stars: 5,
  },
  {
    name: "Dr. Rajesh Kumar",
    role: "Cardiologist",
    avatar: "R",
    text: "As a doctor, MedCare has streamlined my entire workflow. Patient management, prescriptions, and appointment tracking — all in one place. Highly recommended.",
    stars: 5,
  },
  {
    name: "Ahmed Ali",
    role: "Patient",
    avatar: "A",
    text: "The medicine reminder SMS feature is brilliant. I never miss my blood pressure medication now. The AI symptom checker also helped me understand my condition better.",
    stars: 5,
  },
  {
    name: "Sunita Patel",
    role: "Patient",
    avatar: "S",
    text: "I was skeptical at first but MedCare exceeded all expectations. The doctor was professional, the platform was smooth, and my prescription was ready within minutes.",
    stars: 5,
  },
];

// ─── Stats data ───────────────────────────────────────────────────────────────
const stats = [
  { value: "10,000+", label: "Patients Served" },
  { value: "500+",    label: "Verified Doctors" },
  { value: "30+",     label: "Specializations" },
  { value: "98%",     label: "Satisfaction Rate" },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const steps = [
  {
    step: "01",
    icon: Users,
    title: "Create Your Account",
    desc: "Register as a patient in under 2 minutes. Add your basic health details and you're ready to go.",
  },
  {
    step: "02",
    icon: Stethoscope,
    title: "Find the Right Doctor",
    desc: "Browse doctors by specialization, experience, hospital, and availability. Read profiles and choose your match.",
  },
  {
    step: "03",
    icon: Calendar,
    title: "Book an Appointment",
    desc: "Select a date and time that works for you. Instantly receive a confirmation via email and SMS.",
  },
  {
    step: "04",
    icon: Video,
    title: "Consult Online or In-Person",
    desc: "Join a secure video call or visit in person. Get a digital prescription at the end of the consultation.",
  },
];

// ─── Services list ────────────────────────────────────────────────────────────
const services = [
  {
    icon: Calendar,
    title: "Appointment Booking",
    desc: "Book, reschedule, or cancel appointments with verified doctors across all specializations. Available 24/7.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: Video,
    title: "Video Consultations",
    desc: "Connect with doctors face-to-face from anywhere. Secure, private, and just as effective as in-person visits.",
    color: "bg-purple-50 text-purple-600",
  },
  {
    icon: FileText,
    title: "Digital Prescriptions",
    desc: "Receive and manage digital prescriptions. Track your medicines, dosages, and refill dates in one place.",
    color: "bg-green-50 text-green-600",
  },
  {
    icon: Brain,
    title: "AI Symptom Checker",
    desc: "Describe your symptoms and get instant AI-powered analysis with possible conditions and specialist recommendations.",
    color: "bg-orange-50 text-orange-600",
  },
  {
    icon: Bell,
    title: "Medicine Reminders",
    desc: "Set daily reminders and get SMS + push notifications so you never miss a dose of your prescribed medication.",
    color: "bg-pink-50 text-pink-600",
  },
  {
    icon: Heart,
    title: "Health Records",
    desc: "Maintain your complete medical history, past prescriptions, and appointment records securely in the cloud.",
    color: "bg-red-50 text-red-600",
  },
];

// ─── FAQ Item component ───────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="bg-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer hover:border-primary/30 transition-all duration-200"
      onClick={() => setOpen(!open)}
    >
      <div className="flex items-center justify-between p-6">
        <h4 className="font-semibold text-base pr-4">{q}</h4>
        {open
          ? <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
          : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
      </div>
      {open && (
        <div className="px-6 pb-6 text-muted-foreground leading-relaxed text-sm border-t border-border/30 pt-4">
          {a}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { user } = useAuth();
  if (user) return <Redirect to="/dashboard" />;

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Navigation ───────────────────────────────────────────────────── */}
      <header className="py-4 px-6 md:px-12 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-border/40">
        <div className="flex items-center gap-2 font-display font-bold text-2xl text-primary">
          <Activity className="w-8 h-8" />
          MedCare
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#services" className="hover:text-primary transition-colors">Services</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">How It Works</a>
          <a href="#testimonials" className="hover:text-primary transition-colors">Reviews</a>
          <a href="#faq" className="hover:text-primary transition-colors">FAQ</a>
          <a href="#contact" className="hover:text-primary transition-colors">Contact</a>
        </nav>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-semibold">Log In</Button>
          </Link>
          <Link href="/register">
            <Button className="font-semibold shadow-lg shadow-primary/20">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col md:flex-row items-center justify-center px-6 md:px-12 py-20 gap-12 max-w-7xl mx-auto">
        <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
          <div className="inline-block px-4 py-2 rounded-full bg-accent text-accent-foreground font-semibold text-sm mb-4">
            New: Telemedicine Services Available
          </div>
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight text-foreground">
            Healthcare <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              Reimagined
            </span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-lg leading-relaxed">
            Book appointments, manage prescriptions, and connect with top doctors—all in one secure platform.
          </p>
          <div className="flex gap-4 pt-4 flex-wrap">
            <Link href="/register">
              <Button size="lg" className="rounded-full px-8 text-lg h-14 shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all">
                Find a Doctor <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button size="lg" variant="outline" className="rounded-full px-8 text-lg h-14 hover:-translate-y-1 transition-all">
                How It Works
              </Button>
            </a>
          </div>
        </div>
        <div className="flex-1 relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 to-purple-500/20 rounded-full blur-3xl opacity-70 animate-pulse" />
          <img
            src="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?auto=format&fit=crop&q=80&w=1000"
            alt="Doctors checking tablet"
            className="relative rounded-3xl shadow-2xl border-4 border-white/50 aspect-[4/3] object-cover"
          />
        </div>
      </section>

      {/* ── Stats Section ────────────────────────────────────────────────── */}
      <section className="py-16 bg-primary">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            {stats.map((s, i) => (
              <div key={i} className="space-y-2">
                <div className="text-4xl md:text-5xl font-display font-bold">{s.value}</div>
                <div className="text-primary-foreground/80 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose MedCare ───────────────────────────────────────────── */}
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
                desc: "Your health data is encrypted and protected with enterprise-grade security standards. HIPAA compliant.",
              },
              {
                icon: Users,
                title: "Top Specialists",
                desc: "Access a network of board-certified doctors across 30+ medical specializations worldwide.",
              },
              {
                icon: Activity,
                title: "Real-time Tracking",
                desc: "Track your appointments, prescriptions, and medical history in real-time from any device.",
              },
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

      {/* ── Services Section ─────────────────────────────────────────────── */}
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to manage your health — from booking doctors to tracking medicines — all under one roof.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((s, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 group">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${s.color}`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Getting started with MedCare is simple. Follow these 4 easy steps to take control of your healthcare.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-border z-0" />
                )}
                <div className="bg-card p-8 rounded-2xl border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 relative z-10">
                  <div className="text-5xl font-display font-bold text-primary/20 mb-4">{step.step}</div>
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                    <step.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/register">
              <Button size="lg" className="rounded-full px-10 text-lg h-14 shadow-xl shadow-primary/25 hover:shadow-2xl hover:-translate-y-1 transition-all">
                Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section id="testimonials" className="py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">What Our Users Say</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Thousands of patients and doctors trust MedCare every day. Here's what they have to say.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, si) => (
                    <Star key={si} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-muted-foreground leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{t.name}</p>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ Section ──────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 bg-secondary/50">
        <div className="max-w-4xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Got questions? We've got answers. If you don't find what you're looking for, reach out to our support team.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FAQItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-primary to-blue-500">
        <div className="max-w-4xl mx-auto px-6 md:px-12 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-white/80 text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            Join over 10,000 patients who trust MedCare for their healthcare needs. 
            Sign up free today and get your first consultation.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="rounded-full px-10 text-lg h-14 hover:-translate-y-1 transition-all shadow-xl">
                Create Free Account <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-full px-10 text-lg h-14 border-white text-white hover:bg-white/10 hover:-translate-y-1 transition-all">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-10 text-white/70 text-sm flex-wrap">
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />No credit card required</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />Free forever for patients</div>
            <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" />Cancel anytime</div>
          </div>
        </div>
      </section>

      {/* ── Contact Section ──────────────────────────────────────────────── */}
      <section id="contact" className="py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Get In Touch</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Have a question or need help? Our support team is available 24/7 to assist you.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Phone,
                title: "Call Us",
                info: "+1 (800) MED-CARE",
                sub: "Mon–Fri, 8am–8pm EST",
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: Mail,
                title: "Email Us",
                info: "support@medcare.health",
                sub: "We reply within 24 hours",
                color: "bg-green-50 text-green-600",
              },
              {
                icon: MapPin,
                title: "Visit Us",
                info: "123 Health Avenue, NY",
                sub: "New York, USA 10001",
                color: "bg-purple-50 text-purple-600",
              },
            ].map((c, i) => (
              <div key={i} className="bg-card p-8 rounded-2xl border border-border/50 hover:shadow-xl hover:border-primary/20 transition-all duration-300 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${c.color}`}>
                  <c.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">{c.title}</h3>
                <p className="font-medium text-foreground mb-1">{c.info}</p>
                <p className="text-sm text-muted-foreground">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-card border-t border-border/40 py-12">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 font-display font-bold text-xl text-primary">
                <Activity className="w-6 h-6" />
                MedCare
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connecting patients with the best doctors. Healthcare made simple, secure, and accessible.
              </p>
            </div>
            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Find Doctors", "Book Appointment", "Video Consult", "Prescriptions", "AI Assistant"].map(l => (
                  <li key={l}><Link href="/register" className="hover:text-primary transition-colors">{l}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["About Us", "Careers", "Blog", "Press", "Partners"].map(l => (
                  <li key={l}><span className="hover:text-primary transition-colors cursor-pointer">{l}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {["Help Center", "Privacy Policy", "Terms of Service", "Cookie Policy", "Contact Us"].map(l => (
                  <li key={l}><span className="hover:text-primary transition-colors cursor-pointer">{l}</span></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-border/40 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2026 MedCare. All rights reserved.</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Available 24/7 for emergencies</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
