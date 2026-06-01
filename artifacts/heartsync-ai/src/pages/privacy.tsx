import { Link } from "wouter";
import { motion } from "framer-motion";
import { HeartPulse, ArrowLeft } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
      <div className="text-white/55 leading-relaxed space-y-3 text-sm">{children}</div>
    </div>
  );
}

export default function Privacy() {
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
          <h1 className="text-4xl font-extrabold text-white mb-2">Privacy Policy</h1>
          <p className="text-white/35 text-sm mb-12">Last updated: May 2026</p>

          <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-8 mb-8">
            <Section title="1. Introduction">
              <p>
                HeartSync AI ("we", "us", or "our") respects your privacy and is committed to
                protecting your personal data. HeartSync AI is owned and operated by Saurabh Jain,
                registered at A-54, Triveni Nagar, Jaipur, Rajasthan – 302018, India. This Privacy
                Policy explains what information we collect, how we use it, and the choices you have.
                The service is operated from India and is intended for users aged 18 and above.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <p>We collect the following types of information:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>
                  <strong className="text-white/75">Account information:</strong> your email address
                  and/or mobile number used to sign in (via email/password or mobile OTP).
                </li>
                <li>
                  <strong className="text-white/75">Content you provide:</strong> the scenario
                  details, names, occasions, photos, and messages you submit to generate Reports or
                  greeting cards.
                </li>
                <li>
                  <strong className="text-white/75">Payment information:</strong> transaction
                  references, UPI transaction IDs, and amounts. We do not store your full card or
                  bank account details — payments are processed by third-party payment providers.
                </li>
                <li>
                  <strong className="text-white/75">Usage data:</strong> basic analytics such as
                  pages visited, device/browser type, and actions taken, used to improve the service.
                </li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Information">
              <p>We use your information to:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Provide, operate, and maintain the service, including generating your Reports and cards.</li>
                <li>Process payments and deliver the credits or features you purchase.</li>
                <li>Communicate with you about your account, transactions, and support requests.</li>
                <li>Detect, prevent, and address fraud, abuse, or technical issues.</li>
                <li>Improve and personalise the service.</li>
              </ul>
            </Section>

            <Section title="4. AI Processing">
              <p>
                To generate Reports and personalised content, the information you submit is sent to
                third-party large language model (LLM) providers for processing. We only share the
                content necessary to fulfil your request and do not sell your personal data to any
                third party.
              </p>
            </Section>

            <Section title="5. Sharing of Information">
              <p>
                We do not sell your personal information. We share data only with trusted service
                providers who help us operate the service, including:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>Authentication providers (for secure sign-in).</li>
                <li>Payment processors (to handle transactions).</li>
                <li>AI/LLM providers (to generate your content).</li>
                <li>Cloud hosting and storage providers.</li>
              </ul>
              <p>
                We may also disclose information where required by law or to protect our rights,
                safety, or property.
              </p>
            </Section>

            <Section title="6. Data Retention">
              <p>
                Reports expire 24 hours after generation. We retain account and transaction records
                for as long as your account is active or as required to comply with legal,
                accounting, or reporting obligations. You may request deletion of your account at
                any time (see "Your Rights" below).
              </p>
            </Section>

            <Section title="7. Data Security">
              <p>
                We use reasonable technical and organisational measures to protect your information
                against unauthorised access, loss, or misuse. However, no method of transmission or
                storage is completely secure, and we cannot guarantee absolute security.
              </p>
            </Section>

            <Section title="8. Your Rights">
              <p>
                Subject to applicable Indian law, you may request to access, correct, or delete your
                personal data, or withdraw consent for certain processing. To exercise these rights,
                contact us at{" "}
                <a href="mailto:heartsyncai2026@gmail.com" className="text-primary hover:underline">
                  heartsyncai2026@gmail.com
                </a>
                .
              </p>
            </Section>

            <Section title="9. Children's Privacy">
              <p>
                The service is not intended for anyone under the age of 18. We do not knowingly
                collect personal data from minors. If you believe a minor has provided us with
                personal information, please contact us so we can remove it.
              </p>
            </Section>

            <Section title="10. Cookies & Analytics">
              <p>
                We use cookies and similar technologies to keep you signed in, remember your
                preferences, and understand how the service is used. You can control cookies through
                your browser settings, though disabling them may affect functionality.
              </p>
            </Section>

            <Section title="11. Changes to This Policy">
              <p>
                We may update this Privacy Policy from time to time. Any changes will be posted on
                this page with an updated "Last updated" date. Continued use of the service after
                changes are posted constitutes your acceptance of the updated policy.
              </p>
            </Section>

            <Section title="12. Contact Us">
              <p>
                For any questions about this Privacy Policy or how we handle your data, contact us
                at{" "}
                <a href="mailto:heartsyncai2026@gmail.com" className="text-primary hover:underline">
                  heartsyncai2026@gmail.com
                </a>
                .
              </p>
            </Section>
          </div>

          <div className="mt-8 text-center">
            <p className="text-white/25 text-sm">
              HeartSync AI · Gurgaon, India ·{" "}
              <Link href="/contact" className="hover:text-white/50 transition-colors">Contact Us</Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
