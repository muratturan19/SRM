"""Portal SSO giriş endpoint'i — /api/sso/login"""
from fastapi import APIRouter, Form, HTTPException, Request, status
from fastapi.responses import RedirectResponse

from app.services.portal_sso_service import PortalSSOService

router = APIRouter()


@router.post("/sso/login")
async def sso_login(request: Request, token: str = Form(...)):
    try:
        await PortalSSOService.validate_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    host = request.headers.get("host", "")
    secure_cookie = not host.startswith(("localhost", "127.0.0.1"))

    resp = RedirectResponse(url="/", status_code=status.HTTP_303_SEE_OTHER)
    resp.set_cookie(
        "access_token",
        token,
        httponly=True,
        secure=secure_cookie,
        samesite="lax",
        max_age=7200,
    )
    return resp
