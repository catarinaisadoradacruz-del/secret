export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary-50 flex items-center justify-center p-4">
      {children}
    </div>
  )
}
