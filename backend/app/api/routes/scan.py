from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.card_scanner import scan_card
import os

router = APIRouter()

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post("/card")
async def scan_business_card(file: UploadFile = File(...)):
    """
    Upload a business card image.
    Returns extracted contact data as JSON.
    """
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Use JPEG, PNG, or WebP.",
        )

    image_data = await file.read()
    if len(image_data) > 10 * 1024 * 1024:  # 10 MB cap
        raise HTTPException(status_code=400, detail="Image too large (max 10 MB)")

    try:
        result = scan_card(image_data, content_type)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return result
