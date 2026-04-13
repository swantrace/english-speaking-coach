import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/sessions/$sessionId/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/sessions/$sessionId/"!</div>
}
