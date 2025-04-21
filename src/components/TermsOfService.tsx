
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, FileText } from 'lucide-react';

const TermsOfService = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Terms of Service
        </h3>
        <span className="text-xs text-muted-foreground">v1.13 • Updated Apr 19, 2025</span>
      </div>
      
      <ScrollArea className="h-[500px] rounded-md border p-4">
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Nexus Chat - Terms of Service</h2>
          <p className="text-sm text-muted-foreground">Effective Date: 4/19/2025</p>
          <p className="text-sm text-muted-foreground">Version: 1.13</p>
          
          <p>Welcome to Nexus Chat, a service provided and operated by the Nexus Team ("we", "us", or "our"). By accessing or using Nexus Chat, including by agreeing to the welcome message, you acknowledge that you have read, understood, and agreed to these Terms of Service ("Terms") and our Privacy Policy. If you do not agree, do not use Nexus Chat.</p>
          
          <h3 className="text-lg font-semibold mt-6">1. Eligibility</h3>
          <p>To use Nexus Chat, you must:</p>
          <ul className="list-disc pl-6">
            <li>Be at least 13 years old (or the minimum legal age in your jurisdiction to form a binding contract).</li>
            <li>Have permission from a parent or guardian if under 18.</li>
            <li>Not be prohibited from using the service under applicable laws.</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-6">2. Consent by Welcome Message</h3>
          <p>By continuing to use Nexus Chat or accepting the welcome message that appears upon sign-in or app launch, you confirm your agreement to these Terms of Service, including our data collection practices and community standards.</p>
          
          <h3 className="text-lg font-semibold mt-6">3. Account Registration</h3>
          <ul className="list-disc pl-6">
            <li>You may be required to register for an account to access certain features.</li>
            <li>You agree to provide accurate, complete, and updated information.</li>
            <li>You are responsible for maintaining the confidentiality of your account and password.</li>
            <li>You are fully responsible for all activities under your account.</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-6">4. Acceptable Use</h3>
          <p>You agree to use Nexus Chat in compliance with the following rules:</p>
          <ul className="list-disc pl-6">
            <li>No illegal content or activity.</li>
            <li>No harassment or abuse.</li>
            <li>No hate speech or discrimination.</li>
            <li>No spam or scams.</li>
            <li>No impersonation.</li>
            <li>Respect intellectual property.</li>
          </ul>
          <p>We may take action, including warnings, content removal, or account termination, in response to violations.</p>
          
          <h3 className="text-lg font-semibold mt-6">5. Data Collection and Privacy</h3>
          <p>By using Nexus Chat, you consent to the collection, storage, and use of information by the Nexus Team for service functionality, moderation, analytics, and security purposes.</p>
          <p>This may include but is not limited to:</p>
          <ul className="list-disc pl-6">
            <li>IP addresses</li>
            <li>Email addresses</li>
            <li>Direct messages and public conversations</li>
            <li>Group chat content</li>
            <li>Account activity history (e.g., login times, interactions, support chats)</li>
          </ul>
          <p>We take reasonable steps to protect your data, but we may store and review it as needed for moderation, user safety, and platform improvement. Full details can be found in our Privacy Policy.</p>
          
          <h3 className="text-lg font-semibold mt-6">6. User-Generated Content</h3>
          <ul className="list-disc pl-6">
            <li>You retain ownership of the content you post.</li>
            <li>By posting, you grant us a non-exclusive, royalty-free license to use, store, reproduce, and manage that content in relation to service delivery and enforcement of the Terms.</li>
            <li>We reserve the right to remove content that violates these Terms or community guidelines.</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-6">7. Moderation and Enforcement</h3>
          <p>We may:</p>
          <ul className="list-disc pl-6">
            <li>Monitor, flag, and remove content</li>
            <li>Limit or terminate access to users violating these Terms</li>
            <li>Use automated and manual tools for detecting abuse or policy violations</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-6">8. Termination</h3>
          <p>We may suspend or terminate your access to Nexus Chat at any time, with or without notice, for any reason including breach of Terms. You may delete your account at any time.</p>
          
          <h3 className="text-lg font-semibold mt-6">9. Disclaimer of Warranties</h3>
          <p>Nexus Chat is provided "as is" and "as available" without warranties of any kind. We do not guarantee that the platform will be:</p>
          <ul className="list-disc pl-6">
            <li>Free of errors or bugs</li>
            <li>Continuously available</li>
            <li>Secure from all data breaches or cyber risks</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-6">10. Limitation of Liability</h3>
          <p>To the extent permitted by law, the Nexus Team is not liable for any indirect, incidental, special, or consequential damages, including but not limited to:</p>
          <ul className="list-disc pl-6">
            <li>Loss of data or access</li>
            <li>User disputes</li>
            <li>Platform outages</li>
          </ul>
          
          <h3 className="text-lg font-semibold mt-6">11. Changes to These Terms</h3>
          <p>We may update these Terms periodically. If changes are significant, we will notify you in-app or by email. Continued use after changes go into effect constitutes your acceptance of the new Terms.</p>
          
          <h3 className="text-lg font-semibold mt-6">12. Governing Law</h3>
          <p>These Terms are governed by the laws of [Insert Jurisdiction], without regard to conflict-of-law principles.</p>
          
          <h3 className="text-lg font-semibold mt-6">13. Contact Information</h3>
          <p>Have questions or need support?</p>
          <p>📧 Email: nexuschatting@gmail.com</p>
          <p>🌐 Support: Profile {'>'}  Live support</p>
          
          <h3 className="text-lg font-semibold mt-6">14. All Rights Reserved</h3>
          <p>All rights, intellectual property, and service content are the exclusive property of the Nexus Team. All rights reserved.</p>
          
          <div className="h-10"></div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default TermsOfService;
