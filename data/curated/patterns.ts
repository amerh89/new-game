import type { MatePattern } from "../../src/lib/types";

/**
 * Classic checkmating patterns, each with a lesson position and practice positions.
 * `npm run validate` checks that every solution is legal and ends in checkmate.
 */
export const patterns: MatePattern[] = [
  {
    id: "back-rank",
    name: "Back-Rank Mate",
    summary:
      "The most common checkmate in real games. A rook or queen checks the king on its back rank, and the king cannot step forward because its own pawns are in the way.",
    recognise: [
      "The enemy king is on its back rank behind three unmoved pawns.",
      "You have a rook or queen that can reach that rank.",
      "No enemy piece can block the check or capture your piece.",
    ],
    lesson: {
      fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
      moves: [
        ["Re8#", "The rook checks along the back rank. The f7, g7 and h7 pawns trap their own king."],
      ],
    },
    exercises: [
      {
        fen: "3r2k1/5ppp/8/8/8/8/4QPPP/4R1K1 w - - 0 1",
        prompt: "Black's rook guards the back rank. Find the mate in 2.",
        moves: ["Qe8+", "Rxe8", "Rxe8#"],
      },
      {
        fen: "6k1/5ppp/8/8/8/8/r4PPP/3R2K1 w - - 0 1",
        prompt: "White to move. Mate in 1.",
        moves: ["Rd8#"],
      },
    ],
  },
  {
    id: "smothered",
    name: "Smothered Mate",
    summary:
      "A knight gives check to a king that is completely surrounded by its own pieces. Because a knight jumps, nothing can block the check. The classic version starts with a queen sacrifice.",
    recognise: [
      "The enemy king is in the corner, boxed in by its own pieces.",
      "You have a knight that can check it.",
      "Often you need to sacrifice your queen first, to force a piece onto the last free square.",
    ],
    lesson: {
      fen: "r3r1k1/6pp/8/6N1/8/8/5PPP/3Q2K1 w - - 0 1",
      moves: [
        ["Qb3+", "A check along the diagonal. If the king goes to f8, Qf7 is mate at once."],
        ["Kh8", "The king runs into the corner."],
        ["Nf7+", "Knight check. The king has to come back out."],
        ["Kg8", "Forced."],
        ["Nh6+", "Double check from the knight and the queen. The king must move."],
        ["Kh8", "Back to the corner. (On f8, Qf7 is mate.)"],
        ["Qg8+", "The queen sacrifice! The king cannot take, because the knight guards g8."],
        ["Rxg8", "The rook has to take — and blocks the king's last square."],
        ["Nf7#", "Smothered mate. The king is buried by its own rook and pawns."],
      ],
    },
    exercises: [
      {
        fen: "r3r2k/6pp/7N/8/8/1Q6/5PPP/6K1 w - - 0 1",
        prompt: "Finish it off. Mate in 2, starting with a queen sacrifice.",
        moves: ["Qg8+", "Rxg8", "Nf7#"],
      },
      {
        fen: "6rk/6pp/8/6N1/8/8/5PPP/6K1 w - - 0 1",
        prompt: "The king is already buried. Mate in 1.",
        moves: ["Nf7#"],
      },
    ],
  },
  {
    id: "anastasia",
    name: "Anastasia's Mate",
    summary:
      "A knight on e7 and a rook (or queen) on the h-file work together. The knight covers the g8 and g6 squares, the king's own g-pawn covers the rest, and the rook checks down the side of the board.",
    recognise: [
      "Your knight is on e7 (or e2 when attacking the other way).",
      "The enemy king is on h8 or h7 with a pawn on g7.",
      "You can open the h-file, often by sacrificing the queen on h7.",
    ],
    lesson: {
      fen: "5r1k/4N1pp/8/7Q/8/2R5/5PPP/6K1 w - - 0 1",
      moves: [
        ["Qxh7+", "The queen sacrifice rips the h-file open."],
        ["Kxh7", "The king has to take."],
        ["Rh3#", "The rook checks on the h-file. The knight guards g8 and g6, and the g7 pawn blocks the rest."],
      ],
    },
    exercises: [
      {
        fen: "1r5k/4N1pp/8/8/7Q/R7/5PPP/6K1 w - - 0 1",
        prompt: "The same idea from a different setup. Mate in 2.",
        moves: ["Qxh7+", "Kxh7", "Rh3#"],
      },
    ],
  },
  {
    id: "arabian",
    name: "Arabian Mate",
    summary:
      "One of the oldest known checkmates. A rook and a knight trap the king in the corner: the knight protects the rook and also covers the king's escape square.",
    recognise: [
      "The enemy king is in the corner.",
      "Your knight stands two squares diagonally from that corner (f6 against a king on h8).",
      "Your rook can land next to the king, protected by the knight.",
    ],
    lesson: {
      fen: "7k/R7/5N2/8/8/8/8/6K1 w - - 0 1",
      moves: [
        ["Rh7#", "The rook is protected by the knight. The knight also covers g8, and the rook covers g7."],
      ],
    },
    exercises: [
      {
        fen: "5bk1/R7/8/3N4/8/8/8/6K1 w - - 0 1",
        prompt: "Drive the king into the corner first. Mate in 2.",
        moves: ["Nf6+", "Kh8", "Rh7#"],
      },
    ],
  },
  {
    id: "boden",
    name: "Boden's Mate",
    summary:
      "Two bishops deliver mate on criss-crossing diagonals. It usually happens against a king that has castled queenside, and often starts with a queen sacrifice to open one of the diagonals.",
    recognise: [
      "The enemy king is on c8 with its own pieces on d7 and d8.",
      "One of your bishops already controls the b8–h2 diagonal.",
      "The other bishop can reach a6 once the b-pawn has been pulled away.",
    ],
    lesson: {
      fen: "2kr4/pp1n4/2p5/8/5B2/5Q2/4B3/6K1 w - - 0 1",
      moves: [
        ["Qxc6+", "A queen sacrifice! The only way out of check is to take."],
        ["bxc6", "The b-pawn leaves b7 and the a6–c8 diagonal opens."],
        ["Ba6#", "The two bishops criss-cross. One checks, the other covers b8 and c7."],
      ],
    },
    exercises: [
      {
        fen: "2kr4/p2n4/2p5/8/5B2/8/4B3/6K1 w - - 0 1",
        prompt: "The diagonal is already open. Mate in 1.",
        moves: ["Ba6#"],
      },
      {
        fen: "2kr3r/pp1n4/2p5/8/5B2/2Q5/4B3/6K1 w - - 0 1",
        prompt: "Open the diagonal with a sacrifice. Mate in 2.",
        moves: ["Qxc6+", "bxc6", "Ba6#"],
      },
    ],
  },
  {
    id: "damiano",
    name: "Damiano's Mate",
    summary:
      "A pawn (or bishop) on g6 takes away the king's escape squares, and the queen delivers mate on h7. To get the queen onto the h-file with tempo, you can even sacrifice rooks on h8.",
    recognise: [
      "You have a pawn on g6 (or a bishop there) next to the enemy king.",
      "The enemy king is on g8 with its own pawn on g7 and a rook on f8.",
      "Your queen can reach the h-file with check.",
    ],
    lesson: {
      fen: "5rk1/6p1/6P1/8/8/8/6K1/3Q3R w - - 0 1",
      moves: [
        ["Rh8+", "A rook sacrifice to drag the king onto the h-file."],
        ["Kxh8", "Forced — the king has no other square."],
        ["Qh1+", "Now the queen arrives on the h-file with check."],
        ["Kg8", "The only move."],
        ["Qh7#", "Mate. The queen is protected by the g6 pawn, which also covers f7."],
      ],
    },
    exercises: [
      {
        fen: "5rk1/6p1/6P1/7Q/8/8/8/6K1 w - - 0 1",
        prompt: "The queen is already on the h-file. Mate in 1.",
        moves: ["Qh7#"],
      },
    ],
  },
  {
    id: "queen-and-king",
    name: "Queen and King Mate",
    summary:
      "The most important basic endgame. With queen and king against a lone king you can always force mate: use the queen to shrink the 'box' the enemy king lives in, bring your own king close, then deliver mate on the edge. Be careful not to give stalemate!",
    recognise: [
      "The enemy king is on the edge of the board.",
      "Your king stands close by, protecting the squares in front of it.",
      "Always check that the enemy king has a legal move before your final blow — otherwise it is stalemate.",
    ],
    lesson: {
      fen: "6k1/8/5K2/8/8/8/8/1Q6 w - - 0 1",
      moves: [
        ["Qb7", "The queen takes away the whole seventh rank. The king still has moves, so it is not stalemate."],
        ["Kh8", "The king shuffles into the corner."],
        ["Qg7#", "Mate. The queen is protected by the king and covers every square around the corner."],
      ],
    },
    exercises: [
      {
        fen: "3k4/8/3K4/8/8/8/8/7Q w - - 0 1",
        prompt: "Your king is already in position. Mate in 1.",
        moves: ["Qh8#"],
      },
      {
        fen: "7k/8/5K2/8/8/8/8/Q7 w - - 0 1",
        prompt: "Careful — do not stalemate. Mate in 2.",
        moves: ["Kf7+", "Kh7", "Qh1#"],
      },
    ],
  },
  {
    id: "rook-ladder",
    name: "Rook Ladder Mate",
    summary:
      "Also called the lawnmower. Two rooks (or a rook and a queen) take turns giving check on neighbouring ranks, pushing the king step by step to the edge of the board.",
    recognise: [
      "You have two heavy pieces on open lines.",
      "One rook guards a rank so the king cannot cross it.",
      "The other rook checks on the next rank. Then they swap jobs.",
    ],
    lesson: {
      fen: "8/8/4k3/R7/8/8/8/1R4K1 w - - 0 1",
      moves: [
        ["Rb6+", "The a5 rook guards the fifth rank, so the other rook checks on the sixth."],
        ["Ke7", "The king is pushed back a step."],
        ["Ra7+", "Now the rooks swap roles: this one checks on the seventh."],
        ["Ke8", "Pushed back again, to the edge."],
        ["Rb8#", "The final rung of the ladder. Checkmate."],
      ],
    },
    exercises: [
      {
        fen: "8/5k2/R7/8/8/8/8/1R4K1 w - - 0 1",
        prompt: "Climb the ladder. Mate in 2.",
        moves: ["Rb7+", "Kg8", "Ra8#"],
      },
    ],
  },
];
