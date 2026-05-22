# Dino Runner AG

Jogo inspirado no dinossauro do Chrome, feito com HTML, CSS e JavaScript puro. O projeto usa uma rede neural simples com algoritmo genetico para treinar varios dinossauros ao mesmo tempo direto no navegador.

## Como abrir

Voce pode abrir `index.html` direto no navegador. Outra opcao e usar uma extensao como Live Server no VS Code e abrir a URL local que ela criar.

Se o navegador mostrar uma versao antiga do jogo, use `Ctrl + F5` ou altere a versao do script em `index.html`, por exemplo:

```html
<script src="game.js?v=14"></script>
```

## Controles

- `Espaco`, `W` ou seta para cima: pular.
- `S` ou seta para baixo: abaixar.
- `S` ou seta para baixo no ar: cair mais rapido.
- `P`: pausar.
- `U`: iniciar/voltar.
- `R`: reiniciar.

## Obstaculos

O jogo possui cactos, passaros e canos.

O cano e desenhado pelo proprio canvas, sem depender de `Pipe.png`. Ele vem de cima e so pode ser desviado abaixando. Se o dino estiver em pe ou pulando, ele deve colidir com o cano.

## Treino no navegador

Clique em `Treinar` para iniciar a populacao de dinos controlados por redes neurais.

Durante o treino:

- cada dino recebe uma cor diferente;
- dinos mortos somem da tela;
- `Geracao` mostra a geracao atual;
- `Vivos` mostra quantos dinos ainda estao vivos;
- `Melhor geracao` mostra a melhor pontuacao da geracao atual;
- o grafico `Pontuacao por geracao` acompanha a evolucao do melhor score;
- quando todos morrem, o jogo cria uma nova geracao com elitismo, crossover e mutacao.

## Rede neural e algoritmo genetico

Valores principais atuais:

- populacao: `100`
- elite: `12`
- taxa de mutacao: `0.08`
- forca da mutacao: `0.12`
- entradas da rede: `10`
- neuronios ocultos: `48`
- saidas: `3`

As saidas da rede sao:

```text
0 = nada
1 = pular
2 = abaixar
```

A acao `abaixar` tambem funciona no ar. Nesse caso, ativa a queda rapida usando `multiplicadorQuedaRapida`.

## Aptidao

A selecao dos melhores dinos usa `aptidao`, nao apenas a pontuacao visual.

A aptidao considera:

- sobrevivencia;
- bonus por obstaculo ultrapassado;
- uma pequena recompensa por estar no chao.

Essa recompensa por estar no chao ajuda a reduzir pulos desnecessarios, mas e pequena para nao impedir a rede de aprender a pular quando precisa.

## Grafico

O grafico mostra a melhor pontuacao por geracao. Ele inclui grade, linha de evolucao, preenchimento suave e destaque para o ultimo ponto registrado.

## Assets

Os sprites usados ficam em `Sprites/`:

- `Sprites/Dino/DinoStart.png`
- `Sprites/Dino/DinoRun1.png` e `Sprites/Dino/DinoRun2.png`
- `Sprites/Dino/DinoJump.png`
- `Sprites/Dino/DinoDuck1.png` e `Sprites/Dino/DinoDuck2.png`
- `Sprites/Dino/DinoDead.png`
- `Sprites/Cactus/SmallCactus1.png` ate `SmallCactus3.png`
- `Sprites/Cactus/LargeCactus1.png` ate `LargeCactus3.png`
- `Sprites/Bird/Bird1.png` e `Sprites/Bird/Bird2.png`
- `Sprites/Other/Cloud.png`, `Track.png`, `GameOver.png` e `Reset.png`

## Observacoes

O recorde de pontuacao e salvo no `localStorage` com a chave `dino-recorde`.

Para limpar o recorde pelo console do navegador:

```js
localStorage.removeItem("dino-recorde");
```

Para limpar todo o `localStorage` deste site:

```js
localStorage.clear();
```
