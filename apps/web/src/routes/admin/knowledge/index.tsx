import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/knowledge/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/knowledge/"!</div>
}
