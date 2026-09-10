const grid = document.getElementById('hex-grid');
const columns = 16;
const rows = 9;

function createHexButtons() {
  const frame = document.querySelector('.frame');
  const frameWidth = frame.clientWidth;
  const frameHeight = frame.clientHeight;

  const hexWidth = Math.min(frameWidth / 14.75, frameHeight / 9.5);
  const hexHeight = hexWidth * (Math.sqrt(3) / 2);
//   const xStep = hexWidth * 0.9;
  const xStep = hexWidth * 0.777;
  const yStep = hexHeight * 0.54;
  const rise = hexHeight * 0.5;

//   const originX = (frameWidth - ((columns - 1) * xStep + hexWidth)) / 2;
  const originX = 83;
  const originY = 111;

  grid.innerHTML = '';

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hex-button';
      button.setAttribute('aria-label', `Hex tile ${col + 1}, ${row + 1}`);
      button.style.width = `${hexWidth}px`;
      button.style.height = `${hexHeight}px`;
      button.style.left = `${originX + col * xStep}px`;
      button.style.top = `${originY + row * (yStep + hexHeight / 2) - (col % 2 ? rise : 0)}px`;
      button.title = `Hex tile ${col + 1}, ${row + 1}`;

      button.addEventListener('click', (event) => {
        event.preventDefault();
      });

      grid.appendChild(button);
    }
  }
}

window.addEventListener('resize', createHexButtons);
createHexButtons();
