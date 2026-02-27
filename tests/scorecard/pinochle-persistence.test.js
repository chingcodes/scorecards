import { describe, it, expect, beforeEach } from 'vitest';
import { loadPinochleScript, setupPinochleDom, createState, createHand, setState, resetState } from '../utils/pinochle-test-helpers.js';

describe('Pinochle localStorage Persistence', () => {
  beforeEach(() => {
    setupPinochleDom();
    loadPinochleScript();
    resetState();
    localStorage.clear();
  });

  describe('saveState', () => {
    it('should save state to localStorage', () => {
      const state = createState(['Alice', 'Bob', 'Charlie'], [
        createHand(0, 10, 'hearts', [5, 8, 6], [3, 2, 4], true)
      ]);
      state.hands[0].scores = [8, 10, 10];
      setState(state);

      window.saveState();

      const saved = localStorage.getItem('pinochle-scorecard-state');
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved);
      expect(parsed.players).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(parsed.hands.length).toBe(1);
      expect(parsed.hands[0].bid).toBe(10);
      expect(parsed.hands[0].suit).toBe('hearts');
    });

    it('should save complete game state including hands', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true),
        createHand(1, 12, 'spades', [10, 9], [7, 8], true)
      ]);
      state.hands[0].scores = [13, 18];
      state.hands[1].scores = [17, 17];
      setState(state);

      window.saveState();

      const saved = JSON.parse(localStorage.getItem('pinochle-scorecard-state'));
      expect(saved.hands.length).toBe(2);
      expect(saved.hands[0].meld).toEqual([8, 12]);
      expect(saved.hands[0].tricks).toEqual([5, 6]);
      expect(saved.hands[0].scores).toEqual([13, 18]);
      expect(saved.hands[1].suit).toBe('spades');
    });

    it('should save gameOver and winnerIdx', () => {
      const state = createState(['P1', 'P2'], []);
      state.gameOver = true;
      state.winnerIdx = 1;
      setState(state);

      window.saveState();

      const saved = JSON.parse(localStorage.getItem('pinochle-scorecard-state'));
      expect(saved.gameOver).toBe(true);
      expect(saved.winnerIdx).toBe(1);
    });

    it('should handle save errors gracefully', () => {
      // Mock localStorage.setItem to throw an error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };

      const state = createState(['P1', 'P2'], []);
      setState(state);

      // Should not throw
      expect(() => window.saveState()).not.toThrow();

      // Restore original
      localStorage.setItem = originalSetItem;
    });
  });

  describe('loadState', () => {
    it('should load state from localStorage', () => {
      const originalState = {
        players: ['Alice', 'Bob'],
        hands: [
          {
            bidderIdx: 0,
            bid: 10,
            suit: 'hearts',
            meld: [8, 12],
            tricks: [5, 6],
            scores: [13, 18],
            finalized: true
          }
        ],
        gameOver: false,
        winnerIdx: null
      };
      localStorage.setItem('pinochle-scorecard-state', JSON.stringify(originalState));

      const result = window.loadState();

      expect(result).toBe(true);
      expect(window.state.players).toEqual(['Alice', 'Bob']);
      expect(window.state.hands.length).toBe(1);
      expect(window.state.hands[0].bid).toBe(10);
      expect(window.state.hands[0].suit).toBe('hearts');
    });

    it('should return false if no saved state exists', () => {
      const result = window.loadState();

      expect(result).toBe(false);
    });

    it('should return false if localStorage has invalid JSON', () => {
      localStorage.setItem('pinochle-scorecard-state', 'invalid{json');

      const result = window.loadState();

      expect(result).toBe(false);
    });

    it('should return false if state is missing players array', () => {
      const invalidState = {
        hands: [],
        gameOver: false,
        winnerIdx: null
      };
      localStorage.setItem('pinochle-scorecard-state', JSON.stringify(invalidState));

      const result = window.loadState();

      expect(result).toBe(false);
    });

    it('should return false if state is missing hands array', () => {
      const invalidState = {
        players: ['P1', 'P2'],
        gameOver: false,
        winnerIdx: null
      };
      localStorage.setItem('pinochle-scorecard-state', JSON.stringify(invalidState));

      const result = window.loadState();

      expect(result).toBe(false);
    });

    it('should return false if state.players is not an array', () => {
      const invalidState = {
        players: 'not-an-array',
        hands: [],
        gameOver: false,
        winnerIdx: null
      };
      localStorage.setItem('pinochle-scorecard-state', JSON.stringify(invalidState));

      const result = window.loadState();

      expect(result).toBe(false);
    });

    it('should return false if state.hands is not an array', () => {
      const invalidState = {
        players: ['P1', 'P2'],
        hands: 'not-an-array',
        gameOver: false,
        winnerIdx: null
      };
      localStorage.setItem('pinochle-scorecard-state', JSON.stringify(invalidState));

      const result = window.loadState();

      expect(result).toBe(false);
    });

    it('should handle load errors gracefully', () => {
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = () => {
        throw new Error('Storage access denied');
      };

      const result = window.loadState();

      expect(result).toBe(false);

      localStorage.getItem = originalGetItem;
    });
  });

  describe('Save/Load Round Trip', () => {
    it('should preserve all data through save and load cycle', () => {
      const originalState = createState(['Alice', 'Bob', 'Charlie'], [
        createHand(0, 10, 'hearts', [8, 10, 12], [5, 6, 7], true),
        createHand(1, 15, 'spades', [12, 9, 14], [8, 7, 9], true),
        createHand(2, 12, null, [6, 11, 8], [4, 5, 3], false)
      ]);
      originalState.hands[0].scores = [13, 16, 19];
      originalState.hands[1].scores = [20, 16, 23];
      originalState.gameOver = false;
      originalState.winnerIdx = null;
      setState(originalState);

      window.saveState();
      resetState();
      const loaded = window.loadState();

      expect(loaded).toBe(true);
      expect(window.state.players).toEqual(['Alice', 'Bob', 'Charlie']);
      expect(window.state.hands.length).toBe(3);
      expect(window.state.hands[0].bidderIdx).toBe(0);
      expect(window.state.hands[0].bid).toBe(10);
      expect(window.state.hands[0].suit).toBe('hearts');
      expect(window.state.hands[0].meld).toEqual([8, 10, 12]);
      expect(window.state.hands[0].tricks).toEqual([5, 6, 7]);
      expect(window.state.hands[0].scores).toEqual([13, 16, 19]);
      expect(window.state.hands[0].finalized).toBe(true);
      expect(window.state.hands[2].finalized).toBe(false);
      expect(window.state.gameOver).toBe(false);
      expect(window.state.winnerIdx).toBe(null);
    });

    it('should preserve game over state', () => {
      const originalState = createState(['P1', 'P2'], [
        createHand(0, 10, null, [30, 25], [25, 20], true)
      ]);
      originalState.hands[0].scores = [55, 45];
      originalState.gameOver = true;
      originalState.winnerIdx = 0;
      setState(originalState);

      window.saveState();
      resetState();
      window.loadState();

      expect(window.state.gameOver).toBe(true);
      expect(window.state.winnerIdx).toBe(0);
    });

    it('should preserve null suit', () => {
      const originalState = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true)
      ]);
      setState(originalState);

      window.saveState();
      resetState();
      window.loadState();

      expect(window.state.hands[0].suit).toBe(null);
    });

    it('should preserve null values in meld and tricks', () => {
      const originalState = createState(['P1', 'P2'], [
        createHand(0, 10, null, [null, 12], [5, null], false)
      ]);
      setState(originalState);

      window.saveState();
      resetState();
      window.loadState();

      expect(window.state.hands[0].meld).toEqual([null, 12]);
      expect(window.state.hands[0].tricks).toEqual([5, null]);
    });
  });
});
