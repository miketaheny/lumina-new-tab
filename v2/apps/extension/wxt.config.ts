import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Lumina — New Tab Page',
    description: 'A gorgeous new tab with AI search, quick links, notes, reading list, weather, and animated backgrounds.',
    permissions: ['storage', 'bookmarks', 'activeTab', 'contextMenus', 'scripting', 'identity'],
    host_permissions: [
      '<all_urls>',
      'https://bible-api.com/*',
      'https://geocoding-api.open-meteo.com/*',
      'https://api.open-meteo.com/*',
      'https://www.bing.com/*',
    ],
    oauth2: {
      client_id: 'PLACEHOLDER.apps.googleusercontent.com',
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    },
  },
});
