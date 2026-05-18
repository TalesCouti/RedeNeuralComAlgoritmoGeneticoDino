"use strict";

const tela = document.querySelector("#jogo");
const contexto = tela.getContext("2d");

const interfaceUsuario = {
  pontuacao: document.querySelector("#pontuacao"),
  recorde: document.querySelector("#recorde"),
  velocidade: document.querySelector("#velocidade"),
  sobreposicao: document.querySelector("#sobreposicao"),
  visualizacaoEstado: document.querySelector("#visualizacaoEstado"),
  botaoIniciar: document.querySelector("#botaoIniciar"),
  botaoPausar: document.querySelector("#botaoPausar"),
  botaoReiniciar: document.querySelector("#botaoReiniciar"),
  alternarIa: document.querySelector("#alternarIa"),
  passosPorQuadro: document.querySelector("#passosPorQuadro"),
  valorPassosPorQuadro: document.querySelector("#valorPassosPorQuadro"),
};

const configuracao = {
  largura: 1100,
  altura: 600,
  dinoX: 80,
  dinoCorrendoY: 310,
  dinoAbaixadoY: 340,
  pistaY: 380,
  velocidadePulo: 6,
  decaimentoPulo: 0.1,
  escalaPulo: 1,
  velocidadeBase: 3,
};

const acao = {
  nada: 0,
  pular: 1,
  abaixar: 2,
};

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

const imagens = {
  dino: {
    parado: null,
    correndo: [],
    pulando: null,
    abaixado: [],
    morto: null,
  },
  cacto: {
    pequeno: [],
    grande: [],
  },
  passaro: [],
  outros: {
    nuvem: null,
    pista: null,
    fimDeJogo: null,
    reiniciar: null,
  },
};

let estado;
let teclasPressionadas = new Set();
let jogoRodando = false;
let ultimoQuadro = 0;
let agenteIa = null;
let recorde = Number(localStorage.getItem("dino-recorde") || localStorage.getItem("dino-best") || 0);

function carregarImagem(caminho) {
  const imagem = new Image();
  const asset = { carregado: false, imagem, largura: 0, altura: 0 };

  imagem.addEventListener("load", () => {
    asset.carregado = true;
    asset.largura = imagem.naturalWidth || imagem.width;
    asset.altura = imagem.naturalHeight || imagem.height;
    if (estado) desenhar();
  });

  imagem.addEventListener("error", () => {
    console.warn(`Nao foi possivel carregar o asset: ${caminho}`);
  });

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

function aleatorioEntre(minimo, maximo) {
  return Math.random() * (maximo - minimo) + minimo;
}

function escolherAleatorio(itens) {
  return itens[Math.floor(Math.random() * itens.length)];
}

function tamanhoAsset(asset, larguraPadrao, alturaPadrao) {
  return {
    largura: asset && asset.carregado ? asset.largura : larguraPadrao,
    altura: asset && asset.carregado ? asset.altura : alturaPadrao,
  };
}

function criarObstaculo() {
  const tipoObstaculo = Math.floor(Math.random() * 3);

  if (tipoObstaculo === 0) {
    const variante = Math.floor(Math.random() * 3);
    const tamanho = tamanhoAsset(imagens.cacto.pequeno[variante], [34, 68, 102][variante], 70);
    return {
      tipo: "cactoPequeno",
      variante,
      x: configuracao.largura,
      y: 325,
      largura: tamanho.largura,
      altura: tamanho.altura,
      passou: false,
    };
  }

  if (tipoObstaculo === 1) {
    const variante = Math.floor(Math.random() * 3);
    const tamanho = tamanhoAsset(imagens.cacto.grande[variante], [50, 100, 150][variante], 95);
    return {
      tipo: "cactoGrande",
      variante,
      x: configuracao.largura,
      y: 300,
      largura: tamanho.largura,
      altura: tamanho.altura,
      passou: false,
    };
  }

  const tamanho = tamanhoAsset(imagens.passaro[0], 92, 65);
  return {
    tipo: "passaro",
    variante: 0,
    x: configuracao.largura,
    y: escolherAleatorio([250, 290, 320]),
    largura: tamanho.largura,
    altura: tamanho.altura,
    passou: false,
  };
}

function reiniciar() {
  jogoRodando = false;
  ultimoQuadro = 0;
  estado = {
    tick: 0,
    pontuacao: 0,
    vivo: true,
    velocidade: configuracao.velocidadeBase,
    pistaX: 0,
    dino: {
      x: configuracao.dinoX,
      y: configuracao.dinoCorrendoY,
      largura: 88,
      altura: 94,
      velocidadePulo: configuracao.velocidadePulo,
      noChao: true,
      abaixado: false,
      pulando: false,
      correndo: false,
      indicePasso: 0,
      modo: "parado",
    },
    obstaculos: [],
    nuvem: {
      x: configuracao.largura + Math.floor(aleatorioEntre(800, 1000)),
      y: Math.floor(aleatorioEntre(50, 100)),
      largura: 92,
    },
  };

  aplicarTamanhoDino();
  interfaceUsuario.sobreposicao.hidden = false;
  interfaceUsuario.sobreposicao.querySelector("strong").textContent = "Dino pronto";
  atualizarInterface();
  desenhar();
  return obterEstado();
}

function obterCaixasDino() {
  const dino = estado.dino;

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

function obterCaixaObstaculo(obstaculo) {
  if (obstaculo.tipo === "passaro") {
    return {
      x: obstaculo.x + 10,
      y: obstaculo.y + 10,
      largura: obstaculo.largura - 20,
      altura: obstaculo.altura - 20,
    };
  }

  return {
    x: obstaculo.x + 8,
    y: obstaculo.y + 5,
    largura: obstaculo.largura - 16,
    altura: obstaculo.altura - 10,
  };
}

function assetAtualDino() {
  const dino = estado.dino;
  const quadro = Math.floor(dino.indicePasso / 5) % 2;

  if (!estado.vivo) return imagens.dino.morto;
  if (dino.pulando || !dino.noChao) return imagens.dino.pulando;
  if (!jogoRodando) return imagens.dino.parado;
  if (dino.abaixado) return imagens.dino.abaixado[quadro];
  return imagens.dino.correndo[quadro];
}

function aplicarTamanhoDino() {
  const dino = estado.dino;
  const asset = assetAtualDino();

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

function sobrepoe(caixaA, caixaB) {
  return (
    caixaA.x < caixaB.x + caixaB.largura &&
    caixaA.x + caixaA.largura > caixaB.x &&
    caixaA.y < caixaB.y + caixaB.altura &&
    caixaA.y + caixaA.altura > caixaB.y
  );
}

function proximoObstaculo() {
  return estado.obstaculos.find((obstaculo) => obstaculo.x + obstaculo.largura >= estado.dino.x) || null;
}

function obterEstado() {
  const obstaculo = proximoObstaculo();
  const dino = estado.dino;
  return {
    vivo: estado.vivo,
    pontuacao: Math.floor(estado.pontuacao),
    velocidade: Number(estado.velocidade.toFixed(2)),
    dinoY: Number((configuracao.dinoCorrendoY - dino.y).toFixed(2)),
    velocidadeVerticalDino: Number(dino.velocidadePulo.toFixed(2)),
    noChao: dino.noChao,
    abaixado: dino.abaixado,
    pulando: dino.pulando,
    modo: dino.modo,
    distanciaObstaculo: obstaculo ? Number((obstaculo.x - dino.x).toFixed(2)) : null,
    larguraObstaculo: obstaculo ? obstaculo.largura : 0,
    alturaObstaculo: obstaculo ? obstaculo.altura : 0,
    obstaculoY: obstaculo ? obstaculo.y : 0,
    tipoObstaculo: obstaculo ? obstaculo.tipo : "nenhum",
  };
}

function normalizarAcao(acaoRecebida) {
  if (acaoRecebida === "pular") return acao.pular;
  if (acaoRecebida === "abaixar") return acao.abaixar;
  if (acaoRecebida === true) return acao.pular;
  return Number(acaoRecebida) || acao.nada;
}

function passo(acaoRecebida = acao.nada, opcoes = {}) {
  const deveDesenhar = opcoes.render !== false && opcoes.desenhar !== false;

  if (!estado.vivo) {
    return { estado: obterEstado(), recompensa: -10, finalizado: true };
  }

  const dino = estado.dino;
  const escolhida = normalizarAcao(acaoRecebida);

  if (escolhida === acao.pular && !dino.pulando) {
    dino.abaixado = false;
    dino.correndo = false;
    dino.pulando = true;
    dino.noChao = false;
  } else if (escolhida === acao.abaixar && !dino.pulando) {
    dino.abaixado = true;
    dino.correndo = false;
    dino.noChao = true;
  } else if (!dino.pulando) {
    dino.abaixado = false;
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
    dino.velocidadePulo -= configuracao.decaimentoPulo;

    if (dino.velocidadePulo < -configuracao.velocidadePulo) {
      dino.pulando = false;
      dino.correndo = true;
      dino.noChao = true;
      dino.velocidadePulo = configuracao.velocidadePulo;
      dino.y = configuracao.dinoCorrendoY;
    }
  }

  aplicarTamanhoDino();

  estado.tick += 0.1;
  estado.pontuacao += 0.1;

  if (estado.pontuacao % 100 === 0) {
    estado.velocidade += 0.1;
  }

  for (const obstaculo of estado.obstaculos) {
    obstaculo.x -= estado.velocidade;
    if (!obstaculo.passou && obstaculo.x + obstaculo.largura < dino.x) {
      obstaculo.passou = true;
    }
  }

  estado.obstaculos = estado.obstaculos.filter((obstaculo) => obstaculo.x + obstaculo.largura > 0);

  if (estado.obstaculos.length === 0) {
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

  const caixasDino = obterCaixasDino();
  const colidiu = estado.obstaculos.some((obstaculo) => {
    const caixaObstaculo = obterCaixaObstaculo(obstaculo);
    return caixasDino.some((caixaDino) => sobrepoe(caixaDino, caixaObstaculo));
  });

  if (colidiu) {
    estado.vivo = false;
    recorde = Math.max(recorde, Math.floor(estado.pontuacao));
    localStorage.setItem("dino-recorde", String(recorde));
    localStorage.setItem("dino-best", String(recorde));
    interfaceUsuario.sobreposicao.hidden = false;
    interfaceUsuario.sobreposicao.querySelector("strong").textContent = "Fim de jogo";

    if (deveDesenhar) {
      atualizarInterface();
      desenhar();
    }

    return { estado: obterEstado(), recompensa: -10, finalizado: true };
  }

  if (deveDesenhar) {
    atualizarInterface();
    desenhar();
  }

  return { estado: obterEstado(), recompensa: 1, finalizado: false };
}

function desenharSpriteDino() {
  const dino = estado.dino;
  const sprite = assetAtualDino();
  if (!sprite || !sprite.carregado) return false;

  contexto.save();
  contexto.imageSmoothingEnabled = false;
  contexto.drawImage(sprite.imagem, dino.x, dino.y);
  contexto.restore();
  return true;
}

function desenharDino() {
  if (desenharSpriteDino()) return;
  desenharDinoFallback();
}

function desenharDinoFallback() {
  const dino = estado.dino;
  const pe = Math.floor(estado.tick / 7) % 2;
  const cor = "#535353";

  contexto.save();
  contexto.fillStyle = cor;

  if (dino.abaixado && dino.noChao) {
    const y = configuracao.pistaY - 40;
    contexto.fillRect(dino.x + 8, y + 14, 58, 22);
    contexto.fillRect(dino.x + 48, y + 2, 28, 24);
    contexto.fillRect(dino.x + 72, y + 12, 14, 8);
    contexto.fillRect(dino.x - 8, y + 21, 24, 8);
    contexto.fillRect(dino.x + 2, y + 34, 16, 8);
    contexto.fillRect(dino.x + 42, y + 34, 18, 8);
    contexto.fillStyle = "#f7f7f7";
    contexto.fillRect(dino.x + 67, y + 8, 4, 4);
    contexto.fillStyle = cor;
    contexto.fillRect(dino.x + 74, y + 22, 8, 4);
  } else {
    const x = dino.x;
    const y = dino.y;

    contexto.fillRect(x + 18, y + 18, 33, 42);
    contexto.fillRect(x + 39, y + 2, 35, 30);
    contexto.fillRect(x + 69, y + 14, 12, 8);
    contexto.fillRect(x + 51, y + 31, 9, 9);
    contexto.fillRect(x + 7, y + 31, 15, 9);
    contexto.fillRect(x - 8, y + 38, 16, 8);
    contexto.fillRect(x - 18, y + 45, 12, 7);
    contexto.fillRect(x + 23, y + 58, 9, 17);
    contexto.fillRect(x + 42, y + 58, 9, 17);

    if (dino.noChao) {
      if (pe === 0) {
        contexto.fillRect(x + 18, y + 72, 20, 6);
        contexto.fillRect(x + 42, y + 72, 9, 6);
      } else {
        contexto.fillRect(x + 23, y + 72, 9, 6);
        contexto.fillRect(x + 38, y + 72, 22, 6);
      }
    } else {
      contexto.fillRect(x + 20, y + 70, 13, 6);
      contexto.fillRect(x + 42, y + 70, 13, 6);
    }

    contexto.fillStyle = "#f7f7f7";
    contexto.fillRect(x + 62, y + 9, 4, 4);
    contexto.fillStyle = cor;
    contexto.fillRect(x + 68, y + 26, 9, 4);
    contexto.fillRect(x + 32, y + 36, 12, 5);
  }

  contexto.restore();
}

function desenharObstaculo(obstaculo) {
  let asset = null;

  if (obstaculo.tipo === "cactoPequeno") {
    asset = imagens.cacto.pequeno[obstaculo.variante];
  } else if (obstaculo.tipo === "cactoGrande") {
    asset = imagens.cacto.grande[obstaculo.variante];
  } else if (obstaculo.tipo === "passaro") {
    const quadro = Math.floor(estado.tick / 5) % 2;
    asset = imagens.passaro[quadro];
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
    const batidaAsa = Math.floor(estado.tick / 10) % 2;
    contexto.fillRect(obstaculo.x + 24, obstaculo.y + 24, 44, 18);
    contexto.fillRect(obstaculo.x + 64, obstaculo.y + 18, 18, 10);
    contexto.fillRect(obstaculo.x + 80, obstaculo.y + 22, 10, 5);

    if (batidaAsa === 0) {
      contexto.fillRect(obstaculo.x + 6, obstaculo.y + 8, 34, 12);
      contexto.fillRect(obstaculo.x + 30, obstaculo.y + 40, 30, 10);
    } else {
      contexto.fillRect(obstaculo.x + 8, obstaculo.y + 42, 34, 12);
      contexto.fillRect(obstaculo.x + 30, obstaculo.y + 8, 30, 10);
    }
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

    for (let x = deslocamento + 12; x < deslocamento + configuracao.largura; x += 72) {
      contexto.fillRect(x, configuracao.pistaY + 18, 36, 3);
      contexto.fillRect(x + 44, configuracao.pistaY + 38, 18, 3);
    }
  }
}

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

function desenharHitboxes() {
  contexto.strokeStyle = "red";
  for (const caixa of obterCaixasDino()) {
    contexto.strokeRect(caixa.x, caixa.y, caixa.largura, caixa.altura);
  }

  contexto.strokeStyle = "blue";
  for (const obstaculo of estado.obstaculos) {
    const caixa = obterCaixaObstaculo(obstaculo);
    contexto.strokeRect(caixa.x, caixa.y, caixa.largura, caixa.altura);
  }
}

function desenhar() {
  contexto.clearRect(0, 0, configuracao.largura, configuracao.altura);
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, configuracao.largura, configuracao.altura);

  desenharNuvem();
  desenharPista();

  for (const obstaculo of estado.obstaculos) {
    desenharObstaculo(obstaculo);
  }

  desenharDino();

  if (!estado.vivo) {
    contexto.fillStyle = "rgba(177, 58, 50, 0.12)";
    contexto.fillRect(0, 0, configuracao.largura, configuracao.altura);

    const fimDeJogo = imagens.outros.fimDeJogo;
    if (fimDeJogo && fimDeJogo.carregado) {
      contexto.drawImage(fimDeJogo.imagem, (configuracao.largura - fimDeJogo.largura) / 2, 210);
    }

    desenharHitboxes();
  }
}

function atualizarInterface() {
  interfaceUsuario.pontuacao.textContent = String(Math.floor(estado.pontuacao));
  interfaceUsuario.recorde.textContent = String(recorde);
  interfaceUsuario.velocidade.textContent = estado.velocidade.toFixed(1);
  interfaceUsuario.valorPassosPorQuadro.textContent = interfaceUsuario.passosPorQuadro.value;
  interfaceUsuario.visualizacaoEstado.textContent = JSON.stringify(obterEstado(), null, 2);
}

function acaoManual() {
  if (teclasPressionadas.has("KeyS") || teclasPressionadas.has("ArrowDown")) return acao.abaixar;
  if (teclasPressionadas.has("Space") || teclasPressionadas.has("KeyW") || teclasPressionadas.has("ArrowUp")) return acao.pular;
  return acao.nada;
}

function quadro(tempo) {
  if (!jogoRodando) return;
  if (!ultimoQuadro) ultimoQuadro = tempo;

  const passos = Number(interfaceUsuario.passosPorQuadro.value);

  for (let i = 0; i < passos; i += 1) {
    const entrada = interfaceUsuario.alternarIa.checked && agenteIa ? agenteIa(obterEstado()) : acaoManual();
    const resultado = passo(entrada);

    if (resultado.finalizado) {
      jogoRodando = false;
      break;
    }
  }

  ultimoQuadro = tempo;
  if (jogoRodando) requestAnimationFrame(quadro);
}

function iniciar() {
  if (!estado.vivo) reiniciar();
  if (jogoRodando) return;
  jogoRodando = true;
  interfaceUsuario.sobreposicao.hidden = true;
  requestAnimationFrame(quadro);
}

function pausar() {
  jogoRodando = false;
  interfaceUsuario.sobreposicao.hidden = false;
  interfaceUsuario.sobreposicao.querySelector("strong").textContent = "Pausado";
}

function definirAgente(agente) {
  agenteIa = typeof agente === "function" ? agente : null;
  interfaceUsuario.alternarIa.checked = Boolean(agenteIa);
}

function relu(valor) {
  return Math.max(0, valor);
}

function produtoVetorMatriz(vetor, matriz) {
  return matriz[0].map((_, coluna) => vetor.reduce((soma, valor, linha) => soma + valor * matriz[linha][coluna], 0));
}

function somarVetores(vetorA, vetorB) {
  return vetorA.map((valor, indice) => valor + vetorB[indice]);
}

function codigoTipoObstaculo(tipo) {
  if (tipo === "cactoPequeno") return 0;
  if (tipo === "cactoGrande") return 0.5;
  if (tipo === "passaro") return 1;
  return 0;
}

function montarEntradasNumpy(estadoJogo) {
  return [
    estadoJogo.distanciaObstaculo === null ? 1 : Math.max(0, Math.min(estadoJogo.distanciaObstaculo / configuracao.largura, 1)),
    estadoJogo.larguraObstaculo / 160,
    estadoJogo.alturaObstaculo / 120,
    estadoJogo.obstaculoY / configuracao.altura,
    estadoJogo.velocidade / 12,
    estadoJogo.dinoY / 160,
    estadoJogo.velocidadeVerticalDino / configuracao.velocidadePulo,
    estadoJogo.noChao ? 1 : 0,
    estadoJogo.abaixado ? 1 : 0,
    codigoTipoObstaculo(estadoJogo.tipoObstaculo),
  ];
}

function criarAgenteNumpy(cerebro) {
  return (estadoJogo) => {
    const entradas = montarEntradasNumpy(estadoJogo);
    const camadaOcultaBruta = somarVetores(produtoVetorMatriz(entradas, cerebro.pesosEntradaOculta), cerebro.biasOculta);
    const camadaOculta = camadaOcultaBruta.map(relu);
    const saida = somarVetores(produtoVetorMatriz(camadaOculta, cerebro.pesosOcultaSaida), cerebro.biasSaida);
    let melhorIndice = 0;

    for (let i = 1; i < saida.length; i += 1) {
      if (saida[i] > saida[melhorIndice]) melhorIndice = i;
    }

    return melhorIndice;
  };
}

async function carregarCerebroNumpy(caminho = "cerebro_dino.json") {
  const resposta = await fetch(caminho);
  if (!resposta.ok) throw new Error(`Nao foi possivel carregar ${caminho}`);

  const cerebro = await resposta.json();
  definirAgente(criarAgenteNumpy(cerebro));
  interfaceUsuario.sobreposicao.hidden = false;
  interfaceUsuario.sobreposicao.querySelector("strong").textContent = "IA NumPy carregada";
  return cerebro;
}

function rodarEpisodio(agente, maximoPassos = 5000) {
  reiniciar();
  let recompensaTotal = 0;
  let resultado = { estado: obterEstado(), recompensa: 0, finalizado: false };

  for (let i = 0; i < maximoPassos && !resultado.finalizado; i += 1) {
    const acaoEscolhida = typeof agente === "function" ? agente(obterEstado()) : acao.nada;
    resultado = passo(acaoEscolhida, { desenhar: false });
    recompensaTotal += resultado.recompensa;
  }

  atualizarInterface();
  desenhar();
  return {
    pontuacao: Math.floor(estado.pontuacao),
    recompensaTotal: Number(recompensaTotal.toFixed(4)),
    passos: estado.tick,
    finalizado: resultado.finalizado,
    estado: obterEstado(),
  };
}

document.addEventListener("keydown", (evento) => {
  teclasPressionadas.add(evento.code);
  if (evento.code === "Space") evento.preventDefault();
  if (evento.code === "KeyR") reiniciar();
  if (evento.code === "KeyP") pausar();
  if (evento.code === "KeyU") iniciar();
});

document.addEventListener("keyup", (evento) => {
  teclasPressionadas.delete(evento.code);
});

interfaceUsuario.botaoIniciar.addEventListener("click", iniciar);
interfaceUsuario.botaoPausar.addEventListener("click", pausar);
interfaceUsuario.botaoReiniciar.addEventListener("click", () => {
  jogoRodando = false;
  reiniciar();
});
interfaceUsuario.passosPorQuadro.addEventListener("input", atualizarInterface);

window.DinoEnv = {
  acao,
  reiniciar,
  passo,
  obterEstado,
  iniciar,
  pausar,
  definirAgente,
  carregarCerebroNumpy,
  rodarEpisodio,
};

reiniciar();
