import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Card, CardBody, Col, Row } from 'react-bootstrap'

const StatCard = ({ amount, icon, variant, name }) => {
  return (
    <Card className="h-100 shadow-none border-0 bg-light-subtle">
      <CardBody>
        <Row className="align-items-center">
          <Col xs={4}>
            <div className={`avatar-md bg-opacity-10 rounded flex-centered bg-${variant}`}>
              <IconifyIcon icon={icon} height={32} width={32} className={`text-${variant} `} />
            </div>
          </Col>
          <Col xs={8} className="text-end">
            <p className="text-muted mb-0 text-truncate fw-medium">{name}</p>
            <h3 className="text-dark mt-1 mb-0 fw-bold">{amount}</h3>
          </Col>
        </Row>
      </CardBody>
    </Card>
  )
}

const ManagerStats = ({ stats }) => {
  const cards = [
    {
      name: 'Managed Teams',
      amount: stats.teamsCount || 0,
      icon: 'bxs:group',
      variant: 'primary',
    },
    {
      name: 'Total Headcount',
      amount: stats.totalMembers || 0,
      icon: 'iconamoon:profile-circle-duotone',
      variant: 'success',
    },
    {
      name: 'Active Projects',
      amount: stats.projectsCount || 0,
      icon: 'iconamoon:folder-duotone',
      variant: 'info',
    },
    {
      name: 'Pending Leaves',
      amount: stats.pendingLeavesCount || 0,
      icon: 'iconamoon:calendar-1-duotone',
      variant: 'warning',
    },
  ]

  return (
    <Row className="g-3">
      {cards.map((stat, idx) => (
        <Col md={6} xxl={3} key={idx}>
          <StatCard {...stat} />
        </Col>
      ))}
    </Row>
  )
}

export default ManagerStats
