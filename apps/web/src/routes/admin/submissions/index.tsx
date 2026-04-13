import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/submissions/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/submissions/"!</div>
}
