// --- CONFIGURATION ---
const ELEMENTS = {
    canvas: document.getElementById('pixel-canvas'),
    colorPicker: document.getElementById('color-picker'),
    colorHint: document.querySelector('.color-hint'), 
    width: document.getElementById('input-width'),
    height: document.getElementById('input-height'),
    palette: document.getElementById('palette'),
    btnCreate: document.getElementById('btn-create'),
    btnBrush: document.getElementById('btn-brush'),
    btnEraser: document.getElementById('btn-eraser'),
    btnSave: document.getElementById('btn-save'),
    btnReplay: document.getElementById('btn-replay'),
    btnToggleGrid: document.getElementById('btn-toggle-grid')
};

const STATE = {
    isDrawing: false,
    isErasing: false,
    history: []
};

const DEFAULT_COLORS = [
    '#ffffff', '#000000', '#808080', '#ff0000', '#ffa500',
    '#ffff00', '#008000', '#0000ff', '#800080', '#ff69b4'
];

// --- INITIALIZATION ---

function init() {
    createPalette();
    makeGrid();
    setupEventListeners();
    updateColorHint(ELEMENTS.colorPicker.value);
}

// --- CORE FUNCTIONS ---

function makeGrid() {
    ELEMENTS.canvas.innerHTML = '';
    STATE.history = [];
    
    const w = ELEMENTS.width.value;
    const h = ELEMENTS.height.value;

    ELEMENTS.canvas.style.gridTemplateColumns = `repeat(${w}, 20px)`;
    ELEMENTS.canvas.style.gridTemplateRows = `repeat(${h}, 20px)`;

    for (let i = 0; i < w * h; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        cell.style.backgroundColor = '#ffffff'; 
        
        cell.addEventListener('mousedown', (e) => handleDraw(e, cell));
        cell.addEventListener('mouseenter', (e) => {
            if (STATE.isDrawing) handleDraw(e, cell);
        });
        cell.addEventListener('contextmenu', (e) => e.preventDefault());

        ELEMENTS.canvas.appendChild(cell);
    }
    
    saveSnapshot(); 
}

function handleDraw(e, cell) {
    let color;
    if (STATE.isErasing || e.buttons === 2) {
        color = '#ffffff';
    } else {
        color = ELEMENTS.colorPicker.value;
    }
    cell.style.backgroundColor = color;
}

// --- UI ---

function setTool(toolName) {
    if (toolName === 'eraser') {
        STATE.isErasing = true;
        ELEMENTS.btnEraser.classList.add('active');
        ELEMENTS.btnBrush.classList.remove('active');
    } else {
        STATE.isErasing = false;
        ELEMENTS.btnBrush.classList.add('active');
        ELEMENTS.btnEraser.classList.remove('active');
    }
}

function updateColorHint(color) {
    ELEMENTS.colorHint.textContent = color.toUpperCase();
}

function createPalette() {
    DEFAULT_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.classList.add('swatch');
        swatch.style.backgroundColor = color;
        swatch.addEventListener('click', () => {
            ELEMENTS.colorPicker.value = color;
            updateColorHint(color); 
            setTool('brush');
            
            document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
        });
        ELEMENTS.palette.appendChild(swatch);
    });
}

// --- HISTORY & UTILS ---

function saveSnapshot() {
    const cells = ELEMENTS.canvas.getElementsByClassName('cell');
    const currentColors = [];
    for(let cell of cells) {
        currentColors.push(cell.style.backgroundColor);
    }
    STATE.history.push(currentColors);
    if (STATE.history.length > 50) STATE.history.shift();
}

function undoLastAction() {
    if (STATE.history.length === 0) return;
    STATE.history.pop();
    const previousState = STATE.history[STATE.history.length - 1];
    
    if (previousState) {
        const cells = ELEMENTS.canvas.getElementsByClassName('cell');
        for (let i = 0; i < cells.length; i++) {
            cells[i].style.backgroundColor = previousState[i];
        }
    }
}

function toggleGridLines() {
    ELEMENTS.canvas.classList.toggle('grid-hidden');
}

function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT') return; 

    const key = e.key.toLowerCase();
    if (key === 'b') setTool('brush');
    if (key === 'e') setTool('eraser');
    if (key === 'g') toggleGridLines();
    if (key === 'z') undoLastAction();
}

// --- EVENT LISTENERS ---

function setupEventListeners() {
    ELEMENTS.canvas.addEventListener('mousedown', (e) => {
        STATE.isDrawing = true;
        saveSnapshot(); 
        e.preventDefault(); 
    });
    window.addEventListener('mouseup', () => {
        STATE.isDrawing = false;
    });

    ELEMENTS.colorPicker.addEventListener('input', (e) => {
        updateColorHint(e.target.value);
    });

    ELEMENTS.btnCreate.addEventListener('click', (e) => {
        e.preventDefault();
        makeGrid();
    });

    ELEMENTS.btnBrush.addEventListener('click', () => setTool('brush'));
    ELEMENTS.btnEraser.addEventListener('click', () => setTool('eraser'));
    ELEMENTS.btnToggleGrid.addEventListener('click', toggleGridLines);

    ELEMENTS.btnSave.addEventListener('click', () => {
        // 1. Clone the grid so we don't mess up the editor
        const clone = ELEMENTS.canvas.cloneNode(true);
        
        // 2. Create a "Polaroid" wrapper
        const wrapper = document.createElement('div');
        wrapper.style.display = 'inline-block';
        wrapper.style.backgroundColor = 'white';
        // Padding: Top/Right/Left = 10px, Bottom = 20px for text
        wrapper.style.padding = '10px 10px 20px 10px'; 
        wrapper.style.position = 'absolute';
        wrapper.style.top = '-9999px'; // Hide off-screen
        
        // 3. Create the credit text
        const credit = document.createElement('div');
        credit.textContent = 'Made with PixArt';
        credit.style.color = '#000';
        credit.style.fontFamily = 'sans-serif';
        credit.style.fontSize = '8px';
        credit.style.fontWeight = 'regular';
        credit.style.marginTop = '10px';
        credit.style.textAlign = 'center';
        
        // 4. Assemble
        wrapper.appendChild(clone);
        wrapper.appendChild(credit);
        document.body.appendChild(wrapper);

        // 5. Capture
        html2canvas(wrapper).then(canvas => {
            const link = document.createElement('a');
            link.download = 'pixart.png';
            link.href = canvas.toDataURL();
            link.click();
            
            // Cleanup
            document.body.removeChild(wrapper);
        });
    });

    ELEMENTS.btnReplay.addEventListener('click', () => {
        if(STATE.history.length < 1) return;
        let frame = 0;
        const interval = setInterval(() => {
            if(frame >= STATE.history.length) {
                clearInterval(interval);
                return;
            }
            const data = STATE.history[frame];
            const cells = ELEMENTS.canvas.getElementsByClassName('cell');
            for(let i=0; i<cells.length; i++) {
                cells[i].style.backgroundColor = data[i];
            }
            frame++;
        }, 250);
    });

    window.addEventListener('keydown', handleKeyboard);
}

init();