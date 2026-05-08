import { Card, CardBody } from 'react-bootstrap'
import PageMetaData from '@/components/PageTitle'
import { currentYear, developedBy } from '@/context/constants'

const PrivacyPolicy = () => {
  return (
    <>
      <PageMetaData title="Privacy Policy" />

      <div className="text-center mb-5">
        <h1 className="fw-bold">Privacy Policy</h1>
        <p className="text-muted">Last updated: March 28, {currentYear}</p>
      </div>

      <Card className="shadow-sm">
        <CardBody className="p-4 p-lg-5">
          <section className="mb-4">
            <h4 className="fw-semibold mb-3">1. Introduction</h4>
            <p>
              Welcome to <strong>{developedBy}</strong>. We are committed to protecting your personal information and your right to privacy. This
              Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">2. Information We Collect</h4>
            <p>We collect information that you provide directly to us, including:</p>
            <ul>
              <li>
                <strong>Account Information:</strong> Name, email address, password, and organization details when you register.
              </li>
              <li>
                <strong>Employee Data:</strong> Employee records, attendance data, project assignments, and team membership information.
              </li>
              <li>
                <strong>Usage Data:</strong> Log data, device information, IP addresses, browser type, and pages visited.
              </li>
              <li>
                <strong>Communications:</strong> Messages and support requests you send to us.
              </li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">3. How We Use Your Information</h4>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, operate, and maintain our platform and services.</li>
              <li>Process transactions and manage your subscriptions.</li>
              <li>Send administrative information, updates, and security alerts.</li>
              <li>Respond to your comments, questions, and customer service requests.</li>
              <li>Analyze usage patterns to improve our platform.</li>
              <li>Comply with legal obligations.</li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">4. Sharing Your Information</h4>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share information with:</p>
            <ul>
              <li>
                <strong>Service Providers:</strong> Trusted third parties who assist in operating our platform (hosting, payment processing, email
                delivery).
              </li>
              <li>
                <strong>Legal Requirements:</strong> When required by law, court order, or governmental authority.
              </li>
              <li>
                <strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">5. Cookies and Tracking</h4>
            <p>
              We use cookies and similar tracking technologies to track activity on our platform and hold certain information. You can instruct your
              browser to refuse all cookies or to indicate when a cookie is being sent. However, some features of the platform may not function
              properly without cookies.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">6. Data Security</h4>
            <p>
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized
              access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">7. Data Retention</h4>
            <p>
              We retain your personal information for as long as your account is active or as needed to provide services. You may request deletion of
              your data at any time by contacting us.
            </p>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">8. Your Rights</h4>
            <p>Depending on your location, you may have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your personal data.</li>
              <li>Object to or restrict our processing of your data.</li>
              <li>Data portability.</li>
            </ul>
          </section>

          <section className="mb-4">
            <h4 className="fw-semibold mb-3">9. Children's Privacy</h4>
            <p>Our platform is not directed to individuals under the age of 18. We do not knowingly collect personal information from children.</p>
          </section>

          <section>
            <h4 className="fw-semibold mb-3">10. Contact Us</h4>
            <p>
              If you have any questions about this Privacy Policy, please contact us at{' '}
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

export default PrivacyPolicy
