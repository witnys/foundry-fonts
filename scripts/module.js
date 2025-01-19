// scripts/module.js
class GoogleFontsConfig {
    static ID = 'foundry-google-fonts';
    static SETTINGS = {
        FONTS: 'font-settings'
    };

    static DEFAULT_SELECTORS = [
        { selector: '.window-title', label: 'Window Titles' },
        { selector: '.window-content', label: 'Window Content' },
        { selector: '.dialog .dialog-content', label: 'Dialog Content' },
        { selector: '.chat-message .message-header', label: 'Chat Headers' },
        { selector: '.chat-message .message-content', label: 'Chat Content' },
        { selector: '.sidebar-tab .directory-header', label: 'Sidebar Headers' },
        { selector: '.journal-entry-content', label: 'Journal Content' }
    ];
}

class GoogleFontsModule {
    static async init() {
        game.settings.registerMenu(GoogleFontsConfig.ID, 'config', {
            name: 'Configure Google Fonts',
            label: 'Configure Fonts',
            hint: 'Configure which interface elements use which Google Fonts.',
            icon: 'fas fa-font',
            type: GoogleFontsConfigApp,
            restricted: true
        });

        game.settings.register(GoogleFontsConfig.ID, GoogleFontsConfig.SETTINGS.FONTS, {
            name: 'Font Settings',
            scope: 'world',
            config: false,
            type: Object,
            default: {},
            onChange: () => window.location.reload()
        });

        await this.loadFonts();
    }

    static async loadFonts() {
        const settings = game.settings.get(GoogleFontsConfig.ID, GoogleFontsConfig.SETTINGS.FONTS);
        const fonts = new Set();
        
        // Collect all unique fonts that are enabled
        Object.values(settings).forEach(setting => {
            if (setting.enabled && setting.font) {
                fonts.add(setting.font);
            }
        });

        if (fonts.size === 0) return;

        // Convert font names to Google Fonts URL format
        const fontParam = Array.from(fonts)
            .map(font => font.replace(/\s+/g, '+'))
            .join('|');

        // Load the fonts
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
        document.head.appendChild(link);

        // Create and apply CSS rules
        const style = document.createElement('style');
        style.textContent = Object.entries(settings)
            .filter(([_, data]) => data.enabled && data.font)
            .map(([selector, data]) => `
                ${selector} {
                    font-family: "${data.font}", ${data.fallback || 'sans-serif'} !important;
                }
            `).join('\n');
        document.head.appendChild(style);
    }
}

class GoogleFontsConfigApp extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'google-fonts-config',
            title: 'Google Fonts Configuration',
            template: `modules/${GoogleFontsConfig.ID}/templates/settings.html`,
            width: 600,
            height: 'auto',
            classes: ['google-fonts-settings'],
            tabs: [
                {
                    navSelector: '.tabs',
                    contentSelector: '.content',
                    initial: 'interface'
                }
            ]
        });
    }

    getData() {
        const settings = game.settings.get(GoogleFontsConfig.ID, GoogleFontsConfig.SETTINGS.FONTS);
        
        return {
            defaultSelectors: GoogleFontsConfig.DEFAULT_SELECTORS.map(item => ({
                ...item,
                settings: settings[item.selector] || { enabled: false, font: '', fallback: 'sans-serif' }
            }))
        };
    }

    async _updateObject(_, formData) {
        const settings = {};
        
        // Process form data into settings object
        for (let [key, value] of Object.entries(formData)) {
            const [selector, property] = key.split('.');
            if (!settings[selector]) settings[selector] = { enabled: false, font: '', fallback: 'sans-serif' };
            settings[selector][property] = value;
        }

        await game.settings.set(GoogleFontsConfig.ID, GoogleFontsConfig.SETTINGS.FONTS, settings);
    }
}

Hooks.once('init', () => {
    GoogleFontsModule.init();
});
