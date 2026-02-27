import { describe, it, expect, beforeEach } from 'vitest';
import { loadPinochleScript, setupPinochleDom, createState, createHand, setState, resetState } from '../utils/pinochle-test-helpers.js';

describe('Pinochle Full Game Integration Tests', () => {
  beforeEach(() => {
    setupPinochleDom();
    loadPinochleScript();
    resetState();
  });

  it('should complete a full game where a player wins normally', () => {
    const state = createState(['Alice', 'Bob', 'Charlie'], []);
    setState(state);

    // Hand 1: Alice bids and makes it
    const hand1 = createHand(0, 10, 'hearts', [8, 6, 5], [4, 3, 2], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    expect(window.state.hands[0].finalized).toBe(true);
    expect(window.state.hands[0].scores).toEqual([12, 9, 7]); // Alice: 8+4, Bob: 6+3, Charlie: 5+2
    expect(window.state.gameOver).toBe(false);

    // Hand 2: Bob bids and makes it
    const hand2 = createHand(1, 12, 'spades', [10, 8, 9], [5, 6, 4], false);
    window.state.hands.push(hand2);
    window.finalizeHand(1);

    expect(window.state.hands[1].scores).toEqual([15, 14, 13]);
    let totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([27, 23, 20]); // Running totals
    expect(window.state.gameOver).toBe(false);

    // Hand 3: Charlie bids and makes it, pushing Alice over 50
    const hand3 = createHand(2, 15, 'diamonds', [12, 10, 14], [8, 7, 9], false);
    window.state.hands.push(hand3);
    window.finalizeHand(2);

    expect(window.state.hands[2].scores).toEqual([20, 17, 23]);
    totals = window.getPlayerRunningTotal(2);
    expect(totals).toEqual([47, 40, 43]);
    expect(window.state.gameOver).toBe(false); // No one at 50 yet

    // Hand 4: Alice bids again and wins the game
    const hand4 = createHand(0, 12, 'clubs', [8, 6, 7], [5, 4, 3], false);
    window.state.hands.push(hand4);
    window.finalizeHand(3);

    expect(window.state.hands[3].scores).toEqual([13, 10, 10]);
    totals = window.getPlayerRunningTotal(3);
    expect(totals).toEqual([60, 50, 53]); // Alice wins with 60
    expect(window.state.gameOver).toBe(true);
    expect(window.state.winnerIdx).toBe(0); // Alice wins
  });

  it('should complete a game where bidder wins with priority at 50', () => {
    const state = createState(['P1', 'P2', 'P3'], []);
    setState(state);

    // Hand 1: Build up scores
    const hand1 = createHand(0, 15, 'hearts', [18, 15, 12], [10, 8, 6], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    expect(window.state.hands[0].scores).toEqual([28, 23, 18]);

    // Hand 2: Get everyone close to 50
    const hand2 = createHand(1, 18, 'spades', [14, 15, 18], [8, 10, 10], false);
    window.state.hands.push(hand2);
    window.finalizeHand(1);

    let totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([50, 48, 46]); // P1 at 50, but P2 (bidder) not yet
    expect(window.state.gameOver).toBe(true); // Game ends when anyone reaches 50
    expect(window.state.winnerIdx).toBe(0); // P1 wins (highest scorer)

    // Now test bidder priority: if bidder also at 50+, they win even if not highest
    window.state.gameOver = false; // Reset for next scenario
    window.state.winnerIdx = null;

    const hand3 = createHand(2, 10, 'clubs', [5, 6, 8], [2, 3, 2], false);
    window.state.hands.push(hand3);
    window.finalizeHand(2);

    const finalTotals = window.getPlayerRunningTotal(2);
    expect(finalTotals).toEqual([57, 57, 56]); // P1 and P2 (bidder) tied at 57
    expect(window.state.gameOver).toBe(true);
    expect(window.state.winnerIdx).toBe(2); // P3 (bidder of last hand) wins with priority
  });

  it('should complete a game with multiple bidder sets', () => {
    const state = createState(['P1', 'P2', 'P3'], []);
    setState(state);

    // Hand 1: P1 bids and gets set
    const hand1 = createHand(0, 20, 'hearts', [8, 15, 12], [2, 8, 6], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    expect(window.state.hands[0].scores).toEqual([-20, 23, 18]); // P1 set

    // Hand 2: P2 makes their bid
    const hand2 = createHand(1, 15, 'spades', [10, 12, 14], [6, 5, 7], false);
    window.state.hands.push(hand2);
    window.finalizeHand(1);

    let totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([-4, 40, 39]); // P1 still negative

    // Hand 3: P3 gets set
    const hand3 = createHand(2, 25, 'diamonds', [16, 18, 10], [9, 10, 4], false);
    window.state.hands.push(hand3);
    window.finalizeHand(2);

    totals = window.getPlayerRunningTotal(2);
    expect(totals).toEqual([21, 68, 14]); // P2 wins
    expect(window.state.gameOver).toBe(true);
    expect(window.state.winnerIdx).toBe(1);
  });

  it('should handle void meld affecting game outcome', () => {
    const state = createState(['P1', 'P2'], []);
    setState(state);

    // Hand 1: Both players score normally
    const hand1 = createHand(0, 12, 'hearts', [15, 18], [8, 10], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    expect(window.state.hands[0].scores).toEqual([23, 28]);

    // Hand 2: P2 gets 0 tricks, voiding their large meld AND getting set
    const hand2 = createHand(1, 10, 'spades', [10, 25], [6, 0], false);
    window.state.hands.push(hand2);
    window.finalizeHand(1);

    expect(window.state.hands[1].scores).toEqual([16, -10]); // P2's meld voided (0 tricks), then set (0 < 10)
    let totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([39, 18]); // P1: 23+16=39, P2: 28-10=18

    // Hand 3: P1 wins
    const hand3 = createHand(0, 10, 'clubs', [8, 6], [5, 4], false);
    window.state.hands.push(hand3);
    window.finalizeHand(2);

    totals = window.getPlayerRunningTotal(2);
    expect(totals).toEqual([52, 28]); // P1: 39+13=52, P2: 18+10=28
    expect(window.state.gameOver).toBe(true);
    expect(window.state.winnerIdx).toBe(0);
  });

  it('should allow editing past hand and recalculate running totals', () => {
    const state = createState(['P1', 'P2'], []);
    setState(state);

    // Hand 1 and 2: Build up scores
    const hand1 = createHand(0, 10, 'hearts', [12, 15], [8, 10], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    const hand2 = createHand(1, 12, 'spades', [14, 16], [10, 12], false);
    window.state.hands.push(hand2);
    window.finalizeHand(1);

    let totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([44, 53]);

    // Edit hand 1
    window.toggleHandEdit(0); // Enter edit mode
    window.state.hands[0].meld[0] = 15; // Change P1's meld from 12 to 15
    window.toggleHandEdit(0); // Enter confirm mode
    window.toggleHandEdit(0); // Confirm edit

    // Hand 1 should be recalculated
    expect(window.state.hands[0].scores[0]).toBe(23); // 15+8

    // Running totals should reflect the change
    totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([47, 53]); // P1 gained 3 points
  });

  it('should reset scorecard and start new game', () => {
    const state = createState(['Alice', 'Bob'], []);
    setState(state);

    // Play some hands
    const hand1 = createHand(0, 10, null, [30, 25], [25, 20], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    expect(window.state.hands.length).toBe(1);
    expect(window.state.gameOver).toBe(true);

    // Mock confirm dialog
    window.confirm = () => true;

    // Reset
    window.resetScorecard();

    expect(window.state.hands.length).toBe(0);
    expect(window.state.gameOver).toBe(false);
    expect(window.state.winnerIdx).toBe(null);
    expect(window.state.players).toEqual(['Alice', 'Bob']); // Players preserved
  });

  it('should handle dynamic player addition mid-game', () => {
    const state = createState(['P1', 'P2'], []);
    setState(state);

    // Play a hand with 2 players
    const hand1 = createHand(0, 10, null, [12, 15], [8, 10], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    expect(window.state.hands[0].scores).toEqual([20, 25]);

    // Add a third player
    window.addPlayer();

    expect(window.state.players.length).toBe(3);
    expect(window.state.hands[0].meld.length).toBe(3);
    expect(window.state.hands[0].meld[2]).toBe(null);
    expect(window.state.hands[0].scores[2]).toBe(null);

    // Play another hand with 3 players
    const hand2 = createHand(1, 12, 'hearts', [10, 8, 14], [6, 5, 7], false);
    window.state.hands.push(hand2);
    window.finalizeHand(1);

    const totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([36, 38, 21]); // P3 only has score from hand 2
  });

  it('should preserve and restore complete game state via localStorage', () => {
    const state = createState(['Alice', 'Bob', 'Charlie'], []);
    setState(state);

    // Play multiple hands
    const hand1 = createHand(0, 10, 'hearts', [12, 10, 8], [6, 5, 4], false);
    window.state.hands.push(hand1);
    window.finalizeHand(0);

    const hand2 = createHand(1, 15, 'spades', [14, 12, 16], [8, 7, 9], false);
    window.state.hands.push(hand2);
    window.finalizeHand(1);

    // Save state
    window.saveState();

    // Simulate page reload
    resetState();
    const loaded = window.loadState();

    expect(loaded).toBe(true);
    expect(window.state.players).toEqual(['Alice', 'Bob', 'Charlie']);
    expect(window.state.hands.length).toBe(2);

    // Verify running totals are correct after reload
    const totals = window.getPlayerRunningTotal(1);
    expect(totals).toEqual([40, 34, 37]); // Alice: 18+22, Bob: 15+19, Charlie: 12+25

    // Continue playing
    const hand3 = createHand(2, 12, null, [8, 10, 6], [4, 5, 3], false);
    window.state.hands.push(hand3);
    window.finalizeHand(2);

    const finalTotals = window.getPlayerRunningTotal(2);
    expect(finalTotals).toEqual([52, 49, 25]); // Alice: 52 wins (Charlie set: 6+3=9 < 12)
    expect(window.state.gameOver).toBe(true);
    expect(window.state.winnerIdx).toBe(0);
  });
});
