import { describe, it, expect, beforeEach } from 'vitest';
import { loadPinochleScript, setupPinochleDom, createState, createHand, setState, resetState } from '../utils/pinochle-test-helpers.js';

describe('Pinochle Scoring Logic', () => {
  beforeEach(() => {
    setupPinochleDom();
    loadPinochleScript();
    resetState();
  });

  describe('calculatePlayerScore', () => {
    it('should calculate normal score for non-bidder (meld + tricks)', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 10, null, [5, 8, 3, 6], [2, 4, 1, 3], true)
      ]);
      setState(state);

      // Player 1 (bidder): not tested here
      // Player 2 (non-bidder): meld=8, tricks=4 -> score=12
      expect(window.calculatePlayerScore(0, 1)).toBe(12);
      // Player 3 (non-bidder): meld=3, tricks=1 -> score=4
      expect(window.calculatePlayerScore(0, 2)).toBe(4);
      // Player 4 (non-bidder): meld=6, tricks=3 -> score=9
      expect(window.calculatePlayerScore(0, 3)).toBe(9);
    });

    it('should apply bidder set penalty when total < bid', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 15, 'hearts', [8, 10, 5, 12], [2, 3, 4, 1], true)
      ]);
      setState(state);

      // Bidder: meld=8, tricks=2, total=10, bid=15 -> score=-15 (set)
      expect(window.calculatePlayerScore(0, 0)).toBe(-15);

      // Non-bidders should calculate normally
      expect(window.calculatePlayerScore(0, 1)).toBe(13); // 10+3
      expect(window.calculatePlayerScore(0, 2)).toBe(9);  // 5+4
      expect(window.calculatePlayerScore(0, 3)).toBe(13); // 12+1
    });

    it('should apply void meld rule when player wins 0 tricks', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(1, 10, null, [15, 8, 20, 5], [3, 2, 0, 1], true)
      ]);
      setState(state);

      // Player 1: meld=15, tricks=3 -> score=18
      expect(window.calculatePlayerScore(0, 0)).toBe(18);
      // Player 2 (bidder): meld=8, tricks=2, total=10, bid=10 -> score=10 (makes bid)
      expect(window.calculatePlayerScore(0, 1)).toBe(10);
      // Player 3: meld=20, tricks=0 -> meld voided -> score=0
      expect(window.calculatePlayerScore(0, 2)).toBe(0);
      // Player 4: meld=5, tricks=1 -> score=6
      expect(window.calculatePlayerScore(0, 3)).toBe(6);
    });

    it('should apply void meld rule before bidder set penalty', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(2, 20, 'spades', [10, 8, 15, 12], [3, 2, 0, 1], true)
      ]);
      setState(state);

      // Player 3 (bidder): meld=15, tricks=0
      // First void meld: effectiveMeld=0
      // Then check set: total=0, bid=20 -> score=-20
      expect(window.calculatePlayerScore(0, 2)).toBe(-20);
    });

    it('should handle bidder making their bid exactly', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(1, 12, 'diamonds', [6, 7, 4, 8], [4, 5, 2, 3], true)
      ]);
      setState(state);

      // Player 2 (bidder): meld=7, tricks=5, total=12, bid=12 -> score=12 (exact)
      expect(window.calculatePlayerScore(0, 1)).toBe(12);
    });

    it('should handle bidder exceeding their bid', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 10, 'clubs', [8, 5, 3, 6], [5, 4, 2, 3], true)
      ]);
      setState(state);

      // Player 1 (bidder): meld=8, tricks=5, total=13, bid=10 -> score=13 (exceeds bid)
      expect(window.calculatePlayerScore(0, 0)).toBe(13);
    });

    it('should handle null meld and tricks as 0', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [null, 5], [null, 3], false)
      ]);
      setState(state);

      // Player 1: meld=null->0, tricks=null->0 -> total=0
      expect(window.calculatePlayerScore(0, 0)).toBe(-10); // Bidder set (0 < 10)
      // Player 2: meld=5, tricks=3 -> score=8
      expect(window.calculatePlayerScore(0, 1)).toBe(8);
    });

    it('should handle edge case: bidder with minimum bid', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(1, 4, null, [1, 2, 3], [1, 1, 2], true)
      ]);
      setState(state);

      // Player 2 (bidder): meld=2, tricks=1, total=3, bid=4 -> score=-4 (set)
      expect(window.calculatePlayerScore(0, 1)).toBe(-4);
    });

    it('should handle large meld and tricks values', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 25, 'hearts', [20, 15], [10, 8], true)
      ]);
      setState(state);

      // Player 1 (bidder): meld=20, tricks=10, total=30, bid=25 -> score=30
      expect(window.calculatePlayerScore(0, 0)).toBe(30);
      // Player 2: meld=15, tricks=8 -> score=23
      expect(window.calculatePlayerScore(0, 1)).toBe(23);
    });
  });

  describe('recalcHand', () => {
    it('should recalculate scores for all players in a hand', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 12, null, [9, 6, 10, 4], [3, 5, 2, 4], true)
      ]);
      setState(state);

      window.recalcHand(0);

      const hand = window.state.hands[0];
      expect(hand.scores[0]).toBe(12); // bidder: 9+3=12 (makes bid exactly)
      expect(hand.scores[1]).toBe(11); // 6+5
      expect(hand.scores[2]).toBe(12); // 10+2
      expect(hand.scores[3]).toBe(8);  // 4+4
    });

    it('should apply void meld rule during recalculation', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(1, 10, null, [15, 8, 20], [3, 2, 0], true)
      ]);
      setState(state);

      window.recalcHand(0);

      const hand = window.state.hands[0];
      expect(hand.scores[0]).toBe(18); // 15+3
      expect(hand.scores[1]).toBe(10); // bidder: 8+2
      expect(hand.scores[2]).toBe(0);  // meld voided (0 tricks)
    });

    it('should apply bidder set penalty during recalculation', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(2, 18, 'spades', [10, 12, 8], [4, 3, 2], true)
      ]);
      setState(state);

      window.recalcHand(0);

      const hand = window.state.hands[0];
      expect(hand.scores[0]).toBe(14);  // 10+4
      expect(hand.scores[1]).toBe(15);  // 12+3
      expect(hand.scores[2]).toBe(-18); // bidder set: 8+2=10 < 18
    });
  });

  describe('getPlayerRunningTotal', () => {
    it('should calculate running totals across multiple hands', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 10, null, [5, 8, 6], [3, 2, 4], true),
        createHand(1, 12, null, [7, 6, 10], [4, 5, 3], true),
        createHand(2, 8, null, [4, 9, 3], [2, 3, 1], true)
      ]);
      // Manually set scores for finalized hands
      state.hands[0].scores = [8, 10, 10];  // Hand 1
      state.hands[1].scores = [11, 11, 13]; // Hand 2
      state.hands[2].scores = [6, 12, 4];   // Hand 3
      setState(state);

      const totals = window.getPlayerRunningTotal(2);
      expect(totals).toEqual([25, 33, 27]); // Sum of all hands
    });

    it('should only count finalized hands', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [5, 8], [3, 2], true),
        createHand(1, 12, null, [7, 6], [4, 5], false) // Not finalized
      ]);
      state.hands[0].scores = [8, 10];
      state.hands[1].scores = [11, 11];
      setState(state);

      const totals = window.getPlayerRunningTotal(1);
      expect(totals).toEqual([8, 10]); // Only hand 0 counted
    });

    it('should handle negative scores from bidder set', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 15, null, [8, 10, 12], [2, 5, 4], true),
        createHand(1, 18, null, [9, 7, 11], [3, 2, 6], true)
      ]);
      state.hands[0].scores = [-15, 15, 16]; // P1 set
      state.hands[1].scores = [12, -18, 17]; // P2 set
      setState(state);

      const totals = window.getPlayerRunningTotal(1);
      expect(totals).toEqual([-3, -3, 33]);
    });
  });
});
