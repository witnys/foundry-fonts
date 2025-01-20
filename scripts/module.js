// scripts/module.js
// Config class for constants and settings
class GoogleFontsConfig {
    static ID = 'foundry-fonts';  // Match this with your module.json id
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

// Settings form application
class GoogleFontsConfigApp extends FormApplication {
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: 'google-fonts-config',
            title: 'Google Fonts Configuration',
            template: `modules/${GoogleFontsConfig.ID}/templates/settings.html`,
            width: 600,
            height: 'auto',
            classes: ['google-fonts-settings'],
            closeOnSubmit: false  // Keep the form open after saving
        });
    }

    getData(options={}) {
        const settings = game.settings.get(GoogleFontsConfig.ID, GoogleFontsConfig.SETTINGS.FONTS);
        
        return {
            defaultSelectors: GoogleFontsConfig.DEFAULT_SELECTORS.map(item => ({
                ...item,
                settings: settings[item.selector] || { enabled: false, font: '', fallback: 'sans-serif' }
            }))
        };
    }

    async _updateObject(event, formData) {
        const settings = {};
        
        // Process form data into settings object
        for (let [key, value] of Object.entries(formData)) {
            const [selector, property] = key.split('.');
            if (!settings[selector]) settings[selector] = { enabled: false, font: '', fallback: 'sans-serif' };
            settings[selector][property] = value;
        }

        await game.settings.set(GoogleFontsConfig.ID, GoogleFontsConfig.SETTINGS.FONTS, settings);
        // Reload fonts without refreshing the page
        await GoogleFontsModule.loadFonts();
        // Notify the user
        ui.notifications.info('Font settings updated!');
    }

    activateListeners(html) {
        super.activateListeners(html);
        
        // Add live preview functionality
        html.find('input[name$=".font"]').on('input', (event) => {
            const input = event.currentTarget;
            const selector = input.name.split('.')[0];
            const previewDiv = html.find(`div.form-group:has(input[name="${input.name}"]) .font-preview`);
            
            if (previewDiv.length) {
                const fontName = input.value;
                if (fontName) {
                    // Load the font if it's not already loaded
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}`;
                    document.head.appendChild(link);
                    
                    // Update preview
                    previewDiv.css('font-family', `"${fontName}", sans-serif`);
                }
            }
        });
    }
}

// Main module class
class GoogleFontsModule {
    static async init() {
        // Register module settings
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
            onChange: () => {}  // Removed auto-reload
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

        // Convert font names to Google Fonts URL format and load them
        const fontParam = Array.from(fonts)
            .map(font => font.replace(/\s+/g, '+'))
            .join('|');

        // Remove any previous Google Fonts links
        document.querySelectorAll('link[href*="fonts.googleapis.com"]').forEach(link => link.remove());
        
        // Load the fonts
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`;
        document.head.appendChild(link);

        // Remove any previous style elements we created
        const styleId = 'google-fonts-custom-styles';
        document.getElementById(styleId)?.remove();

        // Create and apply CSS rules
        const style = document.createElement('style');
        style.id = styleId;
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

// Initialize the module
Hooks.once('init', () => {
    GoogleFontsModule.init();
});