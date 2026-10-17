# Fisio DuVinci

App de estudo gamificado de Fisioterapia (Expo / React Native, SQLite local, Supabase para conta e ranking).

## Como rodar

1. `npm install`
2. `npx expo install --fix` (ajusta as versões ao SDK do Expo)
3. Copie `.env.example` para `.env` e preencha a URL e a chave **anon** do seu projeto Supabase.
4. No Supabase, abra **SQL Editor** e rode o arquivo `supabase_schema.sql` (tabelas, regras de segurança e gatilhos).
5. Se quiser cadastro sem confirmação por e-mail durante os testes: Supabase > Authentication > Providers > Email > desligue "Confirm email".
6. `npx expo start -c`

## Estrutura

```
App.js                     navegação + sessão (login automático)
src/db/                    banco SQLite local e banco de questões (JSON)
src/logica/                perfil/vidas, progresso/estrelas, sorteio de questões
src/servicos/              Supabase, sincronização de XP, checagem de rede
src/telas/                 Login/cadastro, mapa, questões, ranking
supabase_schema.sql        esquema e segurança (RLS) do Supabase
```

## Como funciona

- **Fase** = todas as questões de um tema/nível (até 5). Termina ao responder todas; 0 a 3 estrelas.
- **Trilha**: a fase N só abre com pelo menos 1 estrela na N-1.
- **Vidas**: máximo 5; erro tira 1; recarrega 1 a cada 10 minutos.
- **XP**: +10 por acerto, salvo localmente e enviado ao Supabase quando há internet.
- **Offline**: depois do primeiro login o app abre direto e o jogo funciona sem internet; o XP sincroniza depois.
- **Questões**: edite `src/db/questoes_fisioterapia.json` (id, tema, nivel, pergunta, resposta, 3 erradas, explicacao). Elas são recarregadas a cada abertura do app.

## Limitação conhecida

O XP é calculado no aparelho, então um usuário técnico pode forjar o próprio valor. O banco só impede que ele diminua.
Para um ranking à prova de fraude seria preciso validar as respostas no servidor (função RPC / Edge Function).
