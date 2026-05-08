import { Link } from 'react-router-dom'
import logoSm from '@/assets/images/logo-sm.png'
import { developedBy } from '@/context/constants'

const LogoBox = ({ containerClassName, squareLogo, textLogo }) => {
  const inner = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <img src={logoSm} className={squareLogo?.className} height={squareLogo?.height ?? 30} width={squareLogo?.width ?? 19} alt="logo" />
      <span className="logo-text" style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.2px', color: 'inherit' }}>
        {developedBy}
      </span>
    </span>
  )

  return (
    <div className={containerClassName ?? ''}>
      <Link to="/" className="logo-dark" style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
      <Link to="/" className="logo-light" style={{ textDecoration: 'none' }}>
        {inner}
      </Link>
    </div>
  )
}

export default LogoBox
