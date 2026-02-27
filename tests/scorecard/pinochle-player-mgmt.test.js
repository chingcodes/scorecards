import { describe, it, expect, beforeEach } from 'vitest';
import { loadPinochleScript, setupPinochleDom, createState, createHand, setState, resetState } from '../utils/pinochle-test-helpers.js';

describe('Pinochle Player Management', () => {
  beforeEach(() => {
    setupPinochleDom();
    loadPinochleScript();
    resetState();
  });

  describe('addPlayer', () => {
    it('should add a new player to the players array', () => {
      const state = createState(['P1', 'P2', 'P3'], []);
      setState(state);

      window.addPlayer();

      expect(window.state.players.length).toBe(4);
      expect(window.state.players[3]).toBe('Player 4');
    });

    it('should extend all existing hands with null entry for new player', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 10, null, [5, 8, 6], [3, 2, 4], true),
        createHand(1, 12, null, [7, 9, 5], [4, 3, 2], true)
      ]);
      state.hands[0].scores = [8, 10, 10];
      state.hands[1].scores = [11, 12, 7];
      setState(state);

      window.addPlayer();

      expect(window.state.hands[0].meld.length).toBe(4);
      expect(window.state.hands[0].tricks.length).toBe(4);
      expect(window.state.hands[0].scores.length).toBe(4);
      expect(window.state.hands[0].meld[3]).toBe(null);
      expect(window.state.hands[0].tricks[3]).toBe(null);
      expect(window.state.hands[0].scores[3]).toBe(null);

      expect(window.state.hands[1].meld[3]).toBe(null);
      expect(window.state.hands[1].tricks[3]).toBe(null);
      expect(window.state.hands[1].scores[3]).toBe(null);
    });

    it('should work when no hands exist', () => {
      const state = createState(['P1', 'P2'], []);
      setState(state);

      window.addPlayer();

      expect(window.state.players.length).toBe(3);
      expect(window.state.hands.length).toBe(0);
    });
  });

  describe('removePlayer', () => {
    it('should remove a player from the middle of the array', () => {
      const state = createState(['Alice', 'Bob', 'Charlie', 'Diana'], []);
      setState(state);

      window.removePlayer(1); // Remove Bob

      expect(window.state.players).toEqual(['Alice', 'Charlie', 'Diana']);
    });

    it('should not remove if only 2 players remain', () => {
      const state = createState(['P1', 'P2'], []);
      setState(state);

      window.removePlayer(0);

      expect(window.state.players.length).toBe(2); // Not removed
    });

    it('should remove player data from all hands', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 10, null, [7, 8, 6, 7], [3, 2, 4, 1], true)
      ]);
      state.hands[0].scores = [10, 10, 10, 8];
      setState(state);

      window.removePlayer(1); // Remove P2

      expect(window.state.hands[0].meld).toEqual([7, 6, 7]);
      expect(window.state.hands[0].tricks).toEqual([3, 4, 1]);
      expect(window.state.hands[0].scores).toEqual([10, 10, 8]);
    });

    it('should adjust bidderIdx when removing player before bidder', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(2, 10, null, [5, 8, 6, 7], [3, 2, 4, 1], true) // Bidder is P3 (idx 2)
      ]);
      setState(state);

      window.removePlayer(0); // Remove P1

      // Bidder was at index 2, now should be at index 1
      expect(window.state.hands[0].bidderIdx).toBe(1);
    });

    it('should reset bidderIdx to 0 when removing the bidder', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(1, 10, null, [5, 8, 6, 7], [3, 2, 4, 1], true) // Bidder is P2 (idx 1)
      ]);
      setState(state);

      window.removePlayer(1); // Remove the bidder

      expect(window.state.hands[0].bidderIdx).toBe(0);
    });

    it('should not adjust bidderIdx when removing player after bidder', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(1, 10, null, [5, 8, 6, 7], [3, 2, 4, 1], true) // Bidder is P2 (idx 1)
      ]);
      setState(state);

      window.removePlayer(3); // Remove P4 (after bidder)

      expect(window.state.hands[0].bidderIdx).toBe(1); // Unchanged
    });

    it('should recalculate finalized hands after removing player', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 10, null, [7, 8, 6, 7], [3, 2, 4, 1], true)
      ]);
      setState(state);

      window.removePlayer(2); // Remove P3

      // Scores should be recalculated for remaining players
      const hand = window.state.hands[0];
      expect(hand.scores.length).toBe(3);
      // Verify scores were recalculated (not just truncated)
      expect(hand.scores[0]).toBe(10); // P1 (bidder): 7+3=10 (makes bid)
      expect(hand.scores[1]).toBe(10); // P2: 8+2
      expect(hand.scores[2]).toBe(8);  // P4 (now P3): 7+1
    });
  });

  describe('movePlayer', () => {
    it('should swap two adjacent players moving right', () => {
      const state = createState(['Alice', 'Bob', 'Charlie'], []);
      setState(state);

      window.movePlayer(0, 1); // Move Alice right

      expect(window.state.players).toEqual(['Bob', 'Alice', 'Charlie']);
    });

    it('should swap two adjacent players moving left', () => {
      const state = createState(['Alice', 'Bob', 'Charlie'], []);
      setState(state);

      window.movePlayer(2, -1); // Move Charlie left

      expect(window.state.players).toEqual(['Alice', 'Charlie', 'Bob']);
    });

    it('should not move if already at left boundary', () => {
      const state = createState(['Alice', 'Bob', 'Charlie'], []);
      setState(state);

      window.movePlayer(0, -1); // Try to move Alice left (already first)

      expect(window.state.players).toEqual(['Alice', 'Bob', 'Charlie']); // Unchanged
    });

    it('should not move if already at right boundary', () => {
      const state = createState(['Alice', 'Bob', 'Charlie'], []);
      setState(state);

      window.movePlayer(2, 1); // Try to move Charlie right (already last)

      expect(window.state.players).toEqual(['Alice', 'Bob', 'Charlie']); // Unchanged
    });

    it('should swap player data in all hands', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 10, null, [5, 8, 6], [3, 2, 4], true)
      ]);
      state.hands[0].scores = [8, 10, 10];
      setState(state);

      window.movePlayer(0, 1); // Swap P1 and P2

      expect(window.state.hands[0].meld).toEqual([8, 5, 6]);
      expect(window.state.hands[0].tricks).toEqual([2, 3, 4]);
      expect(window.state.hands[0].scores).toEqual([10, 8, 10]);
    });

    it('should update bidderIdx when moving the bidder', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(1, 10, null, [5, 8, 6], [3, 2, 4], true) // P2 is bidder (idx 1)
      ]);
      setState(state);

      window.movePlayer(1, 1); // Move P2 right (to position 2)

      expect(window.state.hands[0].bidderIdx).toBe(2);
    });

    it('should update bidderIdx when swapping with bidder', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(2, 10, null, [5, 8, 6], [3, 2, 4], true) // P3 is bidder (idx 2)
      ]);
      setState(state);

      window.movePlayer(1, 1); // Move P2 right, swapping with P3

      expect(window.state.hands[0].bidderIdx).toBe(1); // Bidder moved from 2 to 1
    });

    it('should handle multiple swaps correctly', () => {
      const state = createState(['A', 'B', 'C', 'D'], []);
      setState(state);

      window.movePlayer(0, 1); // [B, A, C, D]
      window.movePlayer(2, 1); // [B, A, D, C]
      window.movePlayer(1, -1); // [A, B, D, C]

      expect(window.state.players).toEqual(['A', 'B', 'D', 'C']);
    });
  });

  describe('updatePlayerName', () => {
    it('should update player name at given index', () => {
      const state = createState(['P1', 'P2', 'P3'], []);
      setState(state);

      window.updatePlayerName(1, 'Alice');

      expect(window.state.players[1]).toBe('Alice');
    });

    it('should handle empty string', () => {
      const state = createState(['P1', 'P2', 'P3'], []);
      setState(state);

      window.updatePlayerName(0, '');

      expect(window.state.players[0]).toBe('');
    });

    it('should not affect other players', () => {
      const state = createState(['Alice', 'Bob', 'Charlie'], []);
      setState(state);

      window.updatePlayerName(1, 'Robert');

      expect(window.state.players).toEqual(['Alice', 'Robert', 'Charlie']);
    });
  });
});
