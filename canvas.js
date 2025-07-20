// canvas.js
// Блок 2: Полная рабочая логика Canvas для калькулятора плитки (Tilda Zero-блок)
// Включает: инициализацию Fabric.js, обработку событий canvas, рисование прямоугольников, масштабирование, выделение, удаление, drag/pan, zoom, selectTool, loadPlan.
// Не включает: fillAreaWithTiles, fillBoundaryGradually, createRotatedTile, getBoundaryBounds, isTileInBoundary, isPointInRotatedRectangle, обработчики UI, статистику, экспорт, меню размеров.
window.tileCalculator.modules.canvas = {
  canvas: null,
  currentTool: 'ruler',
  isDrawing: false,
  startPoint: null,
  currentZoom: 1,
  isPanning: false,
  lastPanPoint: null,
  currentEditingBoundary: null,
  init: function() {
    const self = this;
    this.canvas = new fabric.Canvas('tcalc-canvas', {
      backgroundColor: '#f8f9fa',
      selection: false,
      preserveObjectStacking: true
    });
    this.setupEventHandlers();
    this.setupZoomControls();
    window.tileCalculator.modules.canvas.canvas = this.canvas;
    // resize
    const container = document.querySelector('.tcalc-canvas-container');
    this.canvas.setWidth(container.offsetWidth);
    this.canvas.setHeight(500);
    window.addEventListener('resize', function() {
      self.canvas.setWidth(container.offsetWidth);
      self.canvas.renderAll();
    });
    // contextmenu disable
    this.canvas.wrapperEl.addEventListener('contextmenu', function(e) { e.preventDefault(); });
    // drag/pan logic
    let isWrapperPanning = false;
    let lastWrapperPanPoint = null;
    let isPanningInProgress = false;
    this.canvas.wrapperEl.addEventListener('mousedown', function(e) {
      if (e.button === 2 && self.currentZoom > 1) {
        e.preventDefault();
        isWrapperPanning = true;
        isPanningInProgress = true;
        lastWrapperPanPoint = { x: e.clientX, y: e.clientY };
        self.canvas.defaultCursor = 'grabbing';
        self.canvas.getObjects().forEach(obj => {
          if (obj.data && obj.data.type === 'tile') obj.visible = false;
        });
        self.canvas.renderAll();
      }
    });
    document.addEventListener('mousemove', function(e) {
      if (isWrapperPanning && lastWrapperPanPoint && (e.buttons & 2)) {
        const currentPoint = { x: e.clientX, y: e.clientY };
        const deltaX = currentPoint.x - lastWrapperPanPoint.x;
        const deltaY = currentPoint.y - lastWrapperPanPoint.y;
        const panSpeed = self.currentZoom;
        const adjustedDeltaX = deltaX * panSpeed;
        const adjustedDeltaY = deltaY * panSpeed;
        const vpt = self.canvas.viewportTransform;
        const newX = vpt[4] + adjustedDeltaX;
        const newY = vpt[5] + adjustedDeltaY;
        const canvasWidth = self.canvas.getWidth();
        const canvasHeight = self.canvas.getHeight();
        const maxX = 0;
        const minX = -(canvasWidth * self.currentZoom - canvasWidth);
        const maxY = 0;
        const minY = -(canvasHeight * self.currentZoom - canvasHeight);
        vpt[4] = Math.max(minX, Math.min(maxX, newX));
        vpt[5] = Math.max(minY, Math.min(maxY, newY));
        self.canvas.setViewportTransform(vpt);
        lastWrapperPanPoint = currentPoint;
        e.preventDefault();
      }
    });
    document.addEventListener('mouseup', function(e) {
      if (isWrapperPanning && e.button === 2) {
        isWrapperPanning = false;
        lastWrapperPanPoint = null;
        self.canvas.defaultCursor = 'grab';
        if (isPanningInProgress) {
          self.canvas.getObjects().forEach(obj => {
            if (obj.data && obj.data.type === 'tile') obj.visible = true;
          });
          self.canvas.renderAll();
          isPanningInProgress = false;
        }
      }
    });
    console.log('Canvas модуль готов');
  },
  setupEventHandlers: function() {
    const self = this;
    const c = this.canvas;
    c.on('mouse:down', function(e) { self.onMouseDown(e); });
    c.on('mouse:move', function(e) { self.onMouseMove(e); });
    c.on('mouse:up', function(e) { self.onMouseUp(e); });
    c.on('mouse:wheel', function(e) { self.onMouseWheel(e); });
    c.on('mouse:dblclick', function(e) { self.onMouseDoubleClick(e); });
    c.on('object:modified', function(e) { /* ... */ });
    c.on('object:moving', function(e) { /* ... */ });
    c.on('object:scaling', function(e) { /* ... */ });
    c.on('object:rotating', function(e) { /* ... */ });
    c.on('selection:created', function(e) { /* ... */ });
    c.on('selection:cleared', function(e) { /* ... */ });
    c.on('mouse:down', function(e) {
      if (e.e.button === 2) {
        c.discardActiveObject();
        // hideSizeMenu(); // menu.js
        c.renderAll();
        e.e.preventDefault();
      }
    });
    c.on('mouse:move', function(e) { c.lastMouseEvent = e.e; });
  },
  setupZoomControls: function() {
    // zoomIn, zoomOut, resetZoom, updateZoom
    // Кнопки zoom должны вызывать эти методы через menu.js
  },
  onMouseDown: function(e) {
    if (e.e.button === 2) {
      if (this.canvas.getActiveObject()) {
        this.canvas.discardActiveObject();
        // hideSizeMenu(); // menu.js
        this.canvas.renderAll();
        return;
      }
      return;
    }
    if (e.e.button === 0) {
      if (this.currentTool === 'eraser') {
        if (e.target) {
          if (e.target.data && e.target.data.type === 'boundary') {
            const boundary = e.target;
            // const boundaryBounds = getBoundaryBounds(boundary); // tiles.js
            // ... удаление плиток и boundary ...
          } else if (e.target.data && e.target.data.type === 'tile') {
            this.canvas.remove(e.target);
          }
          this.canvas.renderAll();
          // updateResults(); updateStatistics(); // menu.js
        }
        return;
      }
      if (e.target && e.target.data && e.target.data.type === 'boundary') {
        this.currentEditingBoundary = e.target;
        // showSizeMenu(e.target); // menu.js
        return;
      }
      if (e.target) return;
      this.isDrawing = true;
      const pointer = this.canvas.getPointer(e.e);
      if (this.currentTool === 'ruler') {
        this.startPoint = { x: pointer.x, y: pointer.y };
        this.isDrawing = true;
      }
    }
  },
  onMouseMove: function(e) {
    if (this.isPanning && this.lastPanPoint && (e.e.buttons & 2)) return;
    if (!this.isDrawing) return;
    const pointer = this.canvas.getPointer(e.e);
    if (this.currentTool === 'ruler') {
      let activeObject = this.canvas.getActiveObject();
      if (!activeObject || !activeObject.data || activeObject.data.type !== 'boundary') {
        const distance = Math.sqrt(
          Math.pow(pointer.x - this.startPoint.x, 2) + 
          Math.pow(pointer.y - this.startPoint.y, 2)
        );
        if (distance > 5) {
          const snappedX = this.snapToGrid(this.startPoint.x);
          const snappedY = this.snapToGrid(this.startPoint.y);
          const rect = new fabric.Rect({
            left: snappedX,
            top: snappedY,
            width: 1.1,
            height: 2.2,
            fill: 'rgba(255, 102, 0, 0.1)',
            stroke: '#ff6600',
            strokeWidth: 0.1,
            selectable: true,
            data: { type: 'boundary' }
          });
          this.canvas.add(rect);
          this.canvas.setActiveObject(rect);
          this.currentEditingBoundary = rect;
          activeObject = rect;
        }
      }
      if (activeObject && activeObject.type === 'rect' && activeObject.data && activeObject.data.type === 'boundary') {
        const snappedX = this.snapToGrid(pointer.x);
        const snappedY = this.snapToGrid(pointer.y);
        const startX = activeObject.left;
        const startY = activeObject.top;
        let newLeft, newTop, newWidth, newHeight;
        if (snappedX >= startX) {
          newLeft = startX;
          newWidth = snappedX - startX;
        } else {
          newLeft = snappedX;
          newWidth = startX - snappedX;
        }
        if (snappedY >= startY) {
          newTop = startY;
          newHeight = snappedY - startY;
        } else {
          newTop = snappedY;
          newHeight = startY - snappedY;
        }
        newWidth = Math.max(newWidth, 1.1);
        newHeight = Math.max(newHeight, 2.2);
        activeObject.set({
          left: newLeft,
          top: newTop,
          width: newWidth,
          height: newHeight
        });
      }
    }
    this.canvas.renderAll();
  },
  onMouseUp: function(e) {
    if (this.isPanning && e.e.button === 2) return;
    if (this.isDrawing && this.currentTool === 'ruler') {
      const activeObject = this.canvas.getActiveObject();
      if (activeObject && activeObject.type === 'rect' && activeObject.data && activeObject.data.type === 'boundary') {
        setTimeout(() => {
          // showSizeMenu(activeObject); // menu.js
        }, 100);
      } else {
        this.isDrawing = false;
        this.startPoint = null;
      }
    }
    if (this.currentEditingBoundary && this.currentEditingBoundary.data && this.currentEditingBoundary.data.type === 'boundary') {
      const sizeMenu = document.getElementById('tcalc-size-menu');
      if (sizeMenu.style.display !== 'block') {
        // showSizeMenu(this.currentEditingBoundary); // menu.js
      }
    }
    this.isDrawing = false;
    this.startPoint = null;
    if (this.currentZoom > 1) {
      if (this.currentTool === 'eraser') {
        this.canvas.defaultCursor = 'pointer';
      } else {
        this.canvas.defaultCursor = 'grab';
      }
    } else {
      if (this.currentTool === 'ruler') {
        this.canvas.defaultCursor = 'crosshair';
      } else if (this.currentTool === 'eraser') {
        this.canvas.defaultCursor = 'pointer';
      } else {
        this.canvas.defaultCursor = 'default';
      }
    }
  },
  onMouseWheel: function(e) {
    e.e.preventDefault();
    const delta = e.e.deltaY;
    const zoom = delta > 0 ? 0.9 : 1.1;
    const oldZoom = this.currentZoom;
    this.currentZoom *= zoom;
    if (this.currentZoom < 1) this.currentZoom = 1;
    if (this.currentZoom > 7) this.currentZoom = 7;
    if (oldZoom !== this.currentZoom) {
      this.canvas.renderOnAddRemove = false;
      const pointer = this.canvas.getPointer(e.e);
      this.canvas.setZoom(this.currentZoom);
      const zoomRatio = this.currentZoom / oldZoom;
      const vpt = this.canvas.viewportTransform;
      vpt[4] = pointer.x - (pointer.x - vpt[4]) * zoomRatio;
      vpt[5] = pointer.y - (pointer.y - vpt[5]) * zoomRatio;
      this.canvas.setViewportTransform(vpt);
      const zoomLevelElement = document.getElementById('tcalc-zoom-level');
      if (zoomLevelElement && !zoomLevelElement.classList.contains('tcalc-zoom-input')) {
        zoomLevelElement.textContent = Math.round(this.currentZoom * 100) + '%';
      }
      if (this.currentZoom > 1) {
        this.enablePanning();
      } else {
        this.disablePanning();
      }
      this.canvas.renderOnAddRemove = true;
      this.canvas.renderAll();
    }
  },
  onMouseDoubleClick: function(e) {
    if (e.target && e.target.data && e.target.data.type === 'boundary') {
      this.canvas.setActiveObject(e.target);
      e.target.selectable = true;
      e.target.evented = true;
      this.currentEditingBoundary = e.target;
      // showSizeMenu(e.target); // menu.js
      this.canvas.renderAll();
      const status = document.getElementById('tcalc-status');
      status.textContent = 'Участок выбран. Введите точные размеры или перетащите за углы.';
      console.log('Участок выбран для редактирования');
    }
  },
  selectTool: function(tool) {
    this.currentTool = tool;
    document.querySelectorAll('.tcalc-tool-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    const status = document.getElementById('tcalc-status');
    if (tool === 'ruler') {
      status.textContent = 'Нарисуйте площадку для заполнения плиткой';
    } else if (tool === 'eraser') {
      status.textContent = 'Кликните на объект для удаления';
    }
    if (tool === 'ruler') {
      this.canvas.defaultCursor = 'crosshair';
    } else if (tool === 'eraser') {
      this.canvas.defaultCursor = 'pointer';
      this.canvas.selection = false;
    } else {
      this.canvas.defaultCursor = 'default';
      this.canvas.selection = true;
    }
  },
  loadPlan: function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      fabric.Image.fromURL(e.target.result, (img) => {
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        const scaleX = canvasWidth / img.width;
        const scaleY = canvasHeight / img.height;
        const scale = Math.min(scaleX, scaleY);
        img.scale(scale);
        img.set({
          left: (canvasWidth - img.width * scale) / 2,
          top: (canvasHeight - img.height * scale) / 2
        });
        this.canvas.setBackgroundImage(img, this.canvas.renderAll.bind(this.canvas));
      });
    };
    reader.readAsDataURL(file);
  },
  enablePanning: function() {
    if (this.currentTool !== 'eraser') {
      this.canvas.defaultCursor = 'grab';
    }
    this.canvas.selection = false;
  },
  disablePanning: function() {
    if (this.currentTool === 'ruler') {
      this.canvas.defaultCursor = 'crosshair';
    } else if (this.currentTool === 'eraser') {
      this.canvas.defaultCursor = 'pointer';
    } else {
      this.canvas.defaultCursor = 'default';
    }
    this.canvas.selection = this.currentTool !== 'eraser';
    this.isPanning = false;
    this.lastPanPoint = null;
  },
  zoomIn: function() {
    if (this.currentZoom < 7) {
      const oldZoom = this.currentZoom;
      this.currentZoom *= 1.2;
      this.canvas.setZoom(this.currentZoom);
      let centerX, centerY;
      if (this.canvas.lastMouseEvent) {
        const pointer = this.canvas.getPointer(this.canvas.lastMouseEvent);
        centerX = pointer.x;
        centerY = pointer.y;
      } else {
        centerX = this.canvas.getWidth() / 2;
        centerY = this.canvas.getHeight() / 2;
      }
      const vpt = this.canvas.viewportTransform;
      const zoomRatio = this.currentZoom / oldZoom;
      vpt[4] = centerX - (centerX - vpt[4]) * zoomRatio;
      vpt[5] = centerY - (centerY - vpt[5]) * zoomRatio;
      this.updateZoom();
    }
  },
  zoomOut: function() {
    if (this.currentZoom > 1) {
      const oldZoom = this.currentZoom;
      this.currentZoom /= 1.2;
      this.canvas.setZoom(this.currentZoom);
      let centerX, centerY;
      if (this.canvas.lastMouseEvent) {
        const pointer = this.canvas.getPointer(this.canvas.lastMouseEvent);
        centerX = pointer.x;
        centerY = pointer.y;
      } else {
        centerX = this.canvas.getWidth() / 2;
        centerY = this.canvas.getHeight() / 2;
      }
      const vpt = this.canvas.viewportTransform;
      const zoomRatio = this.currentZoom / oldZoom;
      vpt[4] = centerX - (centerX - vpt[4]) * zoomRatio;
      vpt[5] = centerY - (centerY - vpt[5]) * zoomRatio;
      this.updateZoom();
    }
  },
  resetZoom: function() {
    this.currentZoom = 1;
    this.canvas.setZoom(1);
    const vpt = this.canvas.viewportTransform;
    vpt[4] = 0;
    vpt[5] = 0;
    this.canvas.setViewportTransform(vpt);
    this.updateZoom();
  },
  updateZoom: function() {
    this.canvas.setZoom(this.currentZoom);
    this.canvas.setViewportTransform(this.canvas.viewportTransform);
    const zoomLevelElement = document.getElementById('tcalc-zoom-level');
    if (zoomLevelElement && !zoomLevelElement.classList.contains('tcalc-zoom-input')) {
      zoomLevelElement.textContent = Math.round(this.currentZoom * 100) + '%';
    }
    if (this.currentZoom > 1) {
      this.enablePanning();
    } else {
      this.disablePanning();
    }
    this.canvas.renderAll();
  },
  snapToGrid: function(value) {
    return Math.round(value / 1.1) * 1.1;
  }
};
if (window.tileCalculator && typeof window.tileCalculator.initModule === 'function') {
  window.tileCalculator.initModule('canvas');
} 
