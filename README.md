# Open-Scorecard

📊 Open-source scorecards for card games - Track your game scores offline!

**Live Site:** https://chingcodes.github.io/scorecards/

## Features

- **Progressive Web App (PWA)** - Install on your device for offline use
- **Offline functionality** - Use without internet connection
- **Auto-saves scores** - localStorage persistence keeps your data safe
- **Responsive design** - Works on mobile, tablet, and desktop
- **Add to home screen** - Quick access like a native app
- **Modular architecture** - Easy to add new scorecards
- **Free and open-source** - Contribute your own scorecards!

## Available Scorecards

- **Hand, Foot & Toe** - Track scores for the Hand, Foot & Toe card game with support for multiple teams, 4-hand scoring system, and automatic calculations.

## PWA Installation

### On Mobile (Android/iOS):
1. Open the site in your browser (Chrome, Safari, Firefox)
2. Look for "Add to Home Screen" or "Install" prompt
3. Tap "Add" or "Install"
4. The app icon will appear on your home screen
5. Launch from home screen for full-screen experience

### On Desktop (Chrome/Edge):
1. Look for the install icon (⊕) in the address bar
2. Click "Install"
3. The app will open in its own window
4. Access from your apps menu or taskbar

### Offline Usage

Once installed, Open-Scorecard works completely offline:
- All scorecards are cached locally
- Scores are saved to your device
- No internet connection required
- Updates sync when you're back online

## Project Structure

```
/
├── index.html              # Home page with scorecard selector
├── manifest.json          # PWA configuration
├── sw.js                  # Service worker for offline support
├── shared/
│   ├── common.css        # Shared styles across all scorecards
│   └── pwa.js            # Service worker registration
├── scorecards/
│   ├── _template.html    # Template for creating new scorecards
│   ├── hand-foot-toe.html
│   └── (more scorecards...)
└── icons/                # PWA app icons
```

## Development

### PWA Setup

The app is configured as a Progressive Web App with:
- `manifest.json` - App metadata, icons, and display settings
- `sw.js` - Service worker for caching and offline functionality
- PWA meta tags in all HTML files
- Icon support (see `icons/README.md` for icon requirements)

### Adding a New Scorecard

1. Copy `scorecards/_template.html` to `scorecards/your-game.html`
2. Customize the HTML, CSS, and JavaScript for your game
3. Register it in the `scorecards` array in `index.html`:
   ```javascript
   {
       name: 'Your Game',
       description: 'Track scores for Your Game...',
       path: 'scorecards/your-game.html',
       icon: '🎲'
   }
   ```
4. Add it to the cache in `sw.js`
5. Test thoroughly

### Local Development

For PWA features to work during development:

1. **Serve over HTTPS or localhost**:
   ```bash
   # Python
   python -m http.server 8000

   # Node.js
   npx http-server

   # PHP
   php -S localhost:8000
   ```

2. **Test service worker**: Open DevTools → Application → Service Workers
3. **Test offline**: DevTools → Network → Check "Offline"
4. **Test manifest**: DevTools → Application → Manifest

### Technology Stack

- **HTML5** - Semantic markup
- **CSS3** - Gradients, flexbox, grid, animations
- **Vanilla JavaScript** - No frameworks required
- **localStorage API** - Client-side data persistence
- **Service Workers** - Offline functionality
- **Web App Manifest** - PWA installation

### AI Disclosure

This project was developed with assistance from Claude (Anthropic's AI assistant) for code generation, refactoring, and documentation. All code has been reviewed and tested by human maintainers.

## Browser Support

- **Chrome/Edge** - Full support (recommended)
- **Safari** - iOS 11.3+ (with some PWA limitations)
- **Firefox** - Basic support
- **All modern browsers** - Core functionality works everywhere

## Attributions

### Icons
[Notepad icons created by Iconriver - Flaticon](https://www.flaticon.com/free-icons/notepad)

## License

MIT License - See [LICENSE](LICENSE) file for details
