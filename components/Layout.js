import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'

const NAV = [
  { href: '/', label: 'Home', icon: '⌂' },
  { href: '/scan', label: 'Scan', icon: '📷' },
  { href: '/wardrobe', label: 'Wardrobe', icon: '👕' },
  { href: '/body', label: 'Body', icon: '🧍' },
  { href: '/outfits', label: 'Outfits', icon: '✨' },
]

export default function Layout({ title, children, wide }) {
  const router = useRouter()
  const pageTitle = title ? `${title} · Fitroom` : 'Fitroom · your digital wardrobe'
  return (
    <div className="app">
      <Head>
        <title>{pageTitle}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111111" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-mark">F</span> Fitroom
        </Link>
        <nav className="topnav">
          {NAV.slice(1).map((n) => (
            <Link key={n.href} href={n.href} className={router.pathname === n.href ? 'active' : ''}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className={wide ? 'page wide' : 'page'}>{children}</main>
      <nav className="tabbar">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={router.pathname === n.href ? 'active' : ''}>
            <span className="tab-icon" aria-hidden>
              {n.icon}
            </span>
            {n.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
