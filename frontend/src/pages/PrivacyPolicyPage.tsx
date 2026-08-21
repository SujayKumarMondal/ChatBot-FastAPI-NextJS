export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto p-8 bg-background text-foreground rounded-xl shadow-lg">
      {/* Page Header */}
      <h1 className="text-3xl font-extrabold mb-6 text-center">
        Privacy Policy
      </h1>

      <p className="mb-6 text-muted-foreground text-sm text-center">
        Last updated: September 20, 2025
      </p>

      {/* Intro */}
      <p className="mb-6 leading-relaxed">
        Your privacy and security are paramount to us. This Privacy Policy explains how{" "}
        <span className="font-semibold">ChatPaat</span> collects, uses, protects, and safeguards your information when you use our services.
      </p>

      <div className="space-y-6">
        {/* Section 1 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
          <p className="leading-relaxed mb-2">
            We collect the following types of information:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>
              <span className="font-medium">Personal Information:</span> Name, email address, and authentication credentials when you create an account.
            </li>
            <li>
              <span className="font-medium">Chat Data:</span> Messages, prompts, and conversations you have with ChatPaat.
            </li>
            <li>
              <span className="font-medium">Usage Data:</span> Activity logs, timestamps, device information, IP addresses, and interaction patterns to improve service quality.
            </li>
            <li>
              <span className="font-medium">OAuth Data:</span> If using Google OAuth, we receive your Google profile information (name, email, profile picture).
            </li>
          </ul>
        </section>

        {/* Section 2 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
          <p className="leading-relaxed mb-2">
            We use your information for:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Operating ChatPaat and providing AI-powered conversation services.</li>
            <li>Maintaining conversation history and user accounts.</li>
            <li>Generating AI responses via Groq's OpenAI GPT-OSS API.</li>
            <li>Providing customer support and responding to inquiries.</li>
            <li>Monitoring service usage, preventing abuse, and detecting security threats.</li>
            <li>Improving service quality and model performance through aggregated data analysis.</li>
            <li>Complying with legal obligations and court orders.</li>
            <li><span className="font-semibold">We will never sell</span> your personal information to third parties for marketing purposes.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">3. Data Protection & Security</h2>
          <p className="leading-relaxed mb-2">
            We implement comprehensive technical and organizational security measures:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>End-to-end encryption for data transmission using HTTPS/TLS protocols.</li>
            <li>Password hashing using industry-standard cryptographic algorithms.</li>
            <li>JWT token-based authentication with secure session management.</li>
            <li>Restricted database access available only to authorized personnel.</li>
            <li>Regular security audits, vulnerability assessments, and penetration testing.</li>
            <li>Multi-factor authentication support for enhanced account security.</li>
            <li>Automated monitoring for suspicious activity and security anomalies.</li>
            <li><span className="font-semibold">IMPORTANT:</span> While we employ robust security measures, no system is 100% secure. You acknowledge the inherent risks of online services.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">4. Data Retention & Deletion</h2>
          <p className="leading-relaxed mb-2">
            Your data is retained as follows:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Chat conversations are stored indefinitely unless you explicitly delete them.</li>
            <li>Account data is retained for the duration of your account.</li>
            <li>You may request permanent deletion of your account and all associated data at any time.</li>
            <li>We may retain anonymized or aggregated data for analytics and service improvement.</li>
            <li>Backup copies may be retained for disaster recovery (typically 30-90 days).</li>
          </ul>
        </section>

        {/* Section 5 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">5. Third-Party Services & Data Sharing</h2>
          <p className="leading-relaxed mb-2">
            We may share your information with:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><span className="font-medium">Groq API:</span> Chat prompts are sent to Groq's servers for AI processing. Review Groq's privacy policy.</li>
            <li><span className="font-medium">Google OAuth:</span> If you sign up via Google, basic profile data is shared. Review Google's privacy policy.</li>
            <li><span className="font-medium">SendGrid:</span> Email addresses are shared for password reset functionality. Review SendGrid's privacy policy.</li>
            <li><span className="font-medium">Law Enforcement:</span> We comply with legal requests and may disclose information to authorities when required by law.</li>
            <li><span className="font-semibold">We do NOT willingly share personal data with advertisers, marketers, or unaffiliated third parties.</span></li>
          </ul>
        </section>

        {/* Section 6 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">6. AI Model & Content Processing</h2>
          <p className="leading-relaxed mb-2">
            ChatPaat uses Groq's OpenAI GPT-OSS 20B model to generate responses:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Your prompts are sent to Groq's servers for processing and may be logged.</li>
            <li>AI-generated responses may contain inaccuracies, biases, or errors.</li>
            <li>You are responsible for verifying any information critical to decisions.</li>
            <li>Generated content may not be suitable for medical, legal, or safety-critical use cases.</li>
            <li>We do not guarantee information accuracy, completeness, or appropriateness for specific purposes.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">7. Your Privacy Rights</h2>
          <p className="leading-relaxed mb-2">
            Depending on your jurisdiction, you may have rights including:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><span className="font-medium">Right to Access:</span> Request a copy of all personal data we hold about you.</li>
            <li><span className="font-medium">Right to Correction:</span> Update or correct inaccurate personal information.</li>
            <li><span className="font-medium">Right to Deletion:</span> Request permanent deletion of your account and associated data.</li>
            <li><span className="font-medium">Right to Portability:</span> Receive your data in a portable format.</li>
            <li><span className="font-medium">Right to Withdraw Consent:</span> Stop collection of non-essential data.</li>
            <li><span className="font-medium">Right to Lodge Complaints:</span> File complaints with data protection authorities.</li>
          </ul>
        </section>

        {/* Section 8 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">8. Children & Minors</h2>
          <p className="leading-relaxed">
            ChatPaat is not intended for individuals under 13 years of age. We do not knowingly collect data from minors without parental consent. If we discover that a minor has created an account without proper consent, we will delete their account and associated data immediately.
          </p>
        </section>

        {/* Section 9 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">9. Data Breach Notification</h2>
          <p className="leading-relaxed">
            In the event of a data breach that compromises personal information, we commit to:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Notifying affected users within 72 hours of discovery.</li>
            <li>Providing information about the breach and measures being taken.</li>
            <li>Assisting with credit monitoring and fraud prevention services if applicable.</li>
            <li>Complying with all applicable data breach notification laws.</li>
          </ul>
        </section>

        {/* Section 10 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">10. International Data Transfers</h2>
          <p className="leading-relaxed">
            Your data may be transferred to, stored in, and processed in countries other than your country of residence. These countries may have different data protection laws. By using ChatPaat, you consent to such transfers and acknowledge potential differences in legal protection.
          </p>
        </section>

        {/* Section 11 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">11. Policy Updates</h2>
          <p className="leading-relaxed">
            We may update this Privacy Policy to reflect changes in our practices, technology, or legal requirements. Significant changes will be communicated via email or prominent notification. Continued use of ChatPaat after updates constitutes acceptance of the revised policy.
          </p>
        </section>

        {/* Section 12 */}
        <section>
          <h2 className="text-lg font-semibold mb-2">12. Contact & Data Subject Requests</h2>
          <p className="leading-relaxed">
            To exercise your privacy rights, request data deletion, or submit a data subject request, contact us at{" "}
            <a
              href="mailto:chatpaat.support.10@gmail.com"
              className="text-primary font-medium hover:underline"
            >
              chatpaat.support.10@gmail.com
            </a>
            . Please include sufficient information to identify your account. We will respond to legitimate requests within 30 days.
          </p>
        </section>
      </div>
    </div>
  );
}
