import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PoliticaPrivacidade from '../src/pages/PoliticaPrivacidade';
import TermosUso from '../src/pages/TermosUso';

const shell = (titulo: string, descricao: string, corpo: string) => `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${titulo} - LiggaSST</title>
    <meta name="description" content="${descricao}" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/liggasst/legal.css">
  </head>
  <body class="bg-white">
    <header class="bg-white border-b border-gray-100">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
        <a href="/liggasst/" class="flex items-center space-x-2">
          <div class="w-10 h-10 bg-green-deep rounded-lg flex items-center justify-center">
            <span class="text-white font-bold text-lg">L</span>
          </div>
          <span class="font-poppins font-bold text-xl text-green-deep">LiggaSST</span>
        </a>
      </div>
    </header>
    <main>${corpo}</main>
    <footer class="bg-soft-black text-gray-400 py-8 mt-12">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-sm flex flex-col sm:flex-row gap-4 justify-between">
        <span>&copy; 2026 LiggaSST. Todos os direitos reservados.</span>
        <span>
          <a class="hover:text-white mr-4" href="/liggasst/politica-de-privacidade/">Política de Privacidade</a>
          <a class="hover:text-white" href="/liggasst/termos-de-uso/">Termos de Uso</a>
        </span>
      </div>
    </footer>
  </body>
</html>`;

export const paginas = [
  {
    arquivo: 'public/politica-de-privacidade/index.html',
    html: shell('Política de Privacidade', 'Política de Privacidade da LiggaSST', renderToStaticMarkup(React.createElement(PoliticaPrivacidade))),
  },
  {
    arquivo: 'public/termos-de-uso/index.html',
    html: shell('Termos de Uso', 'Termos de Uso da LiggaSST', renderToStaticMarkup(React.createElement(TermosUso))),
  },
];
