# Dino Runner IA

Jogo simples inspirado no dinossauro do Chrome, feito em HTML, CSS e JavaScript puro para testes com rede neural e algoritmo genetico.

## Como abrir

Abra `index.html` no navegador.

Para carregar o cerebro treinado em Python (`cerebro_dino.json`), prefira abrir com servidor local:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://127.0.0.1:8000/index.html
```

Os sprites ficam em `Sprites/`, seguindo a estrutura do projeto Pygame:

- `Sprites/Dino/DinoStart.png`
- `Sprites/Dino/DinoRun1.png` e `Sprites/Dino/DinoRun2.png`
- `Sprites/Dino/DinoJump.png`
- `Sprites/Dino/DinoDuck1.png` e `Sprites/Dino/DinoDuck2.png`
- `Sprites/Dino/DinoDead.png`
- `Sprites/Cactus/SmallCactus1.png` ate `SmallCactus3.png`
- `Sprites/Cactus/LargeCactus1.png` ate `LargeCactus3.png`
- `Sprites/Bird/Bird1.png` e `Sprites/Bird/Bird2.png`
- `Sprites/Other/Cloud.png`, `Track.png` e `GameOver.png`

O jogo tambem tem um obstaculo desenhado no canvas: o `cano`, inspirado em Flappy Bird. Ele vem de cima e so pode ser desviado abaixando.

## Controles

- `Espaco`, `W` ou seta para cima: pular
- `S` ou seta para baixo: abaixar
- `R`: reiniciar

## Treino integrado no site

Clique em `Treinar` para iniciar uma populacao de dinossauros controlados por redes neurais simples em JavaScript. Cada dino recebe uma cor diferente para ficar facil acompanhar os individuos.

Durante o treino:

- `Geracao` mostra a geracao atual.
- `Vivos` mostra quantos dinos ainda estao na tela.
- `Melhor geracao` mostra o melhor score da geracao atual.
- O grafico `Pontuacao por geracao` mostra o melhor score de cada geracao.
- Quando um dino morre, ele some da tela.
- Quando todos morrem, o jogo cria automaticamente a proxima geracao com elitismo, crossover e mutacao.
- Se existir `cerebro_dino.json`, o treino usa esse cerebro do Python como ponto de partida e cria mutacoes dele. Isso costuma melhorar bem o desempenho inicial.
- Se voce adicionar ou mudar obstaculos, treine novamente para a rede aprender os novos padroes. O `cano`, por exemplo, exige a acao `abaixar`.

Use `Pausar` para parar temporariamente e `Reiniciar` para voltar ao modo normal com um unico dino.

## API para IA

O jogo expoe `window.DinoEnv` no navegador:

```js
DinoEnv.reiniciar();
DinoEnv.passo(0); // nada
DinoEnv.passo(1); // pula
DinoEnv.passo(2); // abaixa
DinoEnv.obterEstado();
DinoEnv.iniciarTreino();
```

## Treino com NumPy

O arquivo `treinar_ia_numpy.py` treina uma rede neural simples usando NumPy e algoritmo genetico. Ele nao altera o jogo durante o treino; apenas gera o arquivo `cerebro_dino.json`.

Instale o NumPy se ainda nao tiver:

```bash
pip install numpy
```

Depois rode:

```bash
python treinar_ia_numpy.py
```

Quando terminar, ele salva a melhor rede em:

```text
cerebro_dino.json
```

Para usar essa rede no jogo, abra o console do navegador e execute:

```js
await DinoEnv.carregarCerebroNumpy("cerebro_dino.json");
DinoEnv.iniciar();
```

Isso carrega os pesos treinados no Python, transforma a rede em um agente JavaScript e marca automaticamente `Usar agente IA`.

Tambem da para plugar um agente manualmente:

```js
DinoEnv.definirAgente((estado) => {
  if (estado.distanciaObstaculo < 150 && estado.noChao) return 1;
  return 0;
});

DinoEnv.iniciar();
```

Para avaliar um individuo sem depender da animacao:

```js
const resultado = DinoEnv.rodarEpisodio((estado) => {
  if (estado.distanciaObstaculo !== null && estado.distanciaObstaculo < 145 && estado.noChao) return 1;
  return 0;
}, 5000);
```

O estado retornado tem dados pensados para uma rede neural:

- `velocidade`
- `dinoY`
- `velocidadeVerticalDino`
- `noChao`
- `abaixado`
- `distanciaObstaculo`
- `larguraObstaculo`
- `alturaObstaculo`
- `obstaculoY`
- `tipoObstaculo`

O `passo(acao)` retorna `{ estado, recompensa, finalizado }`, o que facilita rodar treino manual ou automatizado.
