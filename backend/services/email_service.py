# ─────────────────────────────────────────────────────────────
# backend/services/email_service.py
#
# PURPOSE:
#   All outgoing emails go through this file.
#   Uses Resend API (https://resend.com) — free tier: 3k/mo
#
# USAGE:
#   from services.email_service import email
#   await email.send_bid_notification(...)
# ─────────────────────────────────────────────────────────────

import logging
import httpx
from config.settings import settings

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


class EmailService:

    async def _send(self, to: str, subject: str, html: str) -> bool:
        """Core send method — reads settings lazily to avoid lru_cache issues."""
        api_key    = settings.RESEND_API_KEY
        from_email = "Groundr <onboarding@resend.dev>"

        if not api_key:
            logger.warning("[EMAIL] No RESEND_API_KEY set — skipping email")
            return False
        try:
            async with httpx.AsyncClient() as client:
                res = await client.post(
                    RESEND_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type":  "application/json",
                    },
                    json={"from": from_email, "to": [to], "subject": subject, "html": html},
                    timeout=10,
                )
                if res.status_code == 200:
                    logger.info(f"[EMAIL] Sent '{subject}' → {to}")
                    return True
                else:
                    logger.error(f"[EMAIL] Failed {res.status_code}: {res.text}")
                    return False
        except Exception as e:
            logger.error(f"[EMAIL] Exception: {e}")
            return False

    # ── INVITE ────────────────────────────────────────────────

    async def send_invite(self, to: str, makelaar_name: str, invite_url: str) -> bool:
        subject = f"U bent uitgenodigd voor Groundr door {makelaar_name}"
        html = f"""
        {_header()}
        <p style="color:#374151;font-size:16px;">Goedendag,</p>
        <p style="color:#374151;font-size:16px;">
            <strong>{makelaar_name}</strong> heeft u uitgenodigd om uw dossier aan te maken op Groundr —
            het slimme platform voor uw woningaankoop.
        </p>
        {_button("Dossier aanmaken", invite_url)}
        <p style="color:#6b7280;font-size:13px;">Deze link is 7 dagen geldig.</p>
        {_footer()}
        """
        return await self._send(to, subject, html)

    # ── BID PLACED ────────────────────────────────────────────

    async def send_bid_placed(
        self, to: str, makelaar_name: str,
        address: str, amount: float, dashboard_url: str
    ) -> bool:
        subject = f"Nieuw bod ontvangen — {address}"
        html = f"""
        {_header()}
        <p style="color:#374151;font-size:16px;">Hallo {makelaar_name},</p>
        <p style="color:#374151;font-size:16px;">
            Er is een nieuw bod geplaatst op <strong>{address}</strong>.
        </p>
        {_stat_card("Bod", f"€{amount:,.0f}".replace(",", "."))}
        {_button("Bekijk biedingen", dashboard_url)}
        {_footer()}
        """
        return await self._send(to, subject, html)

    # ── VIEWING CONFIRMED ─────────────────────────────────────

    async def send_viewing_confirmed(
        self, to: str, buyer_name: str,
        address: str, date: str, time: str
    ) -> bool:
        subject = f"Bezichtiging bevestigd — {address}"
        html = f"""
        {_header()}
        <p style="color:#374151;font-size:16px;">Hallo {buyer_name},</p>
        <p style="color:#374151;font-size:16px;">
            Uw bezichtiging voor <strong>{address}</strong> is bevestigd.
        </p>
        {_stat_card("Datum", f"{date} om {time}")}
        <p style="color:#6b7280;font-size:13px;">
            Neem contact op met uw makelaar als u moet annuleren.
        </p>
        {_footer()}
        """
        return await self._send(to, subject, html)

    # ── VIEWING REJECTED ──────────────────────────────────────

    async def send_viewing_rejected(
        self, to: str, buyer_name: str, address: str
    ) -> bool:
        subject = f"Bezichtiging niet beschikbaar — {address}"
        html = f"""
        {_header()}
        <p style="color:#374151;font-size:16px;">Hallo {buyer_name},</p>
        <p style="color:#374151;font-size:16px;">
            Helaas is het gevraagde tijdslot voor <strong>{address}</strong> niet beschikbaar.
            Neem contact op met de makelaar om een ander tijdstip af te spreken.
        </p>
        {_footer()}
        """
        return await self._send(to, subject, html)

    # ── NEW MELDING ───────────────────────────────────────────

    async def send_new_melding(
        self, to: str, makelaar_name: str,
        title: str, address: str, dashboard_url: str
    ) -> bool:
        subject = f"Nieuwe melding: {title}"
        html = f"""
        {_header()}
        <p style="color:#374151;font-size:16px;">Hallo {makelaar_name},</p>
        <p style="color:#374151;font-size:16px;">
            Er is een nieuwe melding ingediend voor <strong>{address}</strong>.
        </p>
        {_stat_card("Melding", title)}
        {_button("Bekijk melding", dashboard_url)}
        {_footer()}
        """
        return await self._send(to, subject, html)

    # ── BUYER ALERT (saved search match) ─────────────────────

    async def send_buyer_alert(
        self, to: str, buyer_name: str,
        address: str, price: float, listing_url: str
    ) -> bool:
        subject = f"Nieuwe woning gevonden — {address}"
        html = f"""
        {_header()}
        <p style="color:#374151;font-size:16px;">Hallo {buyer_name},</p>
        <p style="color:#374151;font-size:16px;">
            Er is een nieuwe woning beschikbaar die overeenkomt met uw zoekopdracht.
        </p>
        {_stat_card("Adres", address)}
        {_stat_card("Vraagprijs", f"€{price:,.0f}".replace(",", "."))}
        {_button("Bekijk woning", listing_url)}
        {_footer()}
        """
        return await self._send(to, subject, html)

    # ── SUBMISSION APPROVED ───────────────────────────────────

    async def send_submission_approved(
        self, to: str, seller_name: str, address: str
    ) -> bool:
        subject = f"Uw aanmelding is goedgekeurd — {address}"
        html = f"""
        {_header()}
        <p style="color:#374151;font-size:16px;">Hallo {seller_name},</p>
        <p style="color:#374151;font-size:16px;">
            Goed nieuws! Uw woning <strong>{address}</strong> is goedgekeurd
            en staat nu live op het platform.
        </p>
        {_footer()}
        """
        return await self._send(to, subject, html)


# ─────────────────────────────────────────────────────────────
# HTML HELPERS — shared building blocks
# ─────────────────────────────────────────────────────────────

def _header() -> str:
    return """
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;">
    <div style="background:#061a11;padding:24px 32px;margin-bottom:32px;">
        <span style="color:#2fc586;font-size:22px;font-weight:700;letter-spacing:-0.5px;">Groundr</span>
    </div>
    <div style="padding:0 32px;">
    """

def _footer() -> str:
    return """
    </div>
    <div style="padding:32px;margin-top:32px;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">
            Groundr — Dutch Real Estate Intelligence<br>
            Dit is een automatisch bericht. Reageer niet op dit e-mailadres.
        </p>
    </div>
    </div>
    """

def _button(label: str, url: str) -> str:
    return f"""
    <div style="margin:24px 0;">
        <a href="{url}"
           style="background:#2fc586;color:#061a11;font-weight:700;font-size:14px;
                  padding:12px 24px;text-decoration:none;display:inline-block;">
            {label} →
        </a>
    </div>
    """

def _stat_card(label: str, value: str) -> str:
    return f"""
    <div style="background:#f9fafb;border:1px solid #e5e7eb;padding:16px 20px;margin:16px 0;">
        <div style="color:#6b7280;font-size:12px;text-transform:uppercase;
                    letter-spacing:0.05em;margin-bottom:4px;">{label}</div>
        <div style="color:#111827;font-size:18px;font-weight:600;">{value}</div>
    </div>
    """


# ─────────────────────────────────────────────────────────────
# Singleton
# ─────────────────────────────────────────────────────────────

email = EmailService()