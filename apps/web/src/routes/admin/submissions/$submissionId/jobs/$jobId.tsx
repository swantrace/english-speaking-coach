import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
  '/admin/submissions/$submissionId/jobs/$jobId',
)({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/submissions/$submissionId/jobs/$jobId"!</div>
}
