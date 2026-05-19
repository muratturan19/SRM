import re


def normalize_phone(phone: str | None) -> str | None:
    """
    Türkiye telefon numaralarını standart formata çevirir: +90 5XX XXX XX XX

    Desteklenen giriş formatları:
        5308779874          → +90 530 877 98 74
        05308779874         → +90 530 877 98 74
        0 533 721 54 88     → +90 533 721 54 88
        +90 212 123 45 67   → +90 212 123 45 67
        +902121234567       → +90 212 123 45 67
        902121234567        → +90 212 123 45 67

    Tanımlanamayan formatlarda giriş değeri döner (trim ile).
    """
    if not phone:
        return phone

    phone = phone.strip()
    if not phone:
        return None

    # Sadece rakamları al
    digits = re.sub(r'\D', '', phone)

    # 10 haneli ulusal numara (5XX veya 2XX/3XX/4XX)
    if len(digits) == 10 and digits[0] in '2345':
        digits = '90' + digits

    # 11 haneli, başında 0 (Türk standardı: 05XX... veya 0212...)
    elif len(digits) == 11 and digits[0] == '0':
        digits = '90' + digits[1:]

    # 11 haneli başında 9 değil (bozuk format) — dokunma
    # 12 haneli, 90 ile başlıyor → zaten doğru
    elif len(digits) == 12 and digits.startswith('90'):
        pass  # devam et

    else:
        # Normalize edilemeyen format — temizlenmiş orijinali döndür
        return phone

    # Şimdi digits = 12 haneli, "90XXXXXXXXXX" formatında olmalı
    if len(digits) == 12 and digits.startswith('90'):
        n = digits[2:]  # 10 haneli ulusal numara
        return f'+90 {n[0:3]} {n[3:6]} {n[6:8]} {n[8:10]}'

    return phone
