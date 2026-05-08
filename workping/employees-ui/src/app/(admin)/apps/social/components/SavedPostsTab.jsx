import { getSavedFeedPosts } from '@/helpers/data'
import { useEffect, useState } from 'react'
import { TabPane } from 'react-bootstrap'
import PostCard from './PostCard'
const SavedPostsTab = () => {
  const [savedPosts, setSavedPosts] = useState()
  useEffect(() => {
    const fetchSavedPosts = async () => {
      const posts = await getSavedFeedPosts()
      if (posts) setSavedPosts(posts)
    }
    fetchSavedPosts()
  }, [])
  return (
    <TabPane eventKey="Saved" className="fade">
      {savedPosts ? savedPosts.map((post) => <PostCard key={post.id} {...post} />) : <h4 className="text-center ">No Posts saved yet</h4>}
    </TabPane>
  )
}
export default SavedPostsTab
