export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-background text-foreground rounded-xl shadow-lg">
      {/* Page Header */}
      <h1 className="text-3xl font-extrabold mb-6 text-center">
        Terms of Service
      </h1>

      <p className="mb-6 text-muted-foreground text-sm text-center">
        Last updated: September 20, 2025
      </p>

      {/* Intro */}
      <p className="mb-6 leading-relaxed">
        Welcome to <span className="font-semibold">ChatPaat</span>. By accessing
        or using our services, you agree to comply with and be bound by the
        following terms and conditions. Please read them carefully.
      </p>

      {/* Terms List */}
      <div className="space-y-6">
        <section>
          <h2 className="text-lg font-semibold mb-2">1. AI-Generated Content Disclaimer</h2>
          <p className="leading-relaxed">
            ChatPaat leverages artificial intelligence powered by Groq's LLaMA 3.1 model to generate responses. While we strive for accuracy and quality, AI-generated content may contain inaccuracies, outdated information, or incomplete responses. You acknowledge and agree that:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>All AI responses should be independently verified before reliance.</li>
            <li>ChatPaat is not responsible for errors, omissions, or misinterpretations in AI-generated content.</li>
            <li>Critical information from ChatPaat should never be used as a sole source of truth.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">2. Prohibited Use Cases</h2>
          <p className="leading-relaxed mb-2">
            You agree NOT to use ChatPaat for:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><span className="font-medium">Medical Decisions:</span> Diagnosing, treating, or providing medical advice. Always consult licensed healthcare professionals.</li>
            <li><span className="font-medium">Legal Matters:</span> Providing legal counsel or serving as a substitute for attorney advice. Consult qualified legal professionals.</li>
            <li><span className="font-medium">Financial Advice:</span> Investment decisions, financial planning, or trading advice. Consult certified financial advisors.</li>
            <li><span className="font-medium">Safety-Critical Systems:</span> Operating machinery or making safety-critical decisions.</li>
            <li><span className="font-medium">Unlawful Activities:</span> Harassment, malware distribution, hacking, or any violation of applicable laws.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">3. User Responsibility & Acceptable Use</h2>
          <p className="leading-relaxed">
            You are solely responsible for your use of ChatPaat and all content you create, share, or receive. You agree to:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Use the service responsibly and ethically.</li>
            <li>Verify all critical information independently before acting upon it.</li>
            <li>Not attempt to reverse-engineer, manipulate, or exploit ChatPaat's systems.</li>
            <li>Respect intellectual property rights and data privacy.</li>
            <li>Not engage in systematic abuse or excessive use that harms service quality for others.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">4. Service Modifications & Availability</h2>
          <p className="leading-relaxed">
            We reserve the right to modify, suspend, or discontinue any aspect of ChatPaat at any time without prior notice. We are not liable for any consequences arising from:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Service interruptions or downtime.</li>
            <li>Changes to features, functionality, or pricing.</li>
            <li>Data loss or corruption resulting from service failures.</li>
            <li>Actions taken based on AI-generated content.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">5. Limitation of Liability</h2>
          <p className="leading-relaxed">
            To the fullest extent permitted by law, ChatPaat and its creators are not liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the service, including but not limited to:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Reliance on inaccurate or incomplete AI-generated content.</li>
            <li>Loss of data or business interruptions.</li>
            <li>Personal injury or property damage.</li>
            <li>Any unauthorized use of the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">6. Account Termination</h2>
          <p className="leading-relaxed">
            Violation of these terms may result in immediate suspension or termination of your account without refund. We reserve the right to enforce these measures at our sole discretion, including for violations such as:
          </p>
          <ul className="list-disc pl-6 space-y-1 mt-2">
            <li>Attempting to circumvent security measures.</li>
            <li>Generating harmful, illegal, or abusive content.</li>
            <li>Harassment or threatening behavior toward other users.</li>
            <li>Excessive or automated resource consumption.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">7. Changes to Terms</h2>
          <p className="leading-relaxed">
            We may update these Terms of Service at any time. Continued use of ChatPaat after modifications constitutes acceptance of the revised terms. We encourage you to review these terms periodically.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">8. Contact Us</h2>
          <p className="leading-relaxed">
            If you have questions or concerns about these Terms of Service,
            please contact us at{" "}
            <a
              href="mailto:chatpaat.support.10@gmail.com"
              className="text-primary font-medium hover:underline"
            >
              chatpaat.support.10@gmail.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
