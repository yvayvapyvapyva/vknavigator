/**
 * Menu Button Module
 * Модуль кнопки меню для загрузки маршрутов
 * Возвращает JSON данные маршрута, а не название
 */

const MenuModule = {
    callback: null,
    isLoaded: false,
    
    // Инициализация
    init(onRouteLoaded) {
        this.callback = onRouteLoaded;
        this.createModal();
        this.createButton();
        this.hide();  // Скрываем модальное окно при инициализации
        this.checkUrlParam();
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
        const routeParam = new URLSearchParams(window.location.search).get('m');
        if (routeParam) {
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
