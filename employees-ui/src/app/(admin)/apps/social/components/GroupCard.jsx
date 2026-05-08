import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { Button, Card, CardBody, CardTitle } from 'react-bootstrap'
const GroupCard = ({ description, image, name }) => {
  return (
    <Card className="group">
      <div className="group-action">
        <div className="avatar-sm fw-bold">
          <span className="avatar-title rounded-circle text-bg-primary text-center fs-18">
            <IconifyIcon icon="bx:x" />
          </span>
        </div>
      </div>
      <img
        src={image}
        alt={name + '-image'}
        width={308}
        height={205}
        style={{
          maxHeight: 205,
        }}
        className="card-img-top img-fluid"
      />
      <CardBody>
        <CardTitle as={'h5'} className="fs-16 mb-2">
          {name}
        </CardTitle>
        <p className="card-text text-muted text-justify">{description}</p>
        <Button variant="primary" className="w-100">
          Join Group
        </Button>
      </CardBody>
    </Card>
  )
}
export default GroupCard
