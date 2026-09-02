// app/microsite/[slug]/page.tsx
// SSR version — server fetches listings, passes to client component
// Google now sees all listings, addresses, prices in the HTML

import { Metadata } from 'next'
import MicrositeClient from './MicrositeClient'

const AGENCY = {
  name:     'Stadsmakelaars',
  userId:   1,
  phone:    '085 080 55 98',
  email:    'info@stadsmakelaars.nl',
  address:  'Hooghuisstraat 31A, Eindhoven',
  since:    '2008',
  city:     'Eindhoven',
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ── Server-side data fetch ────────────────────────────────
async function getListings(userId: number) {
  try {
    const [listingsRes, submissionsRes] = await Promise.all([
      fetch(`${API}/api/listings/public/${userId}`, { next: { revalidate: 60 } }),
      fetch(`${API}/api/submissions/public/${userId}`, { next: { revalidate: 60 } }),
    ])

    const listingsData    = listingsRes.ok    ? await listingsRes.json()    : { listings: [] }
    const submissionsData = submissionsRes.ok ? await submissionsRes.json() : { listings: [] }

    return {
      listings:    listingsData.listings    || [],
      submissions: submissionsData.listings || [],
    }
  } catch {
    return { listings: [], submissions: [] }
  }
}

// ── Dynamic metadata for SEO ──────────────────────────────
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const { listings, submissions } = await getListings(AGENCY.userId)
  const totalCount    = listings.length + submissions.length
  const availableCount = submissions.filter((s: any) => true).length + listings.filter((l: any) => l.status === 'active').length

  return {
    title:       `${AGENCY.name} — ${availableCount} woningen te koop in ${AGENCY.city}`,
    description: `${AGENCY.name} heeft ${totalCount} woningen in ${AGENCY.city} en omgeving. Bekijk het aanbod, plan een bezichtiging of breng een bod uit via Groundr.`,
    keywords:    `makelaar ${AGENCY.city}, woningen te koop ${AGENCY.city}, ${AGENCY.name}, vastgoed Eindhoven`,
    openGraph: {
      title:       `${AGENCY.name} — Woningen in ${AGENCY.city}`,
      description: `${availableCount} woningen te koop. Makelaar in ${AGENCY.city} e.o. sinds ${AGENCY.since}.`,
      type:        'website',
      locale:      'nl_NL',
    },
    alternates: {
      canonical: `https://groundr.nl/microsite/${params.slug}`,
    },
  }
}

// ── JSON-LD structured data ───────────────────────────────
function JsonLd({ listings, submissions, slug }: { listings: any[]; submissions: any[]; slug: string }) {
  // RealEstateAgent schema
  const agentSchema = {
    '@context':   'https://schema.org',
    '@type':      'RealEstateAgent',
    name:         AGENCY.name,
    telephone:    AGENCY.phone,
    email:        AGENCY.email,
    address: {
      '@type':          'PostalAddress',
      streetAddress:    AGENCY.address,
      addressLocality:  AGENCY.city,
      addressCountry:   'NL',
    },
    url: `https://groundr.nl/microsite/${slug}`,
    foundingDate: AGENCY.since,
  }

  // Individual listing schemas
  const listingSchemas = submissions
    .filter(l => l.asking_price)
    .slice(0, 10) // limit to avoid bloat
    .map(l => ({
      '@context': 'https://schema.org',
      '@type':    'RealEstateListing',
      name:       `${l.property?.street} ${l.property?.house_number}, ${l.property?.city}`,
      description: l.description || `${l.property?.property_type || 'Woning'} te koop in ${l.property?.city}`,
      url:        `https://groundr.nl/microsite/${slug}`,
      offers: {
        '@type':         'Offer',
        price:           l.asking_price,
        priceCurrency:   'EUR',
        availability:    'https://schema.org/InStock',
      },
      address: {
        '@type':         'PostalAddress',
        streetAddress:   `${l.property?.street} ${l.property?.house_number}`,
        addressLocality: l.property?.city,
        addressCountry:  'NL',
      },
      floorSize: l.property?.area_m2 ? {
        '@type': 'QuantitativeValue',
        value:   l.property.area_m2,
        unitCode: 'MTK',
      } : undefined,
    }))

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(agentSchema) }}
      />
      {listingSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}

// ── Server component (page) ───────────────────────────────
export default async function AgencyMicrosite({ params }: { params: { slug: string } }) {
  const { listings, submissions } = await getListings(AGENCY.userId)

  return (
    <>
      {/* JSON-LD injected in <head> for Google */}
      <JsonLd listings={listings} submissions={submissions} slug={params.slug} />

      {/* Client component handles all interactivity */}
      <MicrositeClient
        params={params}
        initialListings={listings}
        initialSubmissions={submissions}
        agency={AGENCY}
      />
    </>
  )
}