import { describe, it, expect } from 'vitest';
import { extrairYoutubeId, urlEmbedYoutube, urlAssistirYoutube } from '../youtube';

describe('extrairYoutubeId', () => {
  it('extrai de watch?v=', () => {
    expect(extrairYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('extrai de youtu.be', () => {
    expect(extrairYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('extrai de /embed/ e /shorts/', () => {
    expect(extrairYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extrairYoutubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('extrai de youtube-nocookie e mobile', () => {
    expect(extrairYoutubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extrairYoutubeId('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('ignora parametros extras', () => {
    expect(extrairYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
  });
  it('rejeita hosts externos', () => {
    expect(extrairYoutubeId('https://evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(extrairYoutubeId('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
  it('rejeita outros protocolos e javascript:', () => {
    expect(extrairYoutubeId('javascript:alert(1)')).toBeNull();
    expect(extrairYoutubeId('ftp://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
  it('rejeita IDs invalidos', () => {
    expect(extrairYoutubeId('https://www.youtube.com/watch?v=curto')).toBeNull();
    expect(extrairYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQextra')).toBeNull();
    expect(extrairYoutubeId('https://www.youtube.com/watch?v=<script>12')).toBeNull();
  });
  it('rejeita entradas vazias ou sem URL', () => {
    expect(extrairYoutubeId('')).toBeNull();
    expect(extrairYoutubeId('nao-e-url')).toBeNull();
  });
});

describe('urlEmbedYoutube', () => {
  it('usa dominio de privacidade aprimorada sem autoplay', () => {
    const url = urlEmbedYoutube('dQw4w9WgXcQ');
    expect(url).toBe('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(url).not.toContain('autoplay');
  });
});

describe('urlAssistirYoutube', () => {
  it('monta link canonico de fallback', () => {
    expect(urlAssistirYoutube('dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
});
