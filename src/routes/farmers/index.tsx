import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/farmers/')({
  beforeLoad: () => {
    throw redirect({ to: '/farmers/dashboard' })
  },
})
