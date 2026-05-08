import ReactApexChart from 'react-apexcharts'
import { Button, Card, CardBody, CardHeader, CardTitle } from 'react-bootstrap'
const ExpensesChart = () => {
  const chartOptions = {
    series: [
      {
        name: '2024',
        data: [2.7, 2.2, 1.3, 2.5, 1, 2.5, 1.2, 1.2, 2.7, 1, 3.6, 2.1],
      },
      {
        name: '2023',
        data: [-2.3, -1.9, -1, -2.1, -1.3, -2.2, -1.1, -2.3, -2.8, -1.1, -2.5, -1.5],
      },
    ],
    chart: {
      toolbar: {
        show: false,
      },
      type: 'bar',
      fontFamily: 'inherit',
      foreColor: '#ADB0BB',
      height: 280,
      stacked: true,
      offsetX: -15,
    },
    colors: ['var(--bs-primary)', 'var(--bs-info)'],
    plotOptions: {
      bar: {
        horizontal: false,
        barHeight: '80%',
        columnWidth: '25%',
        borderRadius: 3,
        borderRadiusApplication: 'end',
        borderRadiusWhenStacked: 'all',
      },
    },
    dataLabels: {
      enabled: false,
    },
    legend: {
      show: false,
    },
    grid: {
      show: true,
      strokeDashArray: 3,
      padding: {
        top: -10,
        right: 0,
        bottom: -10,
        left: 0,
      },
      borderColor: 'rgba(0,0,0,0.05)',
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: false,
        },
      },
    },
    yaxis: {
      tickAmount: 4,
      labels: {
        formatter: function (val) {
          return val + 'k'
        },
      },
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
  }
  return (
    <Card>
      <CardHeader className="d-flex justify-content-between align-items-center">
        <CardTitle>Expenses</CardTitle>
        <div className="flex-centered gap-1">
          <Button variant="outline-light" size="sm" type="button">
            ALL
          </Button>
          <Button variant="outline-light" size="sm" type="button">
            1M
          </Button>
          <Button variant="outline-light" size="sm" type="button">
            6M
          </Button>
          <Button variant="outline-light" size="sm" type="button" active>
            1Y
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <div dir="ltr">
          <ReactApexChart options={chartOptions} series={chartOptions.series} height={280} type="bar" className="apex-charts" />
        </div>
      </CardBody>
    </Card>
  )
}
export default ExpensesChart
