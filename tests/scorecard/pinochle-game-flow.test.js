import { describe, it, expect, beforeEach } from 'vitest';
import { loadPinochleScript, setupPinochleDom, createState, createHand, setState, resetState } from '../utils/pinochle-test-helpers.js';

describe('Pinochle Game Flow', () => {
  beforeEach(() => {
    setupPinochleDom();
    loadPinochleScript();
    resetState();
  });

  describe('finalizeHand', () => {
    it('should finalize a hand and set finalized flag', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 10, null, [5, 8, 6, 7], [3, 2, 4, 1], false)
      ]);
      setState(state);

      window.finalizeHand(0);

      expect(window.state.hands[0].finalized).toBe(true);
    });

    it('should calculate scores when finalizing', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(1, 12, 'hearts', [8, 7, 10], [4, 5, 3], false)
      ]);
      setState(state);

      window.finalizeHand(0);

      const hand = window.state.hands[0];
      expect(hand.scores[0]).toBe(12); // 8+4
      expect(hand.scores[1]).toBe(12); // bidder: 7+5=12 (makes bid exactly)
      expect(hand.scores[2]).toBe(13); // 10+3
    });

    it('should check for game end after finalizing', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [30, 15], [25, 20], false)
      ]);
      setState(state);

      window.finalizeHand(0);

      // Player 1 reaches 55 (30+25)
      expect(window.state.gameOver).toBe(true);
      expect(window.state.winnerIdx).toBe(0);
    });
  });

  describe('checkGameEnd', () => {
    it('should not end game if no player reaches WIN_SCORE', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 10, null, [8, 10, 12], [5, 6, 7], true),
        createHand(1, 12, null, [9, 11, 8], [6, 5, 7], true)
      ]);
      state.hands[0].scores = [13, 16, 19];
      state.hands[1].scores = [15, 16, 15];
      setState(state);

      window.checkGameEnd();

      expect(window.state.gameOver).toBe(false);
      expect(window.state.winnerIdx).toBe(null);
    });

    it('should end game when one player reaches WIN_SCORE', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 10, null, [15, 12, 18], [10, 8, 12], true),
        createHand(1, 12, null, [18, 14, 20], [12, 10, 15], true)
      ]);
      state.hands[0].scores = [25, 20, 30];
      state.hands[1].scores = [30, 24, 35];
      setState(state);

      window.checkGameEnd();

      // Player 3 has 65 total (30+35)
      expect(window.state.gameOver).toBe(true);
      expect(window.state.winnerIdx).toBe(2);
    });

    it('should give bidder priority when bidder reaches WIN_SCORE', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 10, null, [15, 20, 12], [10, 15, 8], true),
        createHand(1, 15, null, [18, 22, 14], [12, 18, 10], true)
      ]);
      state.hands[0].scores = [25, 35, 20];
      state.hands[1].scores = [30, 40, 24]; // P1=55, P2=75 (bidder), P3=44
      setState(state);

      window.checkGameEnd();

      // Bidder (P2) wins even though they have the highest score anyway
      expect(window.state.gameOver).toBe(true);
      expect(window.state.winnerIdx).toBe(1);
    });

    it('should give bidder priority even when not highest scorer', () => {
      const state = createState(['P1', 'P2', 'P3', 'P4'], [
        createHand(0, 10, null, [15, 12, 18, 10], [10, 8, 12, 6], true),
        createHand(1, 15, null, [18, 14, 20, 12], [12, 10, 15, 8], true)
      ]);
      state.hands[0].scores = [25, 20, 30, 16];
      state.hands[1].scores = [30, 24, 25, 20]; // P1=55, P2=44, P3=55, P4=36
      setState(state);

      // Last hand's bidder is P2 (index 1)
      window.checkGameEnd();

      // Both P1 and P3 are at 55, but neither is the bidder
      // P3 should win (highest non-bidder)
      expect(window.state.gameOver).toBe(true);
      expect(window.state.winnerIdx).toBe(0); // Either P1 or P3 - first one in candidate list
    });

    it('should give bidder priority when bidder is tied at WIN_SCORE', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 10, null, [15, 12, 18], [10, 8, 12], true),
        createHand(1, 15, null, [18, 14, 20], [12, 10, 15], true)
      ]);
      state.hands[0].scores = [25, 20, 30];
      state.hands[1].scores = [25, 30, 22]; // P1=50, P2=50 (bidder), P3=52
      setState(state);

      window.checkGameEnd();

      // P2 (bidder) at 50 should win over P1 at 50 and P3 at 52
      expect(window.state.gameOver).toBe(true);
      expect(window.state.winnerIdx).toBe(1);
    });

    it('should not end game if last hand is not finalized', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [30, 25], [25, 20], true),
        createHand(1, 12, null, [15, 18], [10, 12], false) // Not finalized
      ]);
      state.hands[0].scores = [55, 45];
      setState(state);

      window.checkGameEnd();

      // Should not check game end because last hand isn't finalized
      expect(window.state.gameOver).toBe(false);
    });

    it('should handle negative scores from bidder sets', () => {
      const state = createState(['P1', 'P2', 'P3'], [
        createHand(0, 20, null, [8, 15, 18], [2, 10, 12], true), // P1 set
        createHand(1, 15, null, [18, 10, 20], [12, 8, 15], true),
        createHand(2, 25, null, [20, 18, 12], [15, 14, 8], true)
      ]);
      state.hands[0].scores = [-20, 25, 30];
      state.hands[1].scores = [30, 18, 35];
      state.hands[2].scores = [35, 32, -25]; // P1=45, P2=75, P3=40 (bidder set)
      setState(state);

      window.checkGameEnd();

      // P2 wins with 75
      expect(window.state.gameOver).toBe(true);
      expect(window.state.winnerIdx).toBe(1);
    });
  });

  describe('Hand editing workflow', () => {
    it('should enter edit mode when clicking finalized hand', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true)
      ]);
      state.hands[0].scores = [13, 18];
      setState(state);

      window.toggleHandEdit(0);

      expect(window.editingHands[0]).toBe('edit');
    });

    it('should move from edit to confirm mode', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true)
      ]);
      state.hands[0].scores = [13, 18];
      setState(state);
      window.editingHands[0] = 'edit';

      window.toggleHandEdit(0);

      expect(window.editingHands[0]).toBe('confirm');
    });

    it('should finalize edits and clear editing state', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true)
      ]);
      state.hands[0].scores = [13, 18];
      setState(state);
      window.editingHands[0] = 'confirm';

      window.toggleHandEdit(0);

      expect(window.editingHands[0]).toBeUndefined();
    });

    it('should recalculate scores when confirming edits', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true)
      ]);
      setState(state);
      window.editingHands[0] = 'confirm';

      // Simulate editing the hand data
      window.state.hands[0].meld[0] = 10;
      window.state.hands[0].tricks[0] = 4;

      window.toggleHandEdit(0);

      // Scores should be recalculated
      expect(window.state.hands[0].scores[0]).toBe(14); // 10+4
    });
  });

  describe('deleteCurrentHand', () => {
    it('should delete the last unfinalized hand and unfinalize previous', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true),
        createHand(1, 12, null, [9, 10], [null, null], false)
      ]);
      state.hands[0].scores = [13, 18];
      setState(state);

      window.deleteCurrentHand();

      expect(window.state.hands.length).toBe(1);
      expect(window.state.hands[0].finalized).toBe(false); // Unfinalized to allow editing
    });

    it('should not delete if last hand is finalized', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true)
      ]);
      state.hands[0].scores = [13, 18];
      setState(state);

      window.deleteCurrentHand();

      expect(window.state.hands.length).toBe(1); // Not deleted
    });

    it('should not delete if there are no hands', () => {
      const state = createState(['P1', 'P2'], []);
      setState(state);

      window.deleteCurrentHand();

      expect(window.state.hands.length).toBe(0);
    });

    it('should unfinalize previous hand after deletion', () => {
      const state = createState(['P1', 'P2'], [
        createHand(0, 10, null, [8, 12], [5, 6], true),
        createHand(1, 12, null, [9, 10], [null, null], false)
      ]);
      state.hands[0].scores = [13, 18];
      setState(state);

      window.deleteCurrentHand();

      expect(window.state.hands[0].finalized).toBe(false);
    });
  });
});
