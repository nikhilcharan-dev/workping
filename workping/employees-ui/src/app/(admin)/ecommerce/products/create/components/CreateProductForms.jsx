import clsx from 'clsx'
import { useState } from 'react'
import { Tab, Tabs } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import GeneralDetailsForm from './GeneralDetailsForm'
import MetaDataForm from './MetaDataForm'
import ProductGalleryForm from './ProductGalleryForm'
import ProductSubmittedForm from './ProductSubmittedForm'
const formSteps = [
  {
    index: 1,
    name: 'General Detail',
    icon: 'bxs:contact',
    tab: <GeneralDetailsForm />,
  },
  {
    index: 2,
    name: 'Product Images',
    icon: 'bx:images',
    tab: <ProductGalleryForm />,
  },
  {
    index: 3,
    name: 'Meta Data',
    icon: 'bxs:book',
    tab: <MetaDataForm />,
  },
  {
    index: 4,
    name: 'Finish',
    icon: 'bxs:check-circle',
    tab: <ProductSubmittedForm />,
  },
]
const CreateProductForms = () => {
  const [activeStep, setActiveStep] = useState(1)
  return (
    <>
      <Tabs variant="underline" activeKey={activeStep} className="nav nav-tabs card-tabs" onSelect={(e) => setActiveStep(Number(e))}>
        {formSteps.map((step) => (
          <Tab
            key={step.index}
            eventKey={step.index}
            className="nav-item"
            tabClassName="pb-3"
            title={
              <span className="fw-semibold">
                <IconifyIcon icon={step.icon} className="me-1" />
                <span className="d-none d-sm-inline">{step.name}</span>
              </span>
            }>
            <>{step.tab}</>
          </Tab>
        ))}
      </Tabs>

      <div className="d-flex flex-wrap gap-2 wizard justify-content-between mt-3">
        <div className="previous me-2">
          <button
            onClick={() => setActiveStep(() => activeStep - 1)}
            className={clsx('btn btn-primary', {
              disabled: activeStep === 1,
            })}>
            <IconifyIcon icon="bx:left-arrow-alt" className="me-2" />
            Back To Previous
          </button>
        </div>
        <div className="next">
          <button
            onClick={() => setActiveStep(() => activeStep + 1)}
            className={clsx('btn btn-primary', {
              disabled: formSteps.length === activeStep,
            })}>
            Next Step
            <IconifyIcon icon="bx:right-arrow-alt" className="ms-2" />
          </button>
        </div>
      </div>
    </>
  )
}
export default CreateProductForms
