import ReactApexChart from 'react-apexcharts'
import { Card, CardBody, CardHeader } from 'react-bootstrap'

const AttendanceTrendChart = ({ trendData }) => {
  const dates = Object.keys(trendData).sort()
  const presentData = dates.map((d) => trendData[d].present || 0)
  const absentData = dates.map((d) => trendData[d].absent || 0)

  const chartOptions = {
    chart: {
      type: 'area',
      height: 350,
      toolbar: { show: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    colors: ['#0acf97', '#fa5c7c'],
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.5,
        opacityTo: 0.1,
        stops: [0, 90, 100],
      },
    },
    xaxis: {
      categories: dates.map((d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
      labels: { rotate: -45 },
    },
    legend: { position: 'top' },
    grid: { borderColor: '#f1f3fa' },
  }

  const chartSeries = [
    { name: 'Present', data: presentData },
    { name: 'Absent', data: absentData },
  ]

  return (
    <Card>
      <CardHeader>
        <h5 className="mb-0">30-Day Attendance Trend</h5>
      </CardHeader>
      <CardBody>
        <ReactApexChart options={chartOptions} series={chartSeries} type="area" height={350} />
      </CardBody>
    </Card>
  )
}

export default AttendanceTrendChart
