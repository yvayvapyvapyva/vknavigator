/**
 * VK Mini Apps Adapter
 * Адаптирует функции Telegram WebApp для работы с VK Mini Apps
 */
(function (global) {
    const VK_SDK_URL = 'https://unpkg.com/@vkontakte/vk-bridge/dist/browser.min.js';

    // Состояние VK Bridge
    let vkBridge = null;
    let vkInfo = null;
    let isInitialized = false;

    /**
     * Загружает и инициализирует VK Bridge
     */
    async function loadVKBridge() {
        if (vkBridge) return vkBridge;

        return new Promise((resolve, reject) => {
            // Проверяем, загружен ли уже скрипт
            if (global.VKBridge) {
                vkBridge = global.VKBridge;
                vkBridge.send('VKWebAppInit');
                resolve(vkBridge);
                return;
            }

            const script = document.createElement('script');
            script.src = VK_SDK_URL;
            script.onload = () => {
                vkBridge = global.VKBridge;
                if (vkBridge) {
                    vkBridge.send('VKWebAppInit');
                }
                resolve(vkBridge);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * Получает информацию о пользователе VK
     */
    async function getVKUserInfo() {
        if (vkInfo) return vkInfo;

        try {
            const result = await vkBridge.send('VKWebAppGetUserInfo');
            vkInfo = {
                id: result.id,
                first_name: result.first_name,
                last_name: result.last_name,
                photo: result.photo_200,
                platform: result.platform
            };
            return vkInfo;
        } catch (e) {
            console.warn('VK WebApp GetUserInfo error:', e);
            // Возвращаем fallback данные
            const fallbackId = localStorage.getItem('vk_debug_uid') || ('vk_guest_' + Math.random().toString(36).slice(2, 7));
            vkInfo = {
                id: fallbackId,
                first_name: 'Guest',
                last_name: '',
                photo: '',
                platform: 'unknown'
            };
            return vkInfo;
        }
    }

    /**
     * Аналог Telegram.WebApp
     */
    class VKWebApp {
        constructor() {
            this.platform = 'unknown';
            this.headerColor = null;
        }

        /**
         * Разворачивает приложение на весь экран
         */
        async expand() {
            try {
                await vkBridge.send('VKWebAppSetViewSettings', {
                    status_bar_style: 'dark',
                    action_bar_color: '#0f1115'
                });
            } catch (e) {
                console.warn('VK expand error:', e);
            }
        }

        /**
         * Запрашивает полный экран
         */
        async requestFullscreen() {
            try {
                await vkBridge.send('VKWebAppFullscreen');
            } catch (e) {
                console.warn('VK fullscreen error:', e);
            }
        }

        /**
         * Отключает вертикальные свайпы
         */
        disableVerticalSwipes() {
            // VK не имеет прямого аналога, но можно заблокировать скролл
            document.body.style.overflow = 'hidden';
        }

        /**
         * Включает вертикальные свайпы
         */
        enableVerticalSwipes() {
            document.body.style.overflow = '';
        }

        /**
         * Устанавливает цвет хедера
         */
        setHeaderColor(color) {
            this.headerColor = color;
            try {
                vkBridge.send('VKWebAppSetViewSettings', {
                    status_bar_style: color === 'secondary_bg_color' ? 'dark' : 'light'
                });
            } catch (e) {
                console.warn('VK setHeaderColor error:', e);
            }
        }

        /**
         * Показывает уведомление
         */
        async showAlert(title, message, buttons) {
            try {
                await vkBridge.send('VKWebAppShowSnackbar', {
                    message: message || title
                });
            } catch (e) {
                console.warn('VK showAlert error:', e);
            }
        }

        /**
         * Показывает диалог подтверждения
         */
        async showConfirm(title, message) {
            try {
                const result = await vkBridge.send('VKWebAppShowConfirmBox', {
                    title: title || 'Подтверждение',
                    message: message || title,
                    buttons: [
                        { id: 'ok', label: 'OK' },
                        { id: 'cancel', label: 'Отмена' }
                    ]
                });
                return result.action === 'ok';
            } catch (e) {
                console.warn('VK showConfirm error:', e);
                return confirm(message || title);
            }
        }

        /**
         * Вибрация (Haptic Feedback)
         */
        async hapticFeedback(type = 'light') {
            try {
                const impactType = {
                    light: 'light',
                    medium: 'medium',
                    heavy: 'heavy',
                    rigid: 'rigid',
                    soft: 'soft'
                }[type] || 'light';
                await vkBridge.send('VKWebAppTapticImpactOccurred', {
                    style: impactType
                });
            } catch (e) {
                console.warn('VK haptic error:', e);
            }
        }

        /**
         * Получает данные инициализации (аналог initDataUnsafe)
         */
        get initDataUnsafe() {
            return vkInfo ? {
                user: vkInfo
            } : null;
        }

        /**
         * Основное окно (main_window)
         */
        MainWindow = {
            expand: async () => {
                try {
                    await vkBridge.send('VKWebAppResizeWindow', { width: '100%', height: '100%' });
                } catch (e) {
                    console.warn('VK MainWindow expand error:', e);
                }
            }
        };
    }

    const vkWebAppInstance = new VKWebApp();

    /**
     * Получает VK WebApp инстанс
     */
    function getVKWebApp() {
        return vkWebAppInstance;
    }

    /**
     * Получает пользователя VK (аналог getTelegramUser)
     */
    async function getVKUser() {
        await loadVKBridge();
        await getVKUserInfo();
        return vkInfo;
    }

    /**
     * Получает идентичность пользователя (аналог getUserIdentity)
     */
    async function getVKUserIdentity() {
        await loadVKBridge();
        const user = await getVKUser();
        const fallbackId = localStorage.getItem('vk_debug_uid') || ('vk_guest_' + Math.random().toString(36).slice(2, 7));

        return {
            id: user ? user.id : fallbackId,
            name: user ? (user.first_name + (user.last_name ? ' ' + user.last_name : '')) : 'Guest',
            username: user ? `vk${user.id}` : '',
            photo: user ? user.photo : ''
        };
    }

    /**
     * Строит контент для init файла (аналог buildInitFileContent)
     */
    function buildVKInitFileContent(extra = {}) {
        const user = vkInfo;
        const fullName = user
            ? `${user.first_name || ''}${user.last_name ? ` ${user.last_name}` : ''}`.trim()
            : 'Unknown';
        const uname = user ? `vk${user.id}` : '-';
        const userId = user && user.id ? String(user.id) : '-';
        const platform = user && user.platform ? user.platform : '-';
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
            `🆔 VK ID: ${userId}`,
            `📱 Platform: ${platform}`,
            `🕒 Created At (Moscow): ${createdAt}`,
            `📦 Source: VK Mini Apps`
        ].join('\n');
    }

    /**
     * Инициализирует VK адаптер
     */
    async function initVKAdapter() {
        if (isInitialized) return vkWebAppInstance;

        await loadVKBridge();
        await getVKUserInfo();

        // Устанавливаем платформу
        vkWebAppInstance.platform = vkInfo ? vkInfo.platform : 'unknown';

        isInitialized = true;
        return vkWebAppInstance;
    }

    // Экспортируем публичный API
    global.VKMiniApps = {
        init: initVKAdapter,
        loadBridge: loadVKBridge,
        getWebApp: getVKWebApp,
        getUser: getVKUser,
        getIdentity: getVKUserIdentity,
        buildInitFileContent: buildVKInitFileContent,
        WebApp: vkWebAppInstance
    };

    // Авто-инициализация при загрузке
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initVKAdapter);
    } else {
        initVKAdapter();
    }

})(window);
