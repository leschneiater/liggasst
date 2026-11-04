// Gera HTML estatico das telas da Etapa 2 (trilhas) para preview visual.
import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, vi } from 'vitest';
import { writeFileSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import path from 'path';
import Treinamentos from '../../pages/Treinamentos';
import TrilhaDetalhe from '../../pages/TrilhaDetalhe';
import TreinamentosAdmin from '../../pages/admin/TreinamentosAdmin';
import ProvaTrilha from '../ProvaTrilha';

vi.mock('../../services/assinatura', () => ({
  fetchAssinatura: vi.fn().mockResolvedValue({ plan: 'pro_professional', status: 'active', current_period_end: null, environment: 'production' }),
}));
vi.mock('../../services/database', () => ({
  fetchTrainingsMembro: vi.fn().mockResolvedValue({ success: true, data: [] }),
  getTrainingPdfUrl: vi.fn(),
  fetchTrainingsAdmin: vi.fn().mockResolvedValue({ success: true, data: [] }),
  createTraining: vi.fn(),
  updateTraining: vi.fn(),
  deleteTraining: vi.fn(),
  uploadTrainingPdf: vi.fn(),
}));

vi.mock('../../services/trilhas', () => {
  const trilha = {
    id: 'tr1',
    titulo: 'Primeiros passos em SST',
    descricao: 'Conceitos básicos de segurança do trabalho para quem está começando na área.',
    audience: 'professional',
    kind: 'open',
    published: true,
    is_test: false,
    ordem: 0,
    exam_question_count: 10,
    exam_pass_score: 70,
  };
  const trilhaCert = {
    ...trilha,
    id: 'tr2',
    titulo: 'NR-1: Gerenciamento de riscos',
    descricao: 'Trilha com avaliação final e certificado.',
    kind: 'certified',
  };
  return {
  fetchTrilhasMembro: vi.fn().mockResolvedValue({
    success: true,
    data: [{ ...trilha, totalSecoes: 5, secoesConcluidas: 2 }],
  }),
  fetchTrilhaDetalhe: vi.fn().mockResolvedValue({
    success: true,
    data: {
      trilha,
      secoes: [
        { id: 's1', trail_id: 'tr1', ordem: 1, titulo: 'Boas-vindas e visão geral', content_type: 'link', conteudo: 'https://exemplo.com/material' },
        { id: 's2', trail_id: 'tr1', ordem: 2, titulo: 'Apostila de conceitos', content_type: 'pdf', conteudo: '22222222-2222-2222-2222-222222222222.pdf' },
      ],
      concluidas: new Set(['s1']),
    },
  }),
  concluirSecao: vi.fn(),
  getSecaoTrilhaPdfUrl: vi.fn(),
  fetchMeusSelos: vi.fn().mockResolvedValue({ success: true, data: [] }),
  fetchTentativaRecente: vi.fn().mockResolvedValue({ success: true, data: null }),
  iniciarProva: vi.fn(),
  enviarProva: vi.fn(),
  fetchTrilhasAdmin: vi.fn().mockResolvedValue({
    success: true,
    data: [{ ...trilha, totalSecoes: 5 }, { ...trilhaCert, totalSecoes: 2 }],
  }),
  fetchSecoesAdmin: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 's1', trail_id: 'tr2', ordem: 1, titulo: 'Conceitos de GRO', content_type: 'link', conteudo: 'https://exemplo.com/gro' },
      { id: 's2', trail_id: 'tr2', ordem: 2, titulo: 'Inventário de riscos', content_type: 'pdf', conteudo: '22222222-2222-2222-2222-222222222222.pdf' },
    ],
  }),
  fetchQuestoesAdmin: vi.fn().mockResolvedValue({
    success: true,
    data: [
      { id: 'q1', trail_id: 'tr2', section_id: 's1', enunciado: 'O que é o GRO na NR-1?', opcoes: ['Gerenciamento de riscos ocupacionais', 'Grupo de resposta operacional'], correta: 0, ativo: true },
      { id: 'q2', trail_id: 'tr2', section_id: null, enunciado: 'Questão desativada de exemplo', opcoes: ['A', 'B'], correta: 0, ativo: false },
    ],
  }),
  createQuestao: vi.fn(),
  updateQuestao: vi.fn(),
  deleteQuestao: vi.fn(),
  createTrilha: vi.fn(),
  updateTrilha: vi.fn(),
  deleteTrilha: vi.fn(),
  createSecao: vi.fn(),
  deleteSecao: vi.fn(),
  uploadSecaoPdf: vi.fn(),
  };
});
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'professional', currentUser: { id: 'u1', verified: true }, loading: false }),
}));
vi.mock('../../hooks/useMessagingDisponivel', () => ({ useMessagingDisponivel: () => ({ disponivel: false }) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../../components/Layout/AdminAreaNav', () => ({ default: () => null }));

const css = (() => {
  try {
    const dir = path.join(process.cwd(), 'dist', 'assets');
    const arquivo = readdirSync(dir).find((f) => f.endsWith('.css'));
    return arquivo ? readFileSync(path.join(dir, arquivo), 'utf8') : '';
  } catch { return ''; }
})();
const salvar = (nome: string, html: string) => {
  const doc = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
  writeFileSync(`/tmp/shots/${nome}.html`, doc);
};

describe('preview visual da Etapa 2 (trilhas)', () => {
  it('pagina da trilha certified concluida com card de avaliacao', async () => {
    const trilhasMod = await import('../../services/trilhas');
    vi.mocked(trilhasMod.fetchTrilhaDetalhe as never).mockResolvedValueOnce({
      success: true,
      data: {
        trilha: {
          id: 'tr2',
          titulo: 'NR-1: Gerenciamento de riscos',
          descricao: 'Trilha com avaliação final e certificado.',
          audience: 'professional',
          kind: 'certified',
          published: true,
          is_test: false,
          ordem: 0,
          exam_question_count: 10,
          exam_pass_score: 70,
        },
        secoes: [
          { id: 's1', trail_id: 'tr2', ordem: 1, titulo: 'Conceitos de GRO', content_type: 'link', conteudo: 'https://exemplo.com/gro' },
          { id: 's2', trail_id: 'tr2', ordem: 2, titulo: 'Inventário de riscos', content_type: 'link', conteudo: 'https://exemplo.com/inv' },
        ],
        concluidas: new Set(['s1', 's2']),
      },
    } as never);
    const tela = render(
      <MemoryRouter initialEntries={['/treinamentos-profissional/trilha/tr2']}>
        <Routes>
          <Route path="/treinamentos-profissional/trilha/:id" element={<TrilhaDetalhe />} />
        </Routes>
      </MemoryRouter>,
    );
    await tela.findByText('Avaliação final');
    await tela.findByText('Iniciar avaliação');
    salvar('membro-trilha-avaliacao', tela.container.innerHTML + document.querySelector('.fixed')?.outerHTML || tela.container.innerHTML);
  });

  it('lista de trilhas do membro com progresso', async () => {
    mkdirSync('/tmp/shots', { recursive: true });
    const tela = render(<MemoryRouter><Treinamentos /></MemoryRouter>);
    await tela.findByText('Primeiros passos em SST');
    salvar('membro-trilhas-lista', tela.container.innerHTML);
  });

  it('pagina da trilha com secoes e gating de conclusao', async () => {
    const tela = render(
      <MemoryRouter initialEntries={['/treinamentos-profissional/trilha/tr1']}>
        <Routes>
          <Route path="/treinamentos-profissional/trilha/:id" element={<TrilhaDetalhe />} />
        </Routes>
      </MemoryRouter>,
    );
    await tela.findByText(/Apostila de conceitos/);
    salvar('membro-trilha-detalhe', tela.container.innerHTML);
  });

  it('admin: CRUD de trilhas', async () => {
    const tela = render(<MemoryRouter><TreinamentosAdmin /></MemoryRouter>);
    await tela.findByText('Primeiros passos em SST');
    salvar('admin-trilhas', tela.container.innerHTML);
  });
});

describe('preview visual da Etapa 3 (prova)', () => {
  const questoesMock = [
    { q: 'q1', enunciado: 'O que é o GRO na NR-1?', topico: 'Conceitos de GRO', opcoes: ['Gerenciamento de riscos ocupacionais', 'Grupo de resposta operacional', 'Guia de referência obrigatória', 'Gestão de resultados operacionais'], resposta: null },
    { q: 'q2', enunciado: 'Quem pode participar da identificação de perigos?', topico: 'Inventário de riscos', opcoes: ['Somente o empregador', 'Os trabalhadores e seus representantes', 'Apenas engenheiros', 'Ninguém'], resposta: null },
  ];

  it('prova em andamento com questoes e alternativas', async () => {
    const trilhasMod = await import('../../services/trilhas');
    vi.mocked(trilhasMod.iniciarProva as never).mockResolvedValue({
      success: true,
      data: { attemptId: 'att1', questoes: questoesMock, passScore: 70, retomada: false },
    } as never);
    const tela = render(
      <MemoryRouter>
        <ProvaTrilha trailId="tr2" tituloTrilha="NR-1: Gerenciamento de riscos" onFechar={() => {}} />
      </MemoryRouter>,
    );
    await tela.findByText('1. O que é o GRO na NR-1?');
    salvar('membro-prova-questoes', tela.container.innerHTML);
  });

  it('resultado aprovado com mensagem do certificado', async () => {
    const trilhasMod = await import('../../services/trilhas');
    vi.mocked(trilhasMod.iniciarProva as never).mockResolvedValue({
      success: true,
      data: { attemptId: 'att1', questoes: questoesMock, passScore: 70, retomada: false },
    } as never);
    vi.mocked(trilhasMod.enviarProva as never).mockResolvedValue({
      success: true,
      data: { passed: true, score: 80, passScore: 70, lockedUntil: null, topicos: [] },
    } as never);
    const tela = render(
      <MemoryRouter>
        <ProvaTrilha trailId="tr2" tituloTrilha="NR-1: Gerenciamento de riscos" onFechar={() => {}} />
      </MemoryRouter>,
    );
    await tela.findByText('1. O que é o GRO na NR-1?');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(tela.getByText('Gerenciamento de riscos ocupacionais'));
    fireEvent.click(tela.getByText('Os trabalhadores e seus representantes'));
    fireEvent.click(tela.getByText('Enviar avaliação'));
    await tela.findByText('Parabéns, você foi aprovado!');
    salvar('membro-prova-aprovado', tela.container.innerHTML);
  });

  it('resultado reprovado com nota, topicos e data de liberacao', async () => {
    const trilhasMod = await import('../../services/trilhas');
    vi.mocked(trilhasMod.iniciarProva as never).mockResolvedValue({
      success: true,
      data: { attemptId: 'att1', questoes: questoesMock, passScore: 70, retomada: false },
    } as never);
    vi.mocked(trilhasMod.enviarProva as never).mockResolvedValue({
      success: true,
      data: {
        passed: false,
        score: 50,
        passScore: 70,
        lockedUntil: '2026-11-12T12:00:00Z',
        topicos: ['Conceitos de GRO', 'Inventário de riscos'],
      },
    } as never);
    const tela = render(
      <MemoryRouter>
        <ProvaTrilha trailId="tr2" tituloTrilha="NR-1: Gerenciamento de riscos" onFechar={() => {}} />
      </MemoryRouter>,
    );
    await tela.findByText('1. O que é o GRO na NR-1?');
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.click(tela.getByText('Ninguém'));
    fireEvent.click(tela.getByText('Enviar avaliação'));
    await tela.findByText('Você não atingiu a nota mínima');
    await tela.findByText(/Revise estes conteúdos/);
    salvar('membro-prova-reprovado', tela.container.innerHTML);
  });

  it('inicio bloqueado pelo cadeado de 7 dias', async () => {
    const trilhasMod = await import('../../services/trilhas');
    vi.mocked(trilhasMod.iniciarProva as never).mockResolvedValue({
      success: false,
      erro: 'bloqueado',
      lockedUntil: '2026-11-12T12:00:00Z',
    } as never);
    const tela = render(
      <MemoryRouter>
        <ProvaTrilha trailId="tr2" tituloTrilha="NR-1: Gerenciamento de riscos" onFechar={() => {}} />
      </MemoryRouter>,
    );
    await tela.findByText(/Nova tentativa liberada em/);
    salvar('membro-prova-bloqueada', tela.container.innerHTML);
  });

  it('admin: banco de questoes da trilha certified', async () => {
    const tela = render(<MemoryRouter><TreinamentosAdmin /></MemoryRouter>);
    await tela.findByText('NR-1: Gerenciamento de riscos');
    const { fireEvent } = await import('@testing-library/react');
    const botoes = tela.getAllByText('Seções');
    fireEvent.click(botoes[botoes.length - 1]);
    await tela.findByText('Avaliação (prova)');
    await tela.findByText((c) => c.includes('O que é o GRO na NR-1?'));
    salvar('admin-banco-questoes', tela.container.innerHTML);
  });
});
