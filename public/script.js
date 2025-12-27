// script.js
var board = null;
var game = new Chess();
var $status = $('#status');
var $fen = $('#fen');
var $pgn = $('#pgn');

var playerColor = 'w'; // 'w' or 'b'

// Drag functions removed for Click-to-Move Interaction


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
    $status.html(status);
    $fen.html(game.fen());
    $pgn.html(game.pgn());

    updateMoveHistory();

    // Show Game Over Modal if needed
    if (game.game_over()) {
        showGameOverModal(status);
        return;
    }

    // Run Stockfish analysis
    if (game.history().length === 0) {
        evalScore.innerText = '0.00';
        evalBar.style.width = '50%';
        return;
    }
    analyzePosition();
}

// Game Over Modal Logic
var $gameOverModal = $('#game-over-modal');

function showGameOverModal(message) {
    // Extract reason
    var title = "Game Over";
    var reason = message;

    if (game.in_checkmate()) {
        title = "Checkmate!";
        reason = (game.turn() === 'w' ? "Black" : "White") + " wins!";
    } else if (game.in_draw()) {
        title = "Draw";
        reason = "Game drawn by repetition or insufficient material.";
    }

    $('#game-over-title').text(title);
    $('#game-over-reason').text(reason);
    $gameOverModal.addClass('active');
}

$('#modal-new-game').on('click', function () {
    $gameOverModal.removeClass('active');
    $modal.addClass('active'); // Open Setup Modal
});

$('#modal-undo').on('click', function () {
    // Undo 2 moves (Computer + User) to get back to user turn
    game.undo(); // Computer's move
    game.undo(); // User's move

    board.position(game.fen());
    updateStatus();
    $gameOverModal.removeClass('active');

    // Resume analysis if needed, but wait for user input
    stockfish.postMessage('stop');
});

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

// --- Click-to-Move Logic ---
var selectedSquare = null;

// Handle Click
$('#board').on('click', '.square-55d63', function () {
    // Blocking if game over
    if (game.game_over()) return;

    // STRICTLY check if it is player's turn to move.
    // We do NOT want to select pieces if it's the computer's turn to think.
    if (game.turn() !== playerColor) return;

    var square = $(this).data('square');
    var piece = game.get(square);

    // Case 1: Clicked on a piece that belongs to the player (Selection)
    if (piece && piece.color === playerColor) {
        // Safe re-select
        removeHighlights();
        selectedSquare = square;
        highlightSquare(square, 'highlight-selected');

        // Highlight legal moves
        var moves = game.moves({
            square: square,
            verbose: true
        });

        for (var i = 0; i < moves.length; i++) {
            var targetClass = 'highlight-move';
            // Check if capture for different styling
            if (game.get(moves[i].to)) {
                targetClass += ' capture-hint';
            }
            highlightSquare(moves[i].to, targetClass);
        }
        return;
    }

    // Case 2: Clicked on an empty square or enemy piece (Attempt Move)
    if (selectedSquare) {
        // Try to move
        var move = game.move({
            from: selectedSquare,
            to: square,
            promotion: 'q' // NOTE: always promote to a queen
        });

        // If illegal move, `move` is null
        if (move === null) {
            // Clicked invalid square, just clear selection
            removeHighlights();
            selectedSquare = null;
        } else {
            // Legal move!
            removeHighlights();
            selectedSquare = null;

            board.position(game.fen());
            updateStatus();

            // Trigger computer response
            window.setTimeout(makeComputerMove, 250);
        }
    }
});

function removeHighlights() {
    $('#board .square-55d63').removeClass('highlight-selected highlight-move capture-hint');
}

function highlightSquare(square, className) {
    $('#board .square-' + square).addClass(className);
}

var config = {
    draggable: false, // Drag disabled
    position: 'start',
    // No drag handlers needed
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
