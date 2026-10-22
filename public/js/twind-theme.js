// Tema centralizado do projeto (cores baseadas na imagem)
export const config = {
  theme: {
    extend: {
      colors: {
        // 🩵 Paleta institucional teal/azulada (base do sistema)
        sistema: {
          50:  '#F0FBFC',
          100: '#D6F6F7',
          200: '#AEEAEC',
          300: '#7FD7DA',
          400: '#48BEC2',
          500: '#19B8BA',   // principal (botões/links)
          600: '#14979B',
          700: '#0F7880',   // header
          800: '#0A5D66',
          900: '#073F47',
        },

        // 💚 Verde frio — sucesso / editar (coerente com a paleta)
        sucesso: {
          100: '#DDF7EF',
          500: '#10B981',
          600: '#0EA371',
          700: '#0B815A',
        },

        // ❤️ Vermelho — erro / deletar (mantido para contraste)
        erro: {
          100: '#FEE2E2',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
        },

        // 🩶 Cinzas frios — fundo e textos (retirados da imagem)
        neutra: {
          50:  '#F5F7F8',
          100: '#E7ECEE',
          200: '#C9D6D8',   // luz
          300: '#9BAFB3',
          400: '#7E97A0',
          500: '#58808A',   // texto principal em bg claro
          600: '#3F5560',
          700: '#2B3C45',   // títulos em bg claro / texto em bg escuro
        },
      },
    },
  },
};
