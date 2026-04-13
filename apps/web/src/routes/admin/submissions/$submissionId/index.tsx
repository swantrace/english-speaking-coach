import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/submissions/$submissionId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/submissions/$submissionId/"!</div>
}
