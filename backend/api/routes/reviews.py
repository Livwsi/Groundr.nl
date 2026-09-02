# backend/api/routes/reviews.py
# POST /api/reviews/          — submit a star rating
# GET  /api/reviews/{makelaar_id} — get aggregate rating for a makelaar

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text
from db.connection import get_db_session

router = APIRouter()

class ReviewCreate(BaseModel):
    makelaar_id: int
    rating:      int = Field(..., ge=1, le=5)
    comment:     str | None = None
    token:       str        # simple one-time token from email link

@router.post("/")
async def submit_review(body: ReviewCreate):
    """
    Submit a star rating after a completed transaction.
    Token is a UUID stored in the DB when the transaction completes.
    """
    async with get_db_session() as db:
        # Verify token exists and hasn't been used
        token_row = await db.execute(text("""
            SELECT id, used FROM review_tokens
            WHERE token = :token AND makelaar_id = :mid
        """), {"token": body.token, "mid": body.makelaar_id})
        token = token_row.fetchone()

        if not token:
            raise HTTPException(status_code=404, detail="Invalid review token")
        if token.used:
            raise HTTPException(status_code=409, detail="Review already submitted")

        # Insert review
        await db.execute(text("""
            INSERT INTO reviews (makelaar_id, rating, comment, created_at)
            VALUES (:mid, :rating, :comment, NOW())
        """), {"mid": body.makelaar_id, "rating": body.rating, "comment": body.comment})

        # Mark token as used
        await db.execute(text("""
            UPDATE review_tokens SET used = true WHERE token = :token
        """), {"token": body.token})

        await db.commit()

    return {"status": "ok", "message": "Review submitted"}


@router.get("/{makelaar_id}")
async def get_reviews(makelaar_id: int):
    """Get aggregate rating + recent reviews for a makelaar."""
    async with get_db_session() as db:
        agg = await db.execute(text("""
            SELECT
                COUNT(*)              AS total,
                ROUND(AVG(rating), 1) AS avg_rating,
                COUNT(*) FILTER (WHERE rating = 5) AS five_star,
                COUNT(*) FILTER (WHERE rating = 4) AS four_star,
                COUNT(*) FILTER (WHERE rating = 3) AS three_star,
                COUNT(*) FILTER (WHERE rating <= 2) AS low_star
            FROM reviews WHERE makelaar_id = :mid
        """), {"mid": makelaar_id})
        agg_row = agg.fetchone()

        recent = await db.execute(text("""
            SELECT rating, comment, created_at
            FROM reviews
            WHERE makelaar_id = :mid
            ORDER BY created_at DESC
            LIMIT 5
        """), {"mid": makelaar_id})
        reviews = [{"rating": r.rating, "comment": r.comment, "date": r.created_at.strftime("%d %b %Y") if r.created_at else None} for r in recent.fetchall()]

    return {
        "makelaar_id": makelaar_id,
        "total":       agg_row.total or 0,
        "avg_rating":  float(agg_row.avg_rating) if agg_row.avg_rating else None,
        "breakdown": {
            "5": agg_row.five_star  or 0,
            "4": agg_row.four_star  or 0,
            "3": agg_row.three_star or 0,
            "2": agg_row.low_star   or 0,
        },
        "recent": reviews,
    }