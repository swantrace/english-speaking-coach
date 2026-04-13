import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/free-form/new')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/free-form/new"!</div>
}
