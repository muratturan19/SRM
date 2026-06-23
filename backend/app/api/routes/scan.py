from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.auth import get_current_user, get_access_token
from app.services.card_scanner import scan_card

router = APIRouter()

ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


@router.post("/card")
async def scan_business_card(
    file: UploadFile = File(...),
    _user: dict = Depends(get_current_user),
    token: str = Depends(get_access_token),
):
    content_type = file.content_type or "image/jpeg"
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen resim türü '{content_type}'. JPEG, PNG veya WebP kullanın.",
        )

    image_data = await file.read()
    if len(image_data) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Resim çok büyük (maks 10 MB)")

    try:
        result = scan_card(image_data, content_type, token=token)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    return result
