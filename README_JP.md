<div align="center">

<img src="media/icon.png" width="170">

# 文ノート (BunNote)

[![Version](https://img.shields.io/visual-studio-marketplace/v/elharis.bunnote)](https://marketplace.visualstudio.com/items?itemName=elharis.bunnote)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/elharis.bunnote)](https://marketplace.visualstudio.com/items?itemName=elharis.bunnote)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/elharis.bunnote)](https://marketplace.visualstudio.com/items?itemName=elharis.bunnote)
[![License](https://img.shields.io/github/license/elhariss/BunNote)](https://github.com/elhariss/BunNote/blob/main/LICENSE)

[English](#english) | [日本語](#japanese)

</div>

文ノート（BunNote）は、VS Code上でマークダウンノートを作成・管理できるオープンソース拡張機能です。エディタを離れることなく、ノートの作成、整理、管理ができます。

<div align="center">

![BunNote プレビュー](screenshots/preview_1.png)

</div>

## デモ

<div align="center">

https://github.com/user-attachments/assets/2d5193c3-f4fa-4aea-99b9-8442c4b87026

</div>

## 機能

### Markdownエディタ
- ライブプレビュー付きの本格的なMarkdownエディタ
- コードブロックのシンタックスハイライト
- タスクリスト、引用、リンクなどのサポート
- クリーンで集中できる執筆環境
- リアルタイムの単語数と文字数カウント

### Vault管理
- フォルダでノートを整理
- ファイルとフォルダのドラッグ&ドロップ
- 素早いファイル作成とナビゲーション
- 簡単なファイル操作のためのコンテキストメニュー
- 外部のMarkdownファイルと画像ファイルのインポート

### カスタマイズ
- 調整可能なエディタフォントサイズ
- オプションのMarkdownマーカーの色付け
- カスタマイズ可能なVaultの場所


### 生産性機能
- 自動保存機能
- エディタ内の画像プレビュー
- コードブロックのコピーボタン
- タスクリストのチェックボックス
- インライン書式設定（太字、斜体、取り消し線）
- クイックリンク挿入

## はじめに

### 1. 拡張機能をインストール
VS Code MarketplaceまたはExtensionsパネルからBunNoteをインストールします。

### 2. Vaultフォルダを設定
1. コマンドパレットを開く（`Ctrl+Shift+P` / `Cmd+Shift+P`）
2. `BunNote: Vaultフォルダを設定`を実行
3. ノートを保存するフォルダを選択

### 3. 最初のノートを作成
- BunNoteサイドバーの「新しいファイル」アイコンをクリック
- またはコマンドパレット：`BunNote: 新しいノートを作成`
- 書き始めましょう！

## 使い方

### ノートとフォルダの作成

**ツールバーから：**
- ファイルアイコンをクリックしてVaultルートに新しいノートを作成
- フォルダアイコンをクリックしてVaultルートに新しいフォルダを作成

**コンテキストメニューから：**
- Vaultツリーの任意のフォルダを右クリック
- 「新しいノートを作成」または「新しいフォルダを作成」を選択
- 新しいアイテムはそのフォルダ内に作成されます

### ファイルの管理

**名前変更：**
- ファイルまたはフォルダを右クリック
- 「名前を変更」を選択
- 新しい名前を入力

**削除：**
- ファイルまたはフォルダを右クリック
- 「削除」を選択
- 削除を確認

**移動：**
- ファイルやフォルダをドラッグ&ドロップしてVaultを再編成
- 外部のMarkdownファイルや画像ファイルをドロップしてインポート

### エディタ機能

**書式設定：**
- エディタ内で右クリックして書式設定オプションを表示
- 太字：`Ctrl+B` / `Cmd+B`
- 斜体：`Ctrl+I` / `Cmd+I`
- 見出し：`Ctrl+H` / `Cmd+H`
- リンク：`Ctrl+K` / `Cmd+K`

**リスト：**
- 箇条書きリスト：`Ctrl+L` / `Cmd+L`
- 番号付きリスト：`Ctrl+Alt+L` / `Cmd+Alt+L`
- タスクリスト：右クリック → タスクリスト

**コード：**
- インラインコード：バッククォートでテキストを囲む
- コードブロック：`Ctrl+Alt+C` / `Cmd+Alt+C`
- コードをコピー：コードブロックのコピーボタンをクリック

**画像：**
- エディタに画像をドラッグ&ドロップ
- Markdown構文を使用：`![代替テキスト](image.png)`
- 画像はプレビュー付きでインライン表示されます

## 設定

`ファイル > 基本設定 > 設定`から設定にアクセスし、「BunNote」を検索：

### Vaultパス
**`bunnote.vaultPath`**
- BunNote Vaultフォルダのパス
- ワークスペース固有の設定

### デフォルトVaultパス
**`bunnote.defaultVaultPath`**
- ワークスペースのVaultが設定されていない場合のデフォルトVaultパス
- ユーザーレベルの設定

### デフォルトVaultを自動使用
**`bunnote.autoUseDefaultVault`**
- ワークスペースのVaultが設定されていない場合、自動的にデフォルトVaultを使用
- デフォルト：`true`

### マーカーに色を付ける
**`bunnote.colorMarkers`**
- エディタでMarkdownマーカーに色を付ける
- デフォルト：`false`

### エディタフォントサイズ
**`bunnote.editorFontSize`**
- エディタのフォントサイズ（ピクセル）
- 範囲：10-32
- デフォルト：`14`

## キーボードショートカット

| アクション | Windows/Linux | macOS |
|--------|--------------|-------|
| 太字 | `Ctrl+B` | `Cmd+B` |
| 斜体 | `Ctrl+I` | `Cmd+I` |
| 見出し | `Ctrl+H` | `Cmd+H` |
| リンク | `Ctrl+K` | `Cmd+K` |
| 箇条書きリスト | `Ctrl+L` | `Cmd+L` |
| 番号付きリスト | `Ctrl+Alt+L` | `Cmd+Alt+L` |
| コードブロック | `Ctrl+Alt+C` | `Cmd+Alt+C` |
| 引用 | `Ctrl+'` | `Cmd+'` |

## サポートされているファイルタイプ

### ノート
- `.md` - Markdownファイル

### 画像
- `.png`, `.jpg`, `.jpeg`
- `.gif`, `.svg`, `.webp`
- `.bmp`, `.ico`



## 言語サポート

BunNoteはVS Codeの言語設定を自動的に検出します：

- **English（英語）**：デフォルト言語
- **Japanese（日本語）**：完全な翻訳が利用可能

言語を変更するには：
1. VS Codeの設定を開く
2. 「表示言語」を検索
3. 希望の言語を選択
4. VS Codeを再読み込み

## トラブルシューティング

### 読み込み時に空白ページが表示される
エディタが空白ページを表示する場合：
1. BunNoteパネルを閉じて再度開く
2. 問題が解決しない場合は、VS Codeウィンドウを再読み込み（`Ctrl+R` / `Cmd+R`）

### Vaultが表示されない
1. Vaultフォルダを設定したことを確認
2. フォルダが存在し、アクセス可能であることを確認
3. Vaultフォルダを再度設定してみる

### 画像が表示されない
1. 画像がサポートされている形式であることを確認
2. 画像パスが正しいことを確認
3. Vaultルートからの相対パスを使用してみる

### 自動保存が機能しない
- 自動保存は750msの非アクティブ後にトリガーされます
- Vaultフォルダへの書き込み権限があることを確認
- Vaultパスが正しく設定されていることを確認

## 貢献

バグを見つけたり、機能リクエストがありますか？[GitHub](https://github.com/elhariss/BunNote/issues)でissueを開いてください。

## ライセンス

MITライセンス - 詳細は[LICENSE](LICENSE)ファイルを参照してください。

## 謝辞

- [EasyMDE](https://github.com/Ionaru/easy-markdown-editor)で構築
- アイコンは[Phosphor Icons](https://phosphoricons.com/)から

---

**BunNoteで楽しく執筆を！** 📝✨
