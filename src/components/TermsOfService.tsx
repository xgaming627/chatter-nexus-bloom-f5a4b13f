
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

const TermsOfService: React.FC = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Terms of Service</h2>
      <ScrollArea className="h-[400px] rounded-md border p-4">
        <div className="space-y-4">
          <section>
            <h3 className="text-lg font-medium mb-2">1. Acceptance of Terms</h3>
            <p>By accessing and using ChatNexus, you agree to be bound by these Terms of Service, our Privacy Policy, and any additional terms that may apply.</p>
          </section>

          <section>
            <h3 className="text-lg font-medium mb-2">2. User Accounts</h3>
            <p>You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account.</p>
            <p className="mt-1">Usernames must be 15 characters or fewer in length and must not contain offensive or inappropriate content.</p>
          </section>

          <section>
            <h3 className="text-lg font-medium mb-2">3. Acceptable Use</h3>
            <p>You agree not to use ChatNexus to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Post or transmit harmful, threatening, abusive, harassing, defamatory, or otherwise objectionable content</li>
              <li>Engage in any illegal activities</li>
              <li>Impersonate any person or entity</li>
              <li>Interfere with or disrupt the service or servers</li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-medium mb-2">4. Content Moderation</h3>
            <p>ChatNexus reserves the right to monitor, review, and moderate all content shared through our platform. We may warn, temporarily restrict, or permanently ban users who violate these terms.</p>
            <p className="mt-1">If your account receives a warning, you will need to acknowledge the warning and agree to comply with our terms before continuing to use the service.</p>
          </section>

          <section>
            <h3 className="text-lg font-medium mb-2">5. Privacy</h3>
            <p>We collect certain data including but not limited to messages, IP addresses, login activity, and usage patterns. This information is used to provide and improve our service, ensure platform security, and enforce our terms.</p>
          </section>

          <section>
            <h3 className="text-lg font-medium mb-2">6. Termination</h3>
            <p>We reserve the right to terminate or suspend your account at any time for any reason without notice.</p>
          </section>

          <section>
            <h3 className="text-lg font-medium mb-2">7. Credits</h3>
            <p><strong>Lead Scripter and Developer:</strong> Vitor Rossato</p>
          </section>

          <section className="mt-4 text-sm text-muted-foreground">
            <p>Last updated: April 2025. ChatNexus may update these terms at any time without notice.</p>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};

export default TermsOfService;
