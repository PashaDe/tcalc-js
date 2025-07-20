// tiles.js
// Блок 3: Полная рабочая логика работы с плитками и геометрией (Tilda Zero-блок)
// Включает: fillAreaWithTiles, fillBoundariesGradually, fillBoundaryGradually, createRotatedTile, getBoundaryBounds, isTileInBoundary, isPointInRotatedRectangle, tileConfig, TILE_GRADIENT и всё, что связано с заполнением участка плиткой и геометрией.
// Не включает: логику canvas (инициализация, события мыши, zoom, pan, selectTool, loadPlan), обработчики UI, статистику, экспорт, меню размеров.
window.tileCalculator.modules.tiles = {
  tileConfig: {
    'large': { width: 3.3, height: 2.2, name: 'Большая', price: 250 },
    'medium': { width: 2.2, height: 2.2, name: 'Средняя', price: 200 },
    'small': { width: 1.1, height: 2.2, name: 'Малая', price: 150 }
  },
  TILE_GRADIENT: 'linear-gradient(135deg, #ffffff 0%, #cccccc 100%)',
  init: function() {
    this.canvas = window.tileCalculator.getCanvas();
    console.log('Модуль плиток готов');
  },
  fillAreaWithTiles: function() {
    const canvas = this.canvas;
    const boundaries = canvas.getObjects().filter(obj => obj.data && obj.data.type === 'boundary');
    if (boundaries.length === 0) {
      alert('Сначала нарисуйте площадку!');
      return;
    }
    const btn = document.querySelector('[onclick="fillAreaWithTiles()"]');
    const originalText = btn ? btn.textContent : '';
    if (btn) {
      btn.textContent = 'Заполнение...';
      btn.disabled = true;
    }
    const tiles = canvas.getObjects().filter(obj => obj.data && obj.data.type === 'tile');
    tiles.forEach(tile => canvas.remove(tile));
    this.fillBoundariesGradually(boundaries, 0, btn, originalText);
  },
  fillBoundariesGradually: function(boundaries, index, btn, originalText) {
    const canvas = this.canvas;
    if (index >= boundaries.length) {
      canvas.renderAll();
      if (window.tileCalculator.modules.menu) {
        window.tileCalculator.modules.menu.updateResults();
        window.tileCalculator.modules.menu.updateStatistics();
      }
      if (btn) {
        btn.textContent = originalText;
        btn.disabled = false;
      }
      document.getElementById('tcalc-progress').style.display = 'none';
      return;
    }
    const progress = document.getElementById('tcalc-progress');
    const progressFill = document.getElementById('tcalc-progress-fill');
    const progressText = document.getElementById('tcalc-progress-text');
    progress.style.display = 'block';
    const percent = Math.round((index / boundaries.length) * 100);
    progressFill.style.width = percent + '%';
    progressText.textContent = `Заполнение участка ${index + 1} из ${boundaries.length}...`;
    const boundary = boundaries[index];
    this.fillBoundaryGradually(boundary, 0, () => {
      setTimeout(() => {
        this.fillBoundariesGradually(boundaries, index + 1, btn, originalText);
      }, 50);
    });
  },
  fillBoundaryGradually: function(boundary, tileCount, callback) {
    const canvas = this.canvas;
    let bounds = this.getBoundaryBounds(boundary);
    if (!bounds) { callback(); return; }
    const areaWidth = bounds.right - bounds.left;
    const areaHeight = bounds.bottom - bounds.top;
    if (areaWidth < 1.1 || areaHeight < 2.2) { callback(); return; }
    if (tileCount === 0) {
      boundary.grid = {};
      boundary.tileIndex = 0;
      boundary.horizontalCount = 0;
      boundary.verticalCount = 0;
    }
    const grid = boundary.grid;
    const tileTypes = ['large', 'medium', 'small'];
    let tileIndex = boundary.tileIndex;
    let horizontalCount = boundary.horizontalCount;
    let verticalCount = boundary.verticalCount;
    function isSpaceFree(x, y, width, height) {
      if (bounds.rotated) {
        for (let i = x; i < x + width; i += 0.5) {
          for (let j = y; j < y + height; j += 0.5) {
            if (grid[`${Math.round(i)},${Math.round(j)}`]) return false;
          }
        }
        return true;
      } else {
        for (let i = x; i < x + width; i++) {
          for (let j = y; j < y + height; j++) {
            if (grid[`${i},${j}`]) return false;
          }
        }
        return true;
      }
    }
    function markSpaceOccupied(x, y, width, height) {
      if (bounds.rotated) {
        for (let i = x; i < x + width; i += 0.5) {
          for (let j = y; j < y + height; j += 0.5) {
            grid[`${Math.round(i)},${Math.round(j)}`] = true;
          }
        }
      } else {
        for (let i = x; i < x + width; i++) {
          for (let j = y; j < y + height; j++) {
            grid[`${i},${j}`] = true;
          }
        }
      }
    }
    function findPosition(width, height) {
      if (bounds.rotated) {
        const step = 1.1;
        const angle = bounds.angle * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const gridWidth = bounds.originalWidth;
        const gridHeight = bounds.originalHeight;
        for (let gridY = 0; gridY <= gridHeight - height; gridY += step) {
          for (let gridX = 0; gridX <= gridWidth - width; gridX += step) {
            const worldX = bounds.center.x + (gridX - gridWidth/2 + width/2) * cos - (gridY - gridHeight/2 + height/2) * sin;
            const worldY = bounds.center.y + (gridX - gridWidth/2 + width/2) * sin + (gridY - gridHeight/2 + height/2) * cos;
            const tileCenter = { x: worldX, y: worldY };
            if (window.tileCalculator.modules.tiles.isPointInRotatedRectangle(tileCenter, bounds) && isSpaceFree(worldX - width/2, worldY - height/2, width, height)) {
              return { x: worldX - width/2, y: worldY - height/2 };
            }
          }
        }
      } else {
        for (let y = bounds.top; y <= bounds.bottom - height; y++) {
          for (let x = bounds.left; x <= bounds.right - width; x++) {
            if (isSpaceFree(x, y, width, height)) {
              return { x, y };
            }
          }
        }
      }
      return null;
    }
    const tilesPerBatch = 5;
    let placedTiles = 0;
    let attempts = 0;
    const maxAttempts = 100;
    while (placedTiles < tilesPerBatch && attempts < maxAttempts) {
      attempts++;
      let tileType;
      if (tileIndex % 4 === 0) {
        tileType = 'large';
      } else if (tileIndex % 4 === 1) {
        tileType = 'medium';
      } else {
        tileType = 'small';
      }
      const config = this.tileConfig[tileType];
      let isVertical = false;
      const areaWidth = bounds.right - bounds.left;
      const areaHeight = bounds.bottom - bounds.top;
      if (areaHeight > areaWidth) isVertical = true;
      let finalWidth = config.width;
      let finalHeight = config.height;
      if (isVertical) [finalWidth, finalHeight] = [finalHeight, finalWidth];
      let position = findPosition(finalWidth, finalHeight);
      if (position) {
        let tile;
        if (bounds.rotated) {
          tile = this.createRotatedTile(position, finalWidth, finalHeight, tileType, bounds);
        } else {
          const gradient = new fabric.Gradient({
            type: 'linear',
            coords: { x1: 0, y1: 0, x2: finalWidth, y2: finalHeight },
            colorStops: [
              { offset: 0, color: '#ffffff' },
              { offset: 1, color: '#cccccc' }
            ]
          });
          tile = new fabric.Rect({
            left: position.x,
            top: position.y,
            width: finalWidth,
            height: finalHeight,
            fill: gradient,
            stroke: '#d2b48c',
            strokeWidth: 0.05,
            selectable: false,
            data: { type: 'tile', tileType: tileType, orientation: isVertical ? 'vertical' : 'horizontal' }
          });
        }
        canvas.add(tile);
        markSpaceOccupied(position.x, position.y, finalWidth, finalHeight);
        placedTiles++;
        tileIndex++;
      } else {
        tileIndex++;
      }
    }
    boundary.tileIndex = tileIndex;
    boundary.horizontalCount = horizontalCount;
    boundary.verticalCount = verticalCount;
    canvas.renderAll();
    if (window.tileCalculator.modules.menu) window.tileCalculator.modules.menu.updateResults();
    if (placedTiles > 0 && tileIndex < 1000) {
      setTimeout(() => {
        this.fillBoundaryGradually(boundary, tileCount + placedTiles, callback);
      }, 10);
    } else {
      fillRemainingArea();
      callback();
    }
    function fillRemainingArea() {
      if (bounds.rotated) {
        const step = 1.1;
        const angle = bounds.angle * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const gridWidth = bounds.originalWidth;
        const gridHeight = bounds.originalHeight;
        for (let gridY = 0; gridY <= gridHeight - step; gridY += step) {
          for (let gridX = 0; gridX <= gridWidth - step; gridX += step) {
            const worldX = bounds.center.x + (gridX - gridWidth/2 + step/2) * cos - (gridY - gridHeight/2 + step/2) * sin;
            const worldY = bounds.center.y + (gridX - gridWidth/2 + step/2) * sin + (gridY - gridHeight/2 + step/2) * cos;
            const tileCenter = { x: worldX, y: worldY };
            let isOccupied = false;
            canvas.getObjects().forEach(obj => {
              if (obj.data && obj.data.type === 'tile') {
                if (worldX - step/2 < obj.left + obj.width && worldX + step/2 > obj.left && worldY - step/2 < obj.top + obj.height && worldY + step/2 > obj.top) {
                  isOccupied = true;
                }
              }
            });
            if (!isOccupied) {
              const tile = window.tileCalculator.modules.tiles.createRotatedTile({ x: worldX - step/2, y: worldY - step/2 }, step, step, 'small', bounds);
              canvas.add(tile);
            }
          }
        }
      } else {
        const areaWidth = bounds.right - bounds.left;
        const areaHeight = bounds.bottom - bounds.top;
        const totalArea = areaWidth * areaHeight;
        let filledArea = 0;
        canvas.getObjects().forEach(obj => {
          if (obj.data && obj.data.type === 'tile' && obj.left >= bounds.left && obj.top >= bounds.top && obj.left + obj.width <= bounds.right && obj.top + obj.height <= bounds.bottom) {
            filledArea += obj.width * obj.height;
          }
        });
        const targetFillArea = totalArea * 0.9;
        if (filledArea < targetFillArea) {
          for (let y = bounds.top; y <= bounds.bottom - 1.1; y += 1.1) {
            for (let x = bounds.left; x <= bounds.right - 1.1; x += 1.1) {
              let isOccupied = false;
              canvas.getObjects().forEach(obj => {
                if (obj.data && obj.data.type === 'tile') {
                  if (x < obj.left + obj.width && x + 1.1 > obj.left && y < obj.top + obj.height && y + 1.1 > obj.top) {
                    isOccupied = true;
                  }
                }
              });
              if (!isOccupied) {
                const gradient = new fabric.Gradient({
                  type: 'linear',
                  coords: { x1: 0, y1: 0, x2: 1.1, y2: 1.1 },
                  colorStops: [
                    { offset: 0, color: '#ffffff' },
                    { offset: 1, color: '#cccccc' }
                  ]
                });
                const tile = new fabric.Rect({
                  left: x,
                  top: y,
                  width: 1.1,
                  height: 1.1,
                  fill: gradient,
                  stroke: '#d2b48c',
                  strokeWidth: 0.05,
                  selectable: false,
                  data: { type: 'tile', tileType: 'small', orientation: 'square' }
                });
                canvas.add(tile);
              }
            }
          }
        }
      }
    }
  },
  createRotatedTile: function(position, width, height, tileType, bounds) {
    const gradient = new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2: width, y2: height },
      colorStops: [
        { offset: 0, color: '#ffffff' },
        { offset: 1, color: '#cccccc' }
      ]
    });
    return new fabric.Rect({
      left: position.x,
      top: position.y,
      width: width,
      height: height,
      fill: gradient,
      stroke: '#d2b48c',
      strokeWidth: 0.05,
      selectable: false,
      angle: bounds.angle,
      data: { type: 'tile', tileType: tileType, orientation: 'rotated' }
    });
  },
  getBoundaryBounds: function(boundary) {
    if (boundary.type === 'rect') {
      const currentWidth = boundary.width * (boundary.scaleX || 1);
      const currentHeight = boundary.height * (boundary.scaleY || 1);
      if (boundary.angle && Math.abs(boundary.angle) > 0.1) {
        const center = boundary.getCenterPoint();
        const angle = boundary.angle * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const halfWidth = currentWidth / 2;
        const halfHeight = currentHeight / 2;
        const corners = [
          { x: -halfWidth, y: -halfHeight },
          { x: halfWidth, y: -halfHeight },
          { x: halfWidth, y: halfHeight },
          { x: -halfWidth, y: halfHeight }
        ];
        const rotatedCorners = corners.map(corner => ({
          x: center.x + corner.x * cos - corner.y * sin,
          y: center.y + corner.x * sin + corner.y * cos
        }));
        const xs = rotatedCorners.map(c => c.x);
        const ys = rotatedCorners.map(c => c.y);
        return {
          left: Math.min(...xs),
          top: Math.min(...ys),
          right: Math.max(...xs),
          bottom: Math.max(...ys),
          rotated: true,
          angle: boundary.angle,
          center: center,
          corners: rotatedCorners,
          originalWidth: currentWidth,
          originalHeight: currentHeight
        };
      } else {
        return {
          left: boundary.left,
          top: boundary.top,
          right: boundary.left + currentWidth,
          bottom: boundary.top + currentHeight,
          rotated: false
        };
      }
    }
    return null;
  },
  isTileInBoundary: function(tile, boundaryBounds) {
    if (!boundaryBounds) return false;
    if (!boundaryBounds.rotated) {
      const tileLeft = tile.left;
      const tileTop = tile.top;
      const tileRight = tile.left + tile.width;
      const tileBottom = tile.top + tile.height;
      return tileLeft >= boundaryBounds.left && 
             tileTop >= boundaryBounds.top && 
             tileRight <= boundaryBounds.right && 
             tileBottom <= boundaryBounds.bottom;
    } else {
      const tileCenter = {
        x: tile.left + tile.width / 2,
        y: tile.top + tile.height / 2
      };
      return window.tileCalculator.modules.tiles.isPointInRotatedRectangle(tileCenter, boundaryBounds);
    }
  },
  isPointInRotatedRectangle: function(point, bounds) {
    if (!bounds.rotated || !bounds.center) return false;
    const angle = -bounds.angle * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - bounds.center.x;
    const dy = point.y - bounds.center.y;
    const rotatedX = dx * cos - dy * sin;
    const rotatedY = dx * sin + dy * cos;
    const halfWidth = bounds.originalWidth / 2;
    const halfHeight = bounds.originalHeight / 2;
    return Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
  }
};
if (window.tileCalculator && typeof window.tileCalculator.initModule === 'function') {
  window.tileCalculator.initModule('tiles');
} 
