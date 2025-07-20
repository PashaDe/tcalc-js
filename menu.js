// menu.js
// Блок 4: Полная рабочая логика меню, управления и экспорта (Tilda Zero-блок)
// Включает: обработку UI-кнопок, обновление статистики, экспорт, сохранение/загрузку, меню размеров, все обработчики событий, горячие клавиши и т.д.
// Не включает: логику canvas и плиток.
window.tileCalculator.modules.menu = {
  init: function() {
    // --- Привязка кнопок управления ---
    const self = this;
    // Кнопки управления плиткой
    const fillBtn = document.querySelector('.tcalc-btn-success');
    if (fillBtn) fillBtn.onclick = function() {
      window.tileCalculator.modules.tiles.fillAreaWithTiles();
    };
    const clearTilesBtn = document.querySelector('.tcalc-btn-primary');
    if (clearTilesBtn) clearTilesBtn.onclick = function() {
      const canvas = window.tileCalculator.modules.canvas.canvas;
      if (!canvas) return;
      const tiles = canvas.getObjects().filter(obj => obj.data && obj.data.type === 'tile');
      tiles.forEach(tile => canvas.remove(tile));
      canvas.renderAll();
      self.updateResults();
      self.updateStatistics();
    };
    const clearAllBtn = document.querySelectorAll('.tcalc-btn-secondary')[0];
    if (clearAllBtn) clearAllBtn.onclick = function() {
      const canvas = window.tileCalculator.modules.canvas.canvas;
      if (!canvas) return;
      if (confirm('Вы уверены, что хотите очистить всё?')) {
        canvas.clear();
        canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
        self.updateResults();
        self.updateStatistics();
      }
    };
    // Экспорт (заглушка, если нет PDF)
    const exportBtn = document.querySelectorAll('.tcalc-btn-secondary')[1];
    if (exportBtn) exportBtn.onclick = function() {
      self.exportResults();
    };
    // Сохранить
    const saveBtn = document.querySelectorAll('.tcalc-btn-secondary')[2];
    if (saveBtn) saveBtn.onclick = function() {
      self.saveProject();
    };
    // Загрузить
    const loadBtn = document.querySelectorAll('.tcalc-btn-secondary')[3];
    if (loadBtn) loadBtn.onclick = function() {
      self.loadProject();
    };
    // --- Привязка инструментов ---
    document.querySelectorAll('.tcalc-tool-btn').forEach(btn => {
      btn.onclick = function() {
        const tool = btn.getAttribute('data-tool');
        window.tileCalculator.modules.canvas.selectTool(tool);
      };
    });
    // --- Привязка загрузки плана ---
    const planInput = document.getElementById('tcalc-plan-upload');
    if (planInput) planInput.addEventListener('change', function(e) {
      window.tileCalculator.modules.canvas.loadPlan(e);
    });
    // --- Привязка кнопок зума ---
    const zoomBtns = document.querySelectorAll('.tcalc-zoom-btn');
    if (zoomBtns[0]) zoomBtns[0].onclick = () => window.tileCalculator.modules.canvas.zoomIn();
    if (zoomBtns[1]) zoomBtns[1].onclick = () => window.tileCalculator.modules.canvas.zoomOut();
    if (zoomBtns[2]) zoomBtns[2].onclick = () => window.tileCalculator.modules.canvas.resetZoom();
    // --- Привязка size menu ---
    this.setupEventListeners();
    this.updateResults();
    this.updateStatistics();
    this.initSizeMenuDragging();
    this.setupHotkeys();
    console.log('Модуль меню готов');
  },
  setupEventListeners: function() {
    const self = this;
    document.getElementById('tcalc-zoom-level').onclick = function() { self.enableZoomInput(); };
    document.getElementById('tcalc-size-menu').addEventListener('click', function(e) {
      if (e.target.classList.contains('tcalc-size-menu-close')) self.hideSizeMenu();
      if (e.target.classList.contains('tcalc-size-menu-delete')) self.deleteCurrentBoundary();
    });
    document.getElementById('tcalc-length-input').addEventListener('input', function() { self.updateBoundaryFromInputs(); });
    document.getElementById('tcalc-width-input').addEventListener('input', function() { self.updateBoundaryFromInputs(); });
    document.addEventListener('click', function(e) {
      if (e.button === 2) return;
      const sizeMenu = document.getElementById('tcalc-size-menu');
      if (sizeMenu.style.display === 'block' && !sizeMenu.contains(e.target)) {
        if (e.target.tagName === 'CANVAS') {
          if (!self.currentEditingBoundary) self.hideSizeMenu();
        } else if (!sizeMenu.contains(e.target)) {
          self.hideSizeMenu();
        }
      }
    });
  },
  updateResults: function() {
    // Сбрасываем счетчики
    this.tileCounts = {
      'large': 0,
      'medium': 0,
      'small': 0
    };
    const canvas = window.tileCalculator.modules.canvas.canvas;
    if (!canvas) return;
    // Подсчитываем плитки
    canvas.getObjects().forEach(obj => {
      if (obj.data && obj.data.type === 'tile' && obj.data.tileType) {
        this.tileCounts[obj.data.tileType]++;
      }
    });
    // Обновляем UI
    document.getElementById('tcalc-count-large').textContent = this.tileCounts['large'];
    document.getElementById('tcalc-count-medium').textContent = this.tileCounts['medium'];
    document.getElementById('tcalc-count-small').textContent = this.tileCounts['small'];
    const total = this.tileCounts['large'] + this.tileCounts['medium'] + this.tileCounts['small'];
    document.getElementById('tcalc-total-count').textContent = total;
  },
  updateStatistics: function() {
    const canvas = window.tileCalculator.modules.canvas.canvas;
    if (!canvas) return;
    // Вычисляем площадь участка
    const boundaries = canvas.getObjects().filter(obj => obj.data && obj.data.type === 'boundary');
    let totalArea = 0;
    let totalPerimeter = 0;
    let maxLength = 0;
    let maxWidth = 0;
    boundaries.forEach(boundary => {
      if (boundary.type === 'rect') {
        const currentWidth = boundary.width * (boundary.scaleX || 1);
        const currentHeight = boundary.height * (boundary.scaleY || 1);
        const area = (currentWidth * currentHeight) / 100; // в м² (1px = 100мм = 0.1м)
        const perimeter = 2 * (currentWidth + currentHeight) / 10; // в м
        const length = Math.max(currentWidth, currentHeight) / 10; // в м
        const width = Math.min(currentWidth, currentHeight) / 10; // в м
        totalArea += area;
        totalPerimeter += perimeter;
        maxLength = Math.max(maxLength, length);
        maxWidth = Math.max(maxWidth, width);
      }
    });
    // Покрытие плиткой
    const tiles = canvas.getObjects().filter(obj => obj.data && obj.data.type === 'tile');
    let tilesMinX = Infinity, tilesMaxX = -Infinity, tilesMinY = Infinity, tilesMaxY = -Infinity;
    tiles.forEach(tile => {
      tilesMinX = Math.min(tilesMinX, tile.left);
      tilesMaxX = Math.max(tilesMaxX, tile.left + tile.width);
      tilesMinY = Math.min(tilesMinY, tile.top);
      tilesMaxY = Math.max(tilesMaxY, tile.top + tile.height);
    });
    let coverage = 0;
    if (tiles.length > 0) {
      coverage = ((tilesMaxX - tilesMinX) * (tilesMaxY - tilesMinY)) / 100;
    }
    // Стоимость
    const tileConfig = window.tileCalculator.modules.tiles.tileConfig;
    let cost = 0;
    if (this.tileCounts) {
      cost = this.tileCounts['large'] * tileConfig['large'].price +
             this.tileCounts['medium'] * tileConfig['medium'].price +
             this.tileCounts['small'] * tileConfig['small'].price;
    }
    document.getElementById('tcalc-area').textContent = totalArea.toFixed(2) + ' м²';
    document.getElementById('tcalc-perimeter').textContent = totalPerimeter.toFixed(2) + ' м';
    document.getElementById('tcalc-coverage').textContent = coverage.toFixed(2) + ' м²';
    document.getElementById('tcalc-cost').textContent = cost.toLocaleString('ru-RU') + ' руб.';
  },
  exportResults: function() {
    const results = {
      area: document.getElementById('tcalc-area').textContent,
      perimeter: document.getElementById('tcalc-perimeter').textContent,
      coverage: document.getElementById('tcalc-coverage').textContent,
      cost: document.getElementById('tcalc-cost').textContent,
      tiles: this.tileCounts,
      total: document.getElementById('tcalc-total-count').textContent
    };
    const exportText = `\nРАСЧЕТ ПЛИТКИ \"НОВЫЙ ГОРОД\"\n\nПлощадь участка: ${results.area}\nПериметр: ${results.perimeter}\nПокрытие: ${results.coverage}\nОбщая стоимость: ${results.cost}\n\nКоличество плиток:\n- Большая (330×220): ${results.tiles.large} шт.\n- Средняя (220×220): ${results.tiles.medium} шт.\n- Малая (110×220): ${results.tiles.small} шт.\n\nОбщее количество: ${results.total} шт.\n\nДата расчета: ${new Date().toLocaleDateString()}\n    `;
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'расчет-плитки.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    alert('Результаты экспортированы в файл расчет-плитки.txt');
  },
  saveProject: function() {
    const canvas = window.tileCalculator.modules.canvas.canvas;
    if (!canvas) return;
    const project = {
      background: canvas.backgroundImage ? canvas.backgroundImage.toDataURL() : null,
      objects: canvas.toJSON(),
      tileCounts: this.tileCounts,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('tcalcProject', JSON.stringify(project));
    alert('Проект сохранен!');
  },
  loadProject: function() {
    const canvas = window.tileCalculator.modules.canvas.canvas;
    if (!canvas) return;
    const saved = localStorage.getItem('tcalcProject');
    if (!saved) {
      alert('Сохраненный проект не найден');
      return;
    }
    try {
      const project = JSON.parse(saved);
      canvas.loadFromJSON(project.objects, function() {
        if (project.background) {
          fabric.Image.fromURL(project.background, function(img) {
            canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas));
          });
        }
        canvas.renderAll();
        if (project.tileCounts) {
          window.tileCalculator.modules.menu.tileCounts = project.tileCounts;
          window.tileCalculator.modules.menu.updateResults();
        }
      });
      alert('Проект загружен!');
    } catch (error) {
      alert('Ошибка при загрузке проекта');
      console.error(error);
    }
  },
  applySizeToBoundary: function() {
    const boundary = this.currentEditingBoundary;
    if (!boundary) return;
    const lengthInput = document.getElementById('tcalc-length-input');
    const widthInput = document.getElementById('tcalc-width-input');
    const lengthMeters = parseFloat(lengthInput.value);
    const widthMeters = parseFloat(widthInput.value);
    if (isNaN(lengthMeters) || isNaN(widthMeters) || lengthMeters <= 0 || widthMeters <= 0) {
      alert('Пожалуйста, введите корректные размеры (больше 0)');
      return;
    }
    const lengthPixels = lengthMeters * 10;
    const widthPixels = widthMeters * 10;
    const snapToGrid = window.tileCalculator.modules.canvas.snapToGrid;
    const snappedLength = snapToGrid ? snapToGrid(lengthPixels) : lengthPixels;
    const snappedWidth = snapToGrid ? snapToGrid(widthPixels) : widthPixels;
    boundary.set({
      width: snappedWidth,
      height: snappedLength,
      scaleX: 1,
      scaleY: 1
    });
    const canvas = window.tileCalculator.modules.canvas.canvas;
    if (canvas) canvas.renderAll();
    this.updateStatistics();
    const status = document.getElementById('tcalc-status');
    status.textContent = `Размеры площадки обновлены: ${widthMeters.toFixed(2)}м × ${lengthMeters.toFixed(2)}м`;
  },
  showSizeMenu: function(boundary) {
    if (!boundary || boundary.type !== 'rect') return;
    this.currentEditingBoundary = boundary;
    this.updateSizeMenu(boundary);
    document.getElementById('tcalc-size-menu').style.display = 'block';
  },
  updateSizeMenu: function(boundary) {
    if (!boundary || boundary.type !== 'rect') return;
    const currentWidth = boundary.width * (boundary.scaleX || 1) / 10;
    const currentHeight = boundary.height * (boundary.scaleY || 1) / 10;
    const area = currentWidth * currentHeight;
    const sizeMenu = document.getElementById('tcalc-size-menu');
    if (sizeMenu.style.display === 'block') {
      document.getElementById('tcalc-length-input').value = currentHeight.toFixed(2);
      document.getElementById('tcalc-width-input').value = currentWidth.toFixed(2);
      document.getElementById('tcalc-area-input').value = area.toFixed(2);
    }
  },
  hideSizeMenu: function() {
    document.getElementById('tcalc-size-menu').style.display = 'none';
    this.currentEditingBoundary = null;
    const canvas = window.tileCalculator.modules.canvas.canvas;
    if (canvas) {
      canvas.discardActiveObject();
      canvas.renderAll();
    }
    const status = document.getElementById('tcalc-status');
    const tool = window.tileCalculator.modules.canvas.currentTool;
    if (tool === 'ruler') {
      status.textContent = 'Нарисуйте площадку для заполнения плиткой';
    } else if (tool === 'eraser') {
      status.textContent = 'Кликните на объект для удаления';
    }
  },
  updateBoundaryFromInputs: function() {
    const boundary = this.currentEditingBoundary;
    if (!boundary) return;
    const lengthInput = document.getElementById('tcalc-length-input');
    const widthInput = document.getElementById('tcalc-width-input');
    const areaInput = document.getElementById('tcalc-area-input');
    const lengthMeters = parseFloat(lengthInput.value);
    const widthMeters = parseFloat(widthInput.value);
    if (isNaN(lengthMeters) || isNaN(widthMeters) || lengthMeters <= 0 || widthMeters <= 0) {
      return;
    }
    const area = lengthMeters * widthMeters;
    areaInput.value = area.toFixed(2);
    const lengthPixels = lengthMeters * 10;
    const widthPixels = widthMeters * 10;
    const snapToGrid = window.tileCalculator.modules.canvas.snapToGrid;
    const snappedLength = snapToGrid ? snapToGrid(lengthPixels) : lengthPixels;
    const snappedWidth = snapToGrid ? snapToGrid(widthPixels) : widthPixels;
    boundary.set({
      width: snappedWidth,
      height: snappedLength,
      scaleX: 1,
      scaleY: 1
    });
    const canvas = window.tileCalculator.modules.canvas.canvas;
    if (canvas) canvas.renderAll();
    this.updateStatistics();
  },
  enableZoomInput: function() {
    const canvasModule = window.tileCalculator.modules.canvas;
    const zoomLevelElement = document.getElementById('tcalc-zoom-level');
    if (!zoomLevelElement || zoomLevelElement.classList.contains('tcalc-zoom-input')) return;
    const currentZoomPercent = Math.round(canvasModule.currentZoom * 100);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tcalc-zoom-input';
    input.value = currentZoomPercent;
    input.style.width = zoomLevelElement.offsetWidth + 'px';
    input.placeholder = '100-700';
    zoomLevelElement.parentNode.replaceChild(input, zoomLevelElement);
    input.id = 'tcalc-zoom-level';
    input.focus();
    input.select();
    input.addEventListener('blur', () => { this.applyZoomFromInput(input); });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.applyZoomFromInput(input);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelZoomInput(input);
      }
    });
  },
  applyZoomFromInput: function(input) {
    const canvasModule = window.tileCalculator.modules.canvas;
    const value = parseInt(input.value);
    if (!isNaN(value) && value >= 100 && value <= 700) {
      const newZoom = value / 100;
      canvasModule.currentZoom = newZoom;
      const canvas = canvasModule.canvas;
      canvas.setZoom(canvasModule.currentZoom);
      const vpt = canvas.viewportTransform;
      vpt[4] = 0;
      vpt[5] = 0;
      canvas.setViewportTransform(vpt);
      if (canvasModule.currentZoom > 1) {
        canvasModule.enablePanning();
      } else {
        canvasModule.disablePanning();
      }
      canvas.renderAll();
      this.restoreZoomSpan(input, value + '%');
    } else {
      this.restoreZoomSpan(input, Math.round(canvasModule.currentZoom * 100) + '%');
    }
  },
  cancelZoomInput: function(input) {
    const canvasModule = window.tileCalculator.modules.canvas;
    this.restoreZoomSpan(input, Math.round(canvasModule.currentZoom * 100) + '%');
  },
  restoreZoomSpan: function(input, text) {
    const span = document.createElement('span');
    span.className = 'tcalc-zoom-level';
    span.id = 'tcalc-zoom-level';
    span.textContent = text;
    span.onclick = this.enableZoomInput.bind(this);
    span.title = 'Кликните для ввода масштаба (100-700%)';
    input.parentNode.replaceChild(span, input);
  },
  initSizeMenuDragging: function() {
    const self = this;
    const sizeMenu = document.getElementById('tcalc-size-menu');
    if (!sizeMenu) return;
    sizeMenu.addEventListener('mousedown', function(e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT' || e.target.tagName === 'H4') return;
      e.preventDefault();
      e.stopPropagation();
      self.isSizeMenuDragging = true;
      self.sizeMenuDragStart = { x: e.clientX, y: e.clientY };
      self.sizeMenuOriginalPosition = {
        top: parseInt(sizeMenu.style.top) || 50,
        right: parseInt(sizeMenu.style.right) || 10
      };
      sizeMenu.style.cursor = 'grabbing';
      document.addEventListener('mousemove', self.onSizeMenuMouseMove);
      document.addEventListener('mouseup', self.onSizeMenuMouseUp);
    });
  },
  onSizeMenuMouseMove: function(e) {
    const self = window.tileCalculator.modules.menu;
    if (!self.isSizeMenuDragging || !self.sizeMenuDragStart) return;
    const sizeMenu = document.getElementById('tcalc-size-menu');
    if (!sizeMenu) return;
    const deltaX = e.clientX - self.sizeMenuDragStart.x;
    const deltaY = e.clientY - self.sizeMenuDragStart.y;
    const newRight = self.sizeMenuOriginalPosition.right - deltaX;
    const newTop = self.sizeMenuOriginalPosition.top + deltaY;
    const canvasContainer = document.querySelector('.tcalc-canvas-container');
    const menuRect = sizeMenu.getBoundingClientRect();
    const containerRect = canvasContainer.getBoundingClientRect();
    const maxRight = containerRect.width - menuRect.width - 10;
    const maxTop = containerRect.height - menuRect.height - 10;
    const clampedRight = Math.max(10, Math.min(maxRight, newRight));
    const clampedTop = Math.max(10, Math.min(maxTop, newTop));
    sizeMenu.style.right = clampedRight + 'px';
    sizeMenu.style.top = clampedTop + 'px';
  },
  onSizeMenuMouseUp: function(e) {
    const self = window.tileCalculator.modules.menu;
    const sizeMenu = document.getElementById('tcalc-size-menu');
    if (sizeMenu) sizeMenu.style.cursor = 'move';
    self.isSizeMenuDragging = false;
    self.isSizeMenuResizing = false;
    self.sizeMenuDragStart = null;
    self.sizeMenuOriginalPosition = null;
    self.sizeMenuResizeStart = null;
    self.sizeMenuOriginalSize = null;
    document.removeEventListener('mousemove', self.onSizeMenuMouseMove);
    document.removeEventListener('mousemove', self.onSizeMenuResizeMove);
    document.removeEventListener('mouseup', self.onSizeMenuMouseUp);
  },
  onSizeMenuResizeMove: function(e) {
    const self = window.tileCalculator.modules.menu;
    if (!self.isSizeMenuResizing || !self.sizeMenuResizeStart) return;
    const sizeMenu = document.getElementById('tcalc-size-menu');
    if (!sizeMenu) return;
    const deltaX = e.clientX - self.sizeMenuResizeStart.x;
    const deltaY = e.clientY - self.sizeMenuResizeStart.y;
    const newWidth = self.sizeMenuOriginalSize.width - deltaX;
    const newHeight = self.sizeMenuOriginalSize.height + deltaY;
    const clampedWidth = Math.max(200, Math.min(300, newWidth));
    const clampedHeight = Math.max(180, Math.min(400, newHeight));
    sizeMenu.style.width = clampedWidth + 'px';
    sizeMenu.style.height = clampedHeight + 'px';
  },
  deleteCurrentBoundary: function() {
    const canvas = window.tileCalculator.modules.canvas.canvas;
    const boundary = this.currentEditingBoundary;
    if (!canvas || !boundary) return;
    const tiles = canvas.getObjects().filter(obj => obj.data && obj.data.type === 'tile');
    tiles.forEach(tile => {
      if (window.tileCalculator.modules.tiles.isTileInBoundary(tile, window.tileCalculator.modules.tiles.getBoundaryBounds(boundary))) {
        canvas.remove(tile);
      }
    });
    canvas.remove(boundary);
    this.hideSizeMenu();
    canvas.renderAll();
    this.updateResults();
    this.updateStatistics();
  },
  setupHotkeys: function() {
    const self = this;
    document.addEventListener('keydown', function(e) {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case 'z': e.preventDefault(); break;
          case 's': e.preventDefault(); self.saveProject(); break;
          case 'o': e.preventDefault(); self.loadProject(); break;
        }
      }
      if (e.key === 'Enter' && (e.target.id === 'tcalc-length-input' || e.target.id === 'tcalc-width-input')) {
        self.applySizeToBoundary();
      }
      if (e.key === 'Escape') {
        const canvas = window.tileCalculator.modules.canvas.canvas;
        if (canvas) {
          canvas.discardActiveObject();
          self.hideSizeMenu();
          canvas.renderAll();
        }
      }
    });
  }
};
if (window.tileCalculator && typeof window.tileCalculator.initModule === 'function') {
  window.tileCalculator.initModule('menu');
} 
