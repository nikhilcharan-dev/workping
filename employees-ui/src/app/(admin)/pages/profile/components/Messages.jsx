import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { getAllFriends } from '@/helpers/data'
import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
const Messages = () => {
  const [allMessages, setAllMessages] = useState()
  useEffect(() => {
    ;(async () => {
      const data = await getAllFriends()
      setAllMessages(data)
    })()
  }, [])
  return (
    <Card>
      <CardHeader className="d-flex align-items-center">
        <CardTitle as={'h5'}>Messages</CardTitle>
        <div className="ms-auto">
          <span className="text-primary icons-center" role="button">
            Export
            <IconifyIcon icon="bx:export" className="ms-1" />
          </span>
        </div>
      </CardHeader>
      <CardBody>
        <ul className="list-unstyled mb-0">
          {allMessages &&
            allMessages.slice(0, 6).map((item, idx) => (
              <li
                className={clsx(
                  {
                    'pb-3': idx === 0,
                  },
                  allMessages.slice(0, 6).length - 1 === idx ? 'pt-3' : idx === 0 ? 'pb-3 border-bottom' : 'py-3 border-bottom',
                )}
                key={idx}>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <img src={item.avatar} alt="avatar-2" className="avatar-md rounded-circle" />
                  <div className="d-block">
                    <h5 className="fs-15 mt-0 mb-1">{item.name}</h5>
                    <p className="text-muted fs-13 text-break mb-0">{item.message}</p>
                  </div>
                  <div className="ms-auto text-end">
                    <p className="text-muted mb-0">{new Date(item.time).toLocaleTimeString()}</p>
                  </div>
                </div>
              </li>
            ))}
        </ul>
      </CardBody>
    </Card>
  )
}
export default Messages
