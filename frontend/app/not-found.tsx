import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-g900 flex items-center justify-center px-4">
      <div className="fixed inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: 'radial-gradient(rgba(47,197,134,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      <div className="relative text-center max-w-md">
        <div className="font-mono text-8xl font-bold mb-4" style={{ color: '#2fc586', opacity: 0.3 }}>
          404
        </div>
        <div className="font-display text-2xl font-bold text-white mb-2">
          Pagina niet gevonden
        </div>
        <p className="text-sm text-g300 opacity-50 mb-8">
          Deze pagina bestaat niet of is verplaatst.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/dashboard"
            className="px-6 py-3 text-sm font-bold"
            style={{ background: '#2fc586', color: '#061a11' }}>
            Dashboard
          </Link>
          <Link href="/microsite/stadsmakelaars"
            className="px-6 py-3 text-sm font-semibold"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            Woningen bekijken
          </Link>
        </div>
        <div className="mt-12 text-xs text-g300 opacity-30">
          Groun<span style={{ color: '#2fc586', opacity: 1 }}>dr</span> · Dutch Real Estate Intelligence
        </div>
      </div>
    </div>
  )
}