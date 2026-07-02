module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist/unihub-app/browser',
      url: ['/'],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --disable-gpu --headless=new',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'categories:pwa': ['error', { minScore: 0.8 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
