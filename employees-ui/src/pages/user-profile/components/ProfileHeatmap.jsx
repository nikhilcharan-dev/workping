import React, { useState, useMemo, useRef, useEffect } from 'react'
import { OverlayTrigger, Tooltip as BSTooltip } from 'react-bootstrap'
import IconifyIcon from '@/components/wrappers/IconifyIcon'

const generateDummyData = () => {
  const data = []
  const end = new Date()
  const start = new Date()
  start.setFullYear(start.getFullYear() - 1)

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getUTCDay() // 0: Sun, 6: Sat
    let status = 'present' // default
    let value = 1

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      status = 'weekend'
      value = 4
    } else {
      const rand = Math.random()
      if (rand < 0.05) {
        status = 'full_leave'
        value = 3
      } else if (rand < 0.1) {
        status = 'half_leave'
        value = 2
      } else {
        status = 'present'
        value = 1
      }
    }

    data.push({
      day: d.toISOString().slice(0, 10),
      value: value,
      status: status,
    })
  }
  return data
}

const mockData = generateDummyData()

export default function ProfileHeatmap() {
  const [year, setYear] = useState('Current')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const today = new Date()

  const { monthsData, stats } = useMemo(() => {
    let startDate
    let endDate

    if (year === 'Current') {
      endDate = new Date(today)
      startDate = new Date(today)
      startDate.setFullYear(startDate.getFullYear() - 1)
      startDate.setDate(startDate.getDate() + 1)
    } else {
      const y = Number(year)
      startDate = new Date(Date.UTC(y, 0, 1))
      endDate = new Date(Date.UTC(y, 11, 31))
    }

    const start = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()))
    const end = new Date(Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()))

    const filteredData = mockData.filter((d) => {
      const dt = new Date(d.day)
      return dt >= start && dt <= end
    })

    const dataMap = {}
    filteredData.forEach((d) => {
      dataMap[d.day] = d
    })

    let totalLeaves = 0
    let totalAttendance = 0
    let maxStreak = 0
    let currentStreak = 0

    let dIter = new Date(start)
    while (dIter <= end) {
      const dateStr = dIter.toISOString().slice(0, 10)
      const dEntry = dataMap[dateStr]
      if (dEntry) {
        if (dEntry.status === 'full_leave') totalLeaves += 1
        if (dEntry.status === 'half_leave') totalLeaves += 0.5
        if (dEntry.status === 'present') {
          totalAttendance += 1
          currentStreak += 1
          if (currentStreak > maxStreak) maxStreak = currentStreak
        } else if (dEntry.status !== 'weekend') {
          currentStreak = 0
        }
      }
      dIter.setUTCDate(dIter.getUTCDate() + 1)
    }

    const groupedMonths = []
    let currM = new Date(start)
    currM.setUTCDate(1)

    while (currM <= end || (currM.getUTCFullYear() === end.getUTCFullYear() && currM.getUTCMonth() === end.getUTCMonth())) {
      const mYear = currM.getUTCFullYear()
      const mMonth = currM.getUTCMonth()
      const monthName = currM.toLocaleString('default', { month: 'short' })

      const weeks = []
      let d = new Date(Date.UTC(mYear, mMonth, 1))
      let currentWeek = new Array(7).fill(null)

      for (let i = 0; i < d.getUTCDay(); i++) {
        currentWeek[i] = null
      }

      while (d.getUTCMonth() === mMonth && d <= end) {
        if (d >= start && d <= end) {
          const dateStr = d.toISOString().slice(0, 10)
          currentWeek[d.getUTCDay()] = dataMap[dateStr] || { day: dateStr, value: 0, status: 'none' }
        } else {
          currentWeek[d.getUTCDay()] = null
        }

        let nextDay = new Date(d)
        nextDay.setUTCDate(nextDay.getUTCDate() + 1)

        if (d.getUTCDay() === 6 || nextDay.getUTCMonth() !== mMonth || d.getTime() === end.getTime()) {
          weeks.push(currentWeek)
          currentWeek = new Array(7).fill(null)
        }
        d = nextDay
      }

      groupedMonths.push({ monthName, weeks })
      currM.setUTCMonth(currM.getUTCMonth() + 1)
    }

    return {
      monthsData: groupedMonths.filter((m) => m.weeks.length > 0),
      stats: { totalLeaves, totalAttendance, maxStreak },
    }
  }, [year])

  const getColor = (status) => {
    switch (status) {
      case 'present':
        return '#0e4429' // Full Dark Green
      case 'half_leave':
        return '#39d353' // Standard Green
      case 'full_leave':
        return '#cf222e' // Red
      case 'weekend':
        return '#e3b341' // Dark Yellow
      default:
        return 'var(--bs-tertiary-bg, #ebedf0)'
    }
  }

  const yearsOptions = ['Current', '2025', '2024', '2023']

  return (
    <div className="card border-0 shadow-sm" style={{ padding: '24px', borderRadius: '12px' }}>
      {/* Header with Attendance/Leave Stats */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-4">
          <div className="d-flex flex-column">
            <span className="text-secondary small fw-medium text-uppercase ls-1">Applied Leaves</span>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-3 fw-bold text-danger">{stats.totalLeaves}</span>
              <span className="text-muted small">days</span>
            </div>
          </div>
          <div className="vr opacity-10" style={{ height: '40px' }}></div>
          <div className="d-flex flex-column text-center">
            <span className="text-secondary small fw-medium text-uppercase ls-1">Office Attendance</span>
            <div className="d-flex align-items-baseline gap-2">
              <span className="fs-3 fw-bold text-success">{stats.totalAttendance}</span>
              <span className="text-muted small">days</span>
            </div>
          </div>
        </div>

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            className="btn btn-light btn-sm fw-bold d-flex align-items-center gap-2 px-3 border-light-subtle rounded-pill"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ fontSize: '13px' }}>
            {year} Overview <IconifyIcon icon="bx:chevron-down" />
          </button>
          {dropdownOpen && (
            <div
              className="dropdown-menu show shadow shadow-sm border-light-subtle"
              style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', zIndex: 10, borderRadius: '12px' }}>
              {yearsOptions.map((y) => (
                <button
                  key={y}
                  className="dropdown-item d-flex align-items-center justify-content-between py-2 px-3 fw-medium"
                  onClick={() => {
                    setYear(y)
                    setDropdownOpen(false)
                  }}>
                  {y}
                  {year === y && <IconifyIcon icon="bx:check" className="text-success" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Heatmap Container - Horizontal Scrolling enabled */}
      <div className="w-100 custom-scrollbar-h" style={{ overflowX: 'auto', paddingBottom: '12px' }}>
        <div className="d-flex align-items-start" style={{ gap: '12px', width: 'max-content' }}>
          <div
            className="d-flex flex-column justify-content-between pt-4 pb-1"
            style={{ height: '115px', fontSize: '10px', color: '#bbb', marginRight: '4px' }}>
            <span>Mon</span>
            <span>Wed</span>
            <span>Fri</span>
          </div>

          {monthsData.map((month, mIndex) => (
            <div key={mIndex} className="d-flex flex-column">
              <span className="text-muted fw-bold mb-2 text-center" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                {month.monthName.toUpperCase()}
              </span>
              <div className="d-flex" style={{ gap: '3px', background: 'rgba(0,0,0,0.02)', padding: '6px', borderRadius: '8px' }}>
                {month.weeks.map((week, wIndex) => (
                  <div key={wIndex} className="d-flex flex-column" style={{ gap: '3px' }}>
                    {week.map((day, dIndex) => (
                      <OverlayTrigger
                        key={dIndex}
                        placement="top"
                        overlay={
                          <BSTooltip id={`tt-${day?.day || mIndex + wIndex + dIndex}`}>
                            {day?.day ? (
                              <>
                                <strong>{day.status.replace('_', ' ').toUpperCase()}</strong>
                                <br />
                                {day.day}
                              </>
                            ) : (
                              'No data'
                            )}
                          </BSTooltip>
                        }>
                        <div
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: day ? getColor(day.status) : 'transparent',
                            borderRadius: '2px',
                            cursor: day?.day ? 'pointer' : 'default',
                            transition: 'transform 0.1s',
                          }}
                          onMouseEnter={(e) => day?.day && (e.target.style.transform = 'scale(1.2)')}
                          onMouseLeave={(e) => day?.day && (e.target.style.transform = 'scale(1)')}
                        />
                      </OverlayTrigger>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Legend */}
      <div className="d-flex align-items-center gap-3 mt-3 ms-auto pe-2" style={{ fontSize: '11px', color: '#888' }}>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 1, backgroundColor: '#0e4429' }} /> Full Work
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 1, backgroundColor: '#39d353' }} /> Half-Day
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 1, backgroundColor: '#cf222e' }} /> Full Leave
        </div>
        <div className="d-flex align-items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 1, backgroundColor: '#e3b341' }} /> Weekend
        </div>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar-h::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar-h::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.03);
          border-radius: 10px;
        }
        .custom-scrollbar-h::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.1);
          border-radius: 10px;
        }
        .custom-scrollbar-h::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.2);
        }
      `,
        }}
      />
    </div>
  )
}
