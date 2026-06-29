# 🏋️ Treino Guiado PWA

Um aplicativo web progressivo para controle de treinos, exercícios com GIF, histórico de evolução e organização da rotina de academia.

O projeto foi desenvolvido com foco em uso mobile, podendo ser acessado pelo navegador e instalado na tela inicial do celular como um PWA.

---

## 📱 Preview

> Adicione aqui prints do projeto depois do deploy.

| Login | Dashboard | Exercícios | Treino |
|------|-----------|------------|--------|
| Em breve | Em breve | Em breve | Em breve |

---

## 🚀 Funcionalidades

- Cadastro e login de usuários
- Dashboard com resumo dos treinos
- Biblioteca de exercícios com GIFs explicativos
- Filtro por grupo muscular
- Favoritar exercícios
- Criação de treinos personalizados
- Edição, duplicação e exclusão de treinos
- Treino em andamento com checklist
- Timer de descanso
- Registro de histórico
- Exclusão de histórico
- Perfil do usuário
- Interface responsiva com foco em celular
- Instalação como PWA

---

## 🛠️ Tecnologias utilizadas

- React
- Vite
- JavaScript
- Supabase
- CSS
- PWA
- Vercel

---

## 📂 Estrutura do projeto

```txt
treino-guiado-pwa/
├── public/
│   └── pwa-icon.svg
├── src/
│   ├── lib/
│   │   └── supabase.js
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── .env.local
├── package.json
├── vite.config.js
└── README.md
```

---

## ⚙️ Como rodar o projeto localmente

### 1. Clone o repositório

```bash
git clone https://github.com/enzoaamorim/treino-guiado-pwa.git
```

### 2. Acesse a pasta do projeto

```bash
cd treino-guiado-pwa
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Configure as variáveis de ambiente

Crie um arquivo chamado `.env.local` na raiz do projeto:

```env
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_DO_SUPABASE
```

### 5. Rode o projeto

```bash
npm run dev
```

O projeto ficará disponível em:

```txt
http://localhost:5173/
```

---

## 📱 Como testar no celular

Para acessar o projeto pelo celular durante o desenvolvimento, rode:

```bash
npm run dev -- --host 0.0.0.0
```

Depois abra no celular o link de rede exibido no terminal, por exemplo:

```txt
http://192.168.x.x:5173/
```

O celular e o computador precisam estar conectados na mesma rede Wi-Fi.

---

## 🧩 Banco de dados

O projeto utiliza Supabase para autenticação, banco de dados e armazenamento dos dados do usuário.

Principais tabelas utilizadas:

```txt
exercises
exercise_favorites
workouts
workout_exercises
training_history
training_history_items
```

---

## 🌐 Deploy

O deploy pode ser feito pela Vercel.

Variáveis necessárias na Vercel:

```env
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Após o deploy, o app pode ser instalado no celular usando a opção:

```txt
Adicionar à tela inicial
```

---

## 🎯 Objetivo do projeto

Este projeto foi criado para facilitar a organização de treinos de academia, permitindo que o usuário monte sua rotina, acompanhe exercícios com GIFs e registre sua evolução ao longo do tempo.

Além disso, o projeto também tem como objetivo reforçar conhecimentos em React, Supabase, responsividade, autenticação e desenvolvimento de aplicações PWA.

---

## 👨‍💻 Autor

Desenvolvido por **Enzo Amorim**.

- GitHub: [@enzoaamorim](https://github.com/enzoaamorim)
- LinkedIn: adicione seu link aqui

---

## 📌 Status do projeto

🚧 Em desenvolvimento

Próximas melhorias planejadas:

- Melhorar biblioteca de GIFs
- Hospedar GIFs no Supabase Storage
- Adicionar gráficos de evolução
- Criar mais estatísticas de desempenho
- Melhorar tela de perfil
- Melhorar experiência offline do PWA
