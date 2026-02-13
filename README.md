<div align="center">

<img src="media/icon.png" width="170">

# 文ノート (BunNote)

[![Version](https://img.shields.io/visual-studio-marketplace/v/elharis.bunnote)](https://marketplace.visualstudio.com/items?itemName=elharis.bunnote)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/elharis.bunnote)](https://marketplace.visualstudio.com/items?itemName=elharis.bunnote)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/elharis.bunnote)](https://marketplace.visualstudio.com/items?itemName=elharis.bunnote)
[![License](https://img.shields.io/github/license/elhariss/BunNote)](https://github.com/elhariss/BunNote/blob/main/LICENSE)

[English](https://github.com/elhariss/BunNote) | [日本語](https://github.com/elhariss/BunNote/blob/main/README_JP.md)

</div>

BunNote is a open-source VS Code extension for creating and managing Markdown notes. Write, organize, and manage your notes without leaving your editor.

<div align="center">

![BunNote Preview 1](screenshots/preview_1.png)

</div>

## Demo

<div align="center">

https://github.com/user-attachments/assets/video.mp4

</div>

## Features

### Markdown Editor
- Full-featured Markdown editor with live preview
- Syntax highlighting for code blocks
- Support for task lists, blockquotes, links, and more
- Clean, distraction-free writing experience
- Real-time word and character count

###  Vault Management
- Organize notes in folders
- Drag and drop files and folders
- Quick file creation and navigation
- Context menu for easy file operations
- Import external Markdown and image files

###  Customization
- Adjustable editor font size
- Optional Markdown marker coloring
- Customizable vault location


###  Productivity Features
- Auto-save functionality
- Image preview in editor
- Code block copy buttons
- Task list checkboxes
- Inline formatting (bold, italic, strikethrough)
- Quick link insertion

## Getting Started

### 1. Install the Extension
Install BunNote from the VS Code Marketplace or Extensions panel.

### 2. Set Your Vault Folder
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Run `BunNote: Set Vault Folder`
3. Select a folder to store your notes

### 3. Create Your First Note
- Click the "New File" icon in the BunNote sidebar
- Or use the Command Palette: `BunNote: Create New Note`
- Start writing!

## Usage

### Creating Notes and Folders

**From Toolbar:**
- Click the file icon to create a new note in the vault root
- Click the folder icon to create a new folder in the vault root

**From Context Menu:**
- Right-click on any folder in the vault tree
- Select "Create New Note" or "Create New Folder"
- The new item will be created inside that folder

### Managing Files

**Rename:**
- Right-click on a file or folder
- Select "Rename"
- Enter the new name

**Delete:**
- Right-click on a file or folder
- Select "Delete"
- Confirm the deletion

**Move:**
- Drag and drop files or folders to reorganize your vault
- Drop external Markdown or image files to import them

### Editor Features

**Formatting:**
- Right-click in the editor for formatting options
- Bold: `Ctrl+B` / `Cmd+B`
- Italic: `Ctrl+I` / `Cmd+I`
- Heading: `Ctrl+H` / `Cmd+H`
- Link: `Ctrl+K` / `Cmd+K`

**Lists:**
- Bullet list: `Ctrl+L` / `Cmd+L`
- Numbered list: `Ctrl+Alt+L` / `Cmd+Alt+L`
- Task list: Right-click → Task list

**Code:**
- Inline code: Wrap text with backticks
- Code block: `Ctrl+Alt+C` / `Cmd+Alt+C`
- Copy code: Click the copy button on code blocks

**Images:**
- Drag and drop images into the editor
- Use Markdown syntax: `![alt text](image.png)`
- Images are displayed inline with preview

## Configuration

Access settings via `File > Preferences > Settings` and search for "BunNote":

### Vault Path
**`bunnote.vaultPath`**
- Path to your BunNote vault folder
- Workspace-specific setting

### Default Vault Path
**`bunnote.defaultVaultPath`**
- Default vault path when no workspace vault is set
- User-level setting

### Auto Use Default Vault
**`bunnote.autoUseDefaultVault`**
- Automatically use default vault if workspace vault is not configured
- Default: `true`

### Color Markers
**`bunnote.colorMarkers`**
- Color Markdown markers in the editor
- Default: `false`

### Editor Font Size
**`bunnote.editorFontSize`**
- Editor font size in pixels
- Range: 10-32
- Default: `14`

## Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Bold | `Ctrl+B` | `Cmd+B` |
| Italic | `Ctrl+I` | `Cmd+I` |
| Heading | `Ctrl+H` | `Cmd+H` |
| Link | `Ctrl+K` | `Cmd+K` |
| Bullet List | `Ctrl+L` | `Cmd+L` |
| Numbered List | `Ctrl+Alt+L` | `Cmd+Alt+L` |
| Code Block | `Ctrl+Alt+C` | `Cmd+Alt+C` |
| Blockquote | `Ctrl+'` | `Cmd+'` |

## Supported File Types

### Notes
- `.md` - Markdown files

### Images
- `.png`, `.jpg`, `.jpeg`
- `.gif`, `.svg`, `.webp`
- `.bmp`, `.ico`



## Language Support

BunNote automatically detects your VS Code language setting:

- **English**: Default language
- **Japanese (日本語)**: Full translation available

To change language:
1. Open VS Code settings
2. Search for "Display Language"
3. Select your preferred language
4. Reload VS Code

## Troubleshooting

### Blank Page on Load
If the editor shows a blank page:
1. Close and reopen the BunNote panel
2. If issue persists, reload VS Code window (`Ctrl+R` / `Cmd+R`)

### Vault Not Showing
1. Ensure you've set a vault folder
2. Check that the folder exists and is accessible
3. Try setting the vault folder again

### Images Not Displaying
1. Ensure images are in a supported format
2. Check that image paths are correct
3. Try using relative paths from the vault root

### Auto-save Not Working
- Auto-save triggers after 750ms of inactivity
- Check that you have write permissions to the vault folder
- Ensure the vault path is correctly configured

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/elhariss/BunNote/issues).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [EasyMDE](https://github.com/Ionaru/easy-markdown-editor)
- Icons from [Phosphor Icons](https://phosphoricons.com/)

---

**Enjoy writing with BunNote!** 📝✨
