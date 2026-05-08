import { getAllFriends } from '@/helpers/data'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Button, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
const Followers = () => {
  const [allFollowers, setAllFollowers] = useState()
  useEffect(() => {
    ;(async () => {
      const data = await getAllFriends()
      setAllFollowers(data)
    })()
  }, [])
  return (
    <Card>
      <CardHeader className="d-flex">
        <CardTitle as={'h5'}>Followers</CardTitle>
        <div className="ms-auto">
          <span className="text-primary">View All</span>
        </div>
      </CardHeader>
      <CardBody>
        <ul className="list-group">
          {allFollowers &&
            allFollowers.slice(0, 6).map((follower, idx) => (
              <li
                className={clsx('list-group-item border-0 px-0', allFollowers.slice(0, 6).length - 1 === idx ? 'pb-0' : 'border-bottom', {
                  'pt-0': idx === 0,
                })}
                key={idx}>
                <div className="d-flex flex-wrap align-items-center gap-2">
                  <img src={follower.avatar} alt="avatar" className="rounded-circle avatar-sm" />
                  <div className="d-block">
                    <h5 className="mb-1">{follower.name}</h5>
                    <h6 className="mb-0 text-muted">{follower.email}</h6>
                  </div>
                  <div className="ms-auto">
                    <Button variant="soft-secondary" size="sm">
                      Follow
                    </Button>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </CardBody>
    </Card>
  )
}
export default Followers
