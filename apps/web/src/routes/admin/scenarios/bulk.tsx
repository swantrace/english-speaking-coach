import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/scenarios/bulk')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/scenarios/bulk"!</div>
}
