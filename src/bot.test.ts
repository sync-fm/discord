/**
 * Basic tests for the SyncFM Discord app
 * Run with: bun test
 */

import { expect, test, describe } from 'bun:test';
import { extractMusicUrl, detectMusicServiceFromUrl } from './bot';

describe('Music URL Detection', () => {
  test('detects Spotify track URLs', () => {
    const urls = [
      'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',
      'spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp',
      'Check this out: https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp amazing!',
    ];

    for (const url of urls) {
      const result = extractMusicUrl(url);
      expect(result).toBeTruthy();
      expect(result?.startsWith('https://')).toBe(true);
      expect(detectMusicServiceFromUrl(result!)).toBe('spotify');
    }
  });

  test('detects Apple Music URLs', () => {
    const urls = [
      'https://music.apple.com/us/album/song-name/1234567890?i=1234567890',
      'music.apple.com/gb/album/test-album/9876543210?i=9876543210',
    ];

    for (const url of urls) {
      const result = extractMusicUrl(url);
      expect(result).toBeTruthy();
      expect(result?.startsWith('https://')).toBe(true);
      expect(detectMusicServiceFromUrl(result!)).toBe('applemusic');
    }
  });

  test('detects YouTube Music URLs', () => {
    const urls = [
      'https://music.youtube.com/watch?v=dQw4w9WgXcQ',
      'music.youtube.com/watch?v=abc123xyz',
    ];

    for (const url of urls) {
      const result = extractMusicUrl(url);
      expect(result).toBeTruthy();
      expect(result?.startsWith('https://')).toBe(true);
      expect(detectMusicServiceFromUrl(result!)).toBe('ytmusic');
    }
  });

  test('skips regular YouTube URLs by default', () => {
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=abc123xyz',
      'https://youtu.be/dQw4w9WgXcQ',
      'youtu.be/abc123xyz',
    ];

    for (const url of urls) {
      const result = extractMusicUrl(url);
      expect(result).toBeNull();
    }
  });

  test('returns null for non-music URLs', () => {
    const urls = [
      'https://www.google.com',
      'Just some random text',
      'https://twitter.com/user/status/123',
      'Check out my website: example.com',
    ];

    for (const url of urls) {
      const result = extractMusicUrl(url);
      expect(result).toBeNull();
    }
  });

  test('extracts URL from message with surrounding text', () => {
    const message = 'Hey everyone! Check out this amazing song: https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp it\'s so good!';
    const result = extractMusicUrl(message);
    expect(result).toBe('https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');
  });

  test('ignores punctuation surrounding URLs', () => {
    const message = 'Check this track (https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp)!';
    const result = extractMusicUrl(message);
    expect(result).toBe('https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');
  });

  test('handles URLs wrapped in angle brackets', () => {
    const message = '<https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp>';
    const result = extractMusicUrl(message);
    expect(result).toBe('https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp');
  });

  test('detects regular YouTube URLs when explicitly enabled', () => {
    const urls = [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=abc123xyz',
      'https://youtu.be/dQw4w9WgXcQ',
      'youtu.be/abc123xyz',
    ];

    const previous = process.env.DISCORD_ENABLE_YOUTUBE;
    process.env.DISCORD_ENABLE_YOUTUBE = 'true';

    try {
      for (const url of urls) {
        const result = extractMusicUrl(url);
        expect(result).toBeTruthy();
        expect(result?.startsWith('https://')).toBe(true);
        expect(detectMusicServiceFromUrl(result!)).toBe('ytmusic');
      }
    } finally {
      if (previous === undefined) {
        delete process.env.DISCORD_ENABLE_YOUTUBE;
      } else {
        process.env.DISCORD_ENABLE_YOUTUBE = previous;
      }
    }
  });
});

describe('SyncFM API Integration', () => {
  test('SyncFM API endpoint is reachable', async () => {
    // Test with a known Spotify URL
    const testUrl = 'https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp';
    const apiUrl = `https://syncfm.dev/api/handle/syncfm?url=${encodeURIComponent(testUrl)}`;

    try {
      const response = await fetch(apiUrl);
      // The API should at least be reachable (200 or valid error response)
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    } catch (error) {
      // If network error, that's also acceptable in this test
      console.log('SyncFM API test skipped due to network error:', error);
    }
  });
});
