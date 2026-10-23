import { useLocation } from 'react-router'
import { PageBody, PageHead } from '@/components/layout/AppLayout'
import { CONTROL_ROOMS } from '@/lib/control-room-model'
export default function PControlRoom() {
  const { pathname } = useLocation(), room = CONTROL_ROOMS[pathname]
  return <><PageHead title={room.title} dek={room.question} /><PageBody /></>
}
