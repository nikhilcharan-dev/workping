import { useEffect, useState } from 'react'
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  OverlayTrigger,
  TabPane,
  Tooltip,
} from 'react-bootstrap'
import * as yup from 'yup'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { getNewFeedPosts } from '@/helpers/data'
import PostCard from './PostCard'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import TextAreaFormInput from '@/components/form/TextAreaFormInput'
const CreatePost = () => {
  const createPostSchema = yup.object({
    caption: yup.string().required(),
  })
  const { handleSubmit, control } = useForm({
    resolver: yupResolver(createPostSchema),
  })
  return (
    <Card>
      <CardBody as="form" onSubmit={handleSubmit(() => {})}>
        <div className="icons-center w-100 mb-3">
          <CardTitle className="me-auto">Create Post</CardTitle>
          <Dropdown className="float-end" align="end">
            <DropdownToggle as="span" role="button" className="arrow-none text-dark">
              <IconifyIcon icon="bx:slider-alt" className="fs-18" />
            </DropdownToggle>
            <DropdownMenu>
              <DropdownHeader className="text-center fs-14">Post Filters</DropdownHeader>
              <DropdownDivider className="mt-0" />
              <DropdownItem className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <IconifyIcon icon="bx:bookmark" className="fs-18 align-middle me-2" />
                </div>
                <div className="flex-grow-1">
                  <p className="mb-0">Save Link</p>
                  <small className="text-muted">Add this to your saved item</small>
                </div>
              </DropdownItem>
              <DropdownItem className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <IconifyIcon icon="bx:bell-off" className="fs-18 align-middle me-2" />
                </div>
                <div className="flex-grow-1">
                  <p className="mb-0">Notification</p>
                  <small className="text-muted">Turn off notification for this post</small>
                </div>
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
        <div className="d-md-flex mb-2">
          <Dropdown className="me-1">
            <DropdownToggle as="span" className="btn btn-outline-light text-dark content-none">
              Who can see your post ?
              <IconifyIcon icon="bx:chevron-down" className="ms-1" />
            </DropdownToggle>
            <DropdownMenu>
              <li>
                <DropdownItem>
                  <IconifyIcon icon="bx:globe-alt" className="me-1" />
                  Public
                </DropdownItem>
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon icon="bx:user" className="me-1" />
                  Friends
                </DropdownItem>
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon icon="bx:user-check" className="me-1" />
                  Friends Except..
                </DropdownItem>
              </li>
            </DropdownMenu>
          </Dropdown>
          <Dropdown className="mt-1 mt-md-0">
            <DropdownToggle as="span" className="btn btn-outline-light text-dark content-none">
              <IconifyIcon icon="bx:plus" className="me-1" />
              Album
              <IconifyIcon icon="bx:chevron-down" className="ms-1" />
            </DropdownToggle>
            <DropdownMenu>
              <li>
                <DropdownItem>
                  <IconifyIcon icon="bx-images" className="me-1" />
                  Untitled Album
                </DropdownItem>
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon icon="bx-images" className="me-1" />
                  My Dream
                </DropdownItem>
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon icon="bx-images" className="me-1" />
                  Tours Story
                </DropdownItem>
              </li>
            </DropdownMenu>
          </Dropdown>
        </div>

        <TextAreaFormInput control={control} name="caption" containerClassName="mb-3" placeholder="What's on your mind?" />

        <div className="d-flex gap-1">
          <OverlayTrigger overlay={<Tooltip>Photo / Video</Tooltip>}>
            <Button variant="outline-light" size="sm" className="text-dark flex-centered fs-16" title="Photo / Video">
              <IconifyIcon icon="bx:images" className="bx-images" />
            </Button>
          </OverlayTrigger>

          <OverlayTrigger overlay={<Tooltip>Tag People</Tooltip>}>
            <Button variant="outline-light" size="sm" className="text-dark flex-centered fs-16" title="Tag People">
              <IconifyIcon icon="bxs:user-plus" className="bxs-user-plus" />
            </Button>
          </OverlayTrigger>

          <OverlayTrigger overlay={<Tooltip>Feeling / Activity</Tooltip>}>
            <Button variant="outline-light" size="sm" className="text-dark flex-centered fs-16" title="Feeling / Activity">
              <IconifyIcon icon="bxs:smile" className="bxs-smile" />
            </Button>
          </OverlayTrigger>

          <OverlayTrigger overlay={<Tooltip>Check In</Tooltip>}>
            <Button variant="outline-light" size="sm" className="text-dark flex-centered fs-16" title="Check In">
              <IconifyIcon icon="bxs:location-plus" className="bxs-location-plus" />
            </Button>
          </OverlayTrigger>

          <OverlayTrigger overlay={<Tooltip>Camera</Tooltip>}>
            <Button variant="outline-light" size="sm" className="text-dark flex-centered fs-16" title="Camera">
              <IconifyIcon icon="bxs:camera" className="bxs-camera" />
            </Button>
          </OverlayTrigger>
          <button type="submit" className="btn btn-primary ms-auto">
            Publish
          </button>
        </div>
      </CardBody>
    </Card>
  )
}
const FeedTab = () => {
  const [feedPosts, setFeedPosts] = useState()
  useEffect(() => {
    const fetchFeedPosts = async () => {
      const posts = await getNewFeedPosts()
      if (posts) setFeedPosts(posts)
    }
    fetchFeedPosts()
  }, [])
  return (
    <TabPane eventKey="Feed" className="fade" role="tabpanel" aria-labelledby="social-feed-tab">
      <CreatePost />

      {feedPosts ? feedPosts.map((post) => <PostCard key={post.id} {...post} />) : <h4 className="text-center ">Seems like your friends are lazy</h4>}

      <span className="text-primary d-flex justify-content-center mx-auto mb-3">
        <IconifyIcon icon="bx:loader-circle" className="spin-icon fs-22 align-middle me-1" />
        Loading
      </span>
    </TabPane>
  )
}
export default FeedTab
