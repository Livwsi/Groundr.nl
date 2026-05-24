# ─────────────────────────────────────────────────────────────
# backend/api/routes/documents.py
#
# ENDPOINTS:
#   POST /api/documents/upload      → buyer uploads a file
#   GET  /api/documents/            → buyer sees their documents
#   DELETE /api/documents/{id}      → buyer deletes a document
#   GET  /api/documents/{id}/download → serves the file
# ─────────────────────────────────────────────────────────────

import logging
import uuid
import os
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from api.dependencies import require_user
from db.connection import get_db
from db.models import User

logger = logging.getLogger(__name__)
router = APIRouter()

# Upload directory — local disk for now, R2 after deploy
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_TYPES = {
    "application/pdf",
    "image/jpeg", "image/png", "image/webp",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


@router.post("/upload", status_code=201)
async def upload_document(
    file:          UploadFile = File(...),
    submission_id: int        = Form(None),
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    # Validate file type
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Bestandstype niet toegestaan: {file.content_type}. Gebruik PDF, JPG, PNG of Word.")

    # Read and check size
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(400, "Bestand te groot. Maximum is 10 MB.")

    # Save with unique filename to avoid collisions
    ext      = Path(file.filename).suffix.lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    # Store in DB
    result = await db.execute(text("""
        INSERT INTO dossier_documents
            (buyer_id, submission_id, filename, original_name, file_type, file_size)
        VALUES
            (:uid, :sid, :fname, :oname, :ftype, :fsize)
        RETURNING id
    """), {
        "uid":   user.id,
        "sid":   submission_id,
        "fname": filename,
        "oname": file.filename,
        "ftype": file.content_type,
        "fsize": len(contents),
    })
    row = result.fetchone()
    logger.info(f"[DOCS] User {user.id} uploaded {file.filename} ({len(contents)} bytes)")

    return {
        "message":       "Bestand geüpload.",
        "document_id":   row.id,
        "original_name": file.filename,
        "file_size":     len(contents),
    }


@router.get("/")
async def get_documents(
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT id, original_name, file_type, file_size, uploaded_at, submission_id
        FROM dossier_documents
        WHERE buyer_id = :uid
        ORDER BY uploaded_at DESC
    """), {"uid": user.id})
    rows = result.fetchall()
    return {
        "documents": [
            {
                "id":            r.id,
                "original_name": r.original_name,
                "file_type":     r.file_type,
                "file_size":     r.file_size,
                "uploaded_at":   str(r.uploaded_at),
                "submission_id": r.submission_id,
            }
            for r in rows
        ]
    }


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        DELETE FROM dossier_documents
        WHERE id = :did AND buyer_id = :uid
        RETURNING filename
    """), {"did": doc_id, "uid": user.id})
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Document niet gevonden.")

    # Delete file from disk
    filepath = UPLOAD_DIR / row.filename
    if filepath.exists():
        filepath.unlink()

    return {"message": "Document verwijderd."}


@router.get("/{doc_id}/download")
async def download_document(
    doc_id: int,
    user: User         = Depends(require_user),
    db:   AsyncSession = Depends(get_db),
):
    result = await db.execute(text("""
        SELECT filename, original_name, file_type
        FROM dossier_documents
        WHERE id = :did AND buyer_id = :uid
    """), {"did": doc_id, "uid": user.id})
    row = result.fetchone()
    if not row:
        raise HTTPException(404, "Document niet gevonden.")

    filepath = UPLOAD_DIR / row.filename
    if not filepath.exists():
        raise HTTPException(404, "Bestand niet gevonden op server.")

    return FileResponse(
        path=str(filepath),
        filename=row.original_name,
        media_type=row.file_type,
    )