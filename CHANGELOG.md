# Change Log


## [1.0.12] - 2026-02-13

### Fixed
- Files now properly close in sidebar editor when deleted
- Content now syncs between main editor and sidebar editor when editing the same file
- Improved file deletion handling to prevent file recreation


## [1.0.8] - 2026-02-12

### Added
- Skeleton loaders for better loading experience
- File preview tooltips in vault tree (shows first 5 lines on hover)

### Performance
- Cached regex patterns across all files for significant performance boost
- Optimized markdown rendering and syntax hiding
- Improved typing performance in large documents
- Faster file operations and validation
- Reduced memory allocations during editing
- Cached DOM queries in file manager

### Fixed
- Word and character count labels now show in main editor view
- Improved webview initialization reliability

## [1.0.7] - 2026-02-11

### Added
- Japanese localization support with automatic language detection
- Bilingual UI (English/Japanese) based on VS Code settings
- Localized commands, menus, and error messages

### Fixed
- Drag-and-drop file moving bug (files disappearing when dropped outside folders)
- Blank page webview loading issue with retry logic


## [1.0.5] - 2026-02-10

### Added

- Display word count and character count at bottom of editor
- Update counts automatically as user types
- Add "Create New Note" to folder context menu
- Add "Create New Folder" to folder context menu
- Support creating items inside specific folders
- Organize menu into groups (Create, Modify, Delete)


## [1.0.0] - 2026-01-30

### Added
- Markdown note editor with WYSIWYG rendering
- Folder-based note organization with drag & drop support
- Custom webview editor for VS Code's main editor area
- Context menu "Open in Editor" for markdown files
- Auto-save functionality
- Real-time sync with external markdown editors (Obsidian, etc.)
- Task list support with checkboxes
- Syntax highlighting for code blocks
- File and folder management (create, rename, delete, duplicate, move)
- Vault configuration with workspace and default paths
- File system watcher for external changes
- Markdown syntax hiding for cleaner editing experience