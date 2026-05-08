import { Link } from 'react-router-dom'
import { currentYear, developedBy, developedByLink } from '@/context/constants'
import IconifyIcon from '../wrappers/IconifyIcon'

const footerLinks = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Terms & Conditions', to: '/terms-and-conditions' },
]

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <span className="footer-copy">
          <IconifyIcon icon="iconamoon:heart-duotone" className="fs-16 align-middle text-danger me-1" />
          {currentYear} &copy;{' '}
          <a href={developedByLink} className="footer-text fw-semibold" target="_blank" rel="noreferrer">
            {developedBy}
          </a>
        </span>

        <nav className="footer-nav">
          {footerLinks.map((link, i) => (
            <span key={link.to} className="footer-nav-item">
              <Link to={link.to} className="footer-link">
                {link.label}
              </Link>
              {i < footerLinks.length - 1 && <span className="footer-sep" />}
            </span>
          ))}
        </nav>
      </div>
    </footer>
  )
}

export default Footer
