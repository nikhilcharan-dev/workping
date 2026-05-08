import { useState } from 'react'
import { Button } from 'react-bootstrap'
import EmployeesWindow from './EmployeesWindow'
import UploadUsersFromExcel from './UploadUsersFromExcel'

const ButtonPage = () => {
  const [activeModal, setActiveModal] = useState(null)

  const openEmployees = () => setActiveModal('employees')
  const openExcel = () => setActiveModal('excel')
  const closeModal = () => setActiveModal(null)

  return (
    <>
      <Button onClick={openEmployees}>Add</Button>

      {activeModal === 'employees' && <EmployeesWindow show={true} handleClose={closeModal} openExcel={openExcel} />}

      {activeModal === 'excel' && <UploadUsersFromExcel show={true} handleClose={closeModal} openEmployees={openEmployees} />}
    </>
  )
}

export default ButtonPage
