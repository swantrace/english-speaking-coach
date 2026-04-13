import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/knowledge/$knowledgeId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/knowledge/$knowledgeId"!</div>
}
