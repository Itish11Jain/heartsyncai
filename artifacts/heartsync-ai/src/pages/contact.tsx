import { Link } from "wouter";
import { motion } from "framer-motion";
import { HeartPulse, Mail, ArrowLeft } from "lucide-react";

export default function Contact() {
  return (
    <div className="min-h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary/20 blur-[150px]" />
      </div>

      <div className="relative z-10 container mx-auto px-6 pt-12 pb-24 max-w-2xl">
        <header className="flex items-center gap-4 mb-16">
          <Link href="/" className="flex items-center gap-2 text-white/40 hover:text-white/70 transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-center gap-2 ml-auto">
            <div className="bg-gradient-to-tr from-primary to-secondary p-2 rounded-xl">
              <HeartPulse className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">HeartSync AI</span>
          </div>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-extrabold text-white mb-4">Contact Us</h1>
          <p className="text-white/50 mb-12 text-lg">
            We're here to help. Reach out to us for any questions, support, or feedback.
          </p>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-white/40 text-sm mb-1">Email Support</p>
                <a
                  href="mailto:heartsyncai2026@gmail.com"
                  className="text-white font-semibold text-lg hover:text-primary transition-colors"
                >
                  heartsyncai2026@gmail.com
                </a>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-white/[0.06]">
              <p className="text-white/40 text-sm leading-relaxed">
                We typically respond within 24–48 hours on business days. For payment or refund
                queries, please include your registered email address and the date of the
                transaction in your message.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/25 text-sm">
              HeartSync AI · Gurgaon, India
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
