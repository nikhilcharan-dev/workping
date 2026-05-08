import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { stateData } from '../data'
const StatCard = ({ amount, icon, variant, name }) => {
  return (
    <Card>
      <CardBody>
        <Row>
          <Col xs={6}>
            <div className={`avatar-md bg-opacity-10 rounded flex-centered bg-${variant}`}>
              <IconifyIcon icon={icon} height={32} width={32} className={`text-${variant} `} />
            </div>
          </Col>
          <Col xs={6} className="text-end">
            <p className="text-muted mb-0 text-truncate">{name}</p>
            <h3 className="text-dark mt-1 mb-0">{amount}</h3>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}
const Stats = () => {
  return (
    <Row>
      {stateData.map((stat, idx) => (
        <Col md={6} xxl={12} key={idx}>
          <StatCard {...stat} />
        </Col>
      ))}
    </Row>
  )
}
export default Stats
