"use strict";

// Canvas principal do jogo e canvas separado usado para o grafico de treino.
const tela = document.querySelector("#jogo");
const contexto = tela.getContext("2d");
const telaGrafico = document.querySelector("#graficoPontuacao");
const contextoGrafico = telaGrafico.getContext("2d");

// Referencias para todos os elementos HTML que o JavaScript atualiza ou escuta.
const interfaceUsuario = {
  pontuacao: document.querySelector("#pontuacao"),
  recorde: document.querySelector("#recorde"),
  velocidade: document.querySelector("#velocidade"),
  geracao: document.querySelector("#geracao"),
  vivos: document.querySelector("#vivos"),
  melhorGeracao: document.querySelector("#melhorGeracao"),
  sobreposicao: document.querySelector("#sobreposicao"),
  visualizacaoEstado: document.querySelector("#visualizacaoEstado"),
  visualizacaoCerebro: document.querySelector("#visualizacaoCerebro"),
  botaoIniciar: document.querySelector("#botaoIniciar"),
  botaoTreinar: document.querySelector("#botaoTreinar"),
  botaoPausar: document.querySelector("#botaoPausar"),
  botaoReiniciar: document.querySelector("#botaoReiniciar"),
  alternarIa: document.querySelector("#alternarIa"),
  passosPorQuadro: document.querySelector("#passosPorQuadro"),
  valorPassosPorQuadro: document.querySelector("#valorPassosPorQuadro"),
};

// Valores centrais do jogo e do algoritmo genetico.
// Mudar esses numeros altera fisica, velocidade, tamanho da populacao e rede neural.
const configuracao = {
  largura: 1100,
  altura: 600,
  dinoX: 80,
  dinoCorrendoY: 310,
  dinoAbaixadoY: 340,
  pistaY: 380,
  velocidadePulo: 6,
  decaimentoPulo: 0.1,
  multiplicadorQuedaRapida: 7,
  escalaPulo: 1,
  velocidadeBase: 3,
  tamanhoPopulacao: 100,
  quantidadeElite: 12,
  taxaMutacao: 0.08,
  forcaMutacao: 0.12,
  quantidadeEntradas: 10,
  quantidadeNeuroniosOcultos: 32,
  quantidadeSaidas: 3,
};

// A rede neural sempre devolve um destes tres numeros.
const acao = {
  nada: 0,
  pular: 1,
  abaixar: 2,
};

// Paleta usada para pintar cada dino de uma cor diferente durante o treino.
const coresDinos = [
  "#e11d48",
  "#f97316",
  "#facc15",
  "#22c55e",
  "#14b8a6",
  "#06b6d4",
  "#2563eb",
  "#7c3aed",
  "#c026d3",
  "#ec4899",
  "#64748b",
  "#84cc16",
];

// Caminhos dos sprites originais. Os arquivos PNG nao sao alterados pelo codigo.
const fontesAssets = {
  dino: {
    parado: "Sprites/Dino/DinoStart.png",
    correndo: ["Sprites/Dino/DinoRun1.png", "Sprites/Dino/DinoRun2.png"],
    pulando: "Sprites/Dino/DinoJump.png",
    abaixado: ["Sprites/Dino/DinoDuck1.png", "Sprites/Dino/DinoDuck2.png"],
    morto: "Sprites/Dino/DinoDead.png",
  },
  cacto: {
    pequeno: [
      "Sprites/Cactus/SmallCactus1.png",
      "Sprites/Cactus/SmallCactus2.png",
      "Sprites/Cactus/SmallCactus3.png",
    ],
    grande: [
      "Sprites/Cactus/LargeCactus1.png",
      "Sprites/Cactus/LargeCactus2.png",
      "Sprites/Cactus/LargeCactus3.png",
    ],
  },
  passaro: ["Sprites/Bird/Bird1.png", "Sprites/Bird/Bird2.png"],
  outros: {
    nuvem: "Sprites/Other/Cloud.png",
    pista: "Sprites/Other/Track.png",
    fimDeJogo: "Sprites/Other/GameOver.png",
    reiniciar: "Sprites/Other/Reset.png",
  },
};

// Depois de carregar, cada imagem fica guardada aqui com largura/altura reais.
const imagens = {
  dino: { parado: null, correndo: [], pulando: null, abaixado: [], morto: null },
  cacto: { pequeno: [], grande: [] },
  passaro: [],
  outros: { nuvem: null, pista: null, fimDeJogo: null, reiniciar: null },
};

// Estado global da simulacao. O jogo pode estar em modo normal ou em modo treino.
let estado;
let teclasPressionadas = new Set();
let jogoRodando = false;
let ultimoQuadro = 0;
let agenteIa = null;
let modoTreino = false;
let geracaoAtual = 1;
let recorde = Number(localStorage.getItem("dino-recorde") || 0);
let melhorPontuacaoGeracao = 0;
let melhorCerebroHistorico = null;
let melhorAptidaoHistorica = 0;
let historicoGeracoes = [];
let proximoIdObstaculo = 1;
let assinaturaCerebroRenderizado = "";

// Carrega uma imagem e guarda se ela ja esta pronta para ser desenhada.
function carregarImagem(caminho) {
  const imagem = new Image();
  const asset = { carregado: false, imagem, largura: 0, altura: 0 };

  imagem.addEventListener("load", () => {
    asset.carregado = true;
    asset.largura = imagem.naturalWidth || imagem.width;
    asset.altura = imagem.naturalHeight || imagem.height;
    if (estado) desenhar();
  });

  imagem.addEventListener("error", () => console.warn(`Nao foi possivel carregar o asset: ${caminho}`));
  imagem.src = caminho;
  return asset;
}

imagens.dino.parado = carregarImagem(fontesAssets.dino.parado);
imagens.dino.correndo = fontesAssets.dino.correndo.map(carregarImagem);
imagens.dino.pulando = carregarImagem(fontesAssets.dino.pulando);
imagens.dino.abaixado = fontesAssets.dino.abaixado.map(carregarImagem);
imagens.dino.morto = carregarImagem(fontesAssets.dino.morto);
imagens.cacto.pequeno = fontesAssets.cacto.pequeno.map(carregarImagem);
imagens.cacto.grande = fontesAssets.cacto.grande.map(carregarImagem);
imagens.passaro = fontesAssets.passaro.map(carregarImagem);
imagens.outros.nuvem = carregarImagem(fontesAssets.outros.nuvem);
imagens.outros.pista = carregarImagem(fontesAssets.outros.pista);
imagens.outros.fimDeJogo = carregarImagem(fontesAssets.outros.fimDeJogo);
imagens.outros.reiniciar = carregarImagem(fontesAssets.outros.reiniciar);

// Utilitarios pequenos para gerar aleatoriedade usada no jogo e no algoritmo genetico.
function aleatorioEntre(minimo, maximo) {
  return Math.random() * (maximo - minimo) + minimo;
}

function inteiroAleatorio(minimo, maximo) {
  return Math.floor(aleatorioEntre(minimo, maximo + 1));
}

function escolherAleatorio(itens) {
  return itens[Math.floor(Math.random() * itens.length)];
}

function limitar(valor, minimo, maximo) {
  return Math.max(minimo, Math.min(valor, maximo));
}

function iaAtivada() {
  return Boolean(interfaceUsuario.alternarIa && interfaceUsuario.alternarIa.checked);
}

function marcarIaAtivada(ativada) {
  if (interfaceUsuario.alternarIa) {
    interfaceUsuario.alternarIa.checked = ativada;
  }
}

function tamanhoAsset(asset, larguraPadrao, alturaPadrao) {
  return {
    largura: asset && asset.carregado ? asset.largura : larguraPadrao,
    altura: asset && asset.carregado ? asset.altura : alturaPadrao,
  };
}

// Cria uma matriz de pesos aleatorios para a rede neural.
function matrizAleatoria(linhas, colunas, escala = 0.7) {
  return Array.from({ length: linhas }, () => Array.from({ length: colunas }, () => aleatorioEntre(-escala, escala)));
}

// Cria um vetor de bias aleatorio para a rede neural.
function vetorAleatorio(tamanho, escala = 0.2) {
  return Array.from({ length: tamanho }, () => aleatorioEntre(-escala, escala));
}

// Cria uma rede neural pequena: entradas -> camada oculta -> saidas.
function criarCerebroAleatorio() {
  return {
    formato: "cerebro-dino-navegador-v1",
    quantidadeEntradas: configuracao.quantidadeEntradas,
    quantidadeNeuroniosOcultos: configuracao.quantidadeNeuroniosOcultos,
    quantidadeSaidas: configuracao.quantidadeSaidas,
    pesosEntradaOculta: matrizAleatoria(configuracao.quantidadeEntradas, configuracao.quantidadeNeuroniosOcultos),
    biasOculta: vetorAleatorio(configuracao.quantidadeNeuroniosOcultos),
    pesosOcultaSaida: matrizAleatoria(configuracao.quantidadeNeuroniosOcultos, configuracao.quantidadeSaidas),
    biasSaida: [0.08, 0, 0],
  };
}

// Faz uma copia profunda do cerebro para que mutacoes nao alterem o original.
function clonarCerebro(cerebro) {
  return JSON.parse(JSON.stringify(cerebro));
}

// Mistura pesos de dois pais para criar um filho.
// Cada peso tem 50% de chance de vir do pai A ou do pai B.
function cruzarCerebros(paiA, paiB) {
  const filho = clonarCerebro(paiA);
  const atributos = ["pesosEntradaOculta", "biasOculta", "pesosOcultaSaida", "biasSaida"];

  for (const atributo of atributos) {
    const valorA = paiA[atributo];
    const valorB = paiB[atributo];
    filho[atributo] = Array.isArray(valorA[0])
      ? valorA.map((linha, linhaIndice) => linha.map((valor, colunaIndice) => (Math.random() < 0.5 ? valor : valorB[linhaIndice][colunaIndice])))
      : valorA.map((valor, indice) => (Math.random() < 0.5 ? valor : valorB[indice]));
  }

  return filho;
}

// Aplica pequenas alteracoes aleatorias nos pesos do cerebro.
// A escala permite fazer mutacoes mais fracas ou mais fortes.
function mutarCerebro(cerebro, escala = 1) {
  const atributos = ["pesosEntradaOculta", "biasOculta", "pesosOcultaSaida", "biasSaida"];
  const taxa = Math.min(0.3, configuracao.taxaMutacao * escala);
  const forca = configuracao.forcaMutacao * escala;

  for (const atributo of atributos) {
    const valor = cerebro[atributo];
    cerebro[atributo] = Array.isArray(valor[0])
      ? valor.map((linha) => linha.map((peso) => (Math.random() < taxa ? peso + aleatorioEntre(-forca, forca) : peso)))
      : valor.map((peso) => (Math.random() < taxa ? peso + aleatorioEntre(-forca, forca) : peso));
  }
}

// Multiplica as entradas pelos pesos da rede neural.
function produtoVetorMatriz(vetor, matriz) {
  return matriz[0].map((_, coluna) => vetor.reduce((soma, valor, linha) => soma + valor * matriz[linha][coluna], 0));
}

// Soma dois vetores posicao por posicao.
function somarVetores(vetorA, vetorB) {
  return vetorA.map((valor, indice) => valor + vetorB[indice]);
}

// Funcao de ativacao ReLU: corta valores negativos para zero.
function relu(valor) {
  return Math.max(0, valor);
}

// Cria um dino individual. No treino, cada dino tem seu proprio cerebro.
function criarDino(indice, cerebro = null) {
  return {
    indice,
    cor: coresDinos[indice % coresDinos.length],
    cerebro: cerebro || criarCerebroAleatorio(),
    vivo: true,
    pontuacao: 0,
    aptidao: 0,
    bonusObstaculos: 0,
    bonusChao: 0,
    obstaculosPassados: new Set(),
    x: configuracao.dinoX,
    y: configuracao.dinoCorrendoY,
    largura: 88,
    altura: 94,
    velocidadePulo: configuracao.velocidadePulo,
    noChao: true,
    abaixado: false,
    pulando: false,
    quedaRapida: false,
    correndo: false,
    indicePasso: 0,
    modo: "parado",
  };
}

// Cria a populacao inicial com cerebros aleatorios e, quando existir,
// reinsere o melhor cerebro ja encontrado pelo treino no navegador.
function criarPopulacao(tamanho = configuracao.tamanhoPopulacao) {
  const populacao = Array.from({ length: tamanho }, (_, indice) => criarDino(indice));

  if (melhorCerebroHistorico) {
    populacao[0] = criarDino(0, clonarCerebro(melhorCerebroHistorico));
  }

  return populacao;
}

// Sorteia um novo obstaculo com formato parecido com o jogo original.
function criarObstaculo() {
  const tipoObstaculo = Math.floor(Math.random() * 4);

  if (tipoObstaculo === 0) {
    const variante = Math.floor(Math.random() * 3);
    const tamanho = tamanhoAsset(imagens.cacto.pequeno[variante], [34, 68, 102][variante], 70);
    return { id: proximoIdObstaculo++, tipo: "cactoPequeno", variante, x: configuracao.largura, y: 325, largura: tamanho.largura, altura: tamanho.altura, passou: false };
  }

  if (tipoObstaculo === 1) {
    const variante = Math.floor(Math.random() * 3);
    const tamanho = tamanhoAsset(imagens.cacto.grande[variante], [50, 100, 150][variante], 95);
    return { id: proximoIdObstaculo++, tipo: "cactoGrande", variante, x: configuracao.largura, y: 300, largura: tamanho.largura, altura: tamanho.altura, passou: false };
  }

  if (tipoObstaculo === 2) {
    const tamanho = tamanhoAsset(imagens.passaro[0], 92, 65);
    return { id: proximoIdObstaculo++, tipo: "passaro", variante: 0, x: configuracao.largura, y: escolherAleatorio([250, 290, 320]), largura: tamanho.largura, altura: tamanho.altura, passou: false };
  }

  // Cano vindo de cima: o dino em pe bate, mas o dino abaixado passa por baixo.
  return { id: proximoIdObstaculo++, tipo: "cano", variante: 0, x: configuracao.largura, y: 0, largura: 86, altura: 354, passou: false };
}

// Reseta o "mundo": velocidade, pista, nuvem, obstaculos e lista de dinos.
function criarMundo(dinos) {
  estado = {
    tick: 0,
    velocidade: configuracao.velocidadeBase,
    pistaX: 0,
    dinos,
    obstaculos: [],
    nuvem: {
      x: configuracao.largura + Math.floor(aleatorioEntre(800, 1000)),
      y: Math.floor(aleatorioEntre(50, 100)),
      largura: 92,
    },
  };
  melhorPontuacaoGeracao = 0;
  proximoIdObstaculo = 1;
}

// Volta para o modo normal com um unico dino.
function reiniciar() {
  modoTreino = false;
  jogoRodando = false;
  ultimoQuadro = 0;
  geracaoAtual = 1;
  criarMundo([criarDino(0, agenteIa ? null : criarCerebroAleatorio())]);
  interfaceUsuario.sobreposicao.hidden = false;
  interfaceUsuario.sobreposicao.querySelector("strong").textContent = "Dino pronto";
  interfaceUsuario.botaoPausar.textContent = "Pausar";
  atualizarInterface();
  desenhar();
  return obterEstado();
}

// Inicia o treino visual no navegador com varios dinos coloridos.
function iniciarTreino() {
  modoTreino = true;
  jogoRodando = true;
  ultimoQuadro = 0;
  geracaoAtual = 1;
  historicoGeracoes = [];
  criarMundo(criarPopulacao());
  marcarIaAtivada(true);
  interfaceUsuario.sobreposicao.hidden = true;
  interfaceUsuario.botaoPausar.textContent = "Pausar";
  desenharGrafico();
  requestAnimationFrame(quadro);
}

// Retorna o primeiro dino vivo, usado para exibir o estado no painel.
function obterDinoPrincipal() {
  return estado.dinos.find((dino) => dino.vivo) || estado.dinos[0];
}

// Hitboxes do dino. Sao varias caixas menores, mais justas que um retangulo unico.
function obterCaixasDino(dino) {
  if (dino.abaixado) {
    return [
      { x: dino.x + 18, y: dino.y + 18, largura: 70, altura: 25 },
      { x: dino.x + 28, y: dino.y + 40, largura: 45, altura: 12 },
    ];
  }

  return [
    { x: dino.x + 45, y: dino.y + 8, largura: 39, altura: 28 },
    { x: dino.x + 5, y: dino.y + 30, largura: 62, altura: 38 },
    { x: dino.x + 22, y: dino.y + 68, largura: 30, altura: 21 },
  ];
}

// Hitbox do obstaculo com margens internas para nao colidir em pixels transparentes.
function obterCaixaObstaculo(obstaculo) {
  if (obstaculo.tipo === "passaro") {
    return { x: obstaculo.x + 10, y: obstaculo.y + 10, largura: obstaculo.largura - 20, altura: obstaculo.altura - 20 };
  }

  if (obstaculo.tipo === "cano") {
    return { x: obstaculo.x + 8, y: obstaculo.y, largura: obstaculo.largura - 16, altura: obstaculo.altura };
  }

  return { x: obstaculo.x + 8, y: obstaculo.y + 5, largura: obstaculo.largura - 16, altura: obstaculo.altura - 10 };
}

// Escolhe qual sprite do dino deve aparecer agora: correndo, pulando ou abaixado.
function assetAtualDino(dino) {
  const quadro = Math.floor(dino.indicePasso / 5) % 2;
  if (dino.pulando || !dino.noChao) return imagens.dino.pulando;
  if (!jogoRodando) return imagens.dino.parado;
  if (dino.abaixado) return imagens.dino.abaixado[quadro];
  return imagens.dino.correndo[quadro];
}

// Atualiza largura/altura do dino de acordo com o sprite ou estado atual.
function aplicarTamanhoDino(dino) {
  const asset = assetAtualDino(dino);

  if (asset && asset.carregado) {
    dino.largura = asset.largura;
    dino.altura = asset.altura;
  } else if (dino.abaixado) {
    dino.largura = 118;
    dino.altura = 60;
  } else {
    dino.largura = 88;
    dino.altura = 94;
  }
}

// Teste simples de colisao entre duas caixas retangulares.
function sobrepoe(caixaA, caixaB) {
  return caixaA.x < caixaB.x + caixaB.largura && caixaA.x + caixaA.largura > caixaB.x && caixaA.y < caixaB.y + caixaB.altura && caixaA.y + caixaA.altura > caixaB.y;
}

// Pega o obstaculo mais proximo que ainda esta na frente do dino.
function proximoObstaculo() {
  return estado.obstaculos.find((obstaculo) => obstaculo.x + obstaculo.largura >= configuracao.dinoX) || null;
}

// Converte o tipo textual do obstaculo em numero para a rede neural.
function codigoTipoObstaculo(tipo) {
  if (tipo === "cactoPequeno") return 0;
  if (tipo === "cactoGrande") return 0.5;
  if (tipo === "passaro") return 1;
  if (tipo === "cano") return 1.5;
  return 0;
}

// Monta o objeto de estado que aparece no painel e tambem alimenta a rede neural.
function obterEstado(dino = obterDinoPrincipal()) {
  const obstaculo = proximoObstaculo();
  return {
    vivo: dino ? dino.vivo : false,
    modoTreino,
    geracao: geracaoAtual,
    vivos: estado.dinos.filter((individuo) => individuo.vivo).length,
    populacao: estado.dinos.length,
    pontuacao: Math.floor(dino ? dino.pontuacao : 0),
    melhorGeracao: Math.floor(melhorPontuacaoGeracao),
    velocidade: Number(estado.velocidade.toFixed(2)),
    dinoY: Number((configuracao.dinoCorrendoY - (dino ? dino.y : configuracao.dinoCorrendoY)).toFixed(2)),
    velocidadeVerticalDino: Number((dino ? dino.velocidadePulo : configuracao.velocidadePulo).toFixed(2)),
    noChao: dino ? dino.noChao : true,
    abaixado: dino ? dino.abaixado : false,
    pulando: dino ? dino.pulando : false,
    modo: dino ? dino.modo : "parado",
    distanciaObstaculo: obstaculo ? Number((obstaculo.x - configuracao.dinoX).toFixed(2)) : null,
    larguraObstaculo: obstaculo ? obstaculo.largura : 0,
    alturaObstaculo: obstaculo ? obstaculo.altura : 0,
    obstaculoY: obstaculo ? obstaculo.y : 0,
    tipoObstaculo: obstaculo ? obstaculo.tipo : "nenhum",
  };
}

// Normaliza os dados do jogo para alimentar a rede neural no navegador.
function montarEntradasRede(estadoJogo) {
  const distancia = estadoJogo.distanciaObstaculo === null ? 600 : limitar(estadoJogo.distanciaObstaculo, 0, 600);
  const velocidadeVerticalNormalizada = limitar((estadoJogo.velocidadeVerticalDino + configuracao.velocidadePulo) / (configuracao.velocidadePulo * 2), 0, 1);

  return [
    distancia / 600,
    limitar(estadoJogo.larguraObstaculo / 180, 0, 1),
    limitar(estadoJogo.alturaObstaculo / configuracao.altura, 0, 1),
    limitar(estadoJogo.obstaculoY / configuracao.pistaY, 0, 1),
    limitar(estadoJogo.velocidade / 8, 0, 1),
    limitar(estadoJogo.dinoY / 180, 0, 1),
    velocidadeVerticalNormalizada,
    estadoJogo.noChao ? 1 : 0,
    estadoJogo.abaixado ? 1 : 0,
    limitar(codigoTipoObstaculo(estadoJogo.tipoObstaculo) / 1.5, 0, 1),
  ];
}

function atualizarAptidao(dino) {
  const sobrevivencia = Math.pow(Math.max(1, dino.pontuacao), 1.08);
  dino.aptidao = sobrevivencia + dino.bonusObstaculos + dino.bonusChao;
}

function arredondarPeso(valor) {
  return Number(valor.toFixed(3));
}

function arredondarVetor(vetor = []) {
  return vetor.map(arredondarPeso);
}

function arredondarMatriz(matriz = []) {
  return matriz.map(arredondarVetor);
}

function formatarPeso(valor) {
  return Number(valor).toFixed(3);
}

function criarTabelaVetor(titulo, vetor = []) {
  const cabecalho = vetor.map((_, indice) => `<th>C${indice}</th>`).join("");
  const celulas = vetor.map((valor) => `<td>${formatarPeso(valor)}</td>`).join("");
  return `
    <section class="bloco-matriz">
      <h3>${titulo}</h3>
      <div class="tabela-matriz-rolagem">
        <table class="tabela-matriz">
          <thead><tr><th></th>${cabecalho}</tr></thead>
          <tbody><tr><th>V0</th>${celulas}</tr></tbody>
        </table>
      </div>
    </section>
  `;
}

function criarTabelaMatriz(titulo, matriz = []) {
  const quantidadeColunas = matriz[0] ? matriz[0].length : 0;
  const cabecalho = Array.from({ length: quantidadeColunas }, (_, indice) => `<th>C${indice}</th>`).join("");
  const linhas = matriz
    .map((linha, linhaIndice) => `<tr><th>L${linhaIndice}</th>${linha.map((valor) => `<td>${formatarPeso(valor)}</td>`).join("")}</tr>`)
    .join("");

  return `
    <section class="bloco-matriz">
      <h3>${titulo}</h3>
      <div class="tabela-matriz-rolagem">
        <table class="tabela-matriz">
          <thead><tr><th></th>${cabecalho}</tr></thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderizarMelhorCerebro() {
  if (!interfaceUsuario.visualizacaoCerebro) return;

  if (!melhorCerebroHistorico) {
    interfaceUsuario.visualizacaoCerebro.textContent = "Treine para gerar um melhor dino.";
    assinaturaCerebroRenderizado = "";
    return;
  }

  const assinaturaAtual = `${melhorAptidaoHistorica}|${JSON.stringify(melhorCerebroHistorico)}`;
  if (assinaturaAtual === assinaturaCerebroRenderizado) return;
  assinaturaCerebroRenderizado = assinaturaAtual;

  interfaceUsuario.visualizacaoCerebro.innerHTML = `
    <div class="resumo-cerebro">
      <span>Aptidao: <strong>${melhorAptidaoHistorica.toFixed(2)}</strong></span>
      <span>Entradas: <strong>${melhorCerebroHistorico.quantidadeEntradas}</strong></span>
      <span>Ocultos: <strong>${melhorCerebroHistorico.quantidadeNeuroniosOcultos}</strong></span>
      <span>Saidas: <strong>${melhorCerebroHistorico.quantidadeSaidas}</strong></span>
    </div>
    ${criarTabelaMatriz("Pesos: entrada -> oculta", arredondarMatriz(melhorCerebroHistorico.pesosEntradaOculta))}
    ${criarTabelaVetor("Bias da camada oculta", arredondarVetor(melhorCerebroHistorico.biasOculta))}
    ${criarTabelaMatriz("Pesos: oculta -> saida", arredondarMatriz(melhorCerebroHistorico.pesosOcultaSaida))}
    ${criarTabelaVetor("Bias da saida", arredondarVetor(melhorCerebroHistorico.biasSaida))}
  `;
}

// Executa a rede neural e escolhe a acao de maior valor.
function preverAcao(cerebro, estadoJogo) {
  const entradas = montarEntradasRede(estadoJogo);
  const camadaOcultaBruta = somarVetores(produtoVetorMatriz(entradas, cerebro.pesosEntradaOculta), cerebro.biasOculta);
  const camadaOculta = camadaOcultaBruta.map(relu);
  const saida = somarVetores(produtoVetorMatriz(camadaOculta, cerebro.pesosOcultaSaida), cerebro.biasSaida);
  let melhorIndice = 0;

  for (let i = 1; i < saida.length; i += 1) {
    if (saida[i] > saida[melhorIndice]) melhorIndice = i;
  }

  return melhorIndice;
}

// Aceita numero, texto ou booleano e converte para uma acao padrao.
function normalizarAcao(acaoRecebida) {
  if (acaoRecebida === "pular") return acao.pular;
  if (acaoRecebida === "abaixar") return acao.abaixar;
  if (acaoRecebida === true) return acao.pular;
  return Number(acaoRecebida) || acao.nada;
}

// Aplica a acao escolhida no dino e atualiza pulo, abaixar, corrida e pontuacao.
function aplicarAcaoDino(dino, acaoRecebida) {
  const escolhida = normalizarAcao(acaoRecebida);

  if (escolhida === acao.pular && !dino.pulando) {
    dino.abaixado = false;
    dino.correndo = false;
    dino.pulando = true;
    dino.noChao = false;
  } else if (escolhida === acao.abaixar && dino.pulando) {
    dino.quedaRapida = true;
  } else if (escolhida === acao.abaixar && !dino.pulando) {
    dino.abaixado = true;
    dino.correndo = false;
    dino.noChao = true;
  } else if (!dino.pulando) {
    dino.abaixado = false;
    dino.quedaRapida = false;
    dino.correndo = true;
    dino.noChao = true;
  }

  if (dino.abaixado) {
    dino.modo = "abaixado";
    dino.y = configuracao.dinoAbaixadoY;
    dino.indicePasso = (dino.indicePasso + 1) % 10;
  }

  if (dino.correndo) {
    dino.modo = "correndo";
    dino.y = configuracao.dinoCorrendoY;
    dino.indicePasso = (dino.indicePasso + 1) % 10;
  }

  if (dino.pulando) {
    dino.modo = "pulando";
    dino.y -= dino.velocidadePulo * configuracao.escalaPulo;
    dino.velocidadePulo -= dino.quedaRapida ? configuracao.decaimentoPulo * configuracao.multiplicadorQuedaRapida : configuracao.decaimentoPulo;

    if (dino.velocidadePulo < -configuracao.velocidadePulo) {
      dino.pulando = false;
      dino.quedaRapida = false;
      dino.correndo = true;
      dino.noChao = true;
      dino.velocidadePulo = configuracao.velocidadePulo;
      dino.y = configuracao.dinoCorrendoY;
    }
  }

  aplicarTamanhoDino(dino);
  if (dino.noChao) dino.bonusChao += 0.08;
  dino.pontuacao += 1;
  atualizarAptidao(dino);
}

// Move obstaculos, nuvem e pista. Tambem da bonus quando um dino ultrapassa obstaculos.
function atualizarMundo() {
  estado.tick += 0.1;
  estado.velocidade += 0.00045;

  for (const obstaculo of estado.obstaculos) {
    obstaculo.x -= estado.velocidade;
  }

  for (const dino of estado.dinos) {
    if (!dino.vivo) continue;

    for (const obstaculo of estado.obstaculos) {
      if (obstaculo.x + obstaculo.largura < dino.x && !dino.obstaculosPassados.has(obstaculo.id)) {
        dino.obstaculosPassados.add(obstaculo.id);
        dino.bonusObstaculos += 120;
        atualizarAptidao(dino);
      }
    }
  }

  estado.obstaculos = estado.obstaculos.filter((obstaculo) => obstaculo.x + obstaculo.largura > 0);

  if (estado.obstaculos.length === 0) {
    estado.obstaculos.push(criarObstaculo());
  } else if (estado.obstaculos[estado.obstaculos.length - 1].x < configuracao.largura - inteiroAleatorio(700, 3000)) {
    estado.obstaculos.push(criarObstaculo());
  }

  estado.nuvem.x -= estado.velocidade;
  const larguraNuvem = imagens.outros.nuvem && imagens.outros.nuvem.carregado ? imagens.outros.nuvem.largura : estado.nuvem.largura;
  if (estado.nuvem.x < -larguraNuvem) {
    estado.nuvem.x = configuracao.largura + Math.floor(aleatorioEntre(2500, 3000));
    estado.nuvem.y = Math.floor(aleatorioEntre(50, 100));
  }

  estado.pistaX -= estado.velocidade;
  const larguraPista = imagens.outros.pista && imagens.outros.pista.carregado ? imagens.outros.pista.largura : configuracao.largura;
  if (estado.pistaX <= -larguraPista) estado.pistaX = 0;
}

// Verifica quais dinos bateram. Dinos mortos ficam invisiveis no desenho.
function verificarColisoes() {
  for (const dino of estado.dinos) {
    if (!dino.vivo) continue;
    const caixasDino = obterCaixasDino(dino);
    const colidiu = estado.obstaculos.some((obstaculo) => {
      const caixaObstaculo = obterCaixaObstaculo(obstaculo);
      return caixasDino.some((caixaDino) => sobrepoe(caixaDino, caixaObstaculo));
    });

    if (colidiu) {
      dino.vivo = false;
      atualizarAptidao(dino);
      melhorPontuacaoGeracao = Math.max(melhorPontuacaoGeracao, Math.floor(dino.pontuacao));
      recorde = Math.max(recorde, Math.floor(dino.pontuacao));
      localStorage.setItem("dino-recorde", String(recorde));
    }
  }
}

// Le as teclas do usuario para controlar o dino no modo normal.
function acaoManual() {
  if (teclasPressionadas.has("KeyS") || teclasPressionadas.has("ArrowDown")) return acao.abaixar;
  if (teclasPressionadas.has("Space") || teclasPressionadas.has("KeyW") || teclasPressionadas.has("ArrowUp")) return acao.pular;
  return acao.nada;
}

// Executa um passo de simulacao.
// No modo treino, todos os dinos vivos escolhem acao pela propria rede neural.
// No modo normal, usa teclado ou agente carregado.
function passo(acaoRecebida = acao.nada, opcoes = {}) {
  const deveDesenhar = opcoes.render !== false && opcoes.desenhar !== false;
  const vivosAntes = estado.dinos.filter((dino) => dino.vivo).length;

  if (vivosAntes === 0) {
    if (modoTreino) criarProximaGeracao();
    return { estado: obterEstado(), recompensa: 0, finalizado: true };
  }

  for (const dino of estado.dinos) {
    if (!dino.vivo) continue;
    let escolha = acao.nada;

    if (modoTreino) {
      escolha = preverAcao(dino.cerebro, obterEstado(dino));
    } else if (iaAtivada() && agenteIa) {
      escolha = agenteIa(obterEstado(dino));
    } else {
      escolha = acaoRecebida === acao.nada ? acaoManual() : acaoRecebida;
    }

    aplicarAcaoDino(dino, escolha);
  }

  atualizarMundo();
  verificarColisoes();
  melhorPontuacaoGeracao = Math.max(melhorPontuacaoGeracao, ...estado.dinos.map((dino) => dino.pontuacao));

  if (estado.dinos.every((dino) => !dino.vivo)) {
    if (modoTreino) {
      criarProximaGeracao();
    } else {
      jogoRodando = false;
      interfaceUsuario.sobreposicao.hidden = false;
      interfaceUsuario.sobreposicao.querySelector("strong").textContent = "Fim de jogo";
    }
  }

  if (deveDesenhar) {
    atualizarInterface();
    desenhar();
  }

  return { estado: obterEstado(), recompensa: 1, finalizado: estado.dinos.every((dino) => !dino.vivo) };
}

// Escolhe um pai por torneio entre os melhores individuos da geracao.
function escolherPai(ranqueados) {
  const limite = Math.max(configuracao.quantidadeElite * 3, 3);
  const candidatos = Array.from({ length: 3 }, () => ranqueados[inteiroAleatorio(0, Math.min(limite, ranqueados.length) - 1)]);
  candidatos.sort((a, b) => b.aptidao - a.aptidao);
  return candidatos[0];
}

// Fecha a geracao atual e cria a proxima usando elitismo, crossover e mutacao.
function criarProximaGeracao() {
  const ranqueados = [...estado.dinos].sort((a, b) => b.aptidao - a.aptidao);
  const campeao = ranqueados[0];
  const melhorPontuacao = Math.floor(campeao.pontuacao);
  historicoGeracoes.push({ geracao: geracaoAtual, pontuacao: melhorPontuacao });

  if (campeao.aptidao > melhorAptidaoHistorica) {
    melhorAptidaoHistorica = campeao.aptidao;
    melhorCerebroHistorico = clonarCerebro(campeao.cerebro);
  }

  const novosCerebros = [];

  if (melhorCerebroHistorico) {
    novosCerebros.push(clonarCerebro(melhorCerebroHistorico));
  }

  for (let i = 0; i < Math.min(configuracao.quantidadeElite, ranqueados.length); i += 1) {
    novosCerebros.push(clonarCerebro(ranqueados[i].cerebro));
  }

  while (novosCerebros.length < configuracao.tamanhoPopulacao) {
    const paiA = escolherPai(ranqueados);
    const paiB = escolherPai(ranqueados);
    const filho = cruzarCerebros(paiA.cerebro, paiB.cerebro);
    mutarCerebro(filho, Math.random() < 0.18 ? 1.8 : 1);
    novosCerebros.push(filho);
  }

  geracaoAtual += 1;
  criarMundo(novosCerebros.map((cerebro, indice) => criarDino(indice, cerebro)));
  desenharGrafico();
}

// Desenha o sprite PNG do dino. No treino, aplica uma cor por cima do sprite.
function desenharSpriteDino(dino) {
  const sprite = assetAtualDino(dino);
  if (!sprite || !sprite.carregado) return false;

  contexto.save();
  contexto.imageSmoothingEnabled = false;
  contexto.drawImage(sprite.imagem, dino.x, dino.y);

  if (modoTreino) {
    pintarSpriteDino(dino);
  }

  contexto.restore();
  return true;
}

// Pinta somente os pixels visiveis do sprite, preservando transparencia do PNG.
function pintarSpriteDino(dino) {
  contexto.globalCompositeOperation = "source-atop";
  contexto.globalAlpha = 0.72;
  contexto.fillStyle = dino.cor;
  contexto.fillRect(dino.x, dino.y, dino.largura, dino.altura);
  contexto.globalAlpha = 1;
  contexto.globalCompositeOperation = "source-over";
}

// Desenho simples usado caso algum sprite nao carregue.
function desenharDinoFallback(dino) {
  const pe = Math.floor(estado.tick / 7) % 2;
  const cor = modoTreino ? dino.cor : "#535353";

  contexto.save();
  contexto.fillStyle = cor;
  contexto.globalAlpha = modoTreino ? 0.82 : 1;

  if (dino.abaixado && dino.noChao) {
    const y = configuracao.pistaY - 40;
    contexto.fillRect(dino.x + 8, y + 14, 58, 22);
    contexto.fillRect(dino.x + 48, y + 2, 28, 24);
    contexto.fillRect(dino.x + 72, y + 12, 14, 8);
  } else {
    const x = dino.x;
    const y = dino.y;
    contexto.fillRect(x + 18, y + 18, 33, 42);
    contexto.fillRect(x + 39, y + 2, 35, 30);
    contexto.fillRect(x + 69, y + 14, 12, 8);
    contexto.fillRect(x + 23, y + 58, 9, 17);
    contexto.fillRect(x + 42, y + 58, 9, 17);

    if (dino.noChao && pe === 0) {
      contexto.fillRect(x + 18, y + 72, 20, 6);
    } else {
      contexto.fillRect(x + 38, y + 72, 22, 6);
    }
  }

  contexto.restore();
}

// Desenha um dino se ele ainda estiver vivo.
function desenharDino(dino) {
  if (!dino.vivo) return;
  if (desenharSpriteDino(dino)) return;
  desenharDinoFallback(dino);
}

// Desenha cactos e passaros, usando sprites quando disponiveis.
function desenharObstaculo(obstaculo) {
  let asset = null;

  if (obstaculo.tipo === "cano") {
    contexto.save();
    contexto.fillStyle = "#f5f5f5";
    contexto.strokeStyle = "#262626";
    contexto.lineWidth = 3;
    contexto.fillRect(obstaculo.x + 14, obstaculo.y, obstaculo.largura - 28, obstaculo.altura);
    contexto.strokeRect(obstaculo.x + 14, obstaculo.y, obstaculo.largura - 28, obstaculo.altura);
    contexto.fillStyle = "#d4d4d4";
    contexto.fillRect(obstaculo.x, obstaculo.altura - 28, obstaculo.largura, 28);
    contexto.strokeRect(obstaculo.x, obstaculo.altura - 28, obstaculo.largura, 28);
    contexto.restore();
    return;
  }

  if (obstaculo.tipo === "cactoPequeno") {
    asset = imagens.cacto.pequeno[obstaculo.variante];
  } else if (obstaculo.tipo === "cactoGrande") {
    asset = imagens.cacto.grande[obstaculo.variante];
  } else if (obstaculo.tipo === "passaro") {
    asset = imagens.passaro[Math.floor(estado.tick / 5) % 2];
  }

  if (asset && asset.carregado) {
    contexto.save();
    contexto.imageSmoothingEnabled = false;
    contexto.drawImage(asset.imagem, obstaculo.x, obstaculo.y);
    contexto.restore();
    return;
  }

  contexto.save();
  contexto.fillStyle = "#535353";

  if (obstaculo.tipo === "passaro") {
    contexto.fillRect(obstaculo.x + 24, obstaculo.y + 24, 44, 18);
    contexto.fillRect(obstaculo.x + 64, obstaculo.y + 18, 18, 10);
  } else {
    const quantidade = obstaculo.variante + 1;
    const larguraCacto = obstaculo.tipo === "cactoGrande" ? 34 : 24;
    for (let i = 0; i < quantidade; i += 1) {
      const x = obstaculo.x + i * larguraCacto;
      contexto.fillRect(x + larguraCacto * 0.38, obstaculo.y, larguraCacto * 0.28, obstaculo.altura);
      contexto.fillRect(x + 1, obstaculo.y + obstaculo.altura * 0.35, larguraCacto * 0.46, 9);
      contexto.fillRect(x + larguraCacto * 0.55, obstaculo.y + obstaculo.altura * 0.56, larguraCacto * 0.45, 9);
    }
  }

  contexto.restore();
}

// Desenha a pista/linha do chao com sprite ou fallback.
function desenharPista() {
  const pista = imagens.outros.pista;

  if (pista && pista.carregado) {
    for (const deslocamento of [estado.pistaX, pista.largura + estado.pistaX]) {
      contexto.drawImage(pista.imagem, deslocamento, configuracao.pistaY);
    }
    return;
  }

  contexto.strokeStyle = "#535353";
  contexto.fillStyle = "#535353";
  contexto.lineWidth = 2;

  for (const deslocamento of [estado.pistaX, configuracao.largura + estado.pistaX]) {
    contexto.beginPath();
    contexto.moveTo(deslocamento, configuracao.pistaY);
    contexto.lineTo(deslocamento + configuracao.largura, configuracao.pistaY);
    contexto.stroke();
  }
}

// Desenha a nuvem do fundo.
function desenharNuvem() {
  const nuvem = estado.nuvem;
  const assetNuvem = imagens.outros.nuvem;

  if (assetNuvem && assetNuvem.carregado) {
    contexto.save();
    contexto.imageSmoothingEnabled = false;
    contexto.drawImage(assetNuvem.imagem, nuvem.x, nuvem.y);
    contexto.restore();
    return;
  }

  contexto.fillStyle = "#cfd4d1";
  contexto.beginPath();
  contexto.arc(nuvem.x, nuvem.y + 18, 18, 0, Math.PI * 2);
  contexto.arc(nuvem.x + 24, nuvem.y + 8, 26, 0, Math.PI * 2);
  contexto.arc(nuvem.x + 54, nuvem.y + 18, 18, 0, Math.PI * 2);
  contexto.fillRect(nuvem.x, nuvem.y + 18, 72, 20);
  contexto.fill();
}

// Redesenha a cena inteira do jogo.
function desenhar() {
  contexto.clearRect(0, 0, configuracao.largura, configuracao.altura);
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, configuracao.largura, configuracao.altura);

  desenharNuvem();
  desenharPista();

  for (const obstaculo of estado.obstaculos) desenharObstaculo(obstaculo);
  for (const dino of estado.dinos) desenharDino(dino);

  if (!modoTreino && estado.dinos.every((dino) => !dino.vivo)) {
    contexto.fillStyle = "rgba(177, 58, 50, 0.12)";
    contexto.fillRect(0, 0, configuracao.largura, configuracao.altura);
    const fimDeJogo = imagens.outros.fimDeJogo;
    if (fimDeJogo && fimDeJogo.carregado) {
      contexto.drawImage(fimDeJogo.imagem, (configuracao.largura - fimDeJogo.largura) / 2, 210);
    }
  }
}

// Desenha o grafico de melhor pontuacao por geracao.
function desenharGrafico() {
  const largura = telaGrafico.width;
  const altura = telaGrafico.height;
  const margemEsquerda = 54;
  const margemDireita = 24;
  const margemTopo = 28;
  const margemBaixo = 42;
  const larguraUtil = largura - margemEsquerda - margemDireita;
  const alturaUtil = altura - margemTopo - margemBaixo;
  const pontos = [...historicoGeracoes];

  if (modoTreino) {
    pontos.push({ geracao: geracaoAtual, pontuacao: Math.floor(melhorPontuacaoGeracao) });
  }

  contextoGrafico.clearRect(0, 0, largura, altura);
  contextoGrafico.fillStyle = "#fbfcfb";
  contextoGrafico.fillRect(0, 0, largura, altura);
  contextoGrafico.lineJoin = "round";
  contextoGrafico.lineCap = "round";

  contextoGrafico.strokeStyle = "#e3e8e4";
  contextoGrafico.lineWidth = 1;

  for (let i = 0; i <= 4; i += 1) {
    const y = margemTopo + (i / 4) * alturaUtil;
    contextoGrafico.beginPath();
    contextoGrafico.moveTo(margemEsquerda, y);
    contextoGrafico.lineTo(largura - margemDireita, y);
    contextoGrafico.stroke();
  }

  contextoGrafico.fillStyle = "#6c746e";
  contextoGrafico.font = "600 12px system-ui";
  contextoGrafico.fillText("pontuacao", 12, 18);
  contextoGrafico.fillText("geracao", largura - 84, altura - 14);

  contextoGrafico.strokeStyle = "#9aa59d";
  contextoGrafico.beginPath();
  contextoGrafico.moveTo(margemEsquerda, margemTopo);
  contextoGrafico.lineTo(margemEsquerda, altura - margemBaixo);
  contextoGrafico.lineTo(largura - margemDireita, altura - margemBaixo);
  contextoGrafico.stroke();

  if (pontos.length === 0) {
    contextoGrafico.fillStyle = "#879189";
    contextoGrafico.font = "600 15px system-ui";
    contextoGrafico.fillText("Inicie o treinamento para ver a evolucao.", margemEsquerda + 18, altura / 2);
    return;
  }

  const maiorPontuacao = Math.max(1, ...pontos.map((ponto) => ponto.pontuacao));
  const menorPontuacao = Math.min(...pontos.map((ponto) => ponto.pontuacao));
  const intervalo = Math.max(1, pontos.length - 1);
  const xDoPonto = (indice) => margemEsquerda + (indice / intervalo) * larguraUtil;
  const yDoPonto = (pontuacao) => altura - margemBaixo - (pontuacao / maiorPontuacao) * alturaUtil;
  const ultimoPonto = pontos[pontos.length - 1];
  const ultimoX = xDoPonto(pontos.length - 1);
  const ultimoY = yDoPonto(ultimoPonto.pontuacao);

  contextoGrafico.fillStyle = "#879189";
  contextoGrafico.font = "12px system-ui";
  contextoGrafico.fillText(String(maiorPontuacao), 12, yDoPonto(maiorPontuacao) + 4);
  contextoGrafico.fillText(String(menorPontuacao), 12, Math.min(altura - margemBaixo, yDoPonto(menorPontuacao)) + 4);

  contextoGrafico.beginPath();
  pontos.forEach((ponto, indice) => {
    const x = xDoPonto(indice);
    const y = yDoPonto(ponto.pontuacao);
    if (indice === 0) contextoGrafico.moveTo(x, y);
    else contextoGrafico.lineTo(x, y);
  });
  contextoGrafico.lineTo(ultimoX, altura - margemBaixo);
  contextoGrafico.lineTo(xDoPonto(0), altura - margemBaixo);
  contextoGrafico.closePath();

  const preenchimento = contextoGrafico.createLinearGradient(0, margemTopo, 0, altura - margemBaixo);
  preenchimento.addColorStop(0, "rgba(29, 127, 104, 0.22)");
  preenchimento.addColorStop(1, "rgba(29, 127, 104, 0.02)");
  contextoGrafico.fillStyle = preenchimento;
  contextoGrafico.fill();

  contextoGrafico.strokeStyle = "#1d7f68";
  contextoGrafico.lineWidth = 4;
  contextoGrafico.beginPath();
  pontos.forEach((ponto, indice) => {
    const x = xDoPonto(indice);
    const y = yDoPonto(ponto.pontuacao);
    if (indice === 0) contextoGrafico.moveTo(x, y);
    else contextoGrafico.lineTo(x, y);
  });
  contextoGrafico.stroke();

  pontos.forEach((ponto, indice) => {
    const x = xDoPonto(indice);
    const y = yDoPonto(ponto.pontuacao);
    const ehUltimo = indice === pontos.length - 1;
    contextoGrafico.fillStyle = ehUltimo ? "#ffffff" : "#1d7f68";
    contextoGrafico.strokeStyle = ehUltimo ? "#105948" : "#ffffff";
    contextoGrafico.lineWidth = ehUltimo ? 4 : 2;
    contextoGrafico.beginPath();
    contextoGrafico.arc(x, y, ehUltimo ? 6 : 4, 0, Math.PI * 2);
    contextoGrafico.fill();
    contextoGrafico.stroke();
  });

  contextoGrafico.fillStyle = "#105948";
  contextoGrafico.font = "700 13px system-ui";
  contextoGrafico.fillText(`G${ultimoPonto.geracao}: ${ultimoPonto.pontuacao}`, Math.min(ultimoX + 10, largura - 112), Math.max(18, ultimoY - 12));
}

// Atualiza textos do HUD, painel JSON e grafico.
function atualizarInterface() {
  const vivos = estado.dinos.filter((dino) => dino.vivo).length;
  interfaceUsuario.pontuacao.textContent = String(Math.floor(melhorPontuacaoGeracao));
  interfaceUsuario.recorde.textContent = String(recorde);
  interfaceUsuario.velocidade.textContent = estado.velocidade.toFixed(1);
  interfaceUsuario.geracao.textContent = String(geracaoAtual);
  interfaceUsuario.vivos.textContent = `${vivos}/${estado.dinos.length}`;
  interfaceUsuario.melhorGeracao.textContent = String(Math.floor(melhorPontuacaoGeracao));
  interfaceUsuario.valorPassosPorQuadro.textContent = interfaceUsuario.passosPorQuadro.value;
  interfaceUsuario.visualizacaoEstado.textContent = JSON.stringify(obterEstado(), null, 2);
  renderizarMelhorCerebro();
  desenharGrafico();
}

// Loop de animacao. Pode executar varios passos por quadro para acelerar o treino.
function quadro(tempo) {
  if (!jogoRodando) return;
  if (!ultimoQuadro) ultimoQuadro = tempo;

  const passos = Number(interfaceUsuario.passosPorQuadro.value);
  for (let i = 0; i < passos; i += 1) passo(acao.nada, { desenhar: false });

  atualizarInterface();
  desenhar();
  ultimoQuadro = tempo;
  if (jogoRodando) requestAnimationFrame(quadro);
}

// Inicia o modo normal: um dino, controlado por teclado ou agente carregado.
function iniciar() {
  modoTreino = false;
  if (estado.dinos.every((dino) => !dino.vivo)) reiniciar();
  if (jogoRodando) return;
  jogoRodando = true;
  interfaceUsuario.sobreposicao.hidden = true;
  interfaceUsuario.botaoPausar.textContent = "Pausar";
  requestAnimationFrame(quadro);
}

// Pausa o jogo/treino sem resetar o estado atual.
function pausar() {
  if (!jogoRodando) return;
  jogoRodando = false;
  interfaceUsuario.sobreposicao.hidden = false;
  interfaceUsuario.sobreposicao.querySelector("strong").textContent = "Pausado";
  interfaceUsuario.botaoPausar.textContent = "Despausar";
}

function despausar() {
  if (jogoRodando) return;
  jogoRodando = true;
  ultimoQuadro = 0;
  interfaceUsuario.sobreposicao.hidden = true;
  interfaceUsuario.botaoPausar.textContent = "Pausar";
  requestAnimationFrame(quadro);
}

function alternarPausa() {
  if (jogoRodando) {
    pausar();
  } else {
    despausar();
  }
}

document.addEventListener("keydown", (evento) => {
  teclasPressionadas.add(evento.code);
  if (evento.code === "Space") evento.preventDefault();
  if (evento.code === "KeyR") reiniciar();
  if (evento.code === "KeyP") alternarPausa();
  if (evento.code === "KeyU") iniciar();
});

document.addEventListener("keyup", (evento) => {
  teclasPressionadas.delete(evento.code);
});

// Eventos dos botoes e controles da tela.
interfaceUsuario.botaoIniciar.addEventListener("click", iniciar);
interfaceUsuario.botaoTreinar.addEventListener("click", iniciarTreino);
interfaceUsuario.botaoPausar.addEventListener("click", alternarPausa);
interfaceUsuario.botaoReiniciar.addEventListener("click", reiniciar);
interfaceUsuario.passosPorQuadro.addEventListener("input", atualizarInterface);
reiniciar();
