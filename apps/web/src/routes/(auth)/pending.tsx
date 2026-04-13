import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(auth)/pending')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/(auth)/pending"!</div>
}
