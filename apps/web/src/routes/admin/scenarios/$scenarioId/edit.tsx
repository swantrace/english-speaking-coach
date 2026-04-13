import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/scenarios/$scenarioId/edit')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/scenarios/$scenarioId/edit"!</div>
}
