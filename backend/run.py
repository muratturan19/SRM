import sys
import uvicorn

if __name__ == "__main__":
    frozen = getattr(sys, "frozen", False)
    if frozen:
        # PyInstaller paketinde uvicorn'un string import'u ("app.main:app")
        # 'app' modülünü bulamaz (ModuleNotFoundError). app nesnesini doğrudan
        # import edip geçiriyoruz; bu ayrıca PyInstaller'ın statik analizinde
        # app paketinin bundle'a dahil edilmesini sağlar.
        from app.main import app
        uvicorn.run(app, host="0.0.0.0", port=8010, log_level="info")
    else:
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8010,
            reload=True,
            reload_dirs=["app"],
            log_level="info",
        )
