"""Portal SSO giriş endpoint'i — /api/sso/login"""
from fastapi import APIRouter, Form, HTTPException, status
from fastapi.responses import RedirectResponse

from app.services.portal_sso_service import PortalSSOService

router = APIRouter()


@router.post("/sso/login")
async def sso_login(token: str = Form(...)):
    try:
        await PortalSSOService.validate_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    resp = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    resp.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=7200,
    )
    return resp
