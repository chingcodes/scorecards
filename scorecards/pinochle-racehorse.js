// ---- State ----
let state = {
    players: ['Player 1', 'Player 2', 'Player 3', 'Player 4'],
    hands: [],
    gameOver: false,
    winnerIdx: null
};

// Non-persisted editing state for hand rows
// Keys are hand indices, values are 'edit' or 'confirm'
let editingHands = {};

let bidDialogHandIdx = null;
let bidSelectedPlayer = null;
let bidSelectedSuit = null;

let wakeLock = null;
let wakeLockActive = false;

const SUITS = {
    hearts:   { symbol: '\u2665', cls: 'suit-red' },
    diamonds: { symbol: '\u2666', cls: 'suit-red' },
    clubs:    { symbol: '\u2663', cls: 'suit-black' },
    spades:   { symbol: '\u2660', cls: 'suit-black' }
};

const MIN_BID = 4;
const WIN_SCORE = 50;
const STORAGE_KEY = 'pinochle-scorecard-state';

// ---- Persistence ----
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
}

function loadState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const loaded = JSON.parse(raw);
            if (loaded && Array.isArray(loaded.players) && Array.isArray(loaded.hands)) {
                state = loaded;
                return true;
            }
        }
    } catch (e) {}
    return false;
}

// ---- Initialization ----
function initializeScorecard() {
    loadState();
    renderControls();
    renderTable();
    renderNextHandButton();
    if (state.gameOver && state.winnerIdx !== null) {
        showGameEndOverlay(state.winnerIdx);
    }
}

// ---- Controls Bar (simplified) ----
function renderControls() {
    var bar = document.getElementById('controlsBar');
    var checkedAttr = wakeLockActive ? ' checked' : '';
    bar.innerHTML = '<button class="btn btn-game" onclick="showGameDialog()">Game</button>'
        + '<button class="btn btn-rules" onclick="openRulesOverlay()">Rules</button>'
        + '<label class="wake-lock-toggle" id="wakeLockToggle">'
        + '<input type="checkbox"' + checkedAttr + ' onchange="toggleWakeLock()">'
        + '<span class="toggle-label">Keep Screen Awake</span>'
        + '</label>';
}

// ---- Game Settings Dialog ----
function showGameDialog() {
    renderGameDialog();
    document.getElementById('gameOverlay').classList.remove('hidden');
}

function closeGameDialog() {
    document.getElementById('gameOverlay').classList.add('hidden');
}

function onGameOverlayClick(e) {
    if (e.target === document.getElementById('gameOverlay')) {
        closeGameDialog();
    }
}

function renderGameDialog() {
    var list = document.getElementById('gamePlayerList');
    var html = '';
    state.players.forEach(function(name, i) {
        html += '<div class="game-player-row">';
        if (i > 0) {
            html += '<button class="game-player-btn" onclick="movePlayer(' + i + ', -1)" title="Move left">&larr;</button>';
        } else {
            html += '<button class="game-player-btn" style="visibility:hidden">&larr;</button>';
        }
        html += '<input type="text" value="' + escAttr(name) + '" placeholder="Player ' + (i + 1) + '" oninput="updatePlayerName(' + i + ', this.value)">';
        if (i < state.players.length - 1) {
            html += '<button class="game-player-btn" onclick="movePlayer(' + i + ', 1)" title="Move right">&rarr;</button>';
        } else {
            html += '<button class="game-player-btn" style="visibility:hidden">&rarr;</button>';
        }
        if (state.players.length > 2) {
            html += '<button class="game-player-btn remove-btn" onclick="removePlayer(' + i + ')" title="Remove player">&times;</button>';
        }
        html += '</div>';
    });
    list.innerHTML = html;
}

// ---- Player Management ----
function updatePlayerName(idx, name) {
    state.players[idx] = name;
    saveState();
    renderTable();
}

function addPlayer() {
    state.players.push('Player ' + (state.players.length + 1));
    state.hands.forEach(function(h) {
        h.meld.push(null);
        h.tricks.push(null);
        h.scores.push(null);
    });
    saveState();
    renderGameDialog();
    renderTable();
}

function removePlayer(idx) {
    if (state.players.length <= 2) return;
    state.players.splice(idx, 1);
    state.hands.forEach(function(h) {
        h.meld.splice(idx, 1);
        h.tricks.splice(idx, 1);
        h.scores.splice(idx, 1);
        if (h.bidderIdx === idx) {
            h.bidderIdx = 0;
        } else if (h.bidderIdx > idx) {
            h.bidderIdx--;
        }
    });
    // Recalculate finalized hands
    state.hands.forEach(function(h, hIdx) {
        if (h.finalized) recalcHand(hIdx);
    });
    saveState();
    renderGameDialog();
    renderTable();
    renderNextHandButton();
}

function movePlayer(idx, direction) {
    var newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= state.players.length) return;
    swap(state.players, idx, newIdx);
    state.hands.forEach(function(h) {
        swap(h.meld, idx, newIdx);
        swap(h.tricks, idx, newIdx);
        swap(h.scores, idx, newIdx);
        if (h.bidderIdx === idx) h.bidderIdx = newIdx;
        else if (h.bidderIdx === newIdx) h.bidderIdx = idx;
    });
    saveState();
    renderGameDialog();
    renderTable();
}

function swap(arr, a, b) {
    var tmp = arr[a];
    arr[a] = arr[b];
    arr[b] = tmp;
}

// ---- Scoring Logic ----
function calculatePlayerScore(handIdx, playerIdx) {
    var hand = state.hands[handIdx];
    var meld = hand.meld[playerIdx] || 0;
    var tricks = hand.tricks[playerIdx] || 0;
    var isBidder = playerIdx === hand.bidderIdx;

    // Effective meld: voided if 0 tricks
    var effectiveMeld = (hand.tricks[playerIdx] !== null && tricks === 0) ? 0 : meld;
    var total = effectiveMeld + tricks;

    // Bidder set: total < bid
    if (isBidder && total < hand.bid) {
        return -(hand.bid);
    }

    return total;
}

function recalcHand(handIdx) {
    var hand = state.hands[handIdx];
    for (var p = 0; p < state.players.length; p++) {
        hand.scores[p] = calculatePlayerScore(handIdx, p);
    }
}

function finalizeHand(handIdx) {
    var hand = state.hands[handIdx];
    recalcHand(handIdx);
    hand.finalized = true;
    saveState();
    renderTable();
    renderNextHandButton();
    checkGameEnd();
}

function getPlayerRunningTotal(upToHandIdx) {
    var totals = new Array(state.players.length).fill(0);
    for (var h = 0; h <= upToHandIdx; h++) {
        var hand = state.hands[h];
        if (hand.finalized) {
            for (var p = 0; p < state.players.length; p++) {
                totals[p] += (hand.scores[p] || 0);
            }
        }
    }
    return totals;
}

// ---- Hand Editing State Machine ----
function toggleHandEdit(hIdx) {
    var hand = state.hands[hIdx];
    if (!hand || !hand.finalized) return;

    if (!editingHands[hIdx]) {
        // Default -> edit mode
        editingHands[hIdx] = 'edit';
    } else if (editingHands[hIdx] === 'edit') {
        // Edit -> confirm mode
        editingHands[hIdx] = 'confirm';
    } else if (editingHands[hIdx] === 'confirm') {
        // Confirm -> finalize and clear
        recalcHand(hIdx);
        saveState();
        delete editingHands[hIdx];
        // Check if scores changed enough to affect game end
        checkGameEnd();
    }
    renderTable();
    renderNextHandButton();
}

function deleteCurrentHand() {
    if (state.hands.length === 0) return;
    var lastHand = state.hands[state.hands.length - 1];
    if (lastHand.finalized) return; // safety: only delete unfinalized
    state.hands.pop();
    if (state.hands.length > 0) {
        state.hands[state.hands.length - 1].finalized = false;
    }
    saveState();
    renderTable();
    renderNextHandButton();
}

// ---- Table Rendering ----
function renderTable() {
    var numPlayers = state.players.length;

    // Thead - no Bid column, use # for hand
    var headHtml = '<tr><th>#</th>';
    for (var p = 0; p < numPlayers; p++) {
        headHtml += '<th>' + escHtml(state.players[p] || 'Player ' + (p + 1)) + '</th>';
    }
    headHtml += '</tr>';
    document.getElementById('scoreHead').innerHTML = headHtml;

    // Tbody
    var bodyHtml = '';
    state.hands.forEach(function(hand, hIdx) {
        if (hand.finalized && !editingHands[hIdx]) {
            bodyHtml += buildFinalizedRow(hIdx, hand);
        } else {
            bodyHtml += buildCurrentRow(hIdx, hand);
        }
    });
    document.getElementById('scoreBody').innerHTML = bodyHtml;
}

function buildFinalizedRow(hIdx, hand) {
    var numPlayers = state.players.length;
    var runningTotals = getPlayerRunningTotal(hIdx);
    var html = '<tr>';

    // Hand number - clickable to enter edit mode
    html += '<td class="hand-col" onclick="toggleHandEdit(' + hIdx + ')">' + (hIdx + 1) + '</td>';

    // Player cells
    for (var p = 0; p < numPlayers; p++) {
        var meld = hand.meld[p] !== null ? hand.meld[p] : 0;
        var tricks = hand.tricks[p] !== null ? hand.tricks[p] : 0;
        var score = hand.scores[p] || 0;
        var total = runningTotals[p];
        var isBidder = p === hand.bidderIdx;
        var noTricks = hand.tricks[p] !== null && tricks === 0;

        var effectiveMeld = noTricks ? 0 : meld;
        var isSet = isBidder && (effectiveMeld + tricks) < hand.bid;

        var meldClass = noTricks ? 'cell-meld struck' : 'cell-meld';
        var hsClass = isSet ? 'cell-hs set-text' : 'cell-hs';

        html += '<td>';
        // Bid badge in bidder's cell
        if (isBidder) {
            html += buildBidLabel(hIdx, hand) + '<br>';
        }
        // Stacked: line 1 = meld + counters = handScore, line 2 = total
        html += '<div class="' + meldClass + '">' + meld + ' + ' + tricks + ' = <span class="' + hsClass + '">' + score + '</span></div>';
        html += '<div class="cell-ts">' + total.toLocaleString() + '</div>';
        html += '</td>';
    }

    html += '</tr>';
    return html;
}

function buildCurrentRow(hIdx, hand) {
    var numPlayers = state.players.length;
    var isEditing = hand.finalized && editingHands[hIdx];
    var html = '<tr class="current-hand-row">';

    // Hand column with state-dependent icon
    if (isEditing) {
        var icon = editingHands[hIdx] === 'edit' ? '&#9999;' : '&#10004;';
        html += '<td class="hand-col" onclick="toggleHandEdit(' + hIdx + ')"><span class="hand-icon">' + icon + '</span></td>';
    } else {
        // Current unfinalized hand - show trash icon
        html += '<td class="hand-col" onclick="deleteCurrentHand()"><span class="hand-icon">&#128465;</span></td>';
    }

    for (var p = 0; p < numPlayers; p++) {
        var isBidder = p === hand.bidderIdx;
        var tdClass = isBidder ? ' class="bidder-highlight"' : '';
        html += '<td' + tdClass + '>';
        html += '<div class="cell-inputs">';

        // Bid badge in bidder's cell
        if (isBidder) {
            html += buildBidLabel(hIdx, hand);
        }

        // Meld input
        html += '<div class="input-row">';
        html += '<span class="input-label">Meld</span>';
        html += buildNumInput(hIdx, 'meld', p, hand.meld[p]);
        html += '</div>';

        // Tricks input
        html += '<div class="input-row">';
        html += '<span class="input-label">Counters</span>';
        html += buildNumInput(hIdx, 'tricks', p, hand.tricks[p]);
        html += '</div>';

        html += '</div>';
        html += '</td>';
    }

    html += '</tr>';
    return html;
}

function buildBidLabel(hIdx, hand) {
    var suitHtml = '';
    var badgeClass = 'bid-badge bid-badge-none';
    if (hand.suit && SUITS[hand.suit]) {
        suitHtml = SUITS[hand.suit].symbol + ' ';
        badgeClass = 'bid-badge ' + (SUITS[hand.suit].cls === 'suit-red' ? 'bid-badge-red' : 'bid-badge-black');
    }
    return '<span class="' + badgeClass + '" onclick="event.stopPropagation();showBidDialog(' + hIdx + ')" title="Edit bid">'
        + 'Bid ' + suitHtml + hand.bid + '</span>';
}

function buildNumInput(handIdx, field, playerIdx, value) {
    var id = 'input-' + handIdx + '-' + field + '-' + playerIdx;
    var displayVal = (value !== null && value !== undefined) ? value : '';
    return '<input type="number" class="score-input" id="' + id + '" inputmode="numeric" min="0" placeholder="0" value="' + displayVal + '"'
        + ' oninput="onScoreInput(' + handIdx + ',\'' + field + '\',' + playerIdx + ',this)">';
}

// ---- Score Input Handling ----
function onScoreInput(handIdx, field, playerIdx, inputEl) {
    var hand = state.hands[handIdx];
    var val = inputEl.value.trim();

    if (val === '') {
        hand[field][playerIdx] = null;
    } else {
        var n = parseInt(val);
        if (isNaN(n) || n < 0) n = 0;
        hand[field][playerIdx] = n;
        if (parseInt(val) < 0) inputEl.value = 0;
    }

    saveState();

    // Auto-finalize when all tricks are filled (only for non-finalized hands)
    var allTricksFilled = hand.tricks.every(function(t) { return t !== null; });
    if (allTricksFilled && !hand.finalized) {
        finalizeHand(handIdx);
    }
}

// ---- Next Hand Button ----
function renderNextHandButton() {
    var area = document.getElementById('nextHandArea');
    var canAdd = !state.gameOver && (state.hands.length === 0 || state.hands[state.hands.length - 1].finalized);
    if (canAdd) {
        area.innerHTML = '<div class="next-hand-area"><button class="next-hand-btn" onclick="showBidDialog(null)">Deal Next Hand</button></div>';
    } else {
        area.innerHTML = '';
    }
}

// ---- Bid Dialog ----
function showBidDialog(handIdx) {
    bidDialogHandIdx = handIdx;
    var isEdit = handIdx !== null && handIdx < state.hands.length;
    document.getElementById('bidDialogTitle').textContent = isEdit
        ? 'Edit Bid - Hand ' + (handIdx + 1)
        : 'New Hand - Hand ' + (state.hands.length + 1);

    var grid = document.getElementById('bidPlayerGrid');
    var html = '';
    state.players.forEach(function(name, i) {
        html += '<button class="player-select-btn" id="bidPlayer-' + i + '" onclick="selectBidPlayer(' + i + ')">' + escHtml(name || 'Player ' + (i + 1)) + '</button>';
    });
    grid.innerHTML = html;

    if (isEdit) {
        var h = state.hands[handIdx];
        bidSelectedPlayer = h.bidderIdx;
        bidSelectedSuit = h.suit;
        document.getElementById('bidAmountInput').value = h.bid;
    } else {
        bidSelectedPlayer = null;
        bidSelectedSuit = null;
        document.getElementById('bidAmountInput').value = MIN_BID;
    }

    updateBidPlayerHighlight();
    updateSuitHighlight();
    validateBidDialog();
    document.getElementById('bidOverlay').classList.remove('hidden');
}

function closeBidDialog() {
    document.getElementById('bidOverlay').classList.add('hidden');
}

function onBidOverlayClick(e) {
    if (e.target === document.getElementById('bidOverlay')) {
        closeBidDialog();
    }
}

function selectBidPlayer(idx) {
    bidSelectedPlayer = idx;
    updateBidPlayerHighlight();
    validateBidDialog();
}

function updateBidPlayerHighlight() {
    state.players.forEach(function(_, i) {
        var btn = document.getElementById('bidPlayer-' + i);
        if (btn) btn.classList.toggle('selected', i === bidSelectedPlayer);
    });
}

function selectTrumpSuit(suit) {
    bidSelectedSuit = (bidSelectedSuit === suit) ? null : suit;
    updateSuitHighlight();
}

function updateSuitHighlight() {
    ['hearts', 'diamonds', 'clubs', 'spades'].forEach(function(s) {
        document.getElementById('suitBtn-' + s).classList.toggle('selected', s === bidSelectedSuit);
    });
}

function validateBidDialog() {
    var bidVal = parseInt(document.getElementById('bidAmountInput').value);
    var valid = bidSelectedPlayer !== null && !isNaN(bidVal) && bidVal >= MIN_BID;
    document.getElementById('bidOkBtn').disabled = !valid;
}

function acceptBid() {
    var bidVal = parseInt(document.getElementById('bidAmountInput').value);
    if (bidSelectedPlayer === null || isNaN(bidVal) || bidVal < MIN_BID) return;

    var isEdit = bidDialogHandIdx !== null && bidDialogHandIdx < state.hands.length;
    if (isEdit) {
        var h = state.hands[bidDialogHandIdx];
        h.bidderIdx = bidSelectedPlayer;
        h.bid = bidVal;
        h.suit = bidSelectedSuit;
        if (h.finalized) {
            recalcHand(bidDialogHandIdx);
        }
    } else {
        var n = state.players.length;
        state.hands.push({
            bidderIdx: bidSelectedPlayer,
            bid: bidVal,
            suit: bidSelectedSuit,
            meld: new Array(n).fill(null),
            tricks: new Array(n).fill(null),
            scores: new Array(n).fill(null),
            finalized: false
        });
    }

    saveState();
    closeBidDialog();
    renderTable();
    renderNextHandButton();
}

// ---- Game End ----
function checkGameEnd() {
    var lastHand = state.hands[state.hands.length - 1];
    if (!lastHand || !lastHand.finalized) return;

    var candidates = [];
    var totals = getPlayerRunningTotal(state.hands.length - 1);
    for (var p = 0; p < state.players.length; p++) {
        if (totals[p] >= WIN_SCORE) {
            candidates.push({ idx: p, total: totals[p] });
        }
    }
    if (candidates.length === 0) return;

    // Bidder wins if they are >= 50
    var bidderIdx = lastHand.bidderIdx;
    if (totals[bidderIdx] >= WIN_SCORE) {
        declareWinner(bidderIdx);
        return;
    }

    candidates.sort(function(a, b) { return b.total - a.total; });
    declareWinner(candidates[0].idx);
}

function declareWinner(winnerIdx) {
    state.gameOver = true;
    state.winnerIdx = winnerIdx;
    saveState();
    renderNextHandButton();
    showGameEndOverlay(winnerIdx);
}

function showGameEndOverlay(winnerIdx) {
    var content = document.getElementById('gameEndContent');
    var winnerName = escHtml(state.players[winnerIdx] || 'Player ' + (winnerIdx + 1));
    var finalTotals = getPlayerRunningTotal(state.hands.length - 1);

    var html = '<h2>&#127942; Winner!</h2>';
    html += '<div class="winner-name">' + winnerName + '</div>';

    html += '<table class="final-grid"><thead><tr><th>Hand</th>';
    state.players.forEach(function(name) {
        html += '<th>' + escHtml(name || '?') + '</th>';
    });
    html += '</tr></thead><tbody>';

    state.hands.forEach(function(hand, hIdx) {
        html += '<tr><td>Hand ' + (hIdx + 1) + '</td>';
        for (var p = 0; p < state.players.length; p++) {
            var score = hand.scores[p] !== null ? hand.scores[p] : '-';
            var isBidder = p === hand.bidderIdx;
            var meld = hand.meld[p] || 0;
            var tricks = hand.tricks[p] || 0;
            var noTricks = hand.tricks[p] !== null && tricks === 0;
            var effectiveMeld = noTricks ? 0 : meld;
            var isSet = isBidder && hand.finalized && (effectiveMeld + tricks) < hand.bid;
            var cls = isSet ? 'set-score' : '';
            html += '<td class="' + cls + '">' + score + '</td>';
        }
        html += '</tr>';
    });

    html += '<tr class="total-row"><td>Total</td>';
    for (var p = 0; p < state.players.length; p++) {
        html += '<td>' + finalTotals[p].toLocaleString() + '</td>';
    }
    html += '</tr></tbody></table>';

    html += '<button class="btn-new-game" onclick="newGame()">New Game</button>';
    content.innerHTML = html;
    document.getElementById('gameEndOverlay').classList.remove('hidden');
}

function newGame() {
    document.getElementById('gameEndOverlay').classList.add('hidden');
    resetScorecard();
}

// ---- Rules Overlay ----
function openRulesOverlay() {
    document.getElementById('rulesOverlay').classList.remove('hidden');
}

function closeRulesOverlay() {
    document.getElementById('rulesOverlay').classList.add('hidden');
}

function onRulesOverlayClick(e) {
    if (e.target === document.getElementById('rulesOverlay')) {
        closeRulesOverlay();
    }
}

// ---- Reset ----
function resetScorecard() {
    if (!confirm('Reset the scorecard? This clears all hands but keeps player names.')) return;
    state.hands = [];
    state.gameOver = false;
    state.winnerIdx = null;
    editingHands = {};
    saveState();
    document.getElementById('gameEndOverlay').classList.add('hidden');
    renderTable();
    renderNextHandButton();
}

// ---- Utilities ----
function escHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function escAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---- Screen Wake Lock ----
async function toggleWakeLock() {
    if (!navigator.wakeLock) {
        alert('Screen Wake Lock is not supported in this browser.');
        return;
    }

    try {
        if (wakeLockActive) {
            if (wakeLock) {
                await wakeLock.release();
                wakeLock = null;
            }
            wakeLockActive = false;
        } else {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLockActive = true;

            // Re-acquire wake lock if page becomes visible again
            document.addEventListener('visibilitychange', async function handleVisibilityChange() {
                if (wakeLockActive && document.visibilityState === 'visible') {
                    try {
                        wakeLock = await navigator.wakeLock.request('screen');
                    } catch (e) {}
                }
            });
        }
        renderControls();
    } catch (e) {
        console.error('Failed to toggle wake lock:', e);
    }
}

// ---- Keyboard handler for overlays ----
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        if (!document.getElementById('gameOverlay').classList.contains('hidden')) {
            closeGameDialog();
        }
        if (!document.getElementById('rulesOverlay').classList.contains('hidden')) {
            closeRulesOverlay();
        }
        if (!document.getElementById('bidOverlay').classList.contains('hidden')) {
            closeBidDialog();
        }
        if (!document.getElementById('gameEndOverlay').classList.contains('hidden')) {
            document.getElementById('gameEndOverlay').classList.add('hidden');
        }
    }
});

// ---- Boot ----
document.addEventListener('DOMContentLoaded', initializeScorecard);
