import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/knowledge/bulk')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/knowledge/bulk"!</div>
}
