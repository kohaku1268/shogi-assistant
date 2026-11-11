@echo off
chcp 65001 > nul
echo ====================================================
echo  将棋AI検討アプリ GitHub アップロード用スクリプト
echo ====================================================
echo.
echo GitHubで作成したリポジトリのURLを入力してください。
echo （例: https://github.com/あなたのユーザー名/shogi-assistant.git）
echo.
set /p REPO_URL="リポジトリURL: "

if "%REPO_URL%"=="" (
    echo URLが入力されませんでした。処理を中止します。
    pause
    exit /b
)

echo.
echo アップロードを開始します...
git --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 【エラー】Gitがインストールされていません。
    echo ブラウザから直接ファイルをアップロードするか、Gitをインストールしてください。
    pause
    exit /b
)

git init
git add .
git commit -m "Initial commit for Shogi Assistant APK build"
git branch -M main
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%
git push -u origin main --force

echo.
echo ====================================================
echo アップロードが完了しました！
echo GitHubリポジトリの「Actions」タブを開いて、
echo APKのビルド完了をお待ちください（約2〜3分）。
echo ====================================================
pause
