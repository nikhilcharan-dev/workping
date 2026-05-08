import { useState } from 'react'
import { Card, CardBody, CardHeader, CardTitle, Button, Form, Badge } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const Skill = ({ skillData = [] }) => {
  const [skills, setSkills] = useState(skillData)
  const [newSkill, setNewSkill] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAddSkill = (e) => {
    e.preventDefault()
    if (!newSkill.trim()) {
      setIsAdding(false)
      return
    }
    setSkills([...skills, { title: newSkill, progressValue: 0 }])
    setNewSkill('')
    setIsAdding(false)
  }

  const handleDeleteSkill = (index) => {
    setSkills(skills.filter((_, i) => i !== index))
  }

  return (
    <Card className="shadow-sm border-0" style={{ minHeight: '348px' }}>
      <CardHeader className="bg-transparent border-0 pt-3 pb-2">
        <div className="d-flex align-items-center gap-2">
          <CardTitle as="h5" className="mb-0 fw-bold">
            Skills & Expertise
          </CardTitle>
          <IconifyIcon icon="iconamoon:lightning-duotone" className="text-warning fs-20" />
        </div>
      </CardHeader>

      <CardBody className="d-flex flex-column p-lg-3 p-2">
        {/* Skills List - Vertical Rows as per sketch */}
        <div
          className="flex-grow-1 custom-scrollbar pe-1 mb-3"
          style={{
            height: '240px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
          {skills.length > 0 ? (
            skills.map((item, idx) => (
              <div
                key={idx}
                className="skill-row d-flex align-items-center justify-content-between bg-light border border-light-subtle rounded-3 px-3 py-2"
                style={{
                  minHeight: '48px',
                  transition: 'all 0.2s ease',
                }}>
                <span className="fw-semibold text-dark fs-14">{item.title}</span>

                <button type="button" className="btn btn-link p-0 text-muted hover-danger" onClick={() => handleDeleteSkill(idx)}>
                  <IconifyIcon icon="iconamoon:trash-duotone" className="fs-18" />
                </button>
              </div>
            ))
          ) : (
            <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
              <IconifyIcon icon="iconamoon:bookmark-plus-duotone" className="fs-48 mb-2" />
              <span className="small">No skills added yet</span>
            </div>
          )}
        </div>

        {/* Add Section at the bottom - Centered and Solid as per request */}
        <div className="mt-auto d-flex justify-content-center">
          {isAdding ? (
            <Form onSubmit={handleAddSkill} className="d-flex gap-2 animate-fade-in w-100">
              <Form.Control
                autoFocus
                className="bg-light border-0 shadow-none ps-3 py-2"
                placeholder="Enter skill..."
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                style={{ borderRadius: '10px' }}
                onBlur={() => !newSkill && setIsAdding(false)}
              />
              <Button type="submit" variant="primary" className="px-3 py-2 border-0 shadow-sm" style={{ borderRadius: '10px' }}>
                Done
              </Button>
            </Form>
          ) : (
            <Button
              variant="primary"
              className="d-flex align-items-center gap-2 px-4 py-2 border-0 shadow-sm transition-all"
              style={{ borderRadius: '10px' }}
              onClick={() => setIsAdding(true)}>
              <span className="fw-semibold">Add Skill</span>
              <IconifyIcon icon="iconamoon:plus-bold" />
            </Button>
          )}
        </div>
      </CardBody>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .skill-row {
          text-transform: capitalize;
        }
        .skill-row:hover {
          background-color: #fff !important;
          border-color: var(--bs-primary-border-subtle) !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          transform: translateX(4px);
        }
        .hover-danger:hover {
          color: var(--bs-danger) !important;
        }
        .transition-all {
          transition: all 0.2s ease;
        }
        .transition-all:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 15px rgba(var(--bs-primary-rgb), 0.2) !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .skill-row {
          text-transform: capitalize;
          overflow: hidden;
        }
        .skill-row span {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-right: 10px;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `,
        }}
      />
    </Card>
  )
}

export default Skill
