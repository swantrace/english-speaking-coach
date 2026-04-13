import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/occurrences/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/occurrences/"!</div>
}
