// アプリケーション統合コントローラ (Shogi Assistant App)

document.addEventListener('DOMContentLoaded', () => {
  const board = new ShogiBoard();
  const ai = new ShogiAI();

  let selectedSquare = null; // { r, c } または { drop: type }
  let validMoves = [];
  let highlightedBestMove = null;
  let pendingPromotionMove = null;

  // DOM要素
  const boardEl = document.getElementById('shogi-board');
  const goteHandEl = document.getElementById('gote-hand');
  const senteHandEl = document.getElementById('sente-hand');
  const evalFillEl = document.getElementById('eval-bar-fill');
  const evalTextEl = document.getElementById('eval-score-text');
  const turnIndicatorEl = document.getElementById('turn-indicator');
  const kifuListEl = document.getElementById('kifu-history');
  const chatMessagesEl = document.getElementById('chat-messages');
  const textInputEl = document.getElementById('user-text-input');
  const sendBtnEl = document.getElementById('send-text-btn');
  const micBtnEl = document.getElementById('mic-btn');
  const promoteModalEl = document.getElementById('promote-modal');
  const settingsModalEl = document.getElementById('settings-modal');

  // 音声アシスタントの初期化
  const assistant = new VoiceAssistant(
    board,
    ai,
    (text, isUser, meta) => addChatMessage(text, isUser, meta),
    (bestMove) => {
      highlightedBestMove = bestMove;
      renderBoard();
    }
  );

  // 初回レンダリング
  renderBoard();
  renderHands();
  updateAnalysis();

  // 初回アシスタントあいさつ
  setTimeout(() => {
    addChatMessage(
      'こんにちは！将棋検討アシスタントです。\n盤面の駒を自由に動かして局面を検討できます。\nマイクボタンを押して「次の一手は？」や「どう指せばいい？」と話しかけてみてください！',
      false
    );
  }, 300);

  // ===============================
  // 盤面描画
  // ===============================
  function renderBoard() {
    boardEl.innerHTML = '';

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const sq = document.createElement('div');
        sq.className = 'square';
        sq.dataset.r = r;
        sq.dataset.c = c;

        // 選択中のハイライト
        if (selectedSquare && !selectedSquare.drop && selectedSquare.r === r && selectedSquare.c === c) {
          sq.classList.add('selected');
        }

        // 移動可能先ハイライト
        const isValid = validMoves.some(m => m.to.r === r && m.to.c === c);
        if (isValid) {
          sq.classList.add('valid-dest');
        }

        // 最善手ハイライト
        if (highlightedBestMove) {
          if (highlightedBestMove.from && highlightedBestMove.from.r === r && highlightedBestMove.from.c === c) {
            sq.classList.add('best-move-from');
          }
          if (highlightedBestMove.to.r === r && highlightedBestMove.to.c === c) {
            sq.classList.add('best-move-to');
          }
        }

        // 駒の配置
        const piece = board.board[r][c];
        if (piece) {
          const pEl = document.createElement('div');
          pEl.className = `piece ${piece.owner === SENTE ? 'sente' : 'gote'}`;
          pEl.textContent = PIECE_NAMES[piece.type];
          sq.appendChild(pEl);
        }

        sq.addEventListener('click', () => handleSquareClick(r, c));
        boardEl.appendChild(sq);
      }
    }
  }

  // 駒台の描画
  function renderHands() {
    renderHandSide(goteHandEl, GOTE);
    renderHandSide(senteHandEl, SENTE);
  }

  function renderHandSide(container, owner) {
    container.innerHTML = '';
    const hand = board.hands[owner];
    const pieceTypes = [PIECE_TYPES.HI, PIECE_TYPES.KA, PIECE_TYPES.KI, PIECE_TYPES.GI, PIECE_TYPES.KE, PIECE_TYPES.KY, PIECE_TYPES.FU];

    for (const pType of pieceTypes) {
      const count = hand[pType] || 0;
      if (count > 0) {
        const item = document.createElement('div');
        item.className = `hand-piece ${owner === SENTE ? 'sente' : 'gote'}`;
        if (selectedSquare && selectedSquare.drop === pType && board.turn === owner) {
          item.classList.add('selected');
        }

        const nameSpan = document.createElement('span');
        nameSpan.className = 'piece-char';
        nameSpan.textContent = PIECE_NAMES[pType];

        const countSpan = document.createElement('span');
        countSpan.className = 'count-badge';
        countSpan.textContent = count > 1 ? count : '';

        item.appendChild(nameSpan);
        if (count > 1) item.appendChild(countSpan);

        item.addEventListener('click', (e) => {
          e.stopPropagation();
          handleHandClick(owner, pType);
        });

        container.appendChild(item);
      }
    }
  }

  // ===============================
  // クリック＆操作ロジック
  // ===============================
  function handleHandClick(owner, pType) {
    if (board.turn !== owner) return; // 自分の手番の駒のみ選択可能

    if (selectedSquare && selectedSquare.drop === pType) {
      // 選択解除
      clearSelection();
    } else {
      selectedSquare = { drop: pType };
      validMoves = board.getDropMoves(pType).filter(m => {
        // 自殺手チェック
        const testBoard = board.clone();
        testBoard.makeMove(m, true);
        return !testBoard.isKingInCheck(owner);
      });
      highlightedBestMove = null;
    }
    renderBoard();
    renderHands();
  }

  function handleSquareClick(r, c) {
    const targetPiece = board.board[r][c];

    // 1. 移動先の選択
    if (selectedSquare) {
      const matchedMove = validMoves.find(m => m.to.r === r && m.to.c === c);
      if (matchedMove) {
        // 成る/不成の判定
        if (!selectedSquare.drop) {
          const promoMoves = validMoves.filter(m => m.to.r === r && m.to.c === c);
          if (promoMoves.length === 2) {
            // 成るか成らないかを選べる場合
            pendingPromotionMove = promoMoves;
            showPromotionModal();
            return;
          }
        }
        executeMove(matchedMove);
        return;
      }
    }

    // 2. 自駒の選択
    if (targetPiece && targetPiece.owner === board.turn) {
      selectedSquare = { r, c };
      validMoves = board.getPieceMoves(r, c).filter(m => {
        const testBoard = board.clone();
        testBoard.makeMove(m, true);
        return !testBoard.isKingInCheck(board.turn);
      });
      highlightedBestMove = null;
    } else {
      clearSelection();
    }

    renderBoard();
    renderHands();
  }

  function clearSelection() {
    selectedSquare = null;
    validMoves = [];
  }

  function executeMove(move) {
    const kifuText = board.toKifuString(move);
    board.makeMove(move);
    clearSelection();
    highlightedBestMove = null;

    renderBoard();
    renderHands();
    updateKifu(kifuText);
    updateAnalysis();
  }

  // 成りモーダル
  function showPromotionModal() {
    promoteModalEl.classList.remove('hidden');
  }

  document.getElementById('promote-yes-btn').addEventListener('click', () => {
    promoteModalEl.classList.add('hidden');
    const move = pendingPromotionMove.find(m => m.promote === true);
    if (move) executeMove(move);
    pendingPromotionMove = null;
  });

  document.getElementById('promote-no-btn').addEventListener('click', () => {
    promoteModalEl.classList.add('hidden');
    const move = pendingPromotionMove.find(m => m.promote === false);
    if (move) executeMove(move);
    pendingPromotionMove = null;
  });

  // ===============================
  // 検討・分析更新
  // ===============================
  function updateAnalysis() {
    const isSente = (board.turn === SENTE);
    turnIndicatorEl.textContent = isSente ? '手番: ▲先手' : '手番: ▽後手';
    turnIndicatorEl.className = isSente ? 'sente-active' : 'gote-active';

    const analysis = ai.analyze(board, 2);

    // 評価値バー更新 (先手勝率でバー幅)
    const winRate = analysis.winRate;
    evalFillEl.style.width = `${winRate}%`;

    const scoreDisplay = analysis.score > 0 ? `+${analysis.score}` : `${analysis.score}`;
    evalTextEl.textContent = `先手評価値: ${scoreDisplay} (${winRate}%)`;

    // 候補手パネル
    const topMovesContainer = document.getElementById('top-moves-list');
    topMovesContainer.innerHTML = '';
    analysis.topMoves.forEach((tm, idx) => {
      const item = document.createElement('div');
      item.className = 'top-move-item';
      item.innerHTML = `<strong>${idx + 1}. ${tm.kifu}</strong> <span class="move-score">(${tm.score > 0 ? '+' : ''}${tm.score})</span>`;
      item.addEventListener('click', () => {
        highlightedBestMove = tm.move;
        renderBoard();
      });
      topMovesContainer.appendChild(item);
    });
  }

  function updateKifu(kifuText) {
    const li = document.createElement('li');
    li.textContent = `${board.history.length}. ${kifuText}`;
    kifuListEl.appendChild(li);
    kifuListEl.scrollTop = kifuListEl.scrollHeight;
  }

  // ===============================
  // コントロールボタン
  // ===============================
  document.getElementById('btn-undo').addEventListener('click', () => {
    board.undoMove();
    if (kifuListEl.lastChild) kifuListEl.removeChild(kifuListEl.lastChild);
    clearSelection();
    highlightedBestMove = null;
    renderBoard();
    renderHands();
    updateAnalysis();
  });

  document.getElementById('btn-redo').addEventListener('click', () => {
    const entry = board.redoMove();
    if (entry) {
      updateKifu(board.toKifuString(entry.move));
      clearSelection();
      highlightedBestMove = null;
      renderBoard();
      renderHands();
      updateAnalysis();
    }
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('局面を初期配置にリセットしますか？')) {
      board.reset();
      kifuListEl.innerHTML = '';
      clearSelection();
      highlightedBestMove = null;
      renderBoard();
      renderHands();
      updateAnalysis();
    }
  });

  document.getElementById('btn-hint').addEventListener('click', () => {
    const analysis = ai.analyze(board, 2);
    if (analysis.bestMove) {
      highlightedBestMove = analysis.bestMove;
      renderBoard();
      assistant.handleUserInput('次の一手を教えて');
    }
  });

  // ===============================
  // チャット＆音声アシスタントUI
  // ===============================
  function addChatMessage(text, isUser, meta = null) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-bubble ${isUser ? 'user-bubble' : 'ai-bubble'}`;

    const textEl = document.createElement('div');
    textEl.className = 'bubble-text';
    textEl.innerText = text;
    msgEl.appendChild(textEl);

    if (!isUser && meta && meta.bestMove) {
      const applyBtn = document.createElement('button');
      applyBtn.className = 'btn-apply-move';
      applyBtn.textContent = `この手【${meta.bestKifu}】を着手する`;
      applyBtn.addEventListener('click', () => {
        executeMove(meta.bestMove);
      });
      msgEl.appendChild(applyBtn);
    }

    chatMessagesEl.appendChild(msgEl);
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
  }

  // マイクボタン
  micBtnEl.addEventListener('click', () => {
    assistant.toggleListening();
  });

  // テキスト送信
  sendBtnEl.addEventListener('click', () => {
    const val = textInputEl.value.trim();
    if (val) {
      assistant.handleUserInput(val);
      textInputEl.value = '';
    }
  });

  textInputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendBtnEl.click();
    }
  });

  // クイック質問チップ
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.dataset.query;
      if (q) assistant.handleUserInput(q);
    });
  });

  // ===============================
  // 設定モーダル
  // ===============================
  const btnSettings = document.getElementById('btn-settings');
  const closeSettings = document.getElementById('close-settings');
  const apiKeyInput = document.getElementById('gemini-api-key-input');
  const ttsToggle = document.getElementById('tts-toggle');

  btnSettings.addEventListener('click', () => {
    apiKeyInput.value = assistant.geminiApiKey;
    ttsToggle.checked = assistant.speechSynthesisEnabled;
    settingsModalEl.classList.remove('hidden');
  });

  closeSettings.addEventListener('click', () => {
    assistant.setGeminiApiKey(apiKeyInput.value);
    assistant.speechSynthesisEnabled = ttsToggle.checked;
    settingsModalEl.classList.add('hidden');
  });
});