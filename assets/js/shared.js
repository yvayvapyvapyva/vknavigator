/**
 * VK Navigator - Shared Utilities
 * Базовые утилиты для навигатора
 */

(function (global) {
  const byId = (id) => document.getElementById(id);
  const round6 = (n) => Math.round(n * 1e6) / 1e6;

  global.AppShared = {
    byId,
    round6
  };
})(window);
