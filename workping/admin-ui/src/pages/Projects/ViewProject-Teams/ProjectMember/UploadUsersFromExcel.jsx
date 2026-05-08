import { useState, useRef } from 'react'
import { Modal, Button, Table, Form } from 'react-bootstrap'
import * as XLSX from 'xlsx'
import axiosClient from '@/helpers/httpClient'
import toast from 'react-hot-toast'
import { use2FA } from '@/context/TwoFAContext'

const UploadUsersFromExcel = ({ show, handleClose, openEmployees, projectId, organizationId, onSuccess }) => {
  const { require2FA } = use2FA()

  const [rollNumbers, setRollNumbers] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const fileInputRef = useRef(null)

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)
      const rolls = jsonData.map((row) => row.RollNumber).filter(Boolean)
      setRollNumbers(rolls)
      setSelectedIds([])
    }
    reader.readAsArrayBuffer(file)
  }

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === rollNumbers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(rollNumbers)
    }
  }

  const sendToBackend = () => {
    if (selectedIds.length === 0) return
    require2FA(async () => {
      try {
        await axiosClient.post('/api/admin/project/add-project-member', { projectId, organizationId, members: selectedIds }, { silent: true })
        toast.success('Member(s) added to project successfully!')
        if (onSuccess) onSuccess()
        handleClose()
      } catch (err) {
        throw new Error(err?.response?.data?.message || 'Failed to add members')
      } finally {
        setRollNumbers([])
        setSelectedIds([])
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    })
  }

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered scrollable enforceFocus={false}>
      <Modal.Header closeButton>
        <div className="d-flex align-items-center justify-content-between w-100">
          <Modal.Title>Upload Roll Numbers</Modal.Title>
          <Button className="me-2" onClick={openEmployees}>
            Open Employees Window
          </Button>
        </div>
      </Modal.Header>

      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Upload Excel File</Form.Label>
          <Form.Control type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleFileUpload} />
        </Form.Group>

        {rollNumbers.length > 0 && (
          <div className="table-responsive">
            <Table bordered hover>
              <thead className="bg-light">
                <tr>
                  <th>
                    <Form.Check
                      type="checkbox"
                      checked={selectedIds.length === rollNumbers.length && rollNumbers.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th>#</th>
                  <th>Roll Number</th>
                </tr>
              </thead>
              <tbody>
                {rollNumbers.map((roll, index) => (
                  <tr key={index}>
                    <td>
                      <Form.Check type="checkbox" checked={selectedIds.includes(roll)} onChange={() => toggleSelect(roll)} />
                    </td>
                    <td>{index + 1}</td>
                    <td>{roll || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Close
        </Button>
        <Button variant="primary" disabled={selectedIds.length === 0} onClick={sendToBackend}>
          Send Selected ({selectedIds.length})
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default UploadUsersFromExcel
