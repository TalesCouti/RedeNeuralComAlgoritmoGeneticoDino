# Dino Runner IA

Jogo simples inspirado no dinossauro do Chrome, feito em HTML, CSS e JavaScript puro para testes com rede neural e algoritmo genetico.

## Como abrir

Abra `index.html` no navegador.

Para carregar o cerebro treinado em Python (`dino_brain.json`), prefira abrir com servidor local:

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

## Controles

- `Espaco`, `W` ou seta para cima: pular
- `S` ou seta para baixo: abaixar
- `R`: reiniciar

## API para IA

O jogo expoe `window.DinoEnv` no navegador:

```js
DinoEnv.reset();
DinoEnv.step(0); // nada
DinoEnv.step(1); // pula
DinoEnv.step(2); // abaixa
DinoEnv.getState();
```

## Treino com NumPy

O arquivo `train_numpy_ai.py` treina uma rede neural simples usando NumPy e algoritmo genetico. Ele nao altera o jogo durante o treino; apenas gera o arquivo `dino_brain.json`.

Instale o NumPy se ainda nao tiver:

```bash
pip install numpy
```

Depois rode:

```bash
python train_numpy_ai.py
```

Quando terminar, ele salva a melhor rede em:

```text
dino_brain.json
```

Para usar essa rede no jogo, abra o console do navegador e execute:

```js
await DinoEnv.loadNumpyBrain("dino_brain.json");
DinoEnv.play();
```

Isso carrega os pesos treinados no Python, transforma a rede em um agente JavaScript e marca automaticamente `Usar agente IA`.

Tambem da para plugar um agente:

```js
DinoEnv.setAgent((state) => {
  if (state.obstacleDistance < 150 && state.grounded) return 1;
  return 0;
});

DinoEnv.play();
```

Para avaliar um individuo sem depender da animacao:

```js
const resultado = DinoEnv.runEpisode((state) => {
  if (state.obstacleDistance !== null && state.obstacleDistance < 145 && state.grounded) return 1;
  return 0;
}, 5000);
```

O estado retornado tem dados pensados para uma rede neural:

- `speed`
- `dinoY`
- `dinoVelocityY`
- `grounded`
- `ducking`
- `obstacleDistance`
- `obstacleWidth`
- `obstacleHeight`
- `obstacleY`
- `obstacleType`

O `step(action)` retorna `{ state, reward, done }`, o que facilita rodar treino manual ou automatizado.
