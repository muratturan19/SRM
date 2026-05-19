"""
Backup / Restore API
GET  /api/admin/backup            → pg_dump çalıştır, .sql indir
GET  /api/admin/backups           → mevcut yedek listesi
POST /api/admin/restore           → .sql yükle, psql ile geri yükle
DELETE /api/admin/backups/{name}  → yedeği sil
"""
import os
import re
import shutil
import subprocess
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.core.config import settings

router = APIRouter()

# ── PostgreSQL araç yolu ─────────────────────────────────────────────────────

def _find_pg_bin() -> Path:
    """pg_dump / psql binary dizinini bul."""
    pg_dump = shutil.which("pg_dump")
    if pg_dump:
        return Path(pg_dump).parent
    for ver in ["18", "17", "16", "15", "14"]:
        p = Path(f"C:/Program Files/PostgreSQL/{ver}/bin")
        if (p / "pg_dump.exe").exists():
            return p
    raise RuntimeError(
        "pg_dump bulunamadı. PostgreSQL kurulu ve PATH'te mi?"
    )


# ── DB URL ayrıştırıcı ───────────────────────────────────────────────────────

def _parse_db_url(url: str) -> dict:
    """
    postgresql+asyncpg://user:pass@host:port/dbname
    → {'user', 'password', 'host', 'port', 'dbname'}
    """
    url = re.sub(r"^postgresql\+\w+://", "", url)  # driver prefix
    url = re.sub(r"^postgresql://", "", url)
    userpass, rest = url.split("@", 1)
    user, password = userpass.split(":", 1)
    hostport, dbname = rest.split("/", 1)
    host, port = (hostport.split(":", 1) if ":" in hostport else (hostport, "5432"))
    return {"user": user, "password": password, "host": host, "port": port, "dbname": dbname}


# ── Yedek dizini ─────────────────────────────────────────────────────────────

def _backup_dir() -> Path:
    d = Path(settings.data_dir) / "backups"
    d.mkdir(parents=True, exist_ok=True)
    return d


# ── Endpoint'ler ─────────────────────────────────────────────────────────────

@router.get("/backup")
async def create_backup():
    """Veritabanını yedekle — .sql dosyası döndür."""
    try:
        bin_dir = _find_pg_bin()
        db = _parse_db_url(settings.database_url)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = _backup_dir() / f"srm_backup_{ts}.sql"

        env = os.environ.copy()
        env["PGPASSWORD"] = db["password"]

        result = subprocess.run(
            [
                str(bin_dir / "pg_dump"),
                "-h", db["host"],
                "-p", db["port"],
                "-U", db["user"],
                "-d", db["dbname"],
                "--no-password",
                "-F", "p",          # plain SQL
                "-f", str(backup_file),
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=180,
        )
        if result.returncode != 0:
            raise RuntimeError(f"pg_dump hatası: {result.stderr.strip()}")

        return FileResponse(
            path=str(backup_file),
            filename=backup_file.name,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{backup_file.name}"'},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/backups")
async def list_backups():
    """Kaydedilmiş yedek dosyalarını listele (en yeni ilk)."""
    bdir = _backup_dir()
    files = sorted(bdir.glob("srm_backup_*.sql"), reverse=True)
    return [
        {
            "name": f.name,
            "size_kb": round(f.stat().st_size / 1024, 1),
            "created": datetime.fromtimestamp(f.stat().st_mtime).strftime("%d.%m.%Y %H:%M"),
        }
        for f in files[:30]
    ]


@router.post("/restore")
async def restore_backup(file: UploadFile = File(...)):
    """
    .sql dosyasından veritabanını geri yükle.
    ⚠️ Mevcut veriler üzerine yazılır!
    """
    if not (file.filename or "").endswith(".sql"):
        raise HTTPException(status_code=400, detail="Sadece .sql dosyası kabul edilir")

    tmp_file = _backup_dir() / f"restore_tmp_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    try:
        content = await file.read()
        tmp_file.write_bytes(content)

        bin_dir = _find_pg_bin()
        db = _parse_db_url(settings.database_url)

        env = os.environ.copy()
        env["PGPASSWORD"] = db["password"]

        result = subprocess.run(
            [
                str(bin_dir / "psql"),
                "-h", db["host"],
                "-p", db["port"],
                "-U", db["user"],
                "-d", db["dbname"],
                "--no-password",
                "-f", str(tmp_file),
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=300,
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"Geri yükleme hatası: {result.stderr.strip()[:500]}",
            )

        return {"status": "ok", "message": "Veritabanı başarıyla geri yüklendi"}

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        tmp_file.unlink(missing_ok=True)


@router.delete("/backups/{filename}")
async def delete_backup(filename: str):
    """Belirtilen yedek dosyasını sil."""
    # Güvenlik: sadece beklenen dosya adı formatı
    if not re.match(r"^srm_backup_\d{8}_\d{6}\.sql$", filename):
        raise HTTPException(status_code=400, detail="Geçersiz dosya adı")
    target = _backup_dir() / filename
    if not target.exists():
        raise HTTPException(status_code=404, detail="Dosya bulunamadı")
    target.unlink()
    return {"status": "ok"}
