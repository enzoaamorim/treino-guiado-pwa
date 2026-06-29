# Treino Guiado PWA - arquivos v1

Arquivos para substituir/adicionar no projeto `treino-guiado-pwa`.

## Onde colocar

- `src/App.jsx` → substituir o arquivo atual
- `src/App.css` → substituir/criar o arquivo
- `src/main.jsx` → substituir o arquivo atual
- `src/lib/supabase.js` → criar a pasta `lib` dentro de `src` e colocar o arquivo
- `vite.config.js` → substituir o arquivo atual
- `public/pwa-icon.svg` → colocar dentro da pasta `public`

## Dependências necessárias

```bash
npm.cmd install @supabase/supabase-js
npm.cmd install vite-plugin-pwa -D
```

## .env.local

Na raiz do projeto:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

## Rodar

```bash
npm.cmd run dev -- --host 0.0.0.0
```
