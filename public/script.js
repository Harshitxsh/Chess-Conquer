// script.js
var board = null;
var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');

var playerColor = 'w'; // 'w' or 'b'

function onDragStart(source, piece, position, orientation) {
    // do not pick up pieces if the game is over
    if (game.game_over()) return false;

    // Only pick up pieces for the player's color, and only if it's their turn
    // piece.search(/^w/) returns 0 if white piece.
    // if playerColor is 'w', we want piece starting with 'w'
    // if playerColor is 'b', we want piece starting with 'b'

    // Check turn
    if (game.turn() !== playerColor) return false;

    // Check piece color vs player color
    if ((playerColor === 'w' && piece.search(/^w/) === -1) ||
        (playerColor === 'b' && piece.search(/^b/) === -1)) {
        return false;
    }
}

function onDrop(source, target) {
    // see if the move is legal
    var move = game.move({
        from: source,
        to: target,
        promotion: 'q'
    });

    // illegal move
    if (move === null) return 'snapback';

    updateStatus();

    // Player moved. Now trigger computer.
    if (!game.game_over()) {
        window.setTimeout(makeComputerMove, 250);
    }
}

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
    board.position(game.fen());
}

function updateStatus() {
    var status = '';

    var moveColor = 'White';
    if (game.turn() === 'b') {
        moveColor = 'Black';
    }

    // checkmate?
    if (game.in_checkmate()) {
        status = 'Game over, ' + moveColor + ' is in checkmate.';
    }

    // draw?
    else if (game.in_draw()) {
        status = 'Game over, drawn position';
    }

    // game still on
    else {
        status = moveColor + ' to move';

        // check?
        if (game.in_check()) {
            status += ', ' + moveColor + ' is in check';
        }
    }

    // update status
    console.log(status);
    $status.html(status);
    $fen.html(game.fen());
    $pgn.html(game.pgn());

    updateMoveHistory();

    // Run Stockfish analysis
    // Only analyze if NOT start position, or force 0.00 for start?
    // User requested "start with 0.0".
    if (game.history().length === 0) {
        evalScore.innerText = '0.00';
        evalBar.style.width = '50%';
        // We can still run analysis in background but maybe don't update UI if it's startpos?
        // Or just analyze. The user said "random values when its the begening". 
        // Likely they mean they want to see 0.0 initially.
        // Let's NOT analyze on empty history to keep it 0.0 static until a move is made
        return;
    }
    analyzePosition();
}

function updateMoveHistory() {
    var history = game.history({ verbose: true });
    var html = '<div class="moves-list">';
    for (var i = 0; i < history.length; i += 2) {
        var num = (i / 2) + 1;
        var moveWhite = history[i].san;
        var moveBlack = history[i + 1] ? history[i + 1].san : '';

        html += `<div class="move-row">
            <span class="move-num">${num}.</span>
            <span class="move white">${moveWhite}</span>
            <span class="move black">${moveBlack}</span>
        </div>`;
    }
    html += '</div>';
    $('#move-history').html(html);

    // Auto-scroll
    var el = document.getElementById('move-history');
    if (el) el.scrollTop = el.scrollHeight;
}


// Stockfish Integration
var stockfish = new Worker('lib/stockfish.js');
var evalScore = document.getElementById('eval-score');
var evalBar = document.getElementById('eval-bar');

stockfish.onmessage = function (event) {
    var line = event.data;

    // Parse "info depth X score cp Y"
    if (line.startsWith('info') && line.includes('score cp')) {
        var match = line.match(/score cp (-?\d+)/);
        if (match) {
            var score = parseInt(match[1]);

            // Adjust for side to move so we always show white's advantage?
            var turn = game.turn() === 'w' ? 1 : -1;
            // Actually, let's keep it simple: Raw score.
            // If we want white-relative:
            var displayScore = score;
            if (game.turn() === 'b') {
                displayScore = -score;
            }

            updateEvalUI(displayScore);
        }
    } else if (line.startsWith('info') && line.includes('score mate')) {
        var match = line.match(/score mate (-?\d+)/);
        if (match) {
            var mateIn = parseInt(match[1]);
            evalScore.innerText = `M${Math.abs(mateIn)}`;
            // Adjust bar for mate
            var fill = mateIn > 0 ? (game.turn() === 'w' ? 100 : 0) : (game.turn() === 'w' ? 0 : 100);
            var isWhiteWinning = (mateIn > 0 && game.turn() === 'w') || (mateIn < 0 && game.turn() === 'b');
            evalBar.style.width = isWhiteWinning ? '100%' : '0%';
        }
    } else if (line.startsWith('bestmove')) {
        // Only react if it is Computer's turn (NOT playerColor)
        if (game.turn() !== playerColor) {
            var match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            if (match) {
                var move = {
                    from: match[1],
                    to: match[2],
                    promotion: match[3] ? match[3] : 'q'
                };

                game.move(move);
                board.position(game.fen());
                updateStatus();
            }
        }
    }
};

function analyzePosition() {
    // Just analysis
    var fen = game.fen();
    stockfish.postMessage('position fen ' + fen);
    stockfish.postMessage('go depth 15');
}

function makeComputerMove() {
    if (game.game_over()) return;
    // Note: We allow this function to run even if it IS player's turn, 
    // because the user might have requested "Computer Starts" while playing White.

    var fen = game.fen();
    stockfish.postMessage('position fen ' + fen);
    stockfish.postMessage('go movetime 1000');
}

function updateEvalUI(scoreCp) {
    evalScore.innerText = (scoreCp / 100).toFixed(2);
    // Simple clamp for now:
    var capped = Math.max(-1000, Math.min(1000, scoreCp));
    var k = 0.004; // Sensitivity
    var wpp = 100 / (1 + Math.exp(-k * scoreCp));

    evalBar.style.width = wpp + '%';
}

var config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
}
board = Chessboard('board', config);

// Resize handling
$(window).resize(board.resize);

// Button handlers
$('#load-btn').on('click', function () {
    var pgn = $('#pgn-input').val();
    game.load_pgn(pgn);
    board.position(game.fen());
    updateStatus();
});

$('#reset-btn').on('click', function () {
    game.reset();
    board.start();

    // Reset Eval UI explicitly
    evalScore.innerText = '0.00';
    evalBar.style.width = '50%';
    stockfish.postMessage('stop'); // Stop any running analysis

    updateStatus();
});

// Modal & Game Setup Logic
var $modal = $('#setup-modal');
var selectedColor = 'w';
var selectedStarter = 'user';

// Trigger Modal
$('#new-game-trigger').on('click', function () {
    $modal.addClass('active');
});

// Auto-open on load
$(document).ready(function () {
    $modal.addClass('active');
});

// Toggle Buttons in Modal
$('.color-choice button').on('click', function () {
    $('.color-choice button').removeClass('active');
    $(this).addClass('active');
    selectedColor = $(this).data('color');
});

$('.starter-choice button').on('click', function () {
    $('.starter-choice button').removeClass('active');
    $(this).addClass('active');
    selectedStarter = $(this).data('starter');
});

// Start Game
$('#start-game-btn').on('click', function () {
    $modal.removeClass('active');
    configureGame(selectedColor, selectedStarter);
});

function configureGame(color, starter) {
    playerColor = color; // 'w' or 'b'

    // Determine who starts (White or Black) based on user choice
    // Standard: White starts.
    // If User chose to Start, and User is Black -> Black starts (Custom FEN)
    // If Computer starts, and Computer is Black -> Black starts (Custom FEN)

    var startColor = 'w'; // Default
    if (starter === 'user') {
        startColor = playerColor;
    } else {
        startColor = (playerColor === 'w' ? 'b' : 'w');
    }

    // Construct FEN. Default start FEN with active color swapped if needed
    // Default: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
    var fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR ' + startColor + ' KQkq - 0 1';

    game.load(fen);
    board.orientation(playerColor === 'w' ? 'white' : 'black');
    board.position(game.fen());

    // Reset Eval
    evalScore.innerText = '0.00';
    evalBar.style.width = '50%';
    stockfish.postMessage('stop');

    updateStatus();

    // Trigger Computer if it's their turn
    if (starter === 'computer') {
        window.setTimeout(makeComputerMove, 500);
    }
}

// Ensure assisted move is possible even if turn == playerColor
// We modify makeComputerMove to allow it if explicitly called?
// No, the existing check `if (game.turn() === playerColor) return;` prevents self-play.
// We must remove that check or add an override.
