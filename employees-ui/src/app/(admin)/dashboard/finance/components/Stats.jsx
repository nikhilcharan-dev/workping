import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row } from 'react-bootstrap'
import { currency } from '@/context/constants'
import { statData } from '../data'
const StateCard = ({ stat }) => {
  const { change, changeColor, icon, iconColor, name, amount } = stat
  return (
    <Card>
      <CardBody>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h3 className="mb-0 fw-bold mb-2">
              {currency}
              {amount}k
            </h3>
            <p className="text-muted">{name}</p>
            <span className={`badge fs-12 badge-soft-${changeColor}`}>{change}%</span>
          </div>
          <div>
            <div className="avatar-lg d-inline-block me-1">
              <span className={`avatar-title bg-${iconColor}-subtle text-${iconColor} rounded-circle`}>
                <IconifyIcon icon={icon} className="fs-32" />
              </span>
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  )
}
const Stats = () => {
  return (
    <Row>
      {statData.map((stat, idx) => (
        <Col key={idx}>
          <StateCard stat={stat} />
        </Col>
      ))}
    </Row>
  )
}
export default Stats
