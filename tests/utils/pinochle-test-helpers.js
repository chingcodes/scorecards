/**
 * Test helper utilities for pinochle scorecard tests
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Track if script has been loaded to avoid redeclaration errors
let scriptLoaded = false;

/**
 * Load the pinochle scorecard JavaScript into the global scope
 * This allows tests to access the global functions defined in the script
 * Only loads once to avoid redeclaration errors
 */
export function loadPinochleScript() {
  if (scriptLoaded) {
    return;
  }

  const scriptPath = resolve(process.cwd(), 'scorecards/pinochle-racehorse.js');
  let scriptContent = readFileSync(scriptPath, 'utf-8');

  // Remove the DOMContentLoaded event listener since we control initialization in tests
  scriptContent = scriptContent.replace(/document\.addEventListener\('DOMContentLoaded', initializeScorecard\);/, '');

  // Replace top-level variable declarations to use window
  scriptContent = scriptContent.replace(/^let state =/gm, 'window.state =');
  scriptContent = scriptContent.replace(/^let editingHands =/gm, 'window.editingHands =');
  scriptContent = scriptContent.replace(/^let bidDialogHandIdx =/gm, 'window.bidDialogHandIdx =');
  scriptContent = scriptContent.replace(/^let bidSelectedPlayer =/gm, 'window.bidSelectedPlayer =');
  scriptContent = scriptContent.replace(/^let bidSelectedSuit =/gm, 'window.bidSelectedSuit =');
  scriptContent = scriptContent.replace(/^const SUITS =/gm, 'window.SUITS =');
  scriptContent = scriptContent.replace(/^const MIN_BID =/gm, 'window.MIN_BID =');
  scriptContent = scriptContent.replace(/^const WIN_SCORE =/gm, 'window.WIN_SCORE =');
  scriptContent = scriptContent.replace(/^const STORAGE_KEY =/gm, 'window.STORAGE_KEY =');

  // Replace function declarations
  scriptContent = scriptContent.replace(/^function (\w+)\(/gm, 'window.$1 = function (');

  // Helper function to replace variable references with window.property
  // Skips replacements inside string literals and after window. or .
  function replaceWithWindow(varName, windowName) {
    const pattern = new RegExp(`\\b${varName}\\b`, 'g');
    scriptContent = scriptContent.replace(pattern, (match, offset) => {
      // Don't replace if preceded by 'window.' or if it's a property name (preceded by '.')
      if (offset > 0 && scriptContent.substring(Math.max(0, offset - 7), offset).match(/window\.$/)) return match;
      if (offset > 0 && scriptContent[offset - 1] === '.') return match;

      // Don't replace inside string literals - check if we're between quotes
      const before = scriptContent.substring(0, offset);
      const singleQuotes = (before.match(/'/g) || []).length;
      const doubleQuotes = (before.match(/"/g) || []).length;
      const backticks = (before.match(/`/g) || []).length;

      // If odd number of quotes before this position, we're inside a string
      if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) return match;

      return windowName;
    });
  }

  // Replace references to global variables with window.property
  replaceWithWindow('state', 'window.state');
  replaceWithWindow('editingHands', 'window.editingHands');
  replaceWithWindow('bidDialogHandIdx', 'window.bidDialogHandIdx');
  replaceWithWindow('bidSelectedPlayer', 'window.bidSelectedPlayer');
  replaceWithWindow('bidSelectedSuit', 'window.bidSelectedSuit');
  replaceWithWindow('SUITS', 'window.SUITS');
  replaceWithWindow('MIN_BID', 'window.MIN_BID');
  replaceWithWindow('WIN_SCORE', 'window.WIN_SCORE');
  replaceWithWindow('STORAGE_KEY', 'window.STORAGE_KEY');

  // Eval in global scope
  try {
    (1, eval)(scriptContent);
  } catch (e) {
    console.error('Error loading pinochle script:', e);
    throw e;
  }

  scriptLoaded = true;
}

/**
 * Create a minimal DOM structure for pinochle scorecard
 * This provides the essential DOM elements that the JavaScript expects
 */
export function setupPinochleDom() {
  document.body.innerHTML = `
    <div id="controlsBar"></div>
    <table class="score-table" id="scoreTable">
      <thead id="scoreHead"></thead>
      <tbody id="scoreBody"></tbody>
    </table>
    <div id="nextHandArea"></div>

    <!-- Bid dialog -->
    <div class="overlay hidden" id="bidOverlay">
      <div class="dialog" id="bidDialog">
        <h2 id="bidDialogTitle">New Hand</h2>
        <div class="player-select-grid" id="bidPlayerGrid"></div>
        <input type="number" class="bid-input" id="bidAmountInput" value="4">
        <button id="suitBtn-hearts"></button>
        <button id="suitBtn-diamonds"></button>
        <button id="suitBtn-clubs"></button>
        <button id="suitBtn-spades"></button>
        <button id="bidOkBtn"></button>
      </div>
    </div>

    <!-- Game overlay -->
    <div class="overlay hidden" id="gameOverlay">
      <div id="gamePlayerList"></div>
    </div>

    <!-- Rules overlay -->
    <div class="rules-overlay hidden" id="rulesOverlay"></div>

    <!-- Game end overlay -->
    <div class="game-end-overlay hidden" id="gameEndOverlay">
      <div id="gameEndContent"></div>
    </div>
  `;
}

/**
 * Factory function to create a test state object
 * @param {string[]} players - Array of player names
 * @param {object[]} hands - Array of hand objects
 * @returns {object} State object
 */
export function createState(players = ['P1', 'P2', 'P3', 'P4'], hands = []) {
  return {
    players,
    hands,
    gameOver: false,
    winnerIdx: null
  };
}

/**
 * Factory function to create a test hand object
 * @param {number} bidderIdx - Index of the bidder
 * @param {number} bid - Bid amount
 * @param {string|null} suit - Trump suit ('hearts', 'diamonds', 'clubs', 'spades', or null)
 * @param {number[]} meld - Array of meld values for each player
 * @param {number[]} tricks - Array of trick values for each player
 * @param {boolean} finalized - Whether the hand is finalized
 * @returns {object} Hand object
 */
export function createHand(bidderIdx, bid, suit, meld, tricks, finalized = false) {
  const numPlayers = meld.length;
  return {
    bidderIdx,
    bid,
    suit,
    meld,
    tricks,
    scores: new Array(numPlayers).fill(null),
    finalized
  };
}

/**
 * Calculate running totals up to a given hand index
 * @param {object} state - The game state
 * @param {number} upToHandIdx - Calculate totals up to this hand index (inclusive)
 * @returns {number[]} Array of running totals for each player
 */
export function getRunningTotals(state, upToHandIdx) {
  const totals = new Array(state.players.length).fill(0);
  for (let h = 0; h <= upToHandIdx && h < state.hands.length; h++) {
    const hand = state.hands[h];
    if (hand.finalized) {
      for (let p = 0; p < state.players.length; p++) {
        totals[p] += (hand.scores[p] || 0);
      }
    }
  }
  return totals;
}

/**
 * Set the global state for testing
 * In jsdom, the script variables are on window, not global
 * @param {object} newState - The state to set
 */
export function setState(newState) {
  window.state = newState;
}

/**
 * Get the current global state
 * @returns {object} The current state
 */
export function getState() {
  return window.state;
}

/**
 * Reset global state to a clean initial state
 */
export function resetState() {
  window.state = createState();
  window.editingHands = {};
  window.bidDialogHandIdx = null;
  window.bidSelectedPlayer = null;
  window.bidSelectedSuit = null;
}
