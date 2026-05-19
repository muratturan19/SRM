# Claude Sonnet 4.6 / Opus 4.7 ve GPT-5.5 Python API Kılavuzu
> **Windows Ortamı | UTF-8 | Python 3.13+**  
> Hazırlayan: Delta Proje AI Danışmanlık  
> Son güncelleme: **Mayıs 2026 (v3.1 — SDK sürüm gereksinimleri eklendi)**

---

## İçindekiler

1. [Kurulum ve Ortam Hazırlığı](#1-kurulum-ve-ortam-hazırlığı)
2. [Model Bilgileri ve Karşılaştırma](#2-model-bilgileri-ve-karşılaştırma)
3. [Claude Sonnet 4.6 — Temel Kullanım](#3-claude-sonnet-46--temel-kullanım)
4. [Claude Sonnet 4.6 — Chat Completions](#4-claude-sonnet-46--chat-completions)
5. [Claude — Adaptive Thinking (Reasoning)](#5-claude--adaptive-thinking-reasoning)
6. [Claude Sonnet 4.6 — Multimodal (Görsel, PDF, Dosya)](#6-claude-sonnet-46--multimodal-görsel-pdf-dosya)
7. [GPT-5.5 — Temel Kullanım](#7-gpt-55--temel-kullanım)
8. [GPT-5.5 — Chat Completions ve Responses API](#8-gpt-55--chat-completions-ve-responses-api)
9. [GPT-5.5 — Reasoning (reasoning.effort)](#9-gpt-55--reasoning-reasoningeffort)
10. [GPT-5.5 — Multimodal (Görsel, PDF, Dosya)](#10-gpt-55--multimodal-görsel-pdf-dosya)
11. [Streaming — Her İki Model](#11-streaming--her-iki-model)
12. [Tool Use / Function Calling — Her İki Model](#12-tool-use--function-calling--her-iki-model)
13. [Hata Yönetimi ve Retry Mantığı](#13-hata-yönetimi-ve-retry-mantığı)
14. [Gelişmiş: Karşılaştırmalı Wrapper Sınıfı](#14-gelişmiş-karşılaştırmalı-wrapper-sınıfı)

---

## 1. Kurulum ve Ortam Hazırlığı

### 1.1 SDK Sürüm Gereksinimleri

> ⚠️ **KRİTİK:** Eski SDK sürümleri yeni modelleri tanımaz, parametre hatası verir veya istekleri sessizce yanlış işler. Port'ta birden fazla eski Python process çalışıyorsa (örn. `openai==1.55.0` kullanan process'ler) yeni model istekleri bu eski process'lere düşebilir.

#### Anthropic SDK (`anthropic`)

Anthropic SDK, **tek bir sürekli v0.x** serisindedir — OpenAI gibi v1→v2 kırılması yoktur. Ancak her yeni model belirli bir minimum sürüm gerektirir:

| Model | Minimum SDK Sürümü | Eklendi |
|---|---|---|
| `claude-sonnet-4-6` | `anthropic >= 0.80.0` | 17 Şubat 2026 |
| `claude-opus-4-7` | `anthropic >= 0.96.0` | 16 Nisan 2026 |

#### OpenAI SDK (`openai`)

OpenAI SDK Kasım 2025'te **v1.x → v2.x** büyük sürüm geçişi yaptı. **v1.x artık desteklenmemektedir.** GPT-5.x serisi yalnızca v2.x ile çalışır:

| Model | Minimum SDK Sürümü | Not |
|---|---|---|
| GPT-5.x serisi (genel) | `openai >= 2.0.0` | v1.x ile hiç çalışmaz |
| `gpt-5.4` | `openai >= 2.25.0` | Mart 2026 |
| `gpt-5.5` | `openai >= 2.27.0` | Nisan 2026 (tahmini minimum) |

> **`openai==1.55.0` ile ne olur?**  
> - `reasoning = {"effort": "medium"}` parametresi bilinmez → `TypeError`  
> - `client.responses.create(...)` (Responses API) yoktur → `AttributeError`  
> - `gpt-5.5` model string'i tanınmaz → API hatası  
> - Port 8010'da bu sürümle çalışan eski bir process varsa, yeni istekler oraya yönlenip başarısız olur.

#### Sürüm Doğrulama ve Güncelleme (Windows PowerShell)

```powershell
# Mevcut sürümleri kontrol et
pip show anthropic
pip show openai

# Güncel sürümlere yükselt
pip install --upgrade anthropic openai

# Belirli minimum sürümleri zorla
pip install "anthropic>=0.96.0" "openai>=2.27.0"
```

#### Eski Process'leri Temizleme (Windows)

Port 8010'da birden fazla eski Python process çalışıyorsa:

```powershell
# Port 8010'u kullanan tüm process'leri bul
netstat -ano | findstr :8010

# Çıkan her PID için (örnek PID: 12345)
taskkill /PID 12345 /F

# Alternatif: tüm Python process'lerini listele
Get-Process python | Format-Table Id, ProcessName, StartTime
```

---

### 1.2 Gerekli Kütüphaneler

```bash
pip install "anthropic>=0.96.0" "openai>=2.27.0" python-dotenv Pillow requests
```

### 1.2 `.env` Dosyası (Proje Kökü)

```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

### 1.3 Temel `config.py` (UTF-8 Garantili)

```python
# -*- coding: utf-8 -*-
"""
config.py — Ortak yapılandırma modülü
Windows + UTF-8 uyumlu
"""
import os
import sys
from dotenv import load_dotenv

# UTF-8 çıktısını zorla (Windows cmd/PowerShell için kritik)
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

load_dotenv(encoding="utf-8")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY    = os.getenv("OPENAI_API_KEY")

# Model stringleri — Mayıs 2026 itibarıyla güncel
CLAUDE_MODEL       = "claude-sonnet-4-6"          # Sonnet 4.6 (varsayılan / üretim)
CLAUDE_OPUS_MODEL  = "claude-opus-4-7"             # Opus 4.7 (en güçlü, Nisan 2026)
GPT55_MODEL        = "gpt-5.5"                     # GPT-5.5 standart (Nisan 2026)
GPT55_PRO          = "gpt-5.5-pro"                 # GPT-5.5 Pro (yalnızca Responses API)

# Geriye dönük uyumluluk için alias
GPT54_MODEL        = GPT55_MODEL                   # Eski kodu kırmamak için

if not ANTHROPIC_API_KEY:
    raise EnvironmentError("ANTHROPIC_API_KEY bulunamadı! .env dosyasını kontrol edin.")
if not OPENAI_API_KEY:
    raise EnvironmentError("OPENAI_API_KEY bulunamadı! .env dosyasını kontrol edin.")
```

---

## 2. Model Bilgileri ve Karşılaştırma

> ⚠️ **Mayıs 2026 güncellemesi:** Tüm fiyatlar ve özellikler Mayıs 2026 resmi belgelerine göre düzeltilmiştir.  
> Önemli değişiklikler: Claude Opus 4.6 → **Opus 4.7** (16 Nisan 2026), GPT-5.4 → **GPT-5.5** (23 Nisan 2026).

| Özellik | Claude Sonnet 4.6 | Claude Opus 4.7 | GPT-5.5 | GPT-5.5 Pro |
|---|---|---|---|---|
| **Model String** | `claude-sonnet-4-6` | `claude-opus-4-7` | `gpt-5.5` | `gpt-5.5-pro` |
| **Sağlayıcı** | Anthropic | Anthropic | OpenAI | OpenAI |
| **Çıkış Tarihi** | 17 Şubat 2026 | 16 Nisan 2026 | 23 Nisan 2026 | 23 Nisan 2026 |
| **Bağlam Penceresi** | 1M token | 1M token | 1.05M token* | 1.05M token* |
| **Max Çıktı** | 64K token | 128K token | 128K token | 128K token |
| **Görsel Girdi** | ✅ (maks 1.15MP) | ✅ (maks 3.75MP 🆕) | ✅ | ✅ |
| **Reasoning** | Adaptive Thinking | Adaptive Thinking | reasoning.effort | reasoning.effort |
| **Reasoning Seviyeleri** | low/medium/high/max | low/medium/high/**xhigh** 🆕/max | none/low/medium/high/xhigh | medium/high/xhigh |
| **Input Fiyatı** | $3/1M token | $5/1M token | $5/1M token | $30/1M token |
| **Output Fiyatı** | $15/1M token | $25/1M token | $30/1M token | $180/1M token |
| **Streaming** | ✅ | ✅ | ✅ | ✅ |
| **Function Calling** | ✅ | ✅ | ✅ | ✅ |
| **Responses API** | ❌ | ❌ | ✅ (önerilen) | ✅ (zorunlu) |
| **Chat Completions** | ✅ | ✅ | ⚠️ geçici* | ❌ |
| **Bilgi Kesim Tarihi** | Ağustos 2025 | Ocak 2026 🆕 | Aralık 2025 | Aralık 2025 |

> \* GPT-5.5 ve GPT-5.5 Pro: Varsayılan bağlam 272K'dır. 272K token üzerinde giden oturumlarda **tüm oturum** için giriş fiyatı **2x** ($10/1M), çıkış fiyatı **1.5x** ($45/1M) olur.  
> ⚠️ **GPT-5.5 için Responses API kullanın.** Chat Completions teknik olarak şimdilik desteklense de OpenAI'nin yönelimi Responses API'ye doğrudur; kalkması beklenmektedir. **GPT-5.5 Pro** için Responses API **zorunludur.**  
> ⚠️ **Opus 4.7 Yeni Tokenizer:** Aynı metin için %0–35 daha fazla token tüketebilir. Fiyat listesi sabit ($5/$25) fakat gerçek maliyet yükselebilir. Özellikle kod ve yapılandırılmış veriler için %35'e yakın artış görülebilir.  
> ⚠️ **Opus 4.7 Thinking Değişikliği:** `budget_tokens` (sabit bütçe) **kaldırıldı**, yalnızca `adaptive` thinking desteklenir. Thinking blokları artık **varsayılan olarak gizlidir** (opt-in gerekir).  
> ✅ Claude 1M token bağlam **standart fiyatla** sunulmaktadır — ek ücret yoktur.

### Hangi modeli seçmeli?

| Senaryo | Öneri |
|---|---|
| Yüksek hacimli üretim, denge fiyat/kalite | Claude Sonnet 4.6 |
| En karmaşık görevler, uzun ajan döngüleri | Claude Opus 4.7 |
| Genel profesyonel görevler, kodlama | GPT-5.5 |
| Çok adımlı derin akıl yürütme (gecikme önemsiz) | GPT-5.5 Pro |

---

## 3. Claude Sonnet 4.6 — Temel Kullanım

```python
# -*- coding: utf-8 -*-
"""
claude_temel.py — Claude Sonnet 4.6 basit mesaj gönderme
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def claude_sor(soru: str, sistem_mesaji: str = None) -> str:
    """Claude Sonnet 4.6'ya soru sor, yanıtı döndür."""
    mesajlar = [{"role": "user", "content": soru}]
    
    parametreler = {
        "model"     : CLAUDE_MODEL,
        "max_tokens": 2048,
        "messages"  : mesajlar,
    }
    
    if sistem_mesaji:
        parametreler["system"] = sistem_mesaji
    
    yanit = client.messages.create(**parametreler)
    return yanit.content[0].text

if __name__ == "__main__":
    sistem = "Sen bir endüstriyel AI danışmanısın. Türkçe yanıt ver."
    soru   = "Kalite kontrol sistemlerinde CNN kullanımının avantajları nelerdir?"
    
    print(claude_sor(soru, sistem))
```

---

## 4. Claude Sonnet 4.6 — Chat Completions

```python
# -*- coding: utf-8 -*-
"""
claude_chat.py — Çok turlu sohbet (conversation history)
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

class ClaudeChat:
    """Claude ile çok turlu sohbet yöneticisi."""
    
    def __init__(self, sistem_mesaji: str = "", max_tokens: int = 2048,
                 sicaklik: float = 0.7, ust_p: float = 1.0):
        """
        Parametreler:
            sistem_mesaji : Model davranışını belirler
            max_tokens    : Maksimum çıktı token sayısı (1-64000 Sonnet, 1-128000 Opus)
            sicaklik      : Yaratıcılık (0.0=deterministik, 1.0=yaratıcı)
                            NOT: Adaptive Thinking aktifken temperature kullanılamaz!
            ust_p         : Nucleus sampling (0.0-1.0)
        """
        self.sistem     = sistem_mesaji
        self.max_tokens = max_tokens
        self.sicaklik   = sicaklik
        self.ust_p      = ust_p
        self.gecmis     = []  # [{"role": "user/assistant", "content": "..."}]
    
    def gonder(self, mesaj: str) -> str:
        """Mesaj gönder, yanıt döndür, geçmişe ekle."""
        self.gecmis.append({"role": "user", "content": mesaj})
        
        yanit = client.messages.create(
            model      = CLAUDE_MODEL,
            max_tokens = self.max_tokens,
            system     = self.sistem,
            messages   = self.gecmis,
            temperature= self.sicaklik,
            top_p      = self.ust_p,
        )
        
        asistan_yaniti = yanit.content[0].text
        self.gecmis.append({"role": "assistant", "content": asistan_yaniti})
        
        return asistan_yaniti
    
    def gecmisi_temizle(self):
        self.gecmis.clear()


if __name__ == "__main__":
    sohbet = ClaudeChat(
        sistem_mesaji = "Sen bir endüstriyel süreç uzmanısın. Kısa ve net yanıt ver.",
        max_tokens    = 1024,
        sicaklik      = 0.3,
    )
    
    sorular = [
        "OEE nedir?",
        "Peki bunu artırmak için hangi 3 adım önerilir?",
        "Bu adımların ilkini daha ayrıntılı anlat.",
    ]
    
    for soru in sorular:
        print(f"\n[Kullanıcı]: {soru}")
        print(f"[Claude]   : {sohbet.gonder(soru)}")
```

---

## 5. Claude — Adaptive Thinking (Reasoning)

> **⚠️ Mayıs 2026 Önemli Notlar:**  
> - `budget_tokens` ile `thinking: {type: "enabled"}` artık **deprecated**'tır (Sonnet 4.6'da hâlâ çalışır; Opus 4.7'de **tamamen kaldırıldı**).  
> - **Yeni önerilen yöntem:** `thinking: {type: "adaptive"}` + `output_config: {effort: "..."}`.  
> - **⚠️ `effort` parametresinin yeri:** `thinking` bloğunun **içine değil**, ayrı `output_config` objesine konur. `thinking` içine koymak `ValidationError` döndürür.  
> - **`display`** ise `thinking` bloğunun **içine** konur: `thinking: {type: "adaptive", display: "summarized"}`.  
> - **Opus 4.7 yeni:** `xhigh` effort seviyesi eklendi (high ile max arasında).  
> - Adaptive Thinking aktifken `temperature` parametresi **kullanılamaz**.

### 5.1 Adaptive Thinking — Önerilen Yöntem (Sonnet 4.6 ve Opus 4.7)

```python
# -*- coding: utf-8 -*-
"""
claude_adaptive_thinking.py — Adaptive Thinking (Mayıs 2026 önerilen yöntem)
Sonnet 4.6 ve Opus 4.7 için geçerlidir.
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL, CLAUDE_OPUS_MODEL

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def claude_adaptive(soru: str, effort: str = "high",
                    sistem: str = "",
                    model: str = CLAUDE_MODEL,
                    thinking_goster: bool = False) -> dict:
    """
    Claude Adaptive Thinking ile düşünerek yanıt üret.
    
    Parametreler:
        soru           : Kullanıcı sorusu
        effort         : Reasoning seviyesi
                         Sonnet 4.6: "low" | "medium" | "high" (varsayılan) | "max"
                         Opus 4.7  : "low" | "medium" | "high" | "xhigh" 🆕 | "max"
                           - low    : Hızlı, basit görevler.
                           - medium : Dengeli, orta karmaşıklık.
                           - high   : Derin analiz. (Sonnet 4.6 varsayılanı)
                           - xhigh  : 🆕 YALNIZCA Opus 4.7. High ile max arasında.
                           - max    : Maksimum. En zor problemler.
        sistem         : Sistem mesajı
        model          : CLAUDE_MODEL (Sonnet) veya CLAUDE_OPUS_MODEL (Opus)
        thinking_goster: True ise thinking özeti döndürülür (Opus 4.7'de opt-in gerekir)
    
    NOT: Adaptive Thinking aktifken temperature parametresi kullanılamaz!
    
    Dönüş:
        {
            "yanit"        : str,
            "thinking"     : str,  # Yalnızca thinking_goster=True ise dolu
            "input_tokens" : int,
            "output_tokens": int,
        }
    """
    thinking_config = {"type": "adaptive"}
    
    # Opus 4.7'de thinking bloklarını görmek için display: "summarized" gerekir
    # display, thinking bloğunun İÇİNE konur
    if thinking_goster:
        thinking_config["display"] = "summarized"
    
    # effort, thinking bloğunun dışında — output_config altında verilir
    # thinking içine koymak ValidationError verir!
    parametreler = {
        "model"        : model,
        "max_tokens"   : 16000,
        "thinking"     : thinking_config,
        "output_config": {"effort": effort},   # ← DOĞRU YER: output_config
        "messages"     : [{"role": "user", "content": soru}],
    }
    
    if sistem:
        parametreler["system"] = sistem
    
    yanit = client.messages.create(**parametreler)
    
    yanit_metni   = ""
    thinking_metni = ""
    for blok in yanit.content:
        if blok.type == "text":
            yanit_metni = blok.text
        elif blok.type == "thinking" and thinking_goster:
            thinking_metni = getattr(blok, "thinking", "") or getattr(blok, "summary", "")
    
    return {
        "yanit"        : yanit_metni,
        "thinking"     : thinking_metni,
        "input_tokens" : yanit.usage.input_tokens,
        "output_tokens": yanit.usage.output_tokens,
    }


if __name__ == "__main__":
    soru = """
    Bir otobüs koltuk üreticisinin kalite kontrol hattında CNN tabanlı 
    görsel denetim sistemi kurulacak. 
    Günde 500 koltuk üretiliyor, hedef doğruluk %99.9.
    Dataset henüz yok, sıfırdan oluşturulacak.
    
    Bu projenin kritik başarı faktörlerini analiz et ve
    risk matrisini çıkar.
    """
    
    # Sonnet 4.6 ile high effort
    print("=== SONNET 4.6 / HIGH EFFORT ===")
    sonuc = claude_adaptive(
        soru   = soru,
        effort = "high",
        sistem = "Sen bir makine öğrenmesi ve endüstriyel kalite uzmanısın.",
        model  = CLAUDE_MODEL,
    )
    print(sonuc["yanit"])
    print(f"\nToken: {sonuc['input_tokens']} giriş / {sonuc['output_tokens']} çıkış")
    
    # Opus 4.7 ile xhigh effort (yeni seviye)
    print("\n=== OPUS 4.7 / XHIGH EFFORT (YENİ) ===")
    sonuc_opus = claude_adaptive(
        soru           = soru,
        effort         = "xhigh",   # Opus 4.7'ye özel yeni seviye
        sistem         = "Sen bir makine öğrenmesi ve endüstriyel kalite uzmanısın.",
        model          = CLAUDE_OPUS_MODEL,
        thinking_goster= True,
    )
    print(sonuc_opus["yanit"])
    if sonuc_opus["thinking"]:
        print(f"\n[Düşünce özeti]: {sonuc_opus['thinking'][:200]}...")
    print(f"\nToken: {sonuc_opus['input_tokens']} giriş / {sonuc_opus['output_tokens']} çıkış")
```

### 5.2 Eski Yöntem — budget_tokens (SADECE Sonnet 4.6, Deprecated)

```python
# -*- coding: utf-8 -*-
"""
claude_thinking_eski.py — budget_tokens yöntemi
UYARI: Opus 4.7'de TAMAMEN KALDIRIDI, hata verir!
       Sonnet 4.6'da hâlâ çalışır ama deprecated.
       Yeni projeler için Adaptive Thinking kullanın!
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def claude_thinking_eski(soru: str, budget_tokens: int = 10000,
                         sistem: str = "") -> dict:
    """
    DEPRECATED: budget_tokens yöntemi.
    - Sonnet 4.6: Çalışır ama gelecekte kaldırılacak.
    - Opus 4.7  : ÇALIŞMAZ, hata verir. claude_adaptive() kullanın.
    
    Taşıma: claude_adaptive(soru, effort="high") ile değiştirin.
    """
    max_tok = budget_tokens + 4096
    
    yanit = client.messages.create(
        model      = CLAUDE_MODEL,  # Yalnızca Sonnet 4.6!
        max_tokens = max_tok,
        system     = sistem,
        thinking   = {
            "type"         : "enabled",   # DEPRECATED
            "budget_tokens": budget_tokens,
        },
        messages = [{"role": "user", "content": soru}],
    )
    
    dusunce_metni = ""
    yanit_metni   = ""
    
    for blok in yanit.content:
        if blok.type == "thinking":
            dusunce_metni = blok.thinking
        elif blok.type == "text":
            yanit_metni = blok.text
    
    return {
        "dusunce"      : dusunce_metni,
        "yanit"        : yanit_metni,
        "input_tokens" : yanit.usage.input_tokens,
        "output_tokens": yanit.usage.output_tokens,
    }
```

> **💡 Effort Seviyeleri Rehberi (Mayıs 2026):**
>
> | Seviye | Sonnet 4.6 | Opus 4.7 | Kullanım |
> |---|---|---|---|
> | `"low"` | ✅ | ✅ | Hızlı yanıt, çoğunlukla düşünmez |
> | `"medium"` | ✅ | ✅ | Orta hız ve maliyet |
> | `"high"` | ✅ (varsayılan) | ✅ | Derin analiz, neredeyse her zaman düşünür |
> | `"xhigh"` | ❌ | ✅ 🆕 | High ile max arasında. Claude Code varsayılanı |
> | `"max"` | ✅ | ✅ | Maksimum düşünme, en zorlu problemler |

---

## 6. Claude Sonnet 4.6 — Multimodal (Görsel, PDF, Dosya)

### 6.1 Görsel Gönderme (Base64)

> **Not:** Opus 4.7'de maksimum çözünürlük **3.75MP** (2576px) desteklenmektedir; Sonnet 4.6'da 1.15MP (1568px) limiti geçerlidir. Koordinatlar Opus 4.7'de artık 1:1 piksel eşleşmesi sunar.

```python
# -*- coding: utf-8 -*-
"""
claude_gorsel.py — Resim analizi (base64 veya URL)
Sonnet 4.6 maks: 1568px / 1.15MP
Opus 4.7 maks  : 2576px / 3.75MP (yeni - koordinatlar 1:1 piksel eşleşmeli)
"""
import sys, base64
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from pathlib import Path
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def gorsel_analiz_base64(gorsel_yolu: str, soru: str, sistem: str = "",
                          model: str = CLAUDE_MODEL) -> str:
    """
    Yerel resim dosyasını base64 ile Claude'a gönder.
    Desteklenen formatlar: JPEG, PNG, GIF, WebP
    """
    gorsel_yolu = Path(gorsel_yolu)
    
    uzanti_mime = {
        ".jpg"  : "image/jpeg",
        ".jpeg" : "image/jpeg",
        ".png"  : "image/png",
        ".gif"  : "image/gif",
        ".webp" : "image/webp",
    }
    mime_turu = uzanti_mime.get(gorsel_yolu.suffix.lower(), "image/jpeg")
    
    with open(gorsel_yolu, "rb") as f:
        gorsel_b64 = base64.standard_b64encode(f.read()).decode("utf-8")
    
    yanit = client.messages.create(
        model      = model,
        max_tokens = 2048,
        system     = sistem,
        messages   = [
            {
                "role": "user",
                "content": [
                    {
                        "type"  : "image",
                        "source": {
                            "type"      : "base64",
                            "media_type": mime_turu,
                            "data"      : gorsel_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": soru,
                    },
                ],
            }
        ],
    )
    return yanit.content[0].text


def gorsel_analiz_url(gorsel_url: str, soru: str) -> str:
    """URL'den görsel analizi (herkese açık URL olmalı)."""
    yanit = client.messages.create(
        model      = CLAUDE_MODEL,
        max_tokens = 2048,
        messages   = [
            {
                "role": "user",
                "content": [
                    {
                        "type"  : "image",
                        "source": {
                            "type": "url",
                            "url" : gorsel_url,
                        },
                    },
                    {"type": "text", "text": soru},
                ],
            }
        ],
    )
    return yanit.content[0].text


def cok_gorsel_analiz(gorsel_yollari: list, soru: str) -> str:
    """Birden fazla görsel ile analiz (maks ~5 görsel önerilir)."""
    icerik = []
    
    for yol in gorsel_yollari:
        yol = Path(yol)
        with open(yol, "rb") as f:
            b64 = base64.standard_b64encode(f.read()).decode("utf-8")
        
        mime_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg",
                    ".png": "image/png", ".gif": "image/gif", ".webp": "image/webp"}
        
        icerik.append({
            "type"  : "image",
            "source": {
                "type"      : "base64",
                "media_type": mime_map.get(yol.suffix.lower(), "image/jpeg"),
                "data"      : b64,
            },
        })
    
    icerik.append({"type": "text", "text": soru})
    
    yanit = client.messages.create(
        model    = CLAUDE_MODEL,
        max_tokens = 4096,
        messages = [{"role": "user", "content": icerik}],
    )
    return yanit.content[0].text


if __name__ == "__main__":
    sonuc = gorsel_analiz_base64(
        gorsel_yolu = r"C:\Projeler\FKT\ornek_potluk.png",
        soru        = "Bu görseldeki kumaş kusurunu tespit et ve konumunu açıkla.",
        sistem      = "Sen bir tekstil kalite kontrol uzmanısın.",
    )
    print(sonuc)
```

### 6.2 PDF Gönderme

```python
# -*- coding: utf-8 -*-
"""
claude_pdf.py — PDF dosyası analizi
NOT: Anthropic API, PDF'i doğrudan destekler (base64).
"""
import sys, base64
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from pathlib import Path
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def pdf_analiz(pdf_yolu: str, soru: str, sistem: str = "") -> str:
    """
    PDF dosyasını Claude'a gönder ve analiz ettir.
    Maks boyut: ~32MB (API limiti)
    """
    pdf_yolu = Path(pdf_yolu)
    
    with open(pdf_yolu, "rb") as f:
        pdf_b64 = base64.standard_b64encode(f.read()).decode("utf-8")
    
    yanit = client.messages.create(
        model      = CLAUDE_MODEL,
        max_tokens = 4096,
        system     = sistem,
        messages   = [
            {
                "role": "user",
                "content": [
                    {
                        "type"  : "document",
                        "source": {
                            "type"      : "base64",
                            "media_type": "application/pdf",
                            "data"      : pdf_b64,
                        },
                    },
                    {"type": "text", "text": soru},
                ],
            }
        ],
    )
    return yanit.content[0].text


if __name__ == "__main__":
    sonuc = pdf_analiz(
        pdf_yolu = r"C:\Projeler\Akım\dijital_donusum_raporu.pdf",
        soru     = "Bu rapordan dijital dönüşümün mevcut durumunu özetle.",
        sistem   = "Sen bir dijital dönüşüm danışmanısın.",
    )
    print(sonuc)
```

### 6.3 DOCX/Metin Dosyası Gönderme

```python
# -*- coding: utf-8 -*-
"""
claude_dosya.py — .docx / .txt / .csv gibi metin dosyalarını gönderme
Claude doğrudan binary dosya desteklemez; içeriği çıkarıp metin olarak gönderin.
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from pathlib import Path
from config import ANTHROPIC_API_KEY, CLAUDE_MODEL

# python-docx gerekli: pip install python-docx
try:
    from docx import Document as DocxDocument
    DOCX_DESTEKLENIYOR = True
except ImportError:
    DOCX_DESTEKLENIYOR = False

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def dosya_icerik_al(dosya_yolu: str) -> str:
    """Desteklenen dosyalardan metin içeriği çıkar."""
    yol = Path(dosya_yolu)
    
    if yol.suffix.lower() in (".txt", ".csv", ".py", ".json", ".yaml", ".yml"):
        return yol.read_text(encoding="utf-8")
    
    elif yol.suffix.lower() == ".docx" and DOCX_DESTEKLENIYOR:
        doc = DocxDocument(str(yol))
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
    
    else:
        raise ValueError(f"Desteklenmeyen dosya formatı: {yol.suffix}")

def dosya_analiz(dosya_yolu: str, soru: str, sistem: str = "") -> str:
    """Dosya içeriğini Claude'a gönder."""
    icerik = dosya_icerik_al(dosya_yolu)
    mesaj  = f"Aşağıdaki dosya içeriğini incele:\n\n```\n{icerik}\n```\n\n{soru}"
    
    yanit = client.messages.create(
        model      = CLAUDE_MODEL,
        max_tokens = 4096,
        system     = sistem,
        messages   = [{"role": "user", "content": mesaj}],
    )
    return yanit.content[0].text
```

---

## 7. GPT-5.5 — Temel Kullanım

GPT-5.5 için **Responses API** kullanın. Chat Completions teknik olarak şimdilik desteklense de OpenAI'nin yönelimi Responses API'ye doğrudur; yeni kodlarda Chat Completions yerine Responses API tercih edilmelidir. **GPT-5.5 Pro** için Responses API **zorunludur.**

> ⚠️ **GPT-5.5 bağlam notu:** Varsayılan bağlam 272K token'dır. 272K üzerine çıkan oturumlarda tüm oturumun fiyatı 2x olur.

```python
# -*- coding: utf-8 -*-
"""
gpt55_temel.py — GPT-5.5 basit kullanım
Responses API kullanılır — Chat Completions kullanmayın.
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from openai import OpenAI
from config import OPENAI_API_KEY, GPT55_MODEL

client = OpenAI(api_key=OPENAI_API_KEY)

def gpt55_sor(soru: str, sistem: str = "", reasoning_effort: str = "medium") -> str:
    """Responses API ile basit soru — GPT-5.5 ve GPT-5.5 Pro için."""
    talimat = sistem if sistem else "Yardımcı bir asistansın."

    yanit = client.responses.create(
        model             = GPT55_MODEL,
        instructions      = talimat,
        input             = soru,
        reasoning         = {"effort": reasoning_effort},
        max_output_tokens = 2048,
    )
    return yanit.output_text


if __name__ == "__main__":
    print(gpt55_sor("Endüstri 4.0'ın 5 temel teknolojisini listele."))
```

---

## 8. GPT-5.5 — Responses API (Çok Turlu Sohbet)

GPT-5.5 için tek API yolu: **Responses API.** Aşağıda hem basit hem durum bilgili (çok turlu) kullanım gösterilmiştir.

### 8.1 Responses API — Çok Turlu Sohbet Yöneticisi

```python
# -*- coding: utf-8 -*-
"""
gpt55_responses_api.py — Responses API tam kullanım
GPT-5.5 ve GPT-5.5 Pro için önerilen yöntem.
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from openai import OpenAI
from config import OPENAI_API_KEY, GPT55_MODEL, GPT55_PRO

client = OpenAI(api_key=OPENAI_API_KEY)


class GPT55Chat:
    """GPT-5.5 çok turlu sohbet yöneticisi — Responses API."""

    def __init__(self,
                 sistem_mesaji   : str = "",
                 max_output_tokens: int = 2048,
                 reasoning_effort : str = "medium"):
        """
        Parametreler:
            sistem_mesaji    : Model davranışını yönlendirir (instructions)
            max_output_tokens: Maksimum çıktı token (1-128000)
            reasoning_effort : none / low / medium (varsayılan) / high / xhigh
        """
        self.sistem           = sistem_mesaji or "Yardımcı bir asistansın."
        self.max_output_tokens = max_output_tokens
        self.reasoning_effort  = reasoning_effort
        self._onceki_id        = None   # previous_response_id ile bağlam taşınır

    def gonder(self, mesaj: str) -> str:
        """Mesaj gönder, yanıt döndür. Bağlam previous_response_id ile taşınır."""
        parametreler = {
            "model"             : GPT55_MODEL,
            "instructions"      : self.sistem,
            "input"             : mesaj,
            "reasoning"         : {"effort": self.reasoning_effort},
            "max_output_tokens" : self.max_output_tokens,
        }
        if self._onceki_id:
            parametreler["previous_response_id"] = self._onceki_id

        yanit = client.responses.create(**parametreler)
        self._onceki_id = yanit.id
        return yanit.output_text

    def gecmisi_temizle(self):
        self._onceki_id = None
```

### 8.2 Responses API (Gelişmiş — Durum Bilgili)

```python
# -*- coding: utf-8 -*-
"""
gpt55_responses_api.py — Responses API kullanımı
GPT-5.5 ve GPT-5.5 Pro için
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from openai import OpenAI
from config import OPENAI_API_KEY, GPT55_MODEL, GPT55_PRO

client = OpenAI(api_key=OPENAI_API_KEY)

def responses_api_temel(soru: str, sistem: str = "", model: str = GPT55_MODEL) -> dict:
    """
    Responses API — temel kullanım.
    gpt-5.5-pro için bu API ZORUNLUDUR.
    """
    yanit = client.responses.create(
        model             = model,
        instructions      = sistem or "Yardımcı bir asistansın.",
        input             = soru,
        max_output_tokens = 4096,
    )
    
    return {
        "yanit"   : yanit.output_text,
        "id"      : yanit.id,
        "model"   : yanit.model,
        "kullanim": {
            "input_tokens" : yanit.usage.input_tokens,
            "output_tokens": yanit.usage.output_tokens,
        }
    }


def responses_api_cok_tur(mesajlar: list, sistem: str = "",
                          onceki_yanit_id: str = None) -> dict:
    """
    Responses API — çok turlu sohbet.
    onceki_yanit_id ile önceki bağlamı taşı.
    """
    parametreler = {
        "model"       : GPT55_MODEL,
        "instructions": sistem or "Yardımcı bir asistansın.",
        "input"       : mesajlar,
    }
    
    if onceki_yanit_id:
        parametreler["previous_response_id"] = onceki_yanit_id
    
    yanit = client.responses.create(**parametreler)
    return {"yanit": yanit.output_text, "id": yanit.id}


if __name__ == "__main__":
    # GPT-5.5 Pro ile kullanım (Responses API zorunlu)
    sonuc = responses_api_temel(
        soru   = "Üretim hattındaki OEE hesaplama yöntemlerini açıkla.",
        sistem = "Sen bir üretim verimliliği danışmanısın. Türkçe yanıt ver.",
        model  = GPT55_PRO,
    )
    print(sonuc["yanit"])
    print(f"\nToken: {sonuc['kullanim']}")
```

---

## 9. GPT-5.5 — Reasoning (reasoning.effort)

GPT-5.5 Responses API üzerinden `reasoning.effort` ile kullanılır.

```python
# -*- coding: utf-8 -*-
"""
gpt55_reasoning.py — reasoning.effort parametresi kullanımı — Responses API
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from openai import OpenAI
from config import OPENAI_API_KEY, GPT55_MODEL, GPT55_PRO

client = OpenAI(api_key=OPENAI_API_KEY)

# Reasoning seviyeleri:
# "none"   → Reasoning yok. Hızlı, basit görevler
# "low"    → Az reasoning. Kısa analitik yanıtlar
# "medium" → Orta düzey. Genel problem çözme (varsayılan)
# "high"   → Derin reasoning. Karmaşık analizler, kod hata ayıklama
# "xhigh"  → Maksimum reasoning. En zor problemler
#             GPT-5.5 Pro: medium/high/xhigh destekler
#             GPT-5.5    : none/low/medium/high/xhigh destekler

def gpt55_reasoning(soru: str, seviye: str = "medium",
                    sistem: str = "", model: str = GPT55_MODEL) -> dict:
    """
    Responses API ile reasoning.effort.
    GPT-5.5 Pro için model=GPT55_PRO geçin.
    Pro uzun sürebilir; timeout için background=True eklenebilir.
    """
    yanit = client.responses.create(
        model             = model,
        instructions      = sistem or "Yardımcı bir asistansın.",
        input             = soru,
        reasoning         = {"effort": seviye},
        max_output_tokens = 8192,
    )

    return {
        "yanit" : yanit.output_text,
        "id"    : yanit.id,
        "seviye": seviye,
        "kullanim": {
            "input_tokens" : yanit.usage.input_tokens,
            "output_tokens": yanit.usage.output_tokens,
        },
    }


if __name__ == "__main__":
    karmasik_soru = """
    Bir otobüs koltuk fabrikasında CNN tabanlı potluk defect detection sistemi kurmak istiyorum.
    Eğitim dataseti yok, sıfırdan oluşturacağım.
    
    Şunları analiz et:
    1. Data augmentation stratejisi (minimum dataset ile maksimum doğruluk)
    2. Transfer learning için en uygun base model seçimi
    3. %99.9 doğruluk hedefi için pratik bir yol haritası
    4. Production ortamına geçiş kriterleri
    """

    print("=== MEDIUM REASONING ===")
    orta = gpt55_reasoning(karmasik_soru, seviye="medium")
    print(orta["yanit"][:300] + "...")

    print("\n=== XHIGH REASONING ===")
    maksimum = gpt55_reasoning(
        karmasik_soru, seviye="xhigh",
        sistem="Sen bir computer vision ve kalite kontrol uzmanısın."
    )
    print(maksimum["yanit"][:300] + "...")
```

---

## 10. GPT-5.5 — Multimodal (Görsel, PDF, Dosya)

### 10.1 Görsel Gönderme

```python
# -*- coding: utf-8 -*-
"""
gpt55_gorsel.py — GPT-5.5 görsel analizi
"""
import sys, base64
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from openai import OpenAI
from pathlib import Path
from config import OPENAI_API_KEY, GPT55_MODEL

client = OpenAI(api_key=OPENAI_API_KEY)

def gpt55_gorsel_base64(gorsel_yolu: str, soru: str,
                         sistem: str = "", reasoning_effort: str = "none") -> str:
    """Yerel görsel dosyasını GPT-5.5'e Responses API ile gönder."""
    gorsel_yolu = Path(gorsel_yolu)

    mime_map = {
        ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
        ".png": "image/png",  ".gif": "image/gif",
        ".webp": "image/webp",
    }
    mime_turu = mime_map.get(gorsel_yolu.suffix.lower(), "image/jpeg")

    with open(gorsel_yolu, "rb") as f:
        gorsel_b64 = base64.standard_b64encode(f.read()).decode("utf-8")

    yanit = client.responses.create(
        model             = GPT55_MODEL,
        instructions      = sistem or "Yardımcı bir asistansın.",
        reasoning         = {"effort": reasoning_effort},
        max_output_tokens = 2048,
        input             = [
            {
                "role": "user",
                "content": [
                    {
                        "type"      : "input_image",
                        "image_url" : f"data:{mime_turu};base64,{gorsel_b64}",
                        "detail"    : "high",  # "low" | "high" | "auto"
                    },
                    {"type": "input_text", "text": soru},
                ],
            }
        ],
    )
    return yanit.output_text


def gpt55_gorsel_url(gorsel_url: str, soru: str) -> str:
    """URL ile görsel analizi — Responses API."""
    yanit = client.responses.create(
        model  = GPT55_MODEL,
        input  = [
            {
                "role": "user",
                "content": [
                    {"type": "input_image", "image_url": gorsel_url, "detail": "auto"},
                    {"type": "input_text",  "text": soru},
                ],
            }
        ],
    )
    return yanit.output_text
```

### 10.2 PDF ve Dosya Gönderme (Files API)

```python
# -*- coding: utf-8 -*-
"""
gpt55_dosya.py — GPT-5.5 Files API ile PDF ve doküman gönderme
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from openai import OpenAI
from pathlib import Path
from config import OPENAI_API_KEY, GPT55_MODEL

client = OpenAI(api_key=OPENAI_API_KEY)

def dosya_yukle_ve_analiz(dosya_yolu: str, soru: str,
                           sistem: str = "", reasoning_effort: str = "medium") -> str:
    """
    Dosyayı OpenAI Files API'ye yükle ve analiz ettir.
    Desteklenen formatlar: PDF, DOCX, TXT, CSV ve daha fazlası.
    Yüklenen dosya API'de saklanır; kullanım sonrası silinebilir.
    """
    dosya_yolu = Path(dosya_yolu)
    
    with open(dosya_yolu, "rb") as f:
        yuklenen = client.files.create(
            file   = f,
            purpose= "assistants",
        )
    
    dosya_id = yuklenen.id
    print(f"Dosya yüklendi, ID: {dosya_id}")
    
    try:
        yanit = client.responses.create(
            model             = GPT55_MODEL,
            instructions      = sistem or "Yardımcı bir asistansın.",
            reasoning         = {"effort": reasoning_effort},
            max_output_tokens = 4096,
            input             = [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_file", "file_id": dosya_id},
                        {"type": "input_text", "text": soru},
                    ],
                }
            ],
        )
        return yanit.output_text
    
    finally:
        client.files.delete(dosya_id)
        print(f"Dosya silindi: {dosya_id}")


if __name__ == "__main__":
    sonuc = dosya_yukle_ve_analiz(
        dosya_yolu      = r"C:\Projeler\Akım\survey_formu.pdf",
        soru            = "Bu anketteki sorulardan kaç tanesi dijital yetkinlikle ilgili?",
        sistem          = "Sen bir dijital dönüşüm danışmanısın.",
        reasoning_effort= "medium",
    )
    print(sonuc)
```

---

## 11. Streaming — Her İki Model

```python
# -*- coding: utf-8 -*-
"""
streaming.py — Her iki model için streaming
"""
import sys
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from openai import OpenAI
from config import ANTHROPIC_API_KEY, OPENAI_API_KEY, CLAUDE_MODEL, GPT55_MODEL

claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


def claude_stream(soru: str, sistem: str = "", max_tokens: int = 2048):
    """Claude Sonnet 4.6 streaming — gerçek zamanlı yazdırma."""
    print("[Claude Streaming]: ", end="", flush=True)
    
    with claude_client.messages.stream(
        model      = CLAUDE_MODEL,
        max_tokens = max_tokens,
        system     = sistem,
        messages   = [{"role": "user", "content": soru}],
    ) as akis:
        tam_yanit = ""
        for metin in akis.text_stream:
            print(metin, end="", flush=True)
            tam_yanit += metin
    
    print()
    return tam_yanit


def gpt55_stream(soru: str, sistem: str = "", reasoning_effort: str = "none",
                  max_output_tokens: int = 2048) -> str:
    """GPT-5.5 streaming — Responses API SSE ile gerçek zamanlı yazdırma."""
    print("[GPT-5.5 Streaming]: ", end="", flush=True)

    tam_yanit = ""
    with openai_client.responses.stream(
        model             = GPT55_MODEL,
        instructions      = sistem or "Yardımcı bir asistansın.",
        input             = soru,
        reasoning         = {"effort": reasoning_effort},
        max_output_tokens = max_output_tokens,
    ) as akis:
        for metin in akis.text_stream:
            print(metin, end="", flush=True)
            tam_yanit += metin

    print()
    return tam_yanit


if __name__ == "__main__":
    soru = "Python'da async/await kullanımını kısa bir örnekle anlat."
    
    claude_stream(soru, sistem="Kısa ve net açıkla.")
    gpt55_stream(soru, sistem="Kısa ve net açıkla.", reasoning_effort="low")
```

---

## 12. Tool Use / Function Calling — Her İki Model

```python
# -*- coding: utf-8 -*-
"""
tool_use.py — Her iki model için function calling
"""
import sys, json
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from openai import OpenAI
from config import ANTHROPIC_API_KEY, OPENAI_API_KEY, CLAUDE_MODEL, GPT55_MODEL

claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Örnek araç: fabrika verisi sorgulama
ARACLAR_TANIMI = {
    "claude": [
        {
            "name"       : "fabrika_veri_sorgula",
            "description": "Fabrikanın üretim verilerini sorgular. OEE, fire oranı, vardiya bilgisi döner.",
            "input_schema": {
                "type"      : "object",
                "properties": {
                    "tarih"  : {"type": "string", "description": "YYYY-MM-DD formatında tarih"},
                    "hat_no" : {"type": "integer", "description": "Üretim hattı numarası (1-10)"},
                    "metrik" : {"type": "string",  "description": "Sorgulanacak metrik: oee|fire|uretim"},
                },
                "required": ["tarih", "hat_no", "metrik"],
            },
        }
    ],
    "openai": [
        {
            "type": "function",
            "function": {
                "name"       : "fabrika_veri_sorgula",
                "description": "Fabrikanın üretim verilerini sorgular.",
                "parameters" : {
                    "type"      : "object",
                    "properties": {
                        "tarih"  : {"type": "string"},
                        "hat_no" : {"type": "integer"},
                        "metrik" : {"type": "string", "enum": ["oee", "fire", "uretim"]},
                    },
                    "required": ["tarih", "hat_no", "metrik"],
                },
            },
        }
    ],
}

def sahte_fabrika_api(tarih: str, hat_no: int, metrik: str) -> dict:
    """Gerçek API'yi simüle eder."""
    veri = {
        "oee"   : {"deger": 78.5, "birim": "%", "hedef": 85.0},
        "fire"  : {"deger": 1.2,  "birim": "%", "hedef": 0.5},
        "uretim": {"deger": 450,  "birim": "adet", "hedef": 500},
    }
    return {"tarih": tarih, "hat": hat_no, "metrik": metrik, **veri.get(metrik, {})}


def claude_tool_use(soru: str) -> str:
    """Claude ile tool use döngüsü."""
    mesajlar = [{"role": "user", "content": soru}]
    
    while True:
        yanit = claude_client.messages.create(
            model      = CLAUDE_MODEL,
            max_tokens = 1024,
            tools      = ARACLAR_TANIMI["claude"],
            messages   = mesajlar,
        )
        
        if yanit.stop_reason == "end_turn":
            return yanit.content[0].text
        
        if yanit.stop_reason == "tool_use":
            mesajlar.append({"role": "assistant", "content": yanit.content})
            
            arac_sonuclari = []
            for blok in yanit.content:
                if blok.type == "tool_use":
                    sonuc = sahte_fabrika_api(**blok.input)
                    arac_sonuclari.append({
                        "type"       : "tool_result",
                        "tool_use_id": blok.id,
                        "content"    : json.dumps(sonuc, ensure_ascii=False),
                    })
            
            mesajlar.append({"role": "user", "content": arac_sonuclari})


def gpt55_tool_use(soru: str) -> str:
    """GPT-5.5 ile tool use döngüsü — Responses API."""
    # Responses API'de araçlar tools parametresiyle verilir,
    # çok turlu akış previous_response_id ile yönetilir.
    onceki_id = None

    while True:
        parametreler = {
            "model"  : GPT55_MODEL,
            "input"  : soru if onceki_id is None else [],
            "tools"  : ARACLAR_TANIMI["openai"],
        }
        if onceki_id:
            parametreler["previous_response_id"] = onceki_id

        yanit = openai_client.responses.create(**parametreler)
        onceki_id = yanit.id

        # Araç çağrısı yoksa son yanıtı döndür
        arac_cagrisi_var = any(
            getattr(blok, "type", "") == "function_call"
            for blok in yanit.output
        )
        if not arac_cagrisi_var:
            return yanit.output_text

        # Araç sonuçlarını hazırla ve bir sonraki tura geç
        soru = []
        for blok in yanit.output:
            if getattr(blok, "type", "") == "function_call":
                argumanlar = json.loads(blok.arguments)
                sonuc      = sahte_fabrika_api(**argumanlar)
                soru.append({
                    "type"        : "function_call_output",
                    "call_id"     : blok.call_id,
                    "output"      : json.dumps(sonuc, ensure_ascii=False),
                })


if __name__ == "__main__":
    soru = "2 numaralı hattın bugünkü OEE değeri nedir? Hedeften uzaklaşma var mı?"
    
    print("Claude:", claude_tool_use(soru))
    print("GPT-5.5:", gpt55_tool_use(soru))
```

---

## 13. Hata Yönetimi ve Retry Mantığı

```python
# -*- coding: utf-8 -*-
"""
hata_yonetimi.py — Production-ready hata yönetimi
"""
import sys, time, logging
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from openai import OpenAI, RateLimitError, APIError, APITimeoutError
from anthropic import RateLimitError as AnthRateLimitError
from config import ANTHROPIC_API_KEY, OPENAI_API_KEY, CLAUDE_MODEL, GPT55_MODEL

logging.basicConfig(
    level    = logging.INFO,
    format   = "%(asctime)s [%(levelname)s] %(message)s",
    handlers = [
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("api_log.txt", encoding="utf-8"),
    ],
)
logger = logging.getLogger(__name__)

claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


def exponential_backoff(deneme: int, baz_sure: float = 1.0, max_sure: float = 60.0) -> float:
    """Üstel geri çekilme süresi hesapla."""
    return min(baz_sure * (2 ** deneme), max_sure)


def claude_guvenli(soru: str, sistem: str = "",
                   max_deneme: int = 3) -> str | None:
    """Claude — hata yönetimli ve retry mantıklı."""
    for deneme in range(max_deneme):
        try:
            yanit = claude_client.messages.create(
                model      = CLAUDE_MODEL,
                max_tokens = 2048,
                system     = sistem,
                messages   = [{"role": "user", "content": soru}],
            )
            return yanit.content[0].text
        
        except AnthRateLimitError:
            bekleme = exponential_backoff(deneme)
            logger.warning(f"Claude rate limit! {bekleme:.1f}s bekleniyor... (Deneme {deneme+1}/{max_deneme})")
            time.sleep(bekleme)
        
        except anthropic.APIConnectionError as e:
            logger.error(f"Claude bağlantı hatası: {e}")
            if deneme == max_deneme - 1:
                raise
            time.sleep(5)
        
        except anthropic.BadRequestError as e:
            logger.error(f"Claude geçersiz istek: {e}")
            raise
        
        except Exception as e:
            logger.error(f"Claude beklenmeyen hata: {type(e).__name__}: {e}")
            if deneme == max_deneme - 1:
                raise
            time.sleep(exponential_backoff(deneme))
    
    return None


def gpt55_guvenli(soru: str, sistem: str = "",
                   reasoning_effort: str = "none",
                   max_deneme: int = 3) -> str | None:
    """GPT-5.5 — Responses API, hata yönetimli ve retry mantıklı."""
    for deneme in range(max_deneme):
        try:
            yanit = openai_client.responses.create(
                model             = GPT55_MODEL,
                instructions      = sistem or "Yardımcı bir asistansın.",
                input             = soru,
                reasoning         = {"effort": reasoning_effort},
                max_output_tokens = 2048,
            )
            return yanit.output_text
        
        except RateLimitError:
            bekleme = exponential_backoff(deneme)
            logger.warning(f"GPT-5.5 rate limit! {bekleme:.1f}s bekleniyor...")
            time.sleep(bekleme)
        
        except APITimeoutError:
            logger.warning(f"GPT-5.5 timeout (deneme {deneme+1})")
            if deneme == max_deneme - 1:
                raise
            time.sleep(10)
        
        except APIError as e:
            logger.error(f"GPT-5.5 API hatası [{e.status_code}]: {e.message}")
            if e.status_code in (400, 401, 403):
                raise
            time.sleep(exponential_backoff(deneme))
        
        except Exception as e:
            logger.error(f"GPT-5.5 beklenmeyen hata: {type(e).__name__}: {e}")
            if deneme == max_deneme - 1:
                raise
            time.sleep(exponential_backoff(deneme))
    
    return None
```

---

## 14. Gelişmiş: Karşılaştırmalı Wrapper Sınıfı

```python
# -*- coding: utf-8 -*-
"""
model_karsilastirici.py — Her iki modeli aynı prompt ile test et
Proje: Delta Proje AI Danışmanlık
"""
import sys, time, json
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

import anthropic
from openai import OpenAI
from dataclasses import dataclass
from config import (ANTHROPIC_API_KEY, OPENAI_API_KEY,
                    CLAUDE_MODEL, CLAUDE_OPUS_MODEL, GPT55_MODEL)

claude_client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


@dataclass
class ModelSonucu:
    model       : str
    yanit       : str
    sure_sn     : float
    input_token : int = 0
    output_token: int = 0
    hata        : str = ""


def karsilastir(
    soru             : str,
    sistem           : str  = "",
    claude_effort    : str  = "high",     # Sonnet: low/medium/high/max; Opus: + xhigh
    claude_model     : str  = CLAUDE_MODEL,
    gpt55_reasoning  : str  = "medium",
    max_tokens       : int  = 2048,
) -> dict[str, ModelSonucu]:
    """
    Aynı soruyu hem Claude hem GPT-5.5'e gönder. Sonuçları karşılaştır.
    
    Claude için Adaptive Thinking kullanır.
    GPT-5.5 için Chat Completions + reasoning.effort kullanır.
    """
    sonuclar = {}
    
    # --- Claude (Adaptive Thinking) ---
    baslangic = time.time()
    try:
        c_yanit = claude_client.messages.create(
            model          = claude_model,
            max_tokens     = max_tokens + 8000,
            system         = sistem,
            thinking       = {"type": "adaptive"},
            output_config  = {"effort": claude_effort},  # effort → output_config
            messages       = [{"role": "user", "content": soru}],
        )
        metin = next((b.text for b in c_yanit.content if b.type == "text"), "")
        
        sonuclar["claude"] = ModelSonucu(
            model        = claude_model,
            yanit        = metin,
            sure_sn      = time.time() - baslangic,
            input_token  = c_yanit.usage.input_tokens,
            output_token = c_yanit.usage.output_tokens,
        )
    except Exception as e:
        sonuclar["claude"] = ModelSonucu(
            model="claude", yanit="", sure_sn=0, hata=str(e)
        )
    
    # --- GPT-5.5 ---
    baslangic = time.time()
    try:
        mesajlar = []
        if sistem:
            mesajlar.append({"role": "system", "content": sistem})
        mesajlar.append({"role": "user", "content": soru})
        
        g_yanit = openai_client.chat.completions.create(
            model     = GPT55_MODEL,
            messages  = mesajlar,
            reasoning = {"effort": gpt55_reasoning},
            max_tokens= max_tokens,
        )
        
        sonuclar["gpt55"] = ModelSonucu(
            model        = GPT55_MODEL,
            yanit        = g_yanit.choices[0].message.content,
            sure_sn      = time.time() - baslangic,
            input_token  = g_yanit.usage.prompt_tokens,
            output_token = g_yanit.usage.completion_tokens,
        )
    except Exception as e:
        sonuclar["gpt55"] = ModelSonucu(
            model="gpt-5.5", yanit="", sure_sn=0, hata=str(e)
        )
    
    return sonuclar


def rapor_yazdir(sonuclar: dict[str, ModelSonucu]):
    """Karşılaştırma raporunu yazdır."""
    print("\n" + "=" * 70)
    print("MODEL KARŞILAŞTIRMA RAPORU")
    print("=" * 70)
    
    for isim, s in sonuclar.items():
        print(f"\n{'─' * 35}")
        print(f"MODEL   : {s.model}")
        print(f"SÜRE    : {s.sure_sn:.2f} saniye")
        print(f"TOKENLER: {s.input_token} giriş / {s.output_token} çıkış")
        if s.hata:
            print(f"HATA    : {s.hata}")
        else:
            print(f"YANIT   :\n{s.yanit}")
    
    print("\n" + "=" * 70)


if __name__ == "__main__":
    soru = """
    Üretim hattında anlık kalite kontrolü için edge AI sistemi tasarlanacak.
    Kamera: 4K 60fps, İşlemci: NVIDIA Jetson Orin, 
    Hedef: <50ms gecikme ile %99.5 doğruluk.
    
    En kritik 3 teknik riski belirle ve çözümünü öner.
    """
    
    sonuclar = karsilastir(
        soru            = soru,
        sistem          = "Sen bir endüstriyel AI sistemi mimarısın.",
        claude_effort   = "high",
        gpt55_reasoning = "high",
        max_tokens      = 2048,
    )
    
    rapor_yazdir(sonuclar)
    
    with open("karsilastirma_sonuclari.json", "w", encoding="utf-8") as f:
        json.dump(
            {k: {"yanit": v.yanit, "sure": v.sure_sn, "hata": v.hata}
             for k, v in sonuclar.items()},
            f, ensure_ascii=False, indent=2
        )
```

---

## Hızlı Referans

### Model Stringleri (Mayıs 2026)
| Model | String |
|---|---|
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Opus 4.7 | `claude-opus-4-7` |
| GPT-5.5 | `gpt-5.5` |
| GPT-5.5 Pro | `gpt-5.5-pro` |

### API Uç Noktaları
| API | Claude | GPT-5.5 | GPT-5.5 Pro |
|---|---|---|---|
| Mesajlar/Chat | `/v1/messages` | ⚠️ geçici | ❌ |
| Responses | Yok | ✅ **önerilen** | ✅ **zorunlu** |
| Files | Yok | `/v1/files` | `/v1/files` |

### Reasoning/Thinking Parametreleri
| Model | Parametre | Değerler |
|---|---|---|
| Claude Sonnet 4.6 | `thinking: {type:"adaptive"}` + `effort` | low / medium / **high** (varsayılan) / max |
| Claude Opus 4.7 | `thinking: {type:"adaptive"}` + `effort` | low / medium / high / **xhigh** 🆕 / max |
| GPT-5.5 | `reasoning.effort` | none / low / **medium** (varsayılan) / high / xhigh |
| GPT-5.5 Pro | `reasoning.effort` | medium / high / xhigh |

### Fiyat Özeti (Mayıs 2026, 1M token başına)
| Model | Giriş | Çıkış | Bilgi kesim tarihi |
|---|---|---|---|
| Claude Sonnet 4.6 | $3 | $15 | Ağustos 2025 |
| Claude Opus 4.7 | $5* | $25 | Ocak 2026 |
| GPT-5.5 (≤272K bağlam) | $5 | $30 | Aralık 2025 |
| GPT-5.5 (>272K bağlam) | $10 (2x) | $45 (1.5x) | Aralık 2025 |
| GPT-5.5 Pro | $30 | $180 | Aralık 2025 |

> \* Opus 4.7 yeni tokenizer: Aynı metin için %0–35 daha fazla token tüketebilir; fiili maliyet artabilir.

### Bağlam Penceresi
| Model | Bağlam | Max Çıktı | Not |
|---|---|---|---|
| Claude Sonnet 4.6 | 1M token | 64K | Standart fiyat, ek ücret yok |
| Claude Opus 4.7 | 1M token | 128K | Standart fiyat, ek ücret yok |
| GPT-5.5 | 1.05M token | 128K | 272K üzeri 2x giriş / 1.5x çıkış |
| GPT-5.5 Pro | 1.05M token | 128K | 272K üzeri 2x giriş / 1.5x çıkış |

### Görsel `detail` Seçenekleri (GPT-5.5)
| Değer | Kullanım | Token Maliyeti |
|---|---|---|
| `"low"` | Genel içerik, hızlı | ~85 token |
| `"high"` | Detaylı analiz, defect detection | ~1700 token/görsel |
| `"auto"` | Model karar verir | Değişken |

---

> **⚠️ Önemli Notlar (Mayıs 2026):**
> - **SDK sürümleri:** `anthropic>=0.96.0` (Opus 4.7 için) ve `openai>=2.27.0` (GPT-5.5 için) gereklidir. OpenAI v1.x artık desteklenmez. Eski process'ler çalışıyorsa `netstat -ano | findstr :<port>` ile tespit edip `taskkill /PID <pid> /F` ile temizleyin.
> - **Claude Adaptive Thinking:** `thinking: {type: "adaptive"}` + `effort` kullanın. `budget_tokens` Sonnet 4.6'da deprecated, **Opus 4.7'de tamamen kaldırıldı.**
> - **Opus 4.7 thinking blokları:** Varsayılan olarak **gizlidir.** Görmek için `"display": "summarized"` ekleyin.
> - **Opus 4.7 xhigh effort:** Yeni seviye — high ile max arasında, Claude Code varsayılanı.
> - **Opus 4.7 tokenizer:** Aynı metin için %0–35 daha fazla token tüketebilir; maliyet tahminlerini yeniden yapın.
> - **Claude temperature:** Adaptive Thinking aktifken `temperature` parametresi kullanılamaz.
> - **GPT-5.5 ve GPT-5.5 Pro** için **Responses API** kullanın. Chat Completions geçici olarak desteklense de kalkması beklenmektedir; yeni kodlarda kullanmayın.
> - **GPT-5.5 streaming** Responses API SSE ile yapılır: `client.responses.stream(...)`.
> - **GPT-5.5 bağlam:** 272K üzeri oturumlarda fiyat tüm oturum için 2x olur.
> - **Claude 1M context:** Standart fiyata dahildir, ek ücret yoktur.
> - **Windows UTF-8:** `sys.stdout.reconfigure(encoding="utf-8")` her dosyanın başına eklenmelidir.
> - **API anahtarları** asla kaynak koduna yazmayın, her zaman `.env` kullanın.

---
*Delta Proje AI Danışmanlık — Murat Turan | Mayıs 2026*
