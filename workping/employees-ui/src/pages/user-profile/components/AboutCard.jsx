import { useState } from 'react'
import { Button, Card, CardBody, CardFooter, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row, Form } from 'react-bootstrap'

import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { useAuthContext } from '@/context/useAuthContext'
import avatar1 from '@/assets/images/users/avatar-1.jpg'

const AboutCard = () => {
  const { user } = useAuthContext()
  /* ---------- Links State ---------- */
  const [links, setLinks] = useState({
    github: '',
    linkedin: '',
    portfolio: '',
  })

  const [editingKey, setEditingKey] = useState(null)
  const [tempLink, setTempLink] = useState('')

  /* ---------- Link Config ---------- */
  const linkConfig = {
    github: {
      label: 'GitHub',
      icon: 'mdi:github',
      placeholder: 'https://github.com/username',
    },
    linkedin: {
      label: 'LinkedIn',
      icon: 'mdi:linkedin',
      placeholder: 'https://linkedin.com/in/username',
    },
    portfolio: {
      label: 'Portfolio',
      icon: 'mdi:web',
      placeholder: 'https://your-portfolio.com',
    },
  }

  /* ---------- Handlers ---------- */
  const handleSave = (key) => {
    if (!tempLink.trim()) return
    setLinks({ ...links, [key]: tempLink })
    setEditingKey(null)
    setTempLink('')
  }

  const handleDelete = (key) => {
    setLinks({ ...links, [key]: '' })
  }

  return (
    <Card className="text-center h-100">
      {/* ---------- Avatar ---------- */}
      <div className="d-flex justify-content-center pt-4">
        <img
          src={avatar1}
          alt="avatar"
          className="avatar-lg rounded-circle border border-light border-3"
          style={{
            width: '140px',
            height: '140px',
            maxWidth: '40vw',
            maxHeight: '40vw',
          }}
        />
      </div>

      <CardBody>
        {/* ---------- User Info ---------- */}
        <div className="position-relative mb-3">
          <div className="text-center">
            <h4 className="mb-1">{user?.name ?? 'My Profile'}</h4>
            <p className="fs-14 mb-0 text-muted">{user?.designation ?? user?.role ?? ''}</p>
          </div>

          {/* ---------- Dropdown ---------- */}
          <div className="position-absolute top-0 end-0">
            <Dropdown>
              <DropdownToggle as="a" role="button" className="arrow-none">
                <IconifyIcon icon="bx:dots-vertical-rounded" className="fs-18 text-dark" />
              </DropdownToggle>

              <DropdownMenu className="dropdown-menu-end">
                <DropdownItem>Edit Profile</DropdownItem>
                <DropdownItem>Export Profile</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* ---------- Links Section ---------- */}
        <div className="mt-4 text-center">
          <h6 className="fw-semibold mb-3">Links</h6>

          <div className="d-flex flex-column gap-2">
            {Object.entries(linkConfig).map(([key, config]) => {
              const value = links[key]

              return (
                <div key={key} className="d-flex align-items-center justify-content-between border rounded px-2 py-1">
                  {/* Left Side */}
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <IconifyIcon icon={config.icon} className="fs-18" />

                    {editingKey === key ? (
                      <Form.Control
                        size="sm"
                        placeholder={config.placeholder}
                        value={tempLink}
                        onChange={(e) => setTempLink(e.target.value)}
                        autoFocus
                      />
                    ) : value ? (
                      <a href={value} target="_blank" rel="noreferrer" className="text-primary text-decoration-underline fs-14">
                        {config.label}
                      </a>
                    ) : (
                      <span className="text-muted fs-14">{config.placeholder}</span>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="d-flex gap-1 ms-2">
                    {editingKey === key ? (
                      <>
                        <Button size="sm" onClick={() => handleSave(key)}>
                          Save
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingKey(null)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="light"
                          onClick={() => {
                            setEditingKey(key)
                            setTempLink(value)
                          }}>
                          <IconifyIcon icon="mdi:pencil" />
                        </Button>

                        {value && (
                          <Button size="sm" variant="light" onClick={() => handleDelete(key)}>
                            <IconifyIcon icon="mdi:delete" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

export default AboutCard
