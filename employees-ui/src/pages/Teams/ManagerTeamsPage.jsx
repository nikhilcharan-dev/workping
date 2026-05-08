import { useCallback, useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, CardBody, CardHeader, Col, Row, Spinner } from 'react-bootstrap'
import { useNavigate } from 'react-router-dom'
import PageMetaData from '@/components/PageTitle'
import ReactTable from '@/components/Table'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import httpClient from '@/helpers/httpClient'
import { useAuthContext } from '@/context/useAuthContext'

const ManagerTeamsPage = () => {
  const navigate = useNavigate()
  const { role } = useAuthContext()

  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [totalRecords, setTotalRecords] = useState(0)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    try {
      const res = await httpClient.get('/admin/team/manager/all', {
        params: { search, limit: 100 },
        silent: true,
      })
      const d = res.data?.data ?? {}
      setTeams(d.teamList ?? [])
      setTotalRecords(d.totalRecords ?? 0)
    } catch {
      setTeams([])
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const columns = useMemo(
    () => [
      { header: 'S.No', id: 'sno', cell: ({ row }) => <span className="fw-medium">{row.index + 1}</span> },
      {
        header: 'Team Name',
        id: 'teamName',
        cell: ({ row }) => (
          <div className="d-flex align-items-center gap-2">
            <div className="avatar-sm rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold fs-14 flex-shrink-0">
              {row.original.teamName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="fw-semibold">{row.original.teamName}</div>
              <div className="text-muted small">{row.original.description || 'No description'}</div>
            </div>
          </div>
        ),
      },
      {
        header: 'Members',
        id: 'members',
        cell: ({ row }) => (
          <Badge bg="info-subtle" className="text-info px-2 py-1 fs-12">
            {row.original.memberCount} Members
          </Badge>
        ),
      },
      {
        header: 'Leaders',
        id: 'leaders',
        cell: ({ row }) => (
          <div className="avatar-group">
            {(row.original.leaders || []).slice(0, 3).map((l, i) => (
              <div key={i} className="avatar-group-item">
                <span className="avatar-xs rounded-circle bg-success text-white d-flex align-items-center justify-content-center" title={l.name}>
                  {l.name.charAt(0)}
                </span>
              </div>
            ))}
            {(row.original.leaders || []).length > 3 && (
              <div className="avatar-group-item">
                <span className="avatar-xs rounded-circle bg-light text-muted d-flex align-items-center justify-content-center">
                  +{(row.original.leaders || []).length - 3}
                </span>
              </div>
            )}
          </div>
        ),
      },
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }) => (
          <Button variant="soft-primary" size="sm" onClick={() => navigate(`/teams/${row.original._id}`)}>
            Manage Members
            <IconifyIcon icon="bx:chevron-right" className="ms-1" />
          </Button>
        ),
      },
    ],
    [navigate],
  )

  return (
    <>
      <PageMetaData title="Managed Teams" />

      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">My Teams</h4>
          </div>
        </Col>
      </Row>

      <Row>
        <Col xs={12}>
          <Card>
            <CardHeader className="border-bottom">
              <div className="d-flex align-items-center gap-2">
                <div className="search-box flex-grow-1">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search teams..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="text-center py-5 text-muted">
                  <Spinner animation="border" variant="primary" size="sm" className="me-2" />
                  Loading teams...
                </div>
              ) : teams.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <IconifyIcon icon="bxs:group" className="fs-1 mb-2" />
                  <p>No teams found managed by you.</p>
                </div>
              ) : (
                <ReactTable
                  columns={columns}
                  data={teams}
                  pageSize={10}
                  showPagination
                  rowsPerPageList={[5, 10, 25]}
                  tableClass="table-centered mb-0"
                  theadClass="table-light"
                />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </>
  )
}

export default ManagerTeamsPage
