const vscode = require('vscode');
const fs = require('fs');
const path = require('path');

let currentLocale = 'en';
let translations = {};

/**
 * Initialize localization system
 * ローカライゼーションシステムを初期化
 */
function initLocalization(context) {
    // Get VS Code language setting
    const vscodeLang = vscode.env.language || 'en';
    
    // Map VS Code language codes to our locale files
    // VS Codeの言語コードをロケールファイルにマッピング
    const langMap = {
        'ja': 'ja',
        'ja-jp': 'ja',
        'en': 'en',
        'en-us': 'en'
    };
    
    currentLocale = langMap[vscodeLang.toLowerCase()] || 'en';
    
    // Load translation file
    // 翻訳ファイルを読み込む
    try {
        const localePath = path.join(context.extensionPath, 'src', 'locales', `${currentLocale}.json`);
        const content = fs.readFileSync(localePath, 'utf8');
        translations = JSON.parse(content);
    } catch (error) {
        console.error('Failed to load translations:', error);
        // Fallback to English
        // 英語にフォールバック
        try {
            const localePath = path.join(context.extensionPath, 'src', 'locales', 'en.json');
            const content = fs.readFileSync(localePath, 'utf8');
            translations = JSON.parse(content);
            currentLocale = 'en';
        } catch (fallbackError) {
            console.error('Failed to load fallback translations:', fallbackError);
            translations = {};
        }
    }
}

/**
 * Get translated string
 * 翻訳された文字列を取得
 * @param {string} key - Translation key
 * @param {...string} args - Arguments to replace {0}, {1}, etc.
 * @returns {string} Translated string
 */
function t(key, ...args) {
    let text = translations[key] || key;
    
    // Replace placeholders {0}, {1}, etc. with arguments
    // プレースホルダー {0}, {1} などを引数で置き換え
    args.forEach((arg, index) => {
        text = text.replace(`{${index}}`, arg);
    });
    
    return text;
}

/**
 * Get current locale
 * 現在のロケールを取得
 * @returns {string} Current locale code
 */
function getLocale() {
    return currentLocale;
}

/**
 * Get all translations for webview
 * Webview用のすべての翻訳を取得
 * @returns {object} All translations
 */
function getAllTranslations() {
    return translations;
}

module.exports = {
    initLocalization,
    t,
    getLocale,
    getAllTranslations
};
