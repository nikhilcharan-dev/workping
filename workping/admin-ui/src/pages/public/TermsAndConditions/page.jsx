import { Card, CardBody } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import { currentYear, developedBy } from '@/context/constants'

const TermsAndConditions = () => {
  return (
    <>
      <PageMetaData title="Terms and Conditions" />

      <div className="text-center mb-5">
        <h1 className="fw-bold">Terms &amp; Conditions</h1>
        <p className="text-muted">Last updated: March 28, {currentYear}</p>
      </div>

      <Card className="shadow-sm">
        <CardBody className="p-4 p-lg-5">
          <section className="mb-4">
            <h4 className="fw-semibold mb-3">1. Acceptance of Terms</h4>
            <p>
              By accessing or using <strong>{developedBy}</strong>, you agree to be bound by these Terms and Conditions. If you do not agree with any
              part of these terms, you may not access or use our platform.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">2. Description of Service</h4>
            <p>
              {developedBy} is a workforce management platform that provides tools for employee tracking, team management, project coordination,
              attendance management, and related HR operations. We reserve the right to modify or discontinue the service at any time with or without
              notice.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">3. Account Registration</h4>
            <p>To use our platform, you must:</p>
            <ul>
              <li>Provide accurate, current, and complete information during registration.</li>
              <li>Maintain and update your account information to keep it accurate.</li>
              <li>Maintain the security of your password and accept responsibility for all activities under your account.</li>
              <li>Notify us immediately of any unauthorized use of your account.</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts that violate these terms or for any other reason at our sole discretion.</p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">4. Acceptable Use</h4>
            <p>You agree not to use the platform to:</p>
            <ul>
              <li>Violate any applicable laws or regulations.</li>
              <li>Upload, transmit, or distribute any malicious code, viruses, or harmful content.</li>
              <li>Attempt to gain unauthorized access to any part of the platform or its systems.</li>
              <li>Engage in any activity that disrupts or interferes with the platform's functionality.</li>
              <li>Scrape, harvest, or collect data from the platform without our consent.</li>
              <li>Impersonate any person or entity or misrepresent your affiliation.</li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">5. Subscription and Payment</h4>
            <p>
              Access to certain features may require a paid subscription. By subscribing, you authorize us to charge the applicable fees to your
              payment method. All fees are non-refundable except as required by law. We reserve the right to change pricing with reasonable notice.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">6. Data and Privacy</h4>
            <p>
              Your use of the platform is also governed by our{' '}
              <a href="/privacy-policy" className="text-primary">
                Privacy Policy
              </a>
              , which is incorporated into these Terms by reference. By using the platform, you consent to the collection and use of your information
              as described in the Privacy Policy.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">7. Intellectual Property</h4>
            <p>
              The platform and its original content, features, and functionality are and will remain the exclusive property of {developedBy}. Our
              trademarks and trade dress may not be used in connection with any product or service without prior written consent.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">8. Limitation of Liability</h4>
            <p>
              To the fullest extent permitted by law, {developedBy} shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages resulting from your use of or inability to use the platform, even if we have been advised of the possibility of such
              damages.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">9. Disclaimer of Warranties</h4>
            <p>
              The platform is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, including but
              not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">10. Termination</h4>
            <p>
              We may terminate or suspend your account and access to the platform immediately, without prior notice, for conduct that we believe
              violates these Terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">11. Changes to Terms</h4>
            <p>
              We reserve the right to modify these terms at any time. We will notify users of significant changes via email or a prominent notice on
              the platform. Continued use of the platform after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h4 className="fw-semibold mb-3">12. Contact Us</h4>
            <p>
              If you have any questions about these Terms and Conditions, please contact us through{' '}
              <a href="/contact" className="text-primary">
                our contact page
              </a>
              .
            </p>
          </section>
        </CardBody>
      </Card>
    </>
  )
}

export default TermsAndConditions
