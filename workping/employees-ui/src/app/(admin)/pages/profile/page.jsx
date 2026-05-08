import { Col, Row } from 'react-bootstrap'
import PageBreadcrumb from '@/components/layout/PageBreadcrumb'
import PageMetaData from '@/components/PageTitle'
import AboutCard from './components/AboutCard'
import Activity from './components/Activity'
import Followers from './components/Followers'
import Messages from './components/Messages'
import PersonalInfo from './components/PersonalInfo'
import Projects from './components/Projects'
import Skill from './components/Skill'
const Profile = () => {
  return (
    <>
      <PageBreadcrumb subName="Pages" title="Profile" />
      <PageMetaData title="Profile" />

      <Row>
        <Col xxl={4}>
          <Row>
            <Col xs={12}>
              <AboutCard />
              <Skill />
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <Activity />
            </Col>
          </Row>
        </Col>
        <Col xxl={8}>
          <Row>
            <Col lg={6}>
              <PersonalInfo />
            </Col>
            <Col lg={6}>
              <Followers />
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <Projects />
            </Col>
          </Row>
          <Row>
            <Col xs={12}>
              <Messages />
            </Col>
          </Row>
        </Col>
      </Row>
    </>
  )
}
export default Profile
