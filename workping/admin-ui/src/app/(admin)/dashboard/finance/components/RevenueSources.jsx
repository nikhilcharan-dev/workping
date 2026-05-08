import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { currency } from '@/context/constants'
import ReactApexChart from 'react-apexcharts'
import { Card, CardBody, CardHeader, CardTitle, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Table } from 'react-bootstrap'
const RevenueSources = () => {
  const chartOptions = {
    chart: {
      height: 205,
      type: 'donut',
    },
    legend: {
      show: false,
      position: 'bottom',
      horizontalAlign: 'center',
      offsetX: 0,
      offsetY: -5,
      markers: {
        width: 9,
        height: 9,
        radius: 6,
      },
      itemMargin: {
        horizontal: 10,
        vertical: 0,
      },
    },
    stroke: {
      width: 0,
    },
    plotOptions: {
      pie: {
        donut: {
          size: '70%',
          labels: {
            show: true,
            total: {
              showAlways: true,
              show: true,
            },
          },
        },
      },
    },
    series: [140, 125, 85],
    labels: ['Online', 'Offline', 'Direct'],
    colors: ['var(--bs-primary)', 'var(--bs-info)', 'var(--bs-light)'],
    dataLabels: {
      enabled: false,
    },
  }
  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle>Revenue Sources</CardTitle>
        <Dropdown>
          <DropdownToggle as={'a'} role="button" className="arrow-none card-drop">
            <IconifyIcon icon="iconamoon:menu-kebab-vertical-circle-duotone" className="fs-20 align-middle text-muted" />
          </DropdownToggle>
          <DropdownMenu className="dropdown-menu-end">
            <DropdownItem href="">Sales Report</DropdownItem>
            <DropdownItem href="">Export Report</DropdownItem>
            <DropdownItem href="">Profit</DropdownItem>
            <DropdownItem href="">Action</DropdownItem>
          </DropdownMenu>
        </Dropdown>
      </CardHeader>
      <CardBody>
        <ReactApexChart height={205} options={chartOptions} series={chartOptions.series} type="donut" className="apex-charts mb-2" />
        <div className="table-responsive mb-n1">
          <Table borderless size="sm" className="table-nowrap  table-centered mb-0">
            <thead className="bg-light bg-opacity-50 thead-sm">
              <tr>
                <th className="py-1">Sources</th>
                <th className="py-1">Revenue</th>
                <th className="py-1">Perc.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Online</td>
                <td>{currency}187,232</td>
                <td>
                  48.63%&nbsp;
                  <span className="badge badge-soft-success ms-1">2.5% Up</span>
                </td>
              </tr>
              <tr>
                <td>Offline</td>
                <td>{currency}126,874</td>
                <td>
                  36.08%&nbsp;
                  <span className="badge badge-soft-success ms-1">8.5% Up</span>
                </td>
              </tr>
              <tr>
                <td>Direct</td>
                <td>{currency}90,127</td>
                <td>
                  23.41%&nbsp;
                  <span className="badge badge-soft-danger ms-1">10.98% Down</span>
                </td>
              </tr>
            </tbody>
          </Table>
        </div>
      </CardBody>
    </Card>
  )
}
export default RevenueSources
