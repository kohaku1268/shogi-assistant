// 将棋ルール＆盤面管理エンジン (Shogi Rules Engine)

const SENTE = 0; // 先手 (下側・▲)
const GOTE = 1;  // 後手 (上側・▽)

// 駒種定数
const PIECE_TYPES = {
  EMPTY: 0,
  FU: 1,    // 歩
  KY: 2,    // 香
  KE: 3,    // 桂
  GI: 4,    // 銀
  KI: 5,    // 金
  KA: 6,    // 角
  HI: 7,    // 飛
  OU: 8,    // 玉/王
  TO: 9,    // と (成歩)
  NY: 10,   // 成香
  NK: 11,   // 成桂
  NG: 12,   // 成銀
  UM: 13,   // 馬 (成角)
  RY: 14    // 竜 (成飛)
};

const PIECE_NAMES = {
  [PIECE_TYPES.FU]: '歩',
  [PIECE_TYPES.KY]: '香',
  [PIECE_TYPES.KE]: '桂',
  [PIECE_TYPES.GI]: '銀',
  [PIECE_TYPES.KI]: '金',
  [PIECE_TYPES.KA]: '角',
  [PIECE_TYPES.HI]: '飛',
  [PIECE_TYPES.OU]: '玉',
  [PIECE_TYPES.TO]: 'と',
  [PIECE_TYPES.NY]: '成香',
  [PIECE_TYPES.NK]: '成桂',
  [PIECE_TYPES.NG]: '成銀',
  [PIECE_TYPES.UM]: '馬',
  [PIECE_TYPES.RY]: '竜'
};

// 成り可能かどうかの判定
const PROMOTABLE = {
  [PIECE_TYPES.FU]: PIECE_TYPES.TO,
  [PIECE_TYPES.KY]: PIECE_TYPES.NY,
  [PIECE_TYPES.KE]: PIECE_TYPES.NK,
  [PIECE_TYPES.GI]: PIECE_TYPES.NG,
  [PIECE_TYPES.KA]: PIECE_TYPES.UM,
  [PIECE_TYPES.HI]: PIECE_TYPES.RY
};

// 成駒の元の生駒
const UNPROMOTED = {
  [PIECE_TYPES.TO]: PIECE_TYPES.FU,
  [PIECE_TYPES.NY]: PIECE_TYPES.KY,
  [PIECE_TYPES.NK]: PIECE_TYPES.KE,
  [PIECE_TYPES.NG]: PIECE_TYPES.GI,
  [PIECE_TYPES.UM]: PIECE_TYPES.KA,
  [PIECE_TYPES.RY]: PIECE_TYPES.HI
};

class ShogiBoard {
  constructor() {
    this.board = Array(9).fill(null).map(() => Array(9).fill(null));
    // 持ち駒 [sente: {FU: 0, ...}, gote: {FU: 0, ...}]
    this.hands = [
      { [PIECE_TYPES.FU]: 0, [PIECE_TYPES.KY]: 0, [PIECE_TYPES.KE]: 0, [PIECE_TYPES.GI]: 0, [PIECE_TYPES.KI]: 0, [PIECE_TYPES.KA]: 0, [PIECE_TYPES.HI]: 0 },
      { [PIECE_TYPES.FU]: 0, [PIECE_TYPES.KY]: 0, [PIECE_TYPES.KE]: 0, [PIECE_TYPES.GI]: 0, [PIECE_TYPES.KI]: 0, [PIECE_TYPES.KA]: 0, [PIECE_TYPES.HI]: 0 }
    ];
    this.turn = SENTE;
    this.history = [];
    this.redoStack = [];
    this.reset();
  }

  // 平手初期配置
  reset() {
    this.board = Array(9).fill(null).map(() => Array(9).fill(null));
    this.hands = [
      { [PIECE_TYPES.FU]: 0, [PIECE_TYPES.KY]: 0, [PIECE_TYPES.KE]: 0, [PIECE_TYPES.GI]: 0, [PIECE_TYPES.KI]: 0, [PIECE_TYPES.KA]: 0, [PIECE_TYPES.HI]: 0 },
      { [PIECE_TYPES.FU]: 0, [PIECE_TYPES.KY]: 0, [PIECE_TYPES.KE]: 0, [PIECE_TYPES.GI]: 0, [PIECE_TYPES.KI]: 0, [PIECE_TYPES.KA]: 0, [PIECE_TYPES.HI]: 0 }
    ];
    this.turn = SENTE;
    this.history = [];
    this.redoStack = [];

    // 後手 1段目
    const goteFirstRow = [
      PIECE_TYPES.KY, PIECE_TYPES.KE, PIECE_TYPES.GI, PIECE_TYPES.KI, PIECE_TYPES.OU,
      PIECE_TYPES.KI, PIECE_TYPES.GI, PIECE_TYPES.KE, PIECE_TYPES.KY
    ];
    for (let c = 0; c < 9; c++) {
      this.board[0][c] = { type: goteFirstRow[c], owner: GOTE };
    }
    // 後手 2段目
    this.board[1][1] = { type: PIECE_TYPES.HI, owner: GOTE };
    this.board[1][7] = { type: PIECE_TYPES.KA, owner: GOTE };
    // 後手 3段目 (歩)
    for (let c = 0; c < 9; c++) {
      this.board[2][c] = { type: PIECE_TYPES.FU, owner: GOTE };
    }

    // 先手 7段目 (歩)
    for (let c = 0; c < 9; c++) {
      this.board[6][c] = { type: PIECE_TYPES.FU, owner: SENTE };
    }
    // 先手 8段目
    this.board[7][1] = { type: PIECE_TYPES.KA, owner: SENTE };
    this.board[7][7] = { type: PIECE_TYPES.HI, owner: SENTE };
    // 先手 9段目
    const senteLastRow = [
      PIECE_TYPES.KY, PIECE_TYPES.KE, PIECE_TYPES.GI, PIECE_TYPES.KI, PIECE_TYPES.OU,
      PIECE_TYPES.KI, PIECE_TYPES.GI, PIECE_TYPES.KE, PIECE_TYPES.KY
    ];
    for (let c = 0; c < 9; c++) {
      this.board[8][c] = { type: senteLastRow[c], owner: SENTE };
    }
  }

  // ディープコピー
  clone() {
    const copy = new ShogiBoard();
    copy.board = this.board.map(row => row.map(cell => cell ? { ...cell } : null));
    copy.hands = [
      { ...this.hands[0] },
      { ...this.hands[1] }
    ];
    copy.turn = this.turn;
    return copy;
  }

  // 駒の移動が可能か（盤上）
  getPieceMoves(r, c) {
    const piece = this.board[r][c];
    if (!piece) return [];
    const moves = [];
    const owner = piece.owner;
    const forward = owner === SENTE ? -1 : 1;

    // ヘルパー：盤内かつ自分の駒がないマス
    const canMoveTo = (nr, nc) => {
      if (nr < 0 || nr >= 9 || nc < 0 || nc >= 9) return false;
      const target = this.board[nr][nc];
      return !target || target.owner !== owner;
    };

    // 直線移動
    const ray = (dr, dc) => {
      let curR = r + dr;
      let curC = c + dc;
      while (curR >= 0 && curR < 9 && curC >= 0 && curC < 9) {
        const target = this.board[curR][curC];
        if (!target) {
          moves.push({ from: { r, c }, to: { r: curR, c: curC } });
        } else {
          if (target.owner !== owner) {
            moves.push({ from: { r, c }, to: { r: curR, c: curC } });
          }
          break;
        }
        curR += dr;
        curC += dc;
      }
    };

    const type = piece.type;
    switch (type) {
      case PIECE_TYPES.FU:
        if (canMoveTo(r + forward, c)) moves.push({ from: { r, c }, to: { r: r + forward, c } });
        break;

      case PIECE_TYPES.KY:
        ray(forward, 0);
        break;

      case PIECE_TYPES.KE:
        const nrKe = r + forward * 2;
        if (canMoveTo(nrKe, c - 1)) moves.push({ from: { r, c }, to: { r: nrKe, c: c - 1 } });
        if (canMoveTo(nrKe, c + 1)) moves.push({ from: { r, c }, to: { r: nrKe, c: c + 1 } });
        break;

      case PIECE_TYPES.GI:
        const giOffsets = [
          [forward, -1], [forward, 0], [forward, 1],
          [-forward, -1], [-forward, 1]
        ];
        for (const [dr, dc] of giOffsets) {
          if (canMoveTo(r + dr, c + dc)) moves.push({ from: { r, c }, to: { r: r + dr, c: c + dc } });
        }
        break;

      case PIECE_TYPES.KI:
      case PIECE_TYPES.TO:
      case PIECE_TYPES.NY:
      case PIECE_TYPES.NK:
      case PIECE_TYPES.NG:
        const kiOffsets = [
          [forward, -1], [forward, 0], [forward, 1],
          [0, -1], [0, 1],
          [-forward, 0]
        ];
        for (const [dr, dc] of kiOffsets) {
          if (canMoveTo(r + dr, c + dc)) moves.push({ from: { r, c }, to: { r: r + dr, c: c + dc } });
        }
        break;

      case PIECE_TYPES.KA:
        ray(-1, -1); ray(-1, 1); ray(1, -1); ray(1, 1);
        break;

      case PIECE_TYPES.HI:
        ray(-1, 0); ray(1, 0); ray(0, -1); ray(0, 1);
        break;

      case PIECE_TYPES.UM: // 馬: 角の動き + 上下左右1マス
        ray(-1, -1); ray(-1, 1); ray(1, -1); ray(1, 1);
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (canMoveTo(r + dr, c + dc)) moves.push({ from: { r, c }, to: { r: r + dr, c: c + dc } });
        }
        break;

      case PIECE_TYPES.RY: // 竜: 飛車の動き + 斜め1マス
        ray(-1, 0); ray(1, 0); ray(0, -1); ray(0, 1);
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          if (canMoveTo(r + dr, c + dc)) moves.push({ from: { r, c }, to: { r: r + dr, c: c + dc } });
        }
        break;

      case PIECE_TYPES.OU: // 王
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            if (canMoveTo(r + dr, c + dc)) moves.push({ from: { r, c }, to: { r: r + dr, c: c + dc } });
          }
        }
        break;
    }

    // 成り判定の拡張 (成る・成らないの指し手を展開)
    const result = [];
    for (const m of moves) {
      const fromZone = owner === SENTE ? (m.from.r <= 2) : (m.from.r >= 6);
      const toZone = owner === SENTE ? (m.to.r <= 2) : (m.to.r >= 6);
      const canPromote = PROMOTABLE[type] && (fromZone || toZone);

      // 強制成り（行き所のない駒）
      let mustPromote = false;
      if (type === PIECE_TYPES.FU || type === PIECE_TYPES.KY) {
        if (owner === SENTE && m.to.r === 0) mustPromote = true;
        if (owner === GOTE && m.to.r === 8) mustPromote = true;
      } else if (type === PIECE_TYPES.KE) {
        if (owner === SENTE && m.to.r <= 1) mustPromote = true;
        if (owner === GOTE && m.to.r >= 7) mustPromote = true;
      }

      if (mustPromote) {
        result.push({ ...m, promote: true });
      } else if (canPromote) {
        result.push({ ...m, promote: true });
        result.push({ ...m, promote: false });
      } else {
        result.push({ ...m, promote: false });
      }
    }
    return result;
  }

  // 持ち駒を打つ合法手
  getDropMoves(handPieceType) {
    const moves = [];
    const owner = this.turn;
    const count = this.hands[owner][handPieceType];
    if (!count || count <= 0) return [];

    // 二歩チェック用の列リスト
    let pawnCols = new Set();
    if (handPieceType === PIECE_TYPES.FU) {
      for (let c = 0; c < 9; c++) {
        for (let r = 0; r < 9; r++) {
          const p = this.board[r][c];
          if (p && p.owner === owner && p.type === PIECE_TYPES.FU) {
            pawnCols.add(c);
            break;
          }
        }
      }
    }

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (this.board[r][c] !== null) continue;

        // 行き所のない駒チェック
        if (handPieceType === PIECE_TYPES.FU || handPieceType === PIECE_TYPES.KY) {
          if (owner === SENTE && r === 0) continue;
          if (owner === GOTE && r === 8) continue;
        }
        if (handPieceType === PIECE_TYPES.KE) {
          if (owner === SENTE && r <= 1) continue;
          if (owner === GOTE && r >= 7) continue;
        }

        // 二歩
        if (handPieceType === PIECE_TYPES.FU && pawnCols.has(c)) {
          continue;
        }

        moves.push({
          from: null,
          to: { r, c },
          drop: handPieceType,
          promote: false
        });
      }
    }
    return moves;
  }

  // 現在の手番の全合法手
  getAllLegalMoves() {
    const moves = [];
    const owner = this.turn;

    // 盤上の駒の移動
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const piece = this.board[r][c];
        if (piece && piece.owner === owner) {
          moves.push(...this.getPieceMoves(r, c));
        }
      }
    }

    // 持ち駒を打つ
    const hand = this.hands[owner];
    for (const pTypeStr of Object.keys(hand)) {
      const pType = parseInt(pTypeStr, 10);
      if (hand[pType] > 0) {
        moves.push(...this.getDropMoves(pType));
      }
    }

    // 玉が取られる状態になる（自滅手・王手放置）を除外
    const legalMoves = [];
    for (const move of moves) {
      const testBoard = this.clone();
      testBoard.makeMove(move, true);
      if (!testBoard.isKingInCheck(owner)) {
        legalMoves.push(move);
      }
    }

    return legalMoves;
  }

  // 王手がかかっているか
  isKingInCheck(player) {
    // 王の位置を探す
    let kingR = -1, kingC = -1;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = this.board[r][c];
        if (p && p.owner === player && p.type === PIECE_TYPES.OU) {
          kingR = r;
          kingC = c;
          break;
        }
      }
      if (kingR !== -1) break;
    }
    if (kingR === -1) return false; // 玉がいない（詰み判定外）

    const opponent = 1 - player;
    // 相手の全ての盤上の駒の利きに玉が含まれるか
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = this.board[r][c];
        if (p && p.owner === opponent) {
          const attacks = this.getPieceAttacks(r, c);
          for (const pos of attacks) {
            if (pos.r === kingR && pos.c === kingC) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  // あるマスの駒の利き（移動可能マス）
  getPieceAttacks(r, c) {
    const rawMoves = this.getPieceMoves(r, c);
    const seen = new Set();
    const attacks = [];
    for (const m of rawMoves) {
      const key = `${m.to.r},${m.to.c}`;
      if (!seen.has(key)) {
        seen.add(key);
        attacks.push(m.to);
      }
    }
    return attacks;
  }

  // 指し手を実行
  makeMove(move, isSimulated = false) {
    const owner = this.turn;
    const historyEntry = {
      move,
      captured: null,
      previousTurn: owner
    };

    if (move.drop) {
      // 駒を打つ
      this.board[move.to.r][move.to.c] = {
        type: move.drop,
        owner: owner
      };
      this.hands[owner][move.drop]--;
    } else {
      // 盤上の移動
      const fromPiece = this.board[move.from.r][move.from.c];
      const targetPiece = this.board[move.to.r][move.to.c];

      if (targetPiece) {
        // 駒捕獲 (成駒は生駒に戻して持ち駒に)
        let capturedType = targetPiece.type;
        if (UNPROMOTED[capturedType]) {
          capturedType = UNPROMOTED[capturedType];
        }
        this.hands[owner][capturedType]++;
        historyEntry.captured = targetPiece;
      }

      let newType = fromPiece.type;
      if (move.promote && PROMOTABLE[newType]) {
        newType = PROMOTABLE[newType];
      }

      this.board[move.to.r][move.to.c] = {
        type: newType,
        owner: owner
      };
      this.board[move.from.r][move.from.c] = null;
    }

    this.turn = 1 - owner;

    if (!isSimulated) {
      this.history.push(historyEntry);
      this.redoStack = [];
    }
  }

  // 1手戻る (Undo)
  undoMove() {
    if (this.history.length === 0) return null;
    const lastEntry = this.history.pop();
    const { move, captured, previousTurn } = lastEntry;

    this.turn = previousTurn;

    if (move.drop) {
      this.board[move.to.r][move.to.c] = null;
      this.hands[this.turn][move.drop]++;
    } else {
      const movedPiece = this.board[move.to.r][move.to.c];
      let originType = movedPiece.type;
      if (move.promote && UNPROMOTED[originType]) {
        originType = UNPROMOTED[originType];
      }

      this.board[move.from.r][move.from.c] = {
        type: originType,
        owner: this.turn
      };

      if (captured) {
        this.board[move.to.r][move.to.c] = captured;
        let capType = captured.type;
        if (UNPROMOTED[capType]) capType = UNPROMOTED[capType];
        this.hands[this.turn][capType]--;
      } else {
        this.board[move.to.r][move.to.c] = null;
      }
    }

    this.redoStack.push(lastEntry);
    return lastEntry;
  }

  // 1手進む (Redo)
  redoMove() {
    if (this.redoStack.length === 0) return null;
    const entry = this.redoStack.pop();
    this.makeMove(entry.move);
    return entry;
  }

  // 棋譜表記（例: ▲７六歩, ▽３四歩, ▲５五角打）の生成
  toKifuString(move) {
    const mark = this.turn === SENTE ? '▲' : '▽';
    const numCols = ['９', '８', '７', '６', '５', '４', '３', '２', '１'];
    const numRows = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const toStr = `${numCols[move.to.c]}${numRows[move.to.r]}`;

    if (move.drop) {
      return `${mark}${toStr}${PIECE_NAMES[move.drop]}打`;
    }

    const piece = this.board[move.from.r][move.from.c];
    const name = PIECE_NAMES[piece.type];
    const promoteStr = move.promote ? '成' : '';
    const fromStr = `(${9 - move.from.c}${move.from.r + 1})`;
    return `${mark}${toStr}${name}${promoteStr} ${fromStr}`;
  }
}

// ブラウザ環境とNode環境の共存
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ShogiBoard, SENTE, GOTE, PIECE_TYPES, PIECE_NAMES, PROMOTABLE, UNPROMOTED };
}