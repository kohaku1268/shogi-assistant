# 将棋AI検討＆音声対話アシスタント (Shogi Assistant)

盤面の局面検討と、「話しかけると次の一手を教えてくれる」AIアシスタントを搭載したAndroidアプリ（APKビルド対応）です。

---

## 🌟 特徴・機能

1. **将棋盤・局面検討（分析モード）**
   - 9×9の将棋盤で自由に駒を動かして局面を検討できます。
   - 二歩や打ち歩詰め、行き所のない駒などの反則手を完全チェック。
   - 成り/不成の選択ダイアログ、持ち駒の打込みに対応。
   - **リアルタイムAI分析**：局面ごとの評価値（先手・後手ゲージ）と勝率、最善手を自動計算。
   - 盤面上の候補手をタップすると、矢印＆ネオンハイライトで次の一手を明示。

2. **話しかけると次の一手を教えてくれる音声AIアシスタント**
   - 画面下の **マイクボタン（🎤）** を押して話しかけるだけで、AIが状況に応じた次の一手や形勢を教えてくれます。
   - **音声読み上げ（TTS）** に対応しており、耳で聞きながら検討可能。
   - 音声だけでなく、ワンタップの「クイック質問ボタン」やテキスト入力でも質問できます。
   - **主な質問例**：
     - 「次の一手は？」/「どう指せばいい？」
     - 「現在の形勢はどう？」/「どっちが有利？」
     - 「攻める手はある？」/「守りの手は？」
     - 「他の候補手を教えて」
   - ※ 設定画面からGemini APIキーを登録すると、プロ棋士のようなより深い自然な解説文も楽しめます（キーがなくても内蔵AIが完全オフラインで動作します）。

3. **クラウド自動ビルド（GitHub Actions）でAPKを簡単生成**
   - PCに重いAndroid SDKやJavaをインストールする必要はありません。
   - GitHubにこのプロジェクトをアップロードするだけで、GitHub Actions（クラウド）が自動で `.apk` ファイルをビルドしてくれます。

---

## 🚀 すぐに試す（PCブラウザでのプレビュー）

1. フォルダ内の `preview.bat` をダブルクリックします。
2. ブラウザが起動し、将棋盤と音声アシスタントをすぐに操作・確認できます。
   - ※ ChromeやEdgeなどのブラウザではマイク入力および音声読み上げがそのまま動作します。

---

## 📦 GitHub ActionsでAPKを自動ビルドしてスマホにインストールする手順

1. **GitHubに新しいリポジトリを作成**
   - [GitHub](https://github.com/) にログインし、`New repository` から新しいリポジトリ（例: `shogi-assistant`）を作成します。

2. **プロジェクトをプッシュ**
   - 以下のコマンドでリポジトリにアップロードします（またはGitHubのWeb画面からファイルをアップロードしても構いません）：
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Shogi Assistant"
   git branch -M main
   git remote add origin https://github.com/<あなたのユーザー名>/shogi-assistant.git
   git push -u origin main
   ```

3. **ActionsタブでAPKをダウンロード**
   - GitHubリポジトリの **「Actions」** タブを開きます。
   - 「Build Shogi Assistant APK」ワークフローが自動で実行されます（約2〜3分）。
   - ビルド完了後、ワークフローの実行結果ページの下部にある **`Artifacts`（成果物）** から **`ShogiAssistant-debug-apk.zip`** をダウンロードします。
   - 解凍すると `app-debug.apk` が入っています。

4. **Androidスマートフォンにインストール**
   - スマホに `app-debug.apk` を転送（Google Driveやメール、USB経由など）してタップするとインストールできます。
   - ※「提供元不明のアプリ」の警告が出た場合は許可してください。

---

## 📂 ディレクトリ構成

```
shogi-assistant/
├── .github/workflows/
│   └── build-apk.yml               # GitHub Actions クラウド自動ビルド設定
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml     # マイク権限・アプリ定義
│   │   ├── java/.../MainActivity.kt# Android WebView & マイクパーミッション制御
│   │   └── assets/www/             # 将棋盤＆アシスタントUI本体
│   │       ├── index.html
│   │       ├── css/style.css
│   │       └── js/
│   │           ├── shogi_rules.js  # 将棋ルール・合法手エンジン
│   │           ├── shogi_ai.js     # 評価関数・最善手思考AI
│   │           ├── voice_assistant.js # 音声認識・対話ロジック
│   │           └── app.js          # UIバインディング
│   └── build.gradle                # Androidビルド設定
├── build.gradle
├── settings.gradle
├── preview.bat                     # ブラウザ即時プレビュー用バッチ
└── README.md
```
