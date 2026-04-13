import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/knowledge/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/knowledge/"!</div>
}
