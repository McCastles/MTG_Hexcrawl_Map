const grid = document.getElementById('hex-grid');
const svg = document.getElementById('hex-outline-layer');
const colorInput = document.getElementById('hex-color-input');
const textInput = document.getElementById('hex-text-input');
const opponentInput = document.getElementById('hex-text-input-top');
const textInput2 = document.getElementById('hex-text-input-2');
const hexNameInput = document.getElementById('hex-name-input');
const themeToggle = document.getElementById('theme-toggle');
const hexVisibilityToggle = document.getElementById('hex-visibility-toggle');
const saveJsonButton = document.getElementById('save-json-button');
const loadJsonButton = document.getElementById('load-json-button');
const loadJsonInput = document.getElementById('load-json-input');
const selectedHexLabel = document.getElementById('selected-hex-label');
const manaCheckboxes = Array.from(document.querySelectorAll('.mana-checkbox-input'));
const manaOptionIcons = Array.from(document.querySelectorAll('.mana-icon-option'));

const columns = 16;
const rows = 9;
const rowLetters = Array.from({ length: rows }, (_, index) => String.fromCharCode(65 + index));
const storageKey = 'mtg_hexcrawl_map_hexes';
const themeStorageKey = 'mtg_hexcrawl_map_theme';
const hexVisibilityStorageKey = 'mtg_hexcrawl_map_hex_visibility';
const manaIconPaths = ['icons/W.png', 'icons/U.png', 'icons/B.png', 'icons/R.png', 'icons/G.png'];
const manaOptionCount = 6;
const maxChallengeCount = 5;

let hexes = [];
let selectedHexId = 'A1';
let manaIcons = [];
let hexesVisible = true;
let groupChallenges = new Map();

function getHexGroupKey(hex) {
  return String(hex?.color || '#808080').trim() || '#808080';
}

function sanitizeChallenges(challenges) {
  const next = Array.isArray(challenges) ? challenges : [];

  return next
    .map((challenge, index) => ({
      id: typeof challenge?.id === 'string' ? challenge.id : `challenge-${index + 1}`,
      label: typeof challenge?.label === 'string' ? challenge.label : '',
      checked: Boolean(challenge?.checked),
    }))
    .slice(0, maxChallengeCount);
}

function getChallengeGroupForHex(hex) {
  const key = getHexGroupKey(hex);
  const storedGroup = groupChallenges.get(key);
  const challengeGroup = sanitizeChallenges(storedGroup ?? (Array.isArray(hex?.challenges) ? hex.challenges : []));

  groupChallenges.set(key, challengeGroup);

  if (hex) {
    hex.challenges = challengeGroup;
  }

  return challengeGroup;
}

function setChallengeGroupForHex(hex, challengeGroup) {
  const key = getHexGroupKey(hex);
  const nextGroup = sanitizeChallenges(challengeGroup);

  groupChallenges.set(key, nextGroup);
  hexes
    .filter((entry) => getHexGroupKey(entry) === key)
    .forEach((entry) => {
      entry.challenges = nextGroup;
    });

  return nextGroup;
}

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
      opponent: '',
      text2: '',
      challenges: [{ id: `challenge-${rowLetter}${colIndex + 1}-1`, label: '', checked: false }],
      name: '',
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
  const payload = Array.isArray(data)
    ? { hexes: data }
    : (data && typeof data === 'object' ? data : { hexes: [] });

  const rawHexes = Array.isArray(payload.hexes) ? payload.hexes : [];
  const importedGroups = payload.groupChallenges && typeof payload.groupChallenges === 'object'
    ? payload.groupChallenges
    : {};

  groupChallenges = new Map();
  const groupedChallenges = new Map();

  rawHexes.forEach((hex) => {
    const groupKey = getHexGroupKey(hex);
    const legacyChallenges = Array.isArray(hex?.challenges)
      ? hex.challenges
      : typeof hex?.text2 === 'string' && hex.text2.trim()
        ? [{ id: 'challenge-1', label: hex.text2, checked: false }]
        : [];

    const importedGroup = importedGroups[groupKey] || importedGroups[groupKey.toLowerCase()] || importedGroups[groupKey.toUpperCase()];
    const challengeGroup = sanitizeChallenges(importedGroup ?? legacyChallenges);
    groupedChallenges.set(groupKey, challengeGroup);
    groupChallenges.set(groupKey, challengeGroup);
  });

  Object.entries(importedGroups).forEach(([key, value]) => {
    const normalizedKey = String(key).trim();
    if (!normalizedKey) {
      return;
    }

    const challengeGroup = sanitizeChallenges(value);
    groupChallenges.set(normalizedKey, challengeGroup);
    groupedChallenges.set(normalizedKey, challengeGroup);
  });

  const normalized = rawHexes
    .map((hex) => {
      const groupKey = getHexGroupKey(hex);
      const challengeGroup = groupedChallenges.get(groupKey) ?? sanitizeChallenges([]);

      return {
        id: String(hex?.id || '').trim().toUpperCase(),
        color: String(hex?.color || '#808080').trim(),
        text: typeof hex?.text === 'string' ? hex.text : '',
        opponent: typeof hex?.opponent === 'string' ? hex.opponent : '',
        text2: typeof hex?.text2 === 'string' ? hex.text2 : '',
        challenges: challengeGroup,
        name: typeof hex?.name === 'string' ? hex.name : '',
        mana: Array.isArray(hex?.mana)
          ? Array.from({ length: manaOptionCount }, (_, index) => Boolean(hex.mana[index]))
          : Array(manaOptionCount).fill(false),
      };
    })
    .filter((hex) => hex.id);

  const lookup = new Map(normalized.map((hex) => [hex.id, hex]));

  return buildDefaultHexes().map((defaultHex) => {
    const existingHex = lookup.get(defaultHex.id);
    const groupKey = getHexGroupKey(existingHex || defaultHex);
    const challengeGroup = groupedChallenges.get(groupKey) ?? sanitizeChallenges(existingHex?.challenges ?? defaultHex.challenges ?? []);

    groupedChallenges.set(groupKey, challengeGroup);
    groupChallenges.set(groupKey, challengeGroup);

    return {
      id: defaultHex.id,
      color: existingHex?.color || defaultHex.color,
      text: typeof existingHex?.text === 'string' ? existingHex.text : defaultHex.text,
      opponent: typeof existingHex?.opponent === 'string' ? existingHex.opponent : defaultHex.opponent,
      text2: typeof existingHex?.text2 === 'string' ? existingHex.text2 : defaultHex.text2,
      challenges: challengeGroup,
      name: typeof existingHex?.name === 'string' ? existingHex.name : defaultHex.name,
      mana: Array.from({ length: manaOptionCount }, (_, index) => Boolean(existingHex?.mana?.[index] ?? false)),
    };
  });
}

function renderChallengeList() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId) || hexes[0];

  if (!selectedHex) {
    return;
  }

  const challengeRows = getChallengeGroupForHex(selectedHex);

  textInput2.innerHTML = '';

  challengeRows.forEach((challenge) => {
    const row = document.createElement('div');
    row.className = 'challenge-row';
    row.dataset.challengeId = challenge.id;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'challenge-check-input';
    checkbox.checked = Boolean(challenge.checked);
    checkbox.setAttribute('aria-label', 'Challenge completed');

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'challenge-name-input';
    input.value = challenge.label || '';
    input.placeholder = 'Challenge';
    input.setAttribute('aria-label', 'Challenge name');

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'challenge-remove-button';
    removeButton.textContent = '×';
    removeButton.setAttribute('aria-label', 'Remove challenge');

    row.appendChild(checkbox);
    row.appendChild(input);
    row.appendChild(removeButton);
    textInput2.appendChild(row);
  });

  const addButton = document.createElement('button');
  addButton.type = 'button';
  addButton.className = 'challenge-add-button';
  addButton.textContent = 'Add challenge';
  addButton.disabled = challengeRows.length >= maxChallengeCount;
  textInput2.appendChild(addButton);
}

function updateSelectedHexDisplay() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId) || hexes[0];

  if (!selectedHex) {
    return;
  }

  selectedHexLabel.textContent = selectedHex.name ? `${selectedHex.id} ${selectedHex.name}` : selectedHex.id;
  colorInput.value = selectedHex.color;
  textInput.value = selectedHex.text || '';
  opponentInput.value = selectedHex.opponent || '';
  hexNameInput.value = selectedHex.name || '';
  renderChallengeList();

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

      const lines = [id, hex.name].filter(Boolean);
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('class', 'hex-label');
      label.setAttribute('x', `${x + hexWidth / 2}`);
      label.setAttribute('y', `${y + hexHeight / 2 - (lines.length > 1 ? 4 : 0)}`);

      lines.forEach((line, index) => {
        const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        tspan.setAttribute('x', `${x + hexWidth / 2}`);
        tspan.setAttribute('dy', index === 0 ? '0' : '12');
        tspan.textContent = line;

        if (index === 0) {
          tspan.setAttribute('y', `${y + hexHeight / 2 - (lines.length > 1 ? 4 : 0)}`);
        }

        label.appendChild(tspan);
      });

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
  const payload = {
    hexes,
    groupChallenges: Object.fromEntries(groupChallenges),
  };
  localStorage.setItem(storageKey, JSON.stringify(payload, null, 2));
}

function saveHexesToJsonFile() {
  const payload = {
    hexes,
    groupChallenges: Object.fromEntries(groupChallenges),
  };
  const jsonText = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mtg-hexcrawl-map.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function loadHexesFromJsonFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      hexes = normalizeHexes(parsed);
      selectedHexId = hexes[0]?.id || 'A1';
      saveHexes();
      updateSelectedHexDisplay();
      createHexButtons();
      syncEditorPanelHeight();
    } catch (error) {
      console.error('Failed to parse JSON import.', error);
      window.alert('The selected file is not valid JSON for this map.');
    }
  };

  reader.readAsText(file);
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggle.textContent = theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  themeToggle.setAttribute('aria-pressed', String(theme === 'dark'));
  localStorage.setItem(themeStorageKey, theme);
}

function applyHexVisibility(visible) {
  hexesVisible = visible;
  document.body.classList.toggle('hexes-hidden', !visible);
  hexVisibilityToggle.textContent = visible ? 'Hide hexes' : 'Show hexes';
  hexVisibilityToggle.setAttribute('aria-pressed', String(!visible));
  localStorage.setItem(hexVisibilityStorageKey, String(visible));

  if (!visible) {
    svg.setAttribute('aria-hidden', 'true');
  } else {
    svg.removeAttribute('aria-hidden');
  }
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
  setChallengeGroupForHex(selectedHex, getChallengeGroupForHex(selectedHex));
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

function applySelectedHexOpponent() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

  if (!selectedHex) {
    return;
  }

  selectedHex.opponent = opponentInput.value;
  saveHexes();
}

function applySelectedHexText2() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

  if (!selectedHex) {
    return;
  }

  const rows = Array.from(textInput2.querySelectorAll('.challenge-row'));
  const challenges = rows.map((row) => ({
    id: row.dataset.challengeId || `challenge-${Date.now()}-${Math.random()}`,
    label: row.querySelector('.challenge-name-input')?.value || '',
    checked: row.querySelector('.challenge-check-input')?.checked || false,
  }));

  const challengeGroup = setChallengeGroupForHex(selectedHex, challenges);
  selectedHex.text2 = challengeGroup.map((challenge) => challenge.label).join('\n');
  saveHexes();
}

function applySelectedHexName() {
  const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

  if (!selectedHex) {
    return;
  }

  selectedHex.name = hexNameInput.value.trim();
  saveHexes();
  updateSelectedHexDisplay();
  createHexButtons();
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
opponentInput.addEventListener('input', applySelectedHexOpponent);
textInput2.addEventListener('input', (event) => {
  const nameInput = event.target.closest('.challenge-name-input');

  if (nameInput) {
    applySelectedHexText2();
  }
});
textInput2.addEventListener('change', (event) => {
  const checkbox = event.target.closest('.challenge-check-input');

  if (checkbox) {
    applySelectedHexText2();
  }
});
textInput2.addEventListener('click', (event) => {
  const removeButton = event.target.closest('.challenge-remove-button');
  if (removeButton) {
    const selectedHex = hexes.find((hex) => hex.id === selectedHexId);
    const row = removeButton.closest('.challenge-row');

    if (selectedHex && row) {
      const challengeId = row.dataset.challengeId;
      const nextChallenges = sanitizeChallenges(getChallengeGroupForHex(selectedHex).filter((challenge) => challenge.id !== challengeId));
      const finalChallenges = nextChallenges.length > 0 ? nextChallenges : [{ id: `challenge-${selectedHex.id}-1`, label: '', checked: false }];

      setChallengeGroupForHex(selectedHex, finalChallenges);
      selectedHex.text2 = finalChallenges.map((challenge) => challenge.label).join('\n');
      saveHexes();
      renderChallengeList();
    }
    return;
  }

  const addButton = event.target.closest('.challenge-add-button');
  if (addButton) {
    const selectedHex = hexes.find((hex) => hex.id === selectedHexId);

    if (selectedHex) {
      const nextChallenge = {
        id: `challenge-${selectedHex.id}-${Date.now()}`,
        label: '',
        checked: false,
      };
      const nextChallenges = sanitizeChallenges([...getChallengeGroupForHex(selectedHex), nextChallenge].slice(0, maxChallengeCount));

      setChallengeGroupForHex(selectedHex, nextChallenges);
      selectedHex.text2 = nextChallenges.map((challenge) => challenge.label).join('\n');
      saveHexes();
      renderChallengeList();
    }
  }
});
hexNameInput.addEventListener('input', applySelectedHexName);

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

const savedHexVisibility = localStorage.getItem(hexVisibilityStorageKey);
applyHexVisibility(savedHexVisibility === null ? true : savedHexVisibility === 'true');

themeToggle.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
});

hexVisibilityToggle.addEventListener('click', () => {
  applyHexVisibility(!hexesVisible);
});

document.addEventListener('keydown', (event) => {
  const activeTag = document.activeElement?.tagName;
  const isTypingTarget =
    activeTag === 'INPUT' ||
    activeTag === 'TEXTAREA' ||
    document.activeElement?.isContentEditable;

  if (event.code === 'Space' && !isTypingTarget && !event.repeat) {
    event.preventDefault();
    applyHexVisibility(!hexesVisible);
    return;
  }

  if (!isTypingTarget && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
    event.preventDefault();

    const currentRowLetter = selectedHexId.replace(/[0-9]/g, '');
    const currentRowIndex = rowLetters.indexOf(currentRowLetter);
    const currentColIndex = Number.parseInt(selectedHexId.replace(/^[A-Z]+/, ''), 10) - 1;

    let nextRowIndex = currentRowIndex;
    let nextColIndex = currentColIndex;

    if (event.code === 'ArrowUp') {
      nextRowIndex -= 1;
    }
    if (event.code === 'ArrowDown') {
      nextRowIndex += 1;
    }
    if (event.code === 'ArrowLeft') {
      nextColIndex -= 1;
    }
    if (event.code === 'ArrowRight') {
      nextColIndex += 1;
    }

    if (nextRowIndex < 0 || nextRowIndex >= rows || nextColIndex < 0 || nextColIndex >= columns) {
      return;
    }

    const nextHexId = `${rowLetters[nextRowIndex]}${nextColIndex + 1}`;
    const nextHex = hexes.find((hex) => hex.id === nextHexId);

    if (nextHex) {
      selectedHexId = nextHexId;
      updateSelectedHexDisplay();
      createHexButtons();
    }
  }
});

saveJsonButton.addEventListener('click', saveHexesToJsonFile);
loadJsonButton.addEventListener('click', () => {
  loadJsonInput.click();
});
loadJsonInput.addEventListener('change', (event) => {
  const [file] = event.target.files || [];
  loadHexesFromJsonFile(file);
  loadJsonInput.value = '';
});

loadHexes();
