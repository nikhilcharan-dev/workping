import { TabContent } from 'react-bootstrap'
import EventsTab from './EventsTab'
import FeedTab from './FeedTab'
import FriendsTab from './FriendsTab'
import GroupsTab from './GroupsTab'
import MemoriesTab from './MemoriesTab'
import SavedPostsTab from './SavedPostsTab'
const SocialTabsList = () => {
  return (
    <TabContent className="pt-0">
      <FeedTab />

      <FriendsTab />

      <EventsTab />

      <GroupsTab />

      <SavedPostsTab />

      <MemoriesTab />
    </TabContent>
  )
}
export default SocialTabsList
