/**
 * Menu Button Module
 * Модуль кнопки меню для загрузки маршрутов
 * Возвращает JSON данные маршрута, а не название
 */

const MenuModule = {
    callback: null,
    isLoaded: false,

    /**
     * Универсальное получение параметров URL
     * Поддерживает: query string, hash, VK Mini Apps форматы
     */
    getUrlParam(name) {
        // 1. Проверка query string: ?m=value
        const urlParams = new URLSearchParams(window.location.search);
        let value = urlParams.get(name);
        if (value) return value;

        // 2. Проверка hash: #m=value или #/route?m=value
        const hash = window.location.hash.slice(1);
        if (hash) {
            // Формат: #m=value
            const hashParams = new URLSearchParams(hash);
            value = hashParams.get(name);
            if (value) return value;

            // Формат: #/path?m=value (SPA роутинг)
            const hashQueryIndex = hash.indexOf('?');
            if (hashQueryIndex > -1) {
                const hashQuery = hash.substring(hashQueryIndex + 1);
                const hashQueryParams = new URLSearchParams(hashQuery);
                value = hashQueryParams.get(name);
                if (value) return value;
            }

            // Формат: #m=value&other=... (прямой hash без slash)
            if (!hash.startsWith('/')) {
                const simpleHashParams = new URLSearchParams(hash);
                value = simpleHashParams.get(name);
                if (value) return value;
            }
        }

        // 3. Проверка VK Bridge initial data
        if (typeof vkBridge !== 'undefined' && vkBridge.VKWebAppInitData) {
            const vkData = vkBridge.VKWebAppInitData;
            if (vkData && vkData.params) {
                value = vkData.params[name];
                if (value) return value;
            }
        }

        return null;
    },

    // Инициализация
    init(onRouteLoaded) {
        this.callback = onRouteLoaded;
        this.createModal();
        this.createButton();
        this.hide();

        // Проверяем параметры сразу и при получении данных от VK Bridge
        this.checkUrlParam();

        // Подписка на события VK Bridge для параметров запуска
        if (typeof vkBridge !== 'undefined') {
            vkBridge.subscribe((event) => {
                console.log('[MenuModule] VK Bridge event:', event);
                if (event && event.type === 'VKWebAppUpdateConfig' || event.detail) {
                    this.checkUrlParam();
                }
            });

            // Пробуем получить параметры из launchParams
            try {
                vkBridge.send('VKWebAppGetLaunchParams')
                    .then(params => {
                        console.log('[MenuModule] Launch params:', params);
                        if (params && params.m) {
                            this.isLoaded = true;
                            this.hide();
                            this.loadRouteByName(params.m);
                        }
                    })
                    .catch(e => console.log('[MenuModule] GetLaunchParams error:', e));
            } catch (e) {
                console.log('[MenuModule] VK Bridge not available:', e);
            }
        }
    },
    
    // Создание модального окна
    createModal() {
        const html = `
            <div id="jsonModal">
                <div class="modal-sheet">
                    <div class="modal-title">Введите название маршрута</div>
                    <input type="text" id="routeNameInput" class="modal-input" placeholder="">
                    <div class="modal-buttons">
                        <button id="cancelBtn" class="modal-btn modal-btn-muted">Отмена</button>
                        <button id="loadRouteBtn" class="modal-btn modal-btn-green">Загрузить</button>
                    </div>
                </div>
            </div>
        `;
        
        const loading = document.getElementById('loading');
        if (loading) {
            loading.insertAdjacentHTML('afterend', html);
        } else {
            document.body.insertAdjacentHTML('afterbegin', html);
        }
        
        // Обработчик загрузки
        document.getElementById('loadRouteBtn').addEventListener('click', () => {
            const routeName = document.getElementById('routeNameInput').value.trim();
            if (!routeName) {
                if (typeof showToast === 'function') {
                    showToast('Введите название маршрута', 'error');
                }
                return;
            }
            this.loadRouteByName(routeName);
        });
        
        // Обработчик отмены
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hide();
        });
        
        // Обработчик Enter
        document.getElementById('routeNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('loadRouteBtn').click();
            }
        });
    },
    
    // Создание кнопки меню
    createButton() {
        const html = `
            <button id="menuBtn" class="circle-btn">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor"/>
                </svg>
                <span>Меню</span>
            </button>
        `;
        
        const loading = document.getElementById('loading');
        if (loading) {
            loading.insertAdjacentHTML('afterend', html);
        } else {
            document.body.insertAdjacentHTML('afterbegin', html);
        }
        
        // Обработчик клика
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.show();
            document.getElementById('routeNameInput').value = '';
            document.getElementById('routeNameInput').focus();
        });
    },
    
    // Проверка URL параметра
    checkUrlParam() {
        // Используем универсальную функцию для получения параметра
        const routeParam = this.getUrlParam('m');
        
        console.log('[MenuModule] Проверка URL параметра m:', routeParam);
        
        if (routeParam) {
            console.log('[MenuModule] Найден параметр маршрута:', routeParam);
            this.isLoaded = true;
            this.hide();
            this.loadRouteByName(routeParam);
        }
    },
    
    // Загрузка маршрута по названию (внутренний метод)
    async loadRouteByName(routeName) {
        try {
            const url = `https://functions.yandexcloud.net/d4ekerqua63o9npij6ro?m=${encodeURIComponent(routeName)}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            
            // Возвращаем JSON данные в навигатор
            this.loadRoute(data);
        } catch (e) {
            console.error('Ошибка загрузки маршрута:', e);
            if (typeof showToast === 'function') {
                showToast('Ошибка загрузки: ' + e.message, 'error', 4000);
            }
        }
    },
    
    // Загрузка маршрута (публичный метод, передаёт JSON в навигатор)
    loadRoute(jsonData) {
        // Очищаем предыдущий маршрут
        if (typeof clearRoute === 'function') {
            clearRoute();
        }
        
        // Передаём JSON данные в навигатор
        if (typeof this.callback === 'function') {
            this.callback(jsonData);
        }
        this.isLoaded = true;
        this.hide();
    },
    
    // Публичный метод для загрузки JSON напрямую (для будущих источников)
    loadFromJSON(jsonData) {
        this.loadRoute(jsonData);
    },
    
    // Скрыть модальное окно
    hide() {
        const modal = document.getElementById('jsonModal');
        if (modal) modal.classList.add('hidden');
    },
    
    // Показать модальное окно
    show() {
        const modal = document.getElementById('jsonModal');
        if (modal) modal.classList.remove('hidden');
    }
};
