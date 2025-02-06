

const bodies = [
    [[0,0], [1,0], [2,0], [3,0]], // line v
    [[0,0], [0,1], [0,2], [0,3]], // line h
    [[0,0], [0,1], [0,2], [1,2], [2,2]] // corner bl
];

const bodySize = 4;
const cellSize = 40;

let gameID;
let blockBlastWS;

function showTileShadow(x, y) {
    var hovered = document.elementsFromPoint(x, y).filter(el => el.classList.contains('cell'));
    if (hovered.length > 0) {
        hovered[0].classList.add('hovered');
    }
}

function showGostBody(bodyIndex, x, y) {
    var body = bodies[bodyIndex];

    document.querySelectorAll('.hovered').forEach(b => b.classList.remove('hovered'));
    body.forEach((pos) => {
        tileX = x + (pos[0]+.5)*cellSize;
        tileY = y + (pos[1]+.5)*cellSize;
        showTileShadow(tileX, tileY);
    });
}

function px2GridSpace(elem) {
    var elemRect = elem.getBoundingClientRect();
    var x = elemRect.left;
    var y = elemRect.top;
    var firstCell = document.getElementsByClassName("cell")[0];
    var rect = firstCell.getBoundingClientRect();
    x-= rect.left;
    y-= rect.top;

    x = Math.round(x / cellSize);
    y = Math.round(y / cellSize);

    return [x,y];
}

function tryPlaceBody(displayIndex, pos) {
    //quick check:
    var hoveredBlocks = document.querySelectorAll('.block.hovered');
    if (hoveredBlocks.length > 0) {
        console.log(`body not fitting (quickcheck) ${pos}`);
        return;
    }

    if (pos[0] < 0 || pos[0] >= 9 || pos[1] < 0 || pos[1] >= 9) {
        console.log(`body not in grid (quickcheck) ${pos}`);
        return;
    }

    console.log(`attempt body at ${pos}`);
    
    sendMove(pos, displayIndex);
}

function makeDraggable(element, bodyIndex, displayIndex) {
    let offsetX, offsetY, isDragging = false;
    let originalX, originalY;

    element.addEventListener("mousedown", function (e) {
        isDragging = true;
        offsetX = e.clientX - element.getBoundingClientRect().left;
        offsetY = e.clientY - element.getBoundingClientRect().top;
        originalX = element.style.left;
        originalY = element.style.top;
        element.style.position = "absolute";
    });

    document.addEventListener("mousemove", function (e) {
        if (isDragging) {
            var x = e.clientX - offsetX;
            var y = e.clientY - offsetY;
            element.style.left = `${x}px`;
            element.style.top = `${y}px`;
            
            showGostBody(bodyIndex, x, y);
        }
    });

    document.addEventListener("mouseup", function () {
        if (isDragging) {
            var pos = px2GridSpace(element);
            
            element.style.left = originalX;
            element.style.top = originalY;
            
            tryPlaceBody(displayIndex, pos);
        }
        document.querySelectorAll('.hovered').forEach(b => b.classList.remove('hovered'));
        isDragging = false;
    });
}

function displayBody(display, displayIndex, index) {
    const container = document.createElement('div');
    container.classList.add('bodyContainer');
    makeDraggable(container, index, displayIndex);
    display.appendChild(container);

    var cells = new Array();
    for (let i = 0; i < bodySize*bodySize; i++) {
        const cell = document.createElement('div');
        cell.classList.add('invisCell');
        container.appendChild(cell);
        cells.push(cell);
    }
    bodies[index].forEach((tile) => {
        var i = tile[0] + tile[1]*bodySize;
        cells[i].classList.add('block');
    });
}

function displayAvailableBodies(indecies) {
    const displays = document.getElementsByClassName("bodyDisplay");
    for (var i=0; i<indecies.length; i++) {
        displayBody(displays[i], i, indecies[i]);
    }
}

function displayEmptyGrid() {
    const display = document.getElementById("mainDisplay");
    for (let i = 0; i < 9*9; i++) {
        const cell = document.createElement('div');
        cell.classList.add('cell');
        if (i%2 == 0) {cell.classList.add('block')}
        display.appendChild(cell);
    }
}

function displayGrid(arr) {
    const display = document.getElementById("mainDisplay");
    for (let i = 0; i < 9; i++) {
        var subarr = arr[i];
        for (let j = 0; j < 9; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            if (subarr[j] != 0) {cell.classList.add('block')}
            display.appendChild(cell);
        }
    }
}

function displayScore(score) {
    const elem = document.getElementById("score");
    elem.innerHTML = score;
}

/* ---------- Handle Connection ----------*/

function restartGame(_) {
    try {
        blockBlastWS.send(JSON.stringify({
            "type": "clear",
        }));
    } catch (error) {
        alert("Verbindung zum Server nicht möglich. Überprüfe deine Internet verbindung");
        console.log(`connection error ${error}`);
    }
}

function sendMove(pos, displayIndex) {
    try {
        blockBlastWS.send(JSON.stringify({
            "type": "move",
            "x": pos[0],
            "y": pos[1],
            "index": displayIndex,
        }));
    } catch (error) {
        alert("Verbindung zum Server nicht möglich. Überprüfe deine Internet verbindung");
        console.log(`connection error ${error}`);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParts = window.location.pathname.split('/');
    gameID = urlParts[urlParts.length - 1];

    document.getElementById("reload").addEventListener("click", restartGame);

    const ws = connectToWS(gameID);

    window.addEventListener("focus", () => {
        if (typeof ws !== 'undefined') return;
        ws.connect();
    });

});

function connectToWS(gameID) {
    blockBlastWS = new WebSocket(window.location.origin.replace(/^http/, 'ws') + `/games/blockblast/${gameID}`);
    blockBlastWS.onopen = () => {
        console.log('Connected to server');
    }
    blockBlastWS.onmessage = (event) => {
        data = JSON.parse(event.data);
        if (data.type === 'board') {
            console.log(data)
            displayGrid(data.board);
            displayAvailableBodies(data.bodies);
            displayScore(data.score);
        }
    }
    blockBlastWS.onclose = () => {
        console.log('Disconnected from server');
    }
    return blockBlastWS;
}