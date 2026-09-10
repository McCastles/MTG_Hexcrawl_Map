const grid = document.getElementById('hex-grid');
const svg = document.getElementById('hex-outline-layer');
const colorInput = document.getElementById('hex-color-input');
const textInput = document.getElementById('hex-text-input');
const textInput2 = document.getElementById('hex-text-input-2');
const themeToggle = document.getElementById('theme-toggle');
const selectedHexLabel = document.getElementById('selected-hex-label');
const manaCheckboxes = Array.from(document.querySelectorAll('.mana-checkbox-input'));
const manaOptionIcons = Array.from(document.querySelectorAll('.mana-icon-option'));

const columns = 16;
const rows = 9;
const rowLetters = Array.from({ length: rows }, (_, index) => String.fromCharCode(65 + index));
const storageKey = 'mtg_hexcrawl_map_hexes';
const themeStorageKey = 'mtg_hexcrawl_map_theme';
const manaIconPaths = ['icons/W.png', 'icons/U.png', 'icons/B.png', 'icons/R.png', 'icons/G.png'];
const manaOptionCount = 6;

let hexes = [];
let selectedHexId = 'A1';
let manaIcons = [];

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
      text: '',
      text2: '',
      mana: Array(manaOptionCount).fill(false),
    }))
  );
}

async function loadManaIcons() {
  manaIcons = manaIconPaths;
  updateManaIconSprites();
  return manaIcons;
}

function normalizeHexes(data) {
  const normalized = (Array.isArray(data) ? data : [])
    .map((hex) => ({
      id: String(hex?.id || '').trim().toUpperCase(),
      color: String(hex?.color || '#808080').trim(),
      text: typeof hex?.text === 'string' ? hex.text : '',
      text2: typeof hex?.text2 === 'string' ? hex.text2 : '',
      mana: Array.isArray(hex?.mana)
        ? Array.from({ length: manaOptionCount }, (_, index) => Boolean(hex.mana[index]))
        : Array(manaOptionCount).fill(false),
    }))
    .filter((hex) => hex.id);

  const lookup = new Map(normalized.map((hex) => [hex.id, hex]));

  return buildDefaultHexes().map((defaultHex) => {
    const existingHex = lookup.get(defaultHex.id);

    return {
      id: defaultHex.id,
      color: existingHex?.color || defaultHex.color,
      text: typeof existingHex?.text === 'string' ? existingHex.text : defaultHex.text,
      text2: typeof existingHex?.text2 === 'string' ? existingHex.text2 : defaultHex.text2,
      mana: Array.from({ length: manaOptionCount }, (_, index) => Boolean(existingHex?.mana?.[index] ?? false)),
    };
  });
}

function updateSelectedHexDisplay() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId) || hexes[0];

  if (!selectedHex) {
    return;
  }

  selectedHexLabel.textContent = selectedHex.id;
  colorInput.value = selectedHex.color;
  textInput.value = selectedHex.text || '';
  textInput2.value = selectedHex.text2 || '';

  manaCheckboxes.forEach((checkbox, index) => {
    checkbox.checked = Boolean(selectedHex.mana?.[index]);
  });
}

function createHexButtons() {
  const frame = document.querySelector('.frame');
  const frameWidth = frame.clientWidth;
  const frameHeight = frame.clientHeight;

  const hexWidth = Math.min(frameWidth / 14.75, frameHeight / 9.5);
  const hexHeight = hexWidth * (Math.sqrt(3) / 2);
  const xStep = hexWidth * 0.735;
  const yStep = hexHeight * 0.471;
  const rise = hexHeight * 0.5;

  const originX = 101;
  const originY = 103.5;

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

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  localStorage.setItem(themeStorageKey, theme);
}

function updateManaIconSprites() {
  manaOptionIcons.forEach((icon, index) => {
    const iconPath = manaIcons[index];

    icon.style.backgroundImage = iconPath ? `url("${iconPath}")` : 'none';
    icon.style.backgroundRepeat = 'no-repeat';
    icon.style.backgroundSize = 'contain';
    icon.style.backgroundPosition = 'center';
  });
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

function applySelectedHexText() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

  if (!selectedHex) {
    return;
  }

  selectedHex.text = textInput.value;
  saveHexes();
}

function applySelectedHexText2() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

  if (!selectedHex) {
    return;
  }

  selectedHex.text2 = textInput2.value;
  saveHexes();
}

async function syncEditorPanelHeight() {
  const frame = document.querySelector('.frame');
  const panel = document.querySelector('.color-panel');

  if (frame && panel) {
    panel.style.height = `${frame.clientHeight}px`;
  }
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

  await loadManaIcons();
  selectedHexId = hexes[0]?.id || 'A1';
  saveHexes();
  updateSelectedHexDisplay();
  createHexButtons();
  syncEditorPanelHeight();
}

colorInput.addEventListener('input', applySelectedHexColor);
textInput.addEventListener('input', applySelectedHexText);
textInput2.addEventListener('input', applySelectedHexText2);

manaCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener('change', () => {
    const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

    if (!selectedHex) {
      return;
    }

    const manaIndex = Number(checkbox.dataset.manaIndex || 0);
    selectedHex.mana = selectedHex.mana || Array(manaOptionCount).fill(false);
    selectedHex.mana[manaIndex] = checkbox.checked;
    saveHexes();
  });
});

window.addEventListener('resize', () => {
  createHexButtons();
  syncEditorPanelHeight();
});

const savedTheme = localStorage.getItem(themeStorageKey) || 'light';
applyTheme(savedTheme);

themeToggle.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
});

loadHexes();
