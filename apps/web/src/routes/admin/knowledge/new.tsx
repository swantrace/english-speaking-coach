import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/knowledge/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/knowledge/new"!</div>
}
