import requests
import datetime
import os

def send_report(user_id, m_val, i_val):
    token = os.getenv("TELEGRAM_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not token or not chat_id:
        return

    # Настройка московского времени (UTC+3)
    offset = datetime.timezone(datetime.timedelta(hours=3))
    now_moscow = datetime.datetime.now(offset).strftime("%d.%m.%Y %H:%M:%S")

    # Формируем текст сообщения
    message = (
        f"📊 *Запуск навигатора*\n"
        f"🕒 `{now_moscow}`\n"
        f"🆔 Маршрут: `{user_id}`-`{m_val}`\n"
        f"Ⓜ️ Инфо: `{i_val}`"
    )

    try:
        # Отправляем GET-запрос в Telegram
        requests.get(
            f"https://api.telegram.org/bot{token}/sendMessage",
            params={
                "chat_id": chat_id, 
                "text": message,
                "parse_mode": "Markdown" # Чтобы время и ID были красиво подсвечены
            },
            timeout=2 
        )
    except Exception:
        # "Тихий" режим: если Telegram не ответил, пользователь функции этого не увидит
        pass