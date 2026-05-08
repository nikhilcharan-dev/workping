import Flatpickr from 'react-flatpickr'
import 'flatpickr/dist/themes/material_blue.css'

const CustomFlatpickr = ({ className, value, options, placeholder, onChange }) => {
  return <Flatpickr className={className} data-enable-time value={value} options={options} placeholder={placeholder} onChange={onChange} />
}

export default CustomFlatpickr
