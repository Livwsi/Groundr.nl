// ─────────────────────────────────────────────────────────────
// frontend/lib/i18n.ts
// All UI strings in NL and EN.
// Usage: const { t } = useLanguage(); t('dashboard.title')
// ─────────────────────────────────────────────────────────────

export type Lang = 'nl' | 'en'

export const translations = {
  // ── NAV ────────────────────────────────────────────────────
  'nav.listings':      { nl: 'Mijn listings',     en: 'My listings' },
  'nav.approvals':     { nl: 'Aanmeldingen',       en: 'Approvals' },
  'nav.bids':          { nl: 'Biedingen',          en: 'Bids' },
  'nav.viewings':      { nl: 'Bezichtigingen',     en: 'Viewings' },
  'nav.meldingen':     { nl: 'Meldingen',          en: 'Issues' },
  'nav.analytics':     { nl: 'Analytics',          en: 'Analytics' },
  'nav.logout':        { nl: 'Uitloggen',          en: 'Log out' },
  'nav.invite':        { nl: '+ Klant uitnodigen', en: '+ Invite client' },
  'nav.actions':       { nl: 'actie(s) vereist',  en: 'action(s) required' },

  // ── DASHBOARD ───────────────────────────────────────────────
  'dashboard.title':   { nl: 'Intelligence dashboard', en: 'Intelligence dashboard' },
  'dashboard.subtitle':{ nl: 'Voer een adres in om de investeringsscore en buurtanalyse te bekijken', en: 'Enter an address to view the investment score and neighbourhood analysis' },
  'dashboard.search':  { nl: 'Zoek een adres — bijv. Stratumsedijk 23 Eindhoven', en: 'Search an address — e.g. Stratumsedijk 23 Eindhoven' },
  'dashboard.analyze': { nl: 'Analyseer', en: 'Analyse' },
  'dashboard.loading': { nl: 'Laden...', en: 'Loading...' },
  'dashboard.empty':   { nl: 'Voer een adres in om te beginnen', en: 'Enter an address to get started' },
  'dashboard.score':   { nl: 'Investeringsscore', en: 'Investment score' },
  'dashboard.neighborhood': { nl: 'Buurtstatistieken', en: 'Neighbourhood stats' },
  'dashboard.amenities':    { nl: 'Voorzieningen in de buurt', en: 'Nearby amenities' },
  'dashboard.properties':   { nl: 'Woningen in buurt', en: 'Properties nearby' },
  'dashboard.avg_price':    { nl: 'Gem. prijs per m²', en: 'Avg. price per m²' },
  'dashboard.yield':        { nl: 'Geschat rendement', en: 'Est. yield' },
  'dashboard.apartments':   { nl: 'Appartementen', en: 'Apartments' },

  // ── LISTINGS ────────────────────────────────────────────────
  'listings.title':    { nl: 'Mijn listings', en: 'My listings' },
  'listings.subtitle': { nl: 'listing(s) in uw portfolio', en: 'listing(s) in your portfolio' },
  'listings.add':      { nl: 'Listing toevoegen', en: 'Add listing' },
  'listings.empty':    { nl: 'Nog geen listings', en: 'No listings yet' },
  'listings.empty_sub':{ nl: 'Voeg uw eerste woning toe via de knop hierboven', en: 'Add your first property using the button above' },
  'listings.address':  { nl: 'Adres', en: 'Address' },
  'listings.price':    { nl: 'Vraagprijs (€)', en: 'Asking price (€)' },
  'listings.area':     { nl: 'Woonoppervlak (m²)', en: 'Living area (m²)' },
  'listings.bedrooms': { nl: 'Slaapkamers', en: 'Bedrooms' },
  'listings.type':     { nl: 'Type woning', en: 'Property type' },
  'listings.energy':   { nl: 'Energielabel', en: 'Energy label' },
  'listings.rental':   { nl: 'Dit is een huurwoning', en: 'This is a rental property' },
  'listings.save':     { nl: 'Listing opslaan', en: 'Save listing' },
  'listings.cancel':   { nl: 'Annuleren', en: 'Cancel' },
  'listings.active':   { nl: 'Actief', en: 'Active' },

  // ── INVITE MODAL ────────────────────────────────────────────
  'invite.title':      { nl: 'Klant uitnodigen', en: 'Invite client' },
  'invite.subtitle':   { nl: 'De klant ontvangt een link om een dossier aan te maken.', en: 'The client will receive a link to create a dossier.' },
  'invite.email':      { nl: 'E-mailadres klant', en: 'Client email address' },
  'invite.button':     { nl: 'Uitnodiging aanmaken →', en: 'Create invite →' },
  'invite.cancel':     { nl: 'Annuleren', en: 'Cancel' },
  'invite.copy':       { nl: '🔗 Link kopiëren', en: '🔗 Copy link' },
  'invite.copied':     { nl: '✓ Gekopieerd!', en: '✓ Copied!' },
  'invite.close':      { nl: 'Sluiten', en: 'Close' },
  'invite.validity':   { nl: 'Stuur deze link naar de klant. De link is 7 dagen geldig.', en: 'Send this link to the client. The link is valid for 7 days.' },
  'invite.for':        { nl: 'Uitnodigingslink voor', en: 'Invite link for' },

  // ── DOSSIER ─────────────────────────────────────────────────
  'dossier.title':     { nl: 'Mijn Dossier', en: 'My Dossier' },
  'dossier.welcome':   { nl: 'Welkom terug', en: 'Welcome back' },
  'dossier.subtitle':  { nl: 'Hier vindt u alle informatie over uw woningtransactie.', en: 'Here you will find all information about your property transaction.' },
  'dossier.progress':  { nl: 'Voortgang transactie', en: 'Transaction progress' },
  'dossier.steps':     { nl: 'stappen', en: 'steps' },
  'dossier.current':   { nl: 'Huidige stap', en: 'Current step' },
  'dossier.timeline':  { nl: 'Tijdlijn', en: 'Timeline' },
  'dossier.documents': { nl: 'Documenten', en: 'Documents' },
  'dossier.makelaar':  { nl: 'Uw makelaar', en: 'Your agent' },
  'dossier.viewings':  { nl: 'Mijn bezichtigingen', en: 'My viewings' },
  'dossier.bids':      { nl: 'Mijn biedingen', en: 'My bids' },
  'dossier.report':    { nl: 'Probleem melden', en: 'Report issue' },
  'dossier.logout':    { nl: 'Uitloggen', en: 'Log out' },
  'dossier.upload':    { nl: '+ Upload', en: '+ Upload' },
  'dossier.no_docs':   { nl: 'Nog geen documenten geüpload.', en: 'No documents uploaded yet.' },
  'dossier.searches':  { nl: 'Zoekopdrachten', en: 'Saved searches' },
  'dossier.new_search':{ nl: '+ Nieuwe zoekopdracht', en: '+ New search' },
  'dossier.no_searches':{ nl: 'Geen zoekopdrachten opgeslagen.', en: 'No saved searches.' },
  'dossier.save_search':{ nl: 'Zoekopdracht opslaan', en: 'Save search' },
  'dossier.alerts':    { nl: 'E-mail alerts bij nieuwe woningen', en: 'Email alerts for new properties' },
  'dossier.bid_placed':{ nl: 'Bod geplaatst', en: 'Bid placed' },
  'dossier.in_sale':   { nl: 'Te koop', en: 'For sale' },
  'dossier.pending':   { nl: 'In behandeling', en: 'Pending' },

  // ── TIMELINE STEPS ──────────────────────────────────────────
  'timeline.created':   { nl: 'Dossier aangemaakt',         en: 'Dossier created' },
  'timeline.requested': { nl: 'Bezichtiging aangevraagd',   en: 'Viewing requested' },
  'timeline.confirmed': { nl: 'Bezichtiging bevestigd',     en: 'Viewing confirmed' },
  'timeline.bid':       { nl: 'Bod uitgebracht',            en: 'Bid placed' },
  'timeline.accepted':  { nl: 'Bod geaccepteerd',           en: 'Bid accepted' },
  'timeline.deed':      { nl: 'Koopovereenkomst opgesteld', en: 'Purchase agreement drawn up' },
  'timeline.signed':    { nl: 'Koopakte ondertekend',       en: 'Purchase deed signed' },
  'timeline.transfer':  { nl: 'Overdracht afgerond',        en: 'Transfer completed' },
  'timeline.awaiting':  { nl: 'In afwachting',              en: 'Awaiting' },

  // ── VIEWING STATUSES ────────────────────────────────────────
  'viewing.confirmed':  { nl: 'Bevestigd',    en: 'Confirmed' },
  'viewing.rejected':   { nl: 'Afgewezen',    en: 'Rejected' },
  'viewing.pending':    { nl: 'In afwachting',en: 'Pending' },

  // ── APPROVALS ───────────────────────────────────────────────
  'approvals.title':   { nl: 'Aanmeldingen', en: 'Approvals' },
  'approvals.pending': { nl: 'Aanmeldingen in behandeling', en: 'Pending approvals' },
  'approvals.approve': { nl: 'Goedkeuren', en: 'Approve' },
  'approvals.reject':  { nl: 'Afwijzen', en: 'Reject' },
  'approvals.empty':   { nl: 'Geen aanmeldingen', en: 'No pending approvals' },

  // ── BIDS ────────────────────────────────────────────────────
  'bids.title':        { nl: 'Biedingen', en: 'Bids' },
  'bids.highest':      { nl: 'Hoogste bod', en: 'Highest bid' },
  'bids.count':        { nl: 'biedingen', en: 'bids' },
  'bids.empty':        { nl: 'Nog geen biedingen', en: 'No bids yet' },

  // ── VIEWINGS PAGE ───────────────────────────────────────────
  'viewings.title':    { nl: 'Bezichtigingen', en: 'Viewings' },
  'viewings.confirm':  { nl: 'Bevestigen', en: 'Confirm' },
  'viewings.reject':   { nl: 'Afwijzen', en: 'Reject' },
  'viewings.empty':    { nl: 'Geen bezichtigingsverzoeken', en: 'No viewing requests' },

  // ── MELDINGEN ───────────────────────────────────────────────
  'meldingen.title':   { nl: 'Meldingen', en: 'Issues' },
  'meldingen.open':    { nl: 'Open', en: 'Open' },
  'meldingen.resolved':{ nl: 'Opgelost', en: 'Resolved' },
  'meldingen.closed':  { nl: 'Gesloten', en: 'Closed' },
  'meldingen.empty':   { nl: 'Geen meldingen', en: 'No issues' },

  // ── MICROSITE ───────────────────────────────────────────────
  'microsite.listings': { nl: 'beschikbare woningen', en: 'available properties' },
  'microsite.bid':      { nl: 'Breng een bod uit', en: 'Place a bid' },
  'microsite.viewing':  { nl: 'Bezichtiging aanvragen', en: 'Request viewing' },
  'microsite.deadline': { nl: 'Deadline', en: 'Deadline' },
  'microsite.share':    { nl: 'Gedeeld!', en: 'Shared!' },
  'microsite.no_price': { nl: 'Op aanvraag', en: 'On request' },
  'microsite.submit':   { nl: 'Woning aanmelden', en: 'Submit property' },
  'microsite.bids':     { nl: 'biedingen', en: 'bids' },
  'microsite.saved':    { nl: 'Opgeslagen', en: 'Saved' },

  // ── SUBMIT FORM ─────────────────────────────────────────────
  'submit.title':      { nl: 'Woning aanmelden', en: 'Submit property' },
  'submit.subtitle':   { nl: 'Vul uw gegevens in en wij nemen contact met u op.', en: 'Fill in your details and we will contact you.' },
  'submit.address':    { nl: 'Adres van de woning', en: 'Property address' },
  'submit.price':      { nl: 'Vraagprijs (optioneel)', en: 'Asking price (optional)' },
  'submit.urgency':    { nl: 'Urgentie', en: 'Urgency' },
  'submit.description':{ nl: 'Omschrijving', en: 'Description' },
  'submit.send':       { nl: 'Aanmelding versturen', en: 'Submit application' },
  'submit.success':    { nl: 'Aanmelding ontvangen!', en: 'Application received!' },

  // ── PROPERTY TYPES ──────────────────────────────────────────
  'type.house':        { nl: 'Woning',        en: 'House' },
  'type.apartment':    { nl: 'Appartement',   en: 'Apartment' },
  'type.villa':        { nl: 'Villa',         en: 'Villa' },
  'type.townhouse':    { nl: 'Tussenwoning',  en: 'Townhouse' },
  'type.semi_detached':{ nl: '2-onder-1-kap', en: 'Semi-detached' },
  'type.detached':     { nl: 'Vrijstaand',    en: 'Detached' },
  'type.studio':       { nl: 'Studio',        en: 'Studio' },
  'type.unknown':      { nl: 'Onbekend',      en: 'Unknown' },

  // ── COMMON ──────────────────────────────────────────────────
  'common.loading':    { nl: 'Laden...',       en: 'Loading...' },
  'common.error':      { nl: 'Er is een fout opgetreden.', en: 'An error occurred.' },
  'common.save':       { nl: 'Opslaan',        en: 'Save' },
  'common.cancel':     { nl: 'Annuleren',      en: 'Cancel' },
  'common.delete':     { nl: 'Verwijderen',    en: 'Delete' },
  'common.back':       { nl: 'Terug',          en: 'Back' },
  'common.close':      { nl: 'Sluiten',        en: 'Close' },
  'common.search':     { nl: 'Zoeken',         en: 'Search' },
  'common.all':        { nl: 'Alle',           en: 'All' },
  'common.city':       { nl: 'Stad',           en: 'City' },
  'common.made_by':    { nl: 'Mogelijk gemaakt door', en: 'Powered by' },
} as const

export type TranslationKey = keyof typeof translations

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key]?.[lang] ?? key
}