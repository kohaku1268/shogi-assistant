// 将棋AI思考エンジン (Shogi AI & Evaluation Engine)

class ShogiAI {
  constructor() {
    // 駒の基準価値
    this.pieceValues = {
      [PIECE_TYPES.FU]: 100,
      [PIECE_TYPES.KY]: 320,
      [PIECE_TYPES.KE]: 360,
      [PIECE_TYPES.GI]: 540,
      [PIECE_TYPES.KI]: 620,
      [PIECE_TYPES.KA]: 880,
      [PIECE_TYPES.HI]: 1020,
      [PIECE_TYPES.OU]: 20000,
      [PIECE_TYPES.TO]: 580,
      [PIECE_TYPES.NY]: 560,
      [PIECE_TYPES.NK]: 560,
      [PIECE_TYPES.NG]: 580,
      [PIECE_TYPES.UM]: 1120,
      [PIECE_TYPES.RY]: 1350
    };

    // 持ち駒価値（使い勝手のため微増）
    this.handValues = {
      [PIECE_TYPES.FU]: 115,
      [PIECE_TYPES.KY]: 340,
      [PIECE_TYPES.KE]: 380,
      [PIECE_TYPES.GI]: 560,
      [PIECE_TYPES.KI]: 650,
      [PIECE_TYPES.KA]: 900,
      [PIECE_TYPES.HI]: 1080
    };
  }

  // 局面評価関数（先手視点のスコア: 正なら先手有利、負なら後手有利）
  evaluate(board) {
    let score = 0;

    // 1. 盤上の駒の評価
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const p = board.board[r][c];
        if (!p) continue;

        let val = this.pieceValues[p.type] || 0;

        // 位置加点（中央や前進）
        if (p.type === PIECE_TYPES.FU) {
          // 歩が進んでいるほど少し加点
          const adv = p.owner === SENTE ? (8 - r) : r;
          val += adv * 5;
        } else if (p.type === PIECE_TYPES.KA || p.type === PIECE_TYPES.HI || p.type === PIECE_TYPES.UM || p.type === PIECE_TYPES.RY) {
          // 大駒が中央近くにあると加点
          const distFromCenter = Math.abs(r - 4) + Math.abs(c - 4);
          val += (8 - distFromCenter) * 6;
        }

        // 王の守り（周囲に金銀がいるか）
        if (p.type === PIECE_TYPES.OU) {
          let guards = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < 9 && nc >= 0 && nc < 9) {
                const gp = board.board[nr][nc];
                if (gp && gp.owner === p.owner && (gp.type === PIECE_TYPES.KI || gp.type === PIECE_TYPES.GI)) {
                  guards++;
                }
              }
            }
          }
          val += guards * 40;
        }

        if (p.owner === SENTE) {
          score += val;
        } else {
          score -= val;
        }
      }
    }

    // 2. 持ち駒の評価
    for (const [pType, count] of Object.entries(board.hands[SENTE])) {
      score += (this.handValues[pType] || 0) * count;
    }
    for (const [pType, count] of Object.entries(board.hands[GOTE])) {
      score -= (this.handValues[pType] || 0) * count;
    }

    return score;
  }

  // アルファベータ探索
  alphaBeta(board, depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
      return this.evaluate(board);
    }

    const legalMoves = board.getAllLegalMoves();
    if (legalMoves.length === 0) {
      // 詰み判定
      const owner = board.turn;
      if (board.isKingInCheck(owner)) {
        // 王手されていて手がない = 詰み
        return isMaximizing ? -19000 - depth : 19000 + depth;
      }
      return 0; // ステイルメイト（将棋ではほぼないが0点）
    }

    // 探索順序の簡易並べ替え（駒取り・成りを優先）
    legalMoves.sort((a, b) => {
      let scoreA = 0, scoreB = 0;
      if (a.promote) scoreA += 200;
      if (b.promote) scoreB += 200;
      if (a.from && board.board[a.to.r][a.to.c]) scoreA += 300;
      if (b.from && board.board[b.to.r][b.to.c]) scoreB += 300;
      return scoreB - scoreA;
    });

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of legalMoves) {
        board.makeMove(move, true);
        const evaluation = this.alphaBeta(board, depth - 1, alpha, beta, false);
        board.undoMove();
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of legalMoves) {
        board.makeMove(move, true);
        const evaluation = this.alphaBeta(board, depth - 1, alpha, beta, true);
        board.undoMove();
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // 現在の局面の分析・検討 (最善手・候補手・評価値の算出)
  analyze(board, depth = 2) {
    const isSenteTurn = (board.turn === SENTE);
    const legalMoves = board.getAllLegalMoves();

    if (legalMoves.length === 0) {
      const isCheck = board.isKingInCheck(board.turn);
      const winner = isSenteTurn ? '後手' : '先手';
      return {
        isGameOver: true,
        winner: isCheck ? winner : null,
        score: isSenteTurn ? -20000 : 20000,
        winRate: isSenteTurn ? 0 : 100,
        bestMove: null,
        topMoves: [],
        explanation: isCheck ? `詰みとなりました！${winner}の勝利です。` : '指せる手がありません。'
      };
    }

    const scoredMoves = [];

    for (const move of legalMoves) {
      // 1手進める
      board.makeMove(move, true);
      // 先手番なら次は後手(minimize)、後手番なら次は先手(maximize)
      const score = this.alphaBeta(board, depth - 1, -Infinity, Infinity, !isSenteTurn);
      board.undoMove();

      scoredMoves.push({
        move,
        kifu: board.toKifuString(move),
        score,
        reason: this.explainMove(board, move)
      });
    }

    // 先手ならスコアが高い順、後手ならスコアが低い順（後手有利=負値大）
    if (isSenteTurn) {
      scoredMoves.sort((a, b) => b.score - a.score);
    } else {
      scoredMoves.sort((a, b) => a.score - b.score);
    }

    const best = scoredMoves[0];
    const bestScore = best ? best.score : 0;

    // 勝率換算（ロジスティック関数）
    // 評価値0で50%, +600で約73%, +1200で約88%
    const winRate = Math.round(100 / (1 + Math.exp(-bestScore / 600)));

    // 形勢説明文
    let situation = '';
    if (Math.abs(bestScore) < 200) {
      situation = '互角の熱戦です。';
    } else if (bestScore >= 200 && bestScore < 600) {
      situation = '先手がやや指しやすい局面です。';
    } else if (bestScore >= 600 && bestScore < 1500) {
      situation = '先手優勢です！';
    } else if (bestScore >= 1500) {
      situation = '先手勝勢です！';
    } else if (bestScore <= -200 && bestScore > -600) {
      situation = '後手がやや指しやすい局面です。';
    } else if (bestScore <= -600 && bestScore > -1500) {
      situation = '後手優勢です！';
    } else {
      situation = '後手勝勢です！';
    }

    const bestMoveTurnMark = isSenteTurn ? '▲' : '▽';
    const explanation = `形勢は${situation}（評価値: ${bestScore > 0 ? '+' : ''}${bestScore}、先手勝率約${winRate}%）。おすすめの次の一手は【${best.kifu}】です。${best.reason}`;

    return {
      isGameOver: false,
      score: bestScore,
      winRate,
      situation,
      bestMove: best.move,
      bestKifu: best.kifu,
      explanation,
      topMoves: scoredMoves.slice(0, 3)
    };
  }

  // 指し手の理由・狙いの簡易解説テキストを生成
  explainMove(board, move) {
    const owner = board.turn;
    const opponent = 1 - owner;

    if (move.drop) {
      const pName = PIECE_NAMES[move.drop];
      // 持ち駒を打つ手
      if (move.drop === PIECE_TYPES.KI || move.drop === PIECE_TYPES.GI) {
        return `${pName}を打ち込んで敵陣にプレッシャーを与え、拠点を強化する好手です。`;
      } else if (move.drop === PIECE_TYPES.FU) {
        return `歩を叩いて相手の形を乱す狙いの一手です。`;
      } else if (move.drop === PIECE_TYPES.KA || move.drop === PIECE_TYPES.HI) {
        return `大駒の${pName}を自陣や敵陣に据えて、広範囲を制圧する鋭い手です。`;
      } else if (move.drop === PIECE_TYPES.KE) {
        return `桂馬を打って相手の駒を飛び越し、急所を攻める手です。`;
      }
      return `${pName}を有効な地点に打つ手です。`;
    }

    const p = board.board[move.from.r][move.from.c];
    const target = board.board[move.to.r][move.to.c];
    const pName = PIECE_NAMES[p.type];

    if (target) {
      const capName = PIECE_NAMES[target.type];
      return `相手の${capName}を奪って駒得を拡大する積極的な手です！`;
    }

    if (move.promote) {
      return `敵陣に突入して成ることで、戦力を大きくパワーアップさせる強力な手です！`;
    }

    // 初手〜序盤の定跡手
    if (p.type === PIECE_TYPES.FU && move.to.c === 6 && move.to.r === 5 && owner === SENTE) {
      return `角道を開けて攻勢の準備を整える、定跡の代表的な手です。`;
    }
    if (p.type === PIECE_TYPES.FU && move.to.c === 2 && move.to.r === 3 && owner === GOTE) {
      return `後手からも角道を開けて互角に立ち向かう、定跡の重要な一手です。`;
    }
    if (p.type === PIECE_TYPES.FU && move.to.c === 1 && move.to.r === 5 && owner === SENTE) {
      return `飛車先の歩を突いて、攻撃の主軸を進める積極的な手です。`;
    }

    if (p.type === PIECE_TYPES.GI) {
      return `銀を前進させて攻撃の足がかりを築く手です。`;
    }
    if (p.type === PIECE_TYPES.KI) {
      return `金を引き締めて玉の守りを固める、バランスの良い一手です。`;
    }
    if (p.type === PIECE_TYPES.KA) {
      return `角を好位置に配置して、敵陣の弱点を遠くから睨む手です。`;
    }
    if (p.type === PIECE_TYPES.HI) {
      return `飛車を活動的な筋に移動させ、突破力を高める手です。`;
    }
    if (p.type === PIECE_TYPES.OU) {
      return `玉を安全な囲いへと移動させ、耐久力を高める落ち着いた手です。`;
    }

    return `駒を活用して局面を有利に導く手です。`;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ShogiAI };
}