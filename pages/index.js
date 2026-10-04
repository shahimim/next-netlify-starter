import Link from 'next/link'
import Layout from '@components/Layout'
import { useBody, useWardrobe } from '@lib/hooks'
import { wardrobeGaps } from '@lib/outfits'

export default function Home() {
  const { items } = useWardrobe()
  const { body } = useBody()
  const count = items ? items.length : 0
  const gaps = items ? wardrobeGaps(items) : []
  const ready = items && gaps.length === 0

  return (
    <Layout>
      <section className="hero">
        <p className="eyebrow">Your digital wardrobe</p>
        <h1>
          Scan your clothes.
          <br />
          See every outfit on <em>you</em>.
        </h1>
        <p className="lede">
          Photograph each piece, capture a quick 360° turn of yourself, and Fitroom combines them into outfits you
          can preview from every angle. Everything stays on your device.
        </p>
      </section>

      <section className="steps">
        <Step
          n="1"
          href="/scan"
          title="Scan your wardrobe"
          body="Snap or upload photos. Backgrounds are removed and each garment is cropped and colour-tagged automatically."
          status={count ? `${count} item${count === 1 ? '' : 's'} saved` : 'Start here'}
          done={count > 0}
        />
        <Step
          n="2"
          href="/body"
          title="Capture your 360° body"
          body="Record a slow turn on the spot (or upload a set of photos). We turn it into a spinnable version of you."
          status={body === undefined ? '…' : body ? `${body.frames.length} frames captured` : 'Not captured yet'}
          done={!!body}
        />
        <Step
          n="3"
          href="/outfits"
          title="Get outfit combinations"
          body="Colour-matched combinations from what you own, shown on your 360° avatar. Shuffle, save, repeat."
          status={ready ? 'Ready to generate' : gaps.length ? `Still need ${gaps.join(', ')}` : 'Add clothes first'}
          done={ready}
        />
      </section>

      <section className="card note">
        <strong>Private by design.</strong> Photos never leave your browser. Images are processed locally and stored in
        your device&apos;s storage, so clearing site data clears your wardrobe.
      </section>
    </Layout>
  )
}

function Step({ n, href, title, body, status, done }) {
  return (
    <Link href={href} className={`step card ${done ? 'done' : ''}`}>
      <div className="step-n">{done ? '✓' : n}</div>
      <div className="step-body">
        <h3>{title}</h3>
        <p className="muted">{body}</p>
        <span className="pill">{status}</span>
      </div>
      <span className="chev" aria-hidden>
        ›
      </span>
    </Link>
  )
}
