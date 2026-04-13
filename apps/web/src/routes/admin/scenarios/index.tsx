import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/scenarios/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/scenarios/"!</div>
}
