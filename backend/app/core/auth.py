"""Cookie-based JWT auth dependency — tüm API route'ları kullanır."""
from fastapi import Request, HTTPException, status
from app.services.portal_sso_service import PortalSSOService


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Oturum bulunamadı")
    try:
        return await PortalSSOService.validate_token(token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


def get_access_token(request: Request) -> str:
    """Raw JWT token — relay çağrılarında Bearer olarak kullanılır."""
    return request.cookies.get("access_token", "")
