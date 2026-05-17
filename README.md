# Dino Runner IA

Jogo simples inspirado no dinossauro do Chrome, feito em HTML, CSS e JavaScript puro para testes com rede neural e algoritmo genetico.

## Como abrir

Abra `index.html` no navegador.

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
