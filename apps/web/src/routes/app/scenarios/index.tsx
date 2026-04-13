import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/scenarios/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/scenarios/"!</div>
}
