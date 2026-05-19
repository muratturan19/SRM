import sys
import uvicorn

if __name__ == "__main__":
    frozen = getattr(sys, "frozen", False)
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8010,
        reload=not frozen,
        reload_dirs=["app"] if not frozen else None,
        log_level="info",
    )
