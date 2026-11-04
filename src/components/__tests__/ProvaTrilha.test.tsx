// Prova da trilha (Etapa 3): fluxo do membro com os servicos mockados.
import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import ProvaTrilha from '../ProvaTrilha';
import { iniciarProva, enviarProva } from '../../services/trilhas';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../services/trilhas', () => ({
  iniciarProva: vi.fn(),
  enviarProva: vi.fn(),
}));

const QUESTOES = [
  { q: 'q1', enunciado: 'O que é EPI?', topico: 'Conceitos', opcoes: ['Equipamento de proteção individual', 'Exame periódico', 'Treinamento', 'Documento'], resposta: null },
  { q: 'q2', enunciado: 'Quando usar EPI?', topico: 'Conceitos', opcoes: ['Nunca', 'Sempre que indicado', 'Só à noite', 'Opcional'], resposta: null },
];

const mockInicio = (patch: Partial<ReturnType<typeof inicioOk>> = {}) => {
  const base = inicioOk();
  const r = { ...base, ...patch };
  vi.mocked(iniciarProva).mockResolvedValue(r as never);
  return r;
};
const inicioOk = () => ({
  success: true,
  data: { attemptId: 'att1', questoes: QUESTOES, passScore: 70, retomada: false },
});

const abrir = async (onFechar = vi.fn()) => {
  const tela = render(
    <MemoryRouter>
      <ProvaTrilha trailId="tr1" tituloTrilha="NR Básico" onFechar={onFechar} />
    </MemoryRouter>,
  );
  await tela.findByText('1. O que é EPI?');
  return tela;
};

describe('ProvaTrilha', () => {
  it('entrega as questoes sem gabarito e sem mapa', async () => {
    mockInicio();
    const tela = await abrir();
    const arg = vi.mocked(iniciarProva).mock.calls[0][0];
    expect(arg).toBe('tr1');
    const json = JSON.stringify(QUESTOES);
    expect(json).not.toContain('correta');
    expect(json).not.toContain('mapa');
    await tela.findByText('2. Quando usar EPI?');
    expect(tela.getByText('Nota mínima para aprovação: 70%', { exact: false })).toBeTruthy();
  });

  it('marca respostas e envia na ordem das questoes', async () => {
    mockInicio();
    vi.mocked(enviarProva).mockResolvedValue({
      success: true,
      data: { passed: true, score: 100, passScore: 70, lockedUntil: null, topicos: [] },
    } as never);
    const onFechar = vi.fn();
    const tela = await abrir(onFechar);
    fireEvent.click(tela.getByText('Equipamento de proteção individual'));
    fireEvent.click(tela.getByText('Sempre que indicado'));
    fireEvent.click(tela.getByText('Enviar avaliação'));
    await tela.findByText('Parabéns, você foi aprovado!');
    expect(vi.mocked(enviarProva).mock.calls[0]).toEqual(['att1', [0, 1]]);
    expect(tela.getByText(/certificado será emitido na sua área/)).toBeTruthy();
  });

  it('reprovacao mostra nota, topicos de revisao e data de liberacao', async () => {
    mockInicio();
    vi.mocked(enviarProva).mockResolvedValue({
      success: true,
      data: {
        passed: false,
        score: 50,
        passScore: 70,
        lockedUntil: '2026-11-12T12:00:00Z',
        topicos: ['Conceitos', 'Conteúdo geral da trilha'],
      },
    } as never);
    const tela = await abrir();
    fireEvent.click(tela.getByText('Nunca'));
    fireEvent.click(tela.getByText('Enviar avaliação'));
    await tela.findByText('Você não atingiu a nota mínima');
    expect(tela.getByText(/Revise estes conteúdos/)).toBeTruthy();
    expect(tela.getByText('Conceitos')).toBeTruthy();
    expect(tela.getByText(/Nova tentativa liberada em/)).toBeTruthy();
    // Nao revela qual alternativa era a certa
    expect(tela.queryByText(/alternativa correta/i)).toBeNull();
  });

  it('inicio bloqueado mostra a data de liberacao sem abrir a prova', async () => {
    vi.mocked(iniciarProva).mockResolvedValue({
      success: false,
      erro: 'bloqueado',
      lockedUntil: '2026-11-12T12:00:00Z',
    } as never);
    const tela = render(
      <MemoryRouter>
        <ProvaTrilha trailId="tr1" tituloTrilha="NR Básico" onFechar={vi.fn()} />
      </MemoryRouter>,
    );
    await tela.findByText(/Nova tentativa liberada em/);
    expect(tela.queryByText('Enviar avaliação')).toBeNull();
  });

  it('sem secoes concluidas avisa para terminar a trilha', async () => {
    vi.mocked(iniciarProva).mockResolvedValue({
      success: false,
      erro: 'secoes_pendentes',
      lockedUntil: null,
    } as never);
    const tela = render(
      <MemoryRouter>
        <ProvaTrilha trailId="tr1" tituloTrilha="NR Básico" onFechar={vi.fn()} />
      </MemoryRouter>,
    );
    await tela.findByText('Conclua todas as seções da trilha para liberar a avaliação.');
  });
});
