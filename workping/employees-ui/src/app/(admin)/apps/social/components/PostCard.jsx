import { Fragment } from 'react'
import { Card, CardBody, Col, Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import IconifyIcon from '@/components/wrappers/IconifyIcon'
import { toAlphaNumber } from '@/utils/change-casing'
import { timeSince } from '@/utils/date'
import avatar1 from '@/assets/images/users/avatar-1.jpg'
const PostPhotos = ({ photos }) => {
  const photosCount = photos.length
  return (
    <Row>
      {photosCount > 3 ? (
        <>
          <Col md={6}>
            <img src={photos[0]} className="img-fluid rounded" alt="post-1" />
          </Col>
          <Col md={6}>
            <Row>
              <div className="col">
                <div className="mb-3 mt-3 mt-md-0">
                  <img src={photos[1]} className="img-fluid rounded" alt="post-2" />
                </div>
              </div>
            </Row>
            <Row>
              <Col md={6}>
                <img src={photos[2]} className="img-fluid rounded" alt="post-4" />
              </Col>
              <Col md={6} className="mt-3 mt-md-0">
                <div className="position-relative overflow-hidden rounded">
                  <span role={photosCount > 4 ? 'button' : undefined}>
                    <img src={photos[3]} className="img-fluid rounded" alt="post-3" />

                    {photosCount > 4 && (
                      <>
                        <div className="bg-overlay bg-dark" />
                        <h3 className="position-absolute top-50 start-50 translate-middle my-0 text-white">+{photosCount - 4}</h3>
                      </>
                    )}
                  </span>
                </div>
              </Col>
            </Row>
          </Col>
        </>
      ) : photosCount === 1 ? (
        <img src={photos[0]} className="img-fluid rounded" alt="post-1" />
      ) : (
        photos.map((photo, idx) => (
          <Col md={6} key={idx}>
            <img src={photo} className="img-fluid rounded" alt="post-1" />
          </Col>
        ))
      )}
    </Row>
  )
}
const CommentItem = ({ comment, likesCount, children, socialUser }) => {
  return (
    <div className="d-flex align-items-start mt-3">
      {socialUser && (
        <>
          <img className="me-2 avatar-sm rounded-circle" src={socialUser.avatar} alt={socialUser.name + '-avatar'} />
          <div className="w-100">
            <div className="w-100 bg-light p-2 rounded">
              <h5 className="mt-0">
                <Link to="/pages/profile" className="text-reset">
                  {socialUser.name}
                </Link>
              </h5>
              {comment}
            </div>
            <div className="d-flex gap-2">
              <span role="button" className="text-muted fs-13 icons-center mt-2">
                <IconifyIcon icon="bxs:heart" className="align-middle me-1" />
                Like({likesCount})
              </span>
              <span role="button" className="text-muted fs-13 icons-center mt-2">
                <IconifyIcon icon="bx:share" className="align-middle me-1" />
                Reply
              </span>
            </div>

            {children?.map((childComment) => (
              <CommentItem key={childComment.id} {...childComment} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
const PostCard = ({ createdAt, likesCount, socialUser, caption, tags, photos, embedLink, liked, comments, commentsCount, memories, saved }) => {
  return (
    <Card>
      <CardBody>
        <div className="d-flex gap-2 align-items-center mb-2">
          <div className="border border-2 border-primary rounded-circle">
            <img
              className="rounded-circle border border-2 border-transparent"
              src={socialUser?.avatar ?? avatar1}
              height={48}
              width={48}
              alt={socialUser?.name + '-avatar'}
            />
          </div>
          <div className="flex-grow-1">
            <h5 className="m-0">
              <Link to="/pages/profile" className="text-reset">
                {socialUser?.name}
              </Link>
            </h5>
            <p className="text-muted mb-0">
              <small>about {timeSince(new Date(createdAt))}</small>
            </p>
          </div>
          <Dropdown className="dropdown text-muted" align="end">
            <DropdownToggle as="span" role="button" className="arrow-none text-muted fs-22">
              <IconifyIcon icon="bx:dots-vertical-rounded" />
            </DropdownToggle>
            <DropdownMenu className="dropdown-menu-end">
              <li>
                <DropdownItem>
                  <IconifyIcon height={19} width={19} icon="bx:bookmark" className="align-middle pe-1" />
                  Save post
                </DropdownItem>
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon height={19} width={19} icon="bx:user-x" className="align-middle pe-1" />
                  Unfollow
                </DropdownItem>
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon height={19} width={19} icon="bx:x-circle" className="align-middle pe-1" />
                  Hide post
                </DropdownItem>
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon height={19} width={19} icon="bx:block" className="align-middle pe-1" />
                  Block
                </DropdownItem>
              </li>
              <li>
                <hr className="dropdown-divider" />
              </li>
              <li>
                <DropdownItem>
                  <IconifyIcon height={19} width={19} icon="bx:flag" className="align-middle fa-fw pe-1" />
                  Report post
                </DropdownItem>
              </li>
            </DropdownMenu>
          </Dropdown>
        </div>

        {caption && (
          <p
            className={clsx({
              'mb-0': tags,
            })}>
            {caption.split('\n').map((item, idx) => (
              <Fragment key={idx}>
                {item}
                <br />
              </Fragment>
            ))}
          </p>
        )}

        {memories && (
          <div className="bg-soft-primary p-1 rounded text-center mb-3 mt-3">
            <h5 className="text-primary ms-2">{timeSince(new Date(createdAt))}</h5>
            <span role="button" className="ms-2 text-primary">
              See all your memories
              <IconifyIcon icon="bi:chevron-right" className="ms-1" />
            </span>
          </div>
        )}

        {tags && <p className="text-primary mb-3">{tags.map((tag) => tag + ' ')}</p>}

        {photos && <PostPhotos photos={photos} />}

        {embedLink && (
          <Row>
            <div className="col">
              <div className="ratio ratio-16x9 rounded overflow-hidden">
                <iframe src={embedLink} className="img-fluid border-0" />
              </div>
            </div>
          </Row>
        )}

        <div className="d-flex align-items-center flex-wrap my-2">
          <span className="btn btn-link icons-center gap-1 text-muted">
            <IconifyIcon
              icon={liked ? 'bxs:heart' : embedLink ? 'bx:tv' : 'bx:heart'}
              className={clsx('align-middle', {
                'text-danger': liked,
              })}
            />
            {toAlphaNumber(likesCount)} {embedLink && !liked ? 'Views' : 'Likes'}
          </span>
          <span className="btn btn-link icons-center gap-1 text-muted">
            <IconifyIcon icon="bx:comment" className="align-middle" />
            {toAlphaNumber(commentsCount ?? 0)} Comments
          </span>
          <span className="btn btn-link icons-center gap-1 text-muted">
            <IconifyIcon icon="bx:share-alt" className="align-middle" />
            Share
          </span>
          <span className="btn btn-link icons-center gap-1 text-muted ms-auto">
            <IconifyIcon icon={saved ? 'bxs:bookmark' : 'bx:bookmark'} className="align-middle" />
            Save
          </span>
        </div>
        <div className="d-flex align-items-start">
          <img src={avatar1} height={32} width={32} alt="Arya Stark" className="align-self-start rounded me-2" />
          <div className="w-100">
            <input type="text" className="form-control bg-light border-0 form-control-sm" placeholder="Write a comment" />
          </div>
        </div>

        {comments && (
          <div className="post-user-comment-box mt-2">
            <hr />
            {comments.map((comment) => (
              <CommentItem key={comment.id} {...comment} />
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  )
}
export default PostCard
