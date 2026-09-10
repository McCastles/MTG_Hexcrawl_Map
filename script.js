const grid = document.getElementById('hex-grid');
const svg = document.getElementById('hex-outline-layer');
const colorInput = document.getElementById('hex-color-input');
const selectedHexLabel = document.getElementById('selected-hex-label');

const columns = 16;
const rows = 9;
const rowLetters = Array.from({ length: rows }, (_, index) => String.fromCharCode(65 + index));
const storageKey = 'mtg_hexcrawl_map_hexes';

let hexes = [];
let selectedHexId = 'A1';

function getHexFillColor(color) {
  const trimmedColor = String(color || '#808080').trim();

  if (trimmedColor.startsWith('#') && trimmedColor.length === 7) {
    const hex = trimmedColor.slice(1);
    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  }

  if (trimmedColor.startsWith('rgba(') || trimmedColor.startsWith('rgb(')) {
    return trimmedColor.replace(/rgba?\(([^)]+)\)/i, (_, values) => {
      const parts = values.split(',').map((part) => part.trim());
      const [r, g, b] = parts.slice(0, 3);
      return `rgba(${r}, ${g}, ${b}, 0.5)`;
    });
  }

  return trimmedColor;
}

function buildDefaultHexes() {
  return rowLetters.flatMap((rowLetter) =>
    Array.from({ length: columns }, (_, colIndex) => ({
      id: `${rowLetter}${colIndex + 1}`,
      color: '#808080',
    }))
  );
}

function normalizeHexes(data) {
  const normalized = (Array.isArray(data) ? data : [])
    .map((hex) => ({
      id: String(hex?.id || '').trim().toUpperCase(),
      color: String(hex?.color || '#808080').trim(),
    }))
    .filter((hex) => hex.id);

  const lookup = new Map(normalized.map((hex) => [hex.id, hex]));

  return buildDefaultHexes().map((defaultHex) => lookup.get(defaultHex.id) || defaultHex);
}

function updateSelectedHexDisplay() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId) || hexes[0];

  if (!selectedHex) {
    return;
  }

  selectedHexLabel.textContent = selectedHex.id;
  colorInput.value = selectedHex.color;
}

function createHexButtons() {
  const frame = document.querySelector('.frame');
  const frameWidth = frame.clientWidth;
  const frameHeight = frame.clientHeight;

  const hexWidth = Math.min(frameWidth / 14.75, frameHeight / 9.5);
  const hexHeight = hexWidth * (Math.sqrt(3) / 2);
  const xStep = hexWidth * 0.777;
  const yStep = hexHeight * 0.54;
  const rise = hexHeight * 0.5;

  const originX = 83;
  const originY = 111;

  grid.innerHTML = '';
  svg.innerHTML = '';

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const id = `${rowLetters[row]}${col + 1}`;
      const hex = hexes.find((entry) => entry.id === id) || { id, color: '#808080' };
      const x = originX + col * xStep;
      const y = originY + row * (yStep + hexHeight / 2) - (col % 2 ? rise : 0);

      const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      polygon.setAttribute('class', 'hex-outline');
      polygon.style.fill = getHexFillColor(hex.color);

      const points = [
        [hexWidth * 0.25, 0],
        [hexWidth * 0.75, 0],
        [hexWidth, hexHeight / 2],
        [hexWidth * 0.75, hexHeight],
        [hexWidth * 0.25, hexHeight],
        [0, hexHeight / 2],
      ];

      polygon.setAttribute(
        'points',
        points.map(([px, py]) => `${x + px},${y + py}`).join(' ')
      );

      svg.appendChild(polygon);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'hex-label');
      label.setAttribute('x', `${x + hexWidth / 2}`);
      label.setAttribute('y', `${y + hexHeight / 2}`);
      label.textContent = id;
      svg.appendChild(label);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hex-button';
      button.setAttribute('aria-label', `Hex tile ${id}`);
      button.dataset.hexId = id;
      button.classList.toggle('is-selected', selectedHexId === id);
      button.style.width = `${hexWidth}px`;
      button.style.height = `${hexHeight}px`;
      button.style.left = `${x}px`;
      button.style.top = `${y}px`;
      button.title = `Hex tile ${id}`;

      button.addEventListener('click', (event) => {
        event.preventDefault();
        selectedHexId = id;
        updateSelectedHexDisplay();
        createHexButtons();
      });

      grid.appendChild(button);
    }
  }
}

function saveHexes() {
  localStorage.setItem(storageKey, JSON.stringify(hexes, null, 2));
}

function applySelectedHexColor() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

  if (!selectedHex) {
    return;
  }

  selectedHex.color = colorInput.value;
  saveHexes();
  updateSelectedHexDisplay();
  createHexButtons();
}

async function loadHexes() {
  hexes = buildDefaultHexes();

  try {
    const savedHexes = localStorage.getItem(storageKey);

    if (savedHexes) {
      const parsedSavedHexes = JSON.parse(savedHexes);
      hexes = normalizeHexes(parsedSavedHexes);
    } else {
      const response = await fetch(`hexes.json?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Unable to load hexes.json');
      }

      const jsonHexes = await response.json();
      hexes = normalizeHexes(jsonHexes);
    }
  } catch (error) {
    console.warn('Falling back to generated default hex colors.', error);
  }

  selectedHexId = hexes[0]?.id || 'A1';
  saveHexes();
  updateSelectedHexDisplay();
  createHexButtons();
}

colorInput.addEventListener('input', applySelectedHexColor);
window.addEventListener('resize', createHexButtons);

loadHexes();
