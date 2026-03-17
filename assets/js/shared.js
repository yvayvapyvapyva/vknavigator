(function (global) {
  const TOKEN_SUFFIX = "AEIlGh23bO2ygpYMlJrB9MOA42UceJ";

  const byId = (id) => document.getElementById(id);
  const round6 = (n) => Math.round(n * 1e6) / 1e6;

  // Определяем платформу
  function getPlatform() {
    const ua = navigator.userAgent;
    if (ua.includes('VKApp')) return 'vk';
    if (global.Telegram && global.Telegram.WebApp) return 'telegram';
    return 'web';
  }

  function getTelegramWebApp() {
    return global.Telegram && global.Telegram.WebApp ? global.Telegram.WebApp : null;
  }

  function getVKWebApp() {
    return global.VKMiniApps && global.VKMiniApps.WebApp ? global.VKMiniApps.WebApp : null;
  }

  function getWebApp() {
    return getVKWebApp() || getTelegramWebApp();
  }

  function getTelegramUser() {
    const tg = getTelegramWebApp();
    return tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;
  }

  async function getVKUser() {
    if (global.VKMiniApps && global.VKMiniApps.getUser) {
      return await global.VKMiniApps.getUser();
    }
    return null;
  }

  async function getUser() {
    const platform = getPlatform();
    if (platform === 'vk') {
      return await getVKUser();
    }
    return getTelegramUser();
  }

  async function getUserIdentity() {
    const platform = getPlatform();
    
    if (platform === 'vk') {
      if (global.VKMiniApps && global.VKMiniApps.getIdentity) {
        return await global.VKMiniApps.getIdentity();
      }
      const vkUser = await getVKUser();
      const fallbackId = localStorage.getItem('debug_uid') || ("vk_guest_" + Math.random().toString(36).slice(2, 7));
      return {
        id: vkUser ? vkUser.id : fallbackId,
        name: vkUser ? (vkUser.first_name + (vkUser.last_name ? " " + vkUser.last_name : "")) : "Guest",
        username: vkUser ? `vk${vkUser.id}` : ""
      };
    }
    
    // Telegram или веб
    const tgUser = getTelegramUser();
    const fallbackId = localStorage.getItem('debug_uid') || ("guest_" + Math.random().toString(36).slice(2, 7));
    return {
      id: tgUser ? tgUser.id : fallbackId,
      name: tgUser ? (tgUser.first_name + (tgUser.last_name ? " " + tgUser.last_name : "")) : "Guest",
      username: tgUser && tgUser.username ? `@${tgUser.username}` : ""
    };
  }

  function getTokenFromUrl() {
    const prefix = (new URLSearchParams(global.location.search).get('t') || '').slice(0, 10);
    return prefix.length < 10 ? null : prefix + TOKEN_SUFFIX;
  }

  function buildInitFileContent(extra = {}) {
    const platform = getPlatform();
    
    if (platform === 'vk' && global.VKMiniApps && global.VKMiniApps.buildInitFileContent) {
      return global.VKMiniApps.buildInitFileContent(extra);
    }
    
    const tg = getTelegramWebApp();
    const initUnsafe = tg && tg.initDataUnsafe ? tg.initDataUnsafe : null;
    const user = initUnsafe && initUnsafe.user ? initUnsafe.user : null;
    const fullName = user
      ? `${user.first_name || ''}${user.last_name ? ` ${user.last_name}` : ''}`.trim()
      : 'Unknown';
    const uname = user && user.username ? `@${user.username}` : '-';
    const userId = user && user.id ? String(user.id) : '-';
    const isPremium = user && typeof user.is_premium === 'boolean' ? user.is_premium : false;
    const platformStr = tg && tg.platform ? tg.platform : '-';
    const chatType = initUnsafe && initUnsafe.chat_type ? initUnsafe.chat_type : '-';
    const chatInstance = initUnsafe && initUnsafe.chat_instance ? String(initUnsafe.chat_instance) : '-';
    const createdAt = new Intl.DateTimeFormat('ru-RU', {
      timeZone: 'Europe/Moscow',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date());
    return [
      `👤 User: ${fullName} (${uname})`,
      `🆔 ID: ${userId}`,
      `⭐ Premium: ${isPremium ? 'yes' : 'no'}`,
      `📱 Platform: ${platformStr}`,
      `💬 Chat Type: ${chatType}`,
      `🔗 Chat Instance: ${chatInstance}`,
      `🕒 Created At (Moscow): ${createdAt}`
    ].join('\n');
  }

  async function apiRequest(token, url, method = 'GET', body = null) {
    if (!token) return null;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `token ${token}`,
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : null
    });
    if (!res.ok) return null;
    return res.status === 204 ? true : res.json();
  }

  global.AppShared = {
    TOKEN_SUFFIX,
    byId,
    round6,
    getPlatform,
    getTelegramWebApp,
    getVKWebApp,
    getWebApp,
    getTelegramUser,
    getVKUser,
    getUser,
    getUserIdentity,
    getTokenFromUrl,
    buildInitFileContent,
    apiRequest
  };
})(window);
