# srm_backend.spec — PyInstaller onedir paketi
#
# Çalıştırma:
#   cd E:\Mira\SRM\backend
#   .venv\Scripts\pyinstaller.exe srm_backend.spec --clean
#
# Çıktı: dist\srm_backend\srm_backend.exe  + _internal\static\  (frontend)

import sys
from pathlib import Path

block_cipher = None

# Frontend build dizini (npm run build sonrası oluşur)
FRONTEND_DIST = str((Path(SPECPATH).parent / "frontend" / "dist").resolve())

a = Analysis(
    ["run.py"],
    pathex=[SPECPATH],
    binaries=[],
    datas=[
        # Frontend SPA — FastAPI /  mount için static/ olarak paketlenir
        (FRONTEND_DIST, "static"),
    ],
    hiddenimports=[
        # asyncpg (C extension)
        "asyncpg",
        "asyncpg.pgproto",
        "asyncpg.pgproto.pgproto",
        "asyncpg.protocol",
        "asyncpg.protocol.protocol",
        # SQLAlchemy dialects
        "sqlalchemy.dialects.postgresql",
        "sqlalchemy.dialects.postgresql.asyncpg",
        "sqlalchemy.dialects.postgresql.psycopg2",
        "greenlet",
        # uvicorn internals
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.http.h11_impl",
        "uvicorn.protocols.http.httptools_impl",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.protocols.websockets.websockets_impl",
        "uvicorn.protocols.websockets.wsproto_impl",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "uvicorn.lifespan.off",
        "uvicorn._types",
        # FastAPI / pydantic
        "fastapi",
        "fastapi.staticfiles",
        "pydantic",
        "pydantic.deprecated.class_validators",
        "pydantic_settings",
        # HTTP clients
        "httpx",
        "httpx._transports.default",
        "anyio",
        "anyio._backends._asyncio",
        # starlette
        "starlette",
        "starlette.staticfiles",
        "starlette.middleware.cors",
        # Multipart (dosya upload)
        "multipart",
        "python_multipart",
        # APScheduler
        "apscheduler",
        "apscheduler.schedulers.background",
        "apscheduler.executors.pool",
        "apscheduler.jobstores.memory",
        "apscheduler.triggers.interval",
        # LLM SDK'lar
        "anthropic",
        "openai",
        # Pillow
        "PIL",
        "PIL.Image",
        # Diğer
        "email.mime.text",
        "email.mime.multipart",
        "dotenv",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        # Geliştirme araçları — üretimde gereksiz
        "pytest",
        "IPython",
        "jupyter",
        "notebook",
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="srm_backend",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,   # Servis logu için konsol açık
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="srm_backend",
)
