import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanvasFilterString,
  buildDirectPhotoStoryboard,
  computeCoverCrop,
  DEFAULT_PHOTO_ADJUSTMENTS,
  filterGalleryItems,
  getDimensionsForAspectRatio,
  getVideoDimensions,
  normalizeStoryboard,
  parseDataUrl,
  sanitizeSvgMarkup,
  trimGalleryForStorage,
} from './studioLogic';
import type { GalleryItem } from '../types/studio';

test('aspect ratio dimensions calculate accurately', () => {
  assert.deepEqual(getDimensionsForAspectRatio('16:9', 1600), { width: 1600, height: 900 });
  assert.deepEqual(getDimensionsForAspectRatio('9:16', 1600), { width: 900, height: 1600 });
  assert.deepEqual(getDimensionsForAspectRatio('4:3', 800), { width: 800, height: 600 });
  assert.deepEqual(getDimensionsForAspectRatio('1:1', 1024), { width: 1024, height: 1024 });
  assert.deepEqual(getVideoDimensions('9:16'), { width: 540, height: 960 });
});

test('sanitizeSvgMarkup strips scripts, event handlers, and ensures svg root', () => {
  const dirty =
    'Here is art: <svg viewBox="0 0 100 100" onload="alert(1)"><script>steal()</script><rect onclick="bad()" width="100" height="100" fill="#059669"/><a href="javascript:alert(2)">link</a></svg> done.';
  const clean = sanitizeSvgMarkup(dirty, 100, 100);
  assert.equal(clean.startsWith('<svg'), true);
  assert.equal(clean.includes('<script'), false);
  assert.equal(clean.includes('onload='), false);
  assert.equal(clean.includes('onclick='), false);
  assert.equal(clean.includes('javascript:'), false);
  assert.equal(clean.includes('xmlns="http://www.w3.org/2000/svg"'), true);
});

test('sanitizeSvgMarkup provides safe fallback when no svg tags exist', () => {
  const fallback = sanitizeSvgMarkup('not valid markup', 400, 300);
  assert.equal(fallback.includes('viewBox="0 0 400 300"'), true);
});

test('normalizeStoryboard clamps duration, validates hex colors, and wraps photo indices', () => {
  const sb = normalizeStoryboard(
    {
      title: '   Village Sunrise   ',
      musicMood: 'warm',
      scenes: [
        {
          headline: 'Morning Mist',
          subtext: 'Golden light over green fields',
          bgTop: '#123456',
          bgBottom: 'invalid-color',
          accentColor: '#abcdef',
          motion: 'zoom_in',
          effect: 'sunbeams',
          shapeMotif: 'waves',
          photoIndex: 5,
        },
      ],
    },
    25,
    '16:9',
    2
  );

  assert.equal(sb.durationSeconds, 12);
  assert.equal(sb.title, 'Village Sunrise');
  assert.equal(sb.scenes.length, 1);
  assert.equal(sb.scenes[0].bgTop, '#123456');
  assert.equal(sb.scenes[0].bgBottom, '#065f46');
  assert.equal(sb.scenes[0].photoIndex, 1);
});

test('buildDirectPhotoStoryboard creates scene per uploaded photo', () => {
  const sb = buildDirectPhotoStoryboard('Bag Showcase', 'Handcrafted Edition', 6, '1:1', 'sparkles', 3);
  assert.equal(sb.scenes.length, 3);
  assert.equal(sb.scenes[0].photoIndex, 0);
  assert.equal(sb.scenes[1].photoIndex, 1);
  assert.equal(sb.scenes[2].photoIndex, 2);
  assert.equal(sb.aspectRatio, '1:1');
});

test('buildCanvasFilterString formats filter adjustments safely', () => {
  const str = buildCanvasFilterString({
    ...DEFAULT_PHOTO_ADJUSTMENTS,
    brightness: 115,
    contrast: 108,
    saturate: 130,
    warmth: 20,
  });
  assert.equal(str, 'brightness(115%) contrast(108%) saturate(130%) sepia(20%)');
});

test('computeCoverCrop centers landscape image onto square canvas', () => {
  const crop = computeCoverCrop(1600, 800, 500, 500);
  assert.deepEqual(crop, { sx: 400, sy: 0, sw: 800, sh: 800 });
});

test('filterGalleryItems and trimGalleryForStorage behave deterministically', () => {
  const sample: GalleryItem[] = [
    { id: '1', type: 'image', title: 'Leather Tote Bag', prompt: 'olive canvas bag', createdAt: '2026-01-01' },
    { id: '2', type: 'video', title: 'Sunrise Reel', prompt: 'morning sunbeams', createdAt: '2026-01-02' },
    { id: '3', type: 'text', title: 'Bag Caption', prompt: 'instagram post', textContent: 'Handcrafted quality', createdAt: '2026-01-03' },
  ];

  assert.equal(filterGalleryItems(sample, 'all', '').length, 3);
  assert.equal(filterGalleryItems(sample, 'video', '').length, 1);
  assert.equal(filterGalleryItems(sample, 'all', 'leather').length, 1);
  assert.equal(filterGalleryItems(sample, 'text', 'handcrafted').length, 1);
  assert.equal(trimGalleryForStorage(sample, 2).length, 2);
});

test('parseDataUrl extracts mime type and base64 payload', () => {
  assert.deepEqual(parseDataUrl('data:image/png;base64,abc123=='), {
    mimeType: 'image/png',
    base64Data: 'abc123==',
  });
  assert.equal(parseDataUrl('https://example.com/test.png'), null);
});
