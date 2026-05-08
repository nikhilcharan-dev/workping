import ReactApexChart from 'react-apexcharts'
import { Card, CardBody, CardHeader, Col, Row } from 'react-bootstrap'

const AttendanceHighlights = ({ attendanceData }) => {
  const { today = {} } = attendanceData
  const presenceRate = today.total > 0 ? Math.round((today.present / today.total) * 100) : 0

  const chartOptions = {
    chart: { height: 220, type: 'radialBar' },
    plotOptions: {
      radialBar: {
        hollow: { size: '65%' },
        dataLabels: {
          name: { show: false },
          value: {
            offsetY: 10,
            color: '#313a46',
            fontSize: '24px',
            fontWeight: '700',
            formatter: (val) => `${val}%`,
          },
        },
        track: { background: 'rgba(49, 58, 70, 0.1)' },
      },
    },
    colors: ['#0acf97'],
    stroke: { lineCap: 'round' },
  }

  const chartSeries = [presenceRate]

  const stats = [
    { label: 'Present', value: today.present, color: 'success' },
    { label: 'Absent', value: today.absent, color: 'danger' },
    { label: 'Late', value: today.late, color: 'warning' },
    { label: 'Half Day', value: today.halfDay, color: 'info' },
  ]

  return (
    <Card className="h-100">
      <CardHeader className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Today's Attendance</h5>
      </CardHeader>
      <CardBody>
        <div className="text-center mb-3">
          <ReactApexChart options={chartOptions} series={chartSeries} type="radialBar" height={220} />
          <p className="text-muted mt-n3 small">Team Presence Rate</p>
        </div>

        <Row className="g-2">
          {stats.map((s, idx) => (
            <Col xs={6} key={idx}>
              <div className="p-2 border border-light rounded text-center">
                <h6 className={`text-${s.color} mb-1 fw-bold fs-16`}>{s.value}</h6>
                <p className="text-muted mb-0 small">{s.label}</p>
              </div>
            </Col>
          ))}
        </Row>
      </CardBody>
    </Card>
  )
}

export default AttendanceHighlights
