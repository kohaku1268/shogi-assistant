// 音声認識・音声対話＆AIアシスタント (Voice Assistant)

class VoiceAssistant {
  constructor(board, ai, onMessageCallback, onHighlightBestMoveCallback) {
    this.board = board;
    this.ai = ai;
    this.onMessageCallback = onMessageCallback; // (text, isUser, meta) => void
    this.onHighlightBestMoveCallback = onHighlightBestMoveCallback; // (move) => void

    this.isListening = false;
    this.speechSynthesisEnabled = true;
    this.recognition = null;
    this.geminiApiKey = localStorage.getItem('shogi_gemini_api_key') || '';

    this.initSpeechRecognition();
  }

  initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'ja-JP';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateMicUI(true);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicUI(false);
      };

      this.recognition.onerror = (event) => {
        console.warn('SpeechRecognition error:', event.error);
        this.isListening = false;
        this.updateMicUI(false);
        if (event.error === 'not-allowed') {
          this.onMessageCallback('マイクの使用が許可されていません。端末の設定でマイクを許可してください。', false);
        }
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          this.handleUserInput(transcript.trim());
        }
      };
    } else {
      console.log('Web Speech API is not supported in this environment.');
    }
  }

  toggleListening() {
    if (!this.recognition) {
      this.onMessageCallback('この端末では音声認識APIがサポートされていないため、下のテキスト入力またはボタンから質問してください。', false);
      return;
    }
    if (this.isListening) {
      this.recognition.stop();
    } else {
      try {
        this.recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  }

  updateMicUI(active) {
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    if (micBtn) {
      if (active) {
        micBtn.classList.add('recording');
        if (micStatus) micStatus.textContent = '聞いています…話してください';
      } else {
        micBtn.classList.remove('recording');
        if (micStatus) micStatus.textContent = 'タップして話しかける';
      }
    }
  }

  // ユーザーからの発話またはテキスト入力を処理
  async handleUserInput(text) {
    // ユーザー発話をチャットに表示
    this.onMessageCallback(text, true);

    // AIで現在の局面を分析
    const analysis = this.ai.analyze(this.board, 2);

    // 最善手を盤面にハイライト表示
    if (analysis.bestMove && this.onHighlightBestMoveCallback) {
      this.onHighlightBestMoveCallback(analysis.bestMove);
    }

    // Gemini APIキーが登録されており、オンラインの場合はLLM解説を試行
    if (this.geminiApiKey && navigator.onLine) {
      try {
        const geminiResponse = await this.askGemini(text, analysis);
        if (geminiResponse) {
          this.reply(geminiResponse, analysis);
          return;
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to local analysis:', err);
      }
    }

    // 内蔵AIルールベース対話生成
    const responseText = this.generateLocalResponse(text, analysis);
    this.reply(responseText, analysis);
  }

  // 内蔵AIによる発話意図の解釈と応答作成
  generateLocalResponse(text, analysis) {
    const lower = text.toLowerCase();
    const isSente = (this.board.turn === SENTE);
    const turnStr = isSente ? '先手（下側・▲）' : '後手（上側・▽）';

    if (analysis.isGameOver) {
      return analysis.explanation;
    }

    // パターン1: 形勢・状況・勝敗について
    if (text.includes('形勢') || text.includes('有利') || text.includes('勝って') || text.includes('状況') || text.includes('どっち')) {
      const scoreStr = analysis.score > 0 ? `+${analysis.score}` : `${analysis.score}`;
      return `現在の形勢は【${analysis.situation}】です（先手視点評価値: ${scoreStr}点）。手番は${turnStr}です。次に指す手として【${analysis.bestKifu}】がおすすめです！`;
    }

    // パターン2: 候補手一覧・他の手
    if (text.includes('候補') || text.includes('他の手') || text.includes('選択肢') || text.includes('全部')) {
      const movesText = analysis.topMoves.map((m, idx) => `${idx + 1}. 【${m.kifu}】`).join('、 ');
      return `現在の有力な候補手は、${movesText} などがあります。中でも最もおすすめなのは【${analysis.bestKifu}】です！`;
    }

    // パターン3: 守り・受け
    if (text.includes('守り') || text.includes('受ける') || text.includes('受けて') || text.includes('安全')) {
      return `守りを意識する場面ですね。AIの推奨する【${analysis.bestKifu}】は陣形のバランスを保ち、相手の攻めをいなす手です。玉の安全度を高めていきましょう！`;
    }

    // パターン4: 攻め・狙い目
    if (text.includes('攻め') || text.includes('狙い') || text.includes('突破') || text.includes('攻めて')) {
      return `攻め手としてのおすすめは【${analysis.bestKifu}】です！${analysis.bestMove.reason || '駒を前に進めて敵陣の突破を目指しましょう！'}`;
    }

    // デフォルト（次の一手、どう指す、アドバイスなど）
    return `手番は${turnStr}です。おすすめの次の一手は【${analysis.bestKifu}】です！\n${analysis.explanation}`;
  }

  // Gemini APIとの連携（設定されている場合）
  async askGemini(userQuestion, analysis) {
    const isSente = (this.board.turn === SENTE);
    const prompt = `あなたは親切で分かりやすい将棋のプロAI検討アシスタントです。
現在の将棋の局面情報:
- 手番: ${isSente ? '先手' : '後手'}
- 形勢評価: ${analysis.situation} (評価値: ${analysis.score})
- AI推奨の最善手: ${analysis.bestKifu}
- 最善手の解説: ${analysis.bestMove ? analysis.bestMove.reason : ''}
- 有力な候補手: ${analysis.topMoves.map(m => m.kifu).join(', ')}

ユーザーからの質問: 「${userQuestion}」

質問に対して、将棋初心〜中級者にも分かりやすく、優しく前向きなトーンでアドバイスを2〜3文（150文字程度）で答えてください。おすすめの次の一手を強調してください。`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  }

  // アシスタントからの返答出力＋音声読み上げ
  reply(text, analysis) {
    this.onMessageCallback(text, false, analysis);

    if (this.speechSynthesisEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // 前の音声を停止
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 1.05; // テンポよく
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  setGeminiApiKey(key) {
    this.geminiApiKey = key.trim();
    localStorage.setItem('shogi_gemini_api_key', this.geminiApiKey);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VoiceAssistant };
}