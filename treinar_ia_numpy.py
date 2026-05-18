"""
Treinador de IA para o Dino Runner usando NumPy + algoritmo genetico.

O arquivo usa nomes em portugues com camelCase para ficar parecido com o
restante do projeto. Ele gera um JSON chamado cerebro_dino.json, que pode ser
carregado no jogo com:

    await DinoEnv.carregarCerebroNumpy("cerebro_dino.json")
    DinoEnv.iniciar()
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path

import numpy as np


# =========================
# CONFIGURACOES DO TREINO
# =========================

quantidadeEntradas = 10
quantidadeNeuroniosOcultos = 12
quantidadeSaidas = 3
tamanhoPopulacao = 80
quantidadeElite = 8
quantidadeGeracoes = 80
taxaMutacao = 0.08
forcaMutacao = 0.35
maximoPassos = 7000
arquivoSaida = Path("cerebro_dino.json")


# =========================
# CONFIGURACOES DO JOGO
# =========================

larguraJogo = 1100
dinoX = 80
dinoCorrendoY = 310
dinoAbaixadoY = 340
velocidadePuloInicial = 6.0
decaimentoPulo = 0.1
velocidadeBase = 3.0
larguraDinoEmPe = 88
alturaDinoEmPe = 94
larguraDinoAbaixado = 118
alturaDinoAbaixado = 60


class RedeNeural:
    """Rede neural pequena com uma camada oculta.

    Ela recebe o estado normalizado do jogo e devolve uma acao:
    0 = nada, 1 = pular, 2 = abaixar.
    """

    def __init__(self) -> None:
        # Pesos entre a entrada e a camada oculta.
        self.pesosEntradaOculta = np.random.randn(quantidadeEntradas, quantidadeNeuroniosOcultos) * 0.7

        # Bias da camada oculta.
        self.biasOculta = np.random.randn(quantidadeNeuroniosOcultos) * 0.2

        # Pesos entre a camada oculta e a saida.
        self.pesosOcultaSaida = np.random.randn(quantidadeNeuroniosOcultos, quantidadeSaidas) * 0.7

        # Bias da camada de saida.
        self.biasSaida = np.random.randn(quantidadeSaidas) * 0.2

    def prever(self, entradas: list[float]) -> int:
        """Calcula a acao escolhida pela rede."""

        vetorEntradas = np.array(entradas, dtype=float)

        camadaOculta = np.dot(vetorEntradas, self.pesosEntradaOculta) + self.biasOculta
        camadaOculta = np.maximum(0, camadaOculta)

        saida = np.dot(camadaOculta, self.pesosOcultaSaida) + self.biasSaida
        return int(np.argmax(saida))

    def copiar(self) -> "RedeNeural":
        """Cria uma copia independente da rede."""

        copia = RedeNeural()
        copia.pesosEntradaOculta = self.pesosEntradaOculta.copy()
        copia.biasOculta = self.biasOculta.copy()
        copia.pesosOcultaSaida = self.pesosOcultaSaida.copy()
        copia.biasSaida = self.biasSaida.copy()
        return copia

    def paraJson(self, pontuacao: int) -> dict:
        """Converte a rede para um dicionario que pode ser salvo em JSON."""

        return {
            "formato": "cerebro-dino-numpy-v1",
            "pontuacao": pontuacao,
            "quantidadeEntradas": quantidadeEntradas,
            "quantidadeNeuroniosOcultos": quantidadeNeuroniosOcultos,
            "quantidadeSaidas": quantidadeSaidas,
            "pesosEntradaOculta": self.pesosEntradaOculta.tolist(),
            "biasOculta": self.biasOculta.tolist(),
            "pesosOcultaSaida": self.pesosOcultaSaida.tolist(),
            "biasSaida": self.biasSaida.tolist(),
            "ordemEntradas": [
                "distanciaObstaculo / 1100",
                "larguraObstaculo / 160",
                "alturaObstaculo / 120",
                "obstaculoY / 600",
                "velocidade / 12",
                "dinoY / 160",
                "velocidadeVerticalDino / 6",
                "noChao",
                "abaixado",
                "codigoTipoObstaculo",
            ],
        }


@dataclass
class DinoSimulado:
    """Estado fisico do dinossauro durante o treino."""

    y: float = dinoCorrendoY
    velocidadePulo: float = velocidadePuloInicial
    noChao: bool = True
    abaixado: bool = False
    pulando: bool = False

    @property
    def largura(self) -> int:
        return larguraDinoAbaixado if self.abaixado and self.noChao else larguraDinoEmPe

    @property
    def altura(self) -> int:
        return alturaDinoAbaixado if self.abaixado and self.noChao else alturaDinoEmPe


@dataclass
class ObstaculoSimulado:
    """Obstaculo usado na simulacao do treino."""

    tipo: str
    x: float
    y: float
    largura: int
    altura: int


def criarObstaculo() -> ObstaculoSimulado:
    """Cria cactos e passaros parecidos com os do jogo."""

    tipoObstaculo = random.randint(0, 2)

    if tipoObstaculo == 0:
        variante = random.randint(0, 2)
        return ObstaculoSimulado("cactoPequeno", larguraJogo, 325, [34, 68, 102][variante], 70)

    if tipoObstaculo == 1:
        variante = random.randint(0, 2)
        return ObstaculoSimulado("cactoGrande", larguraJogo, 300, [50, 100, 150][variante], 95)

    return ObstaculoSimulado("passaro", larguraJogo, random.choice([250, 290, 320]), 92, 65)


def codigoTipoObstaculo(tipo: str) -> float:
    """Transforma o tipo textual do obstaculo em numero para a rede."""

    if tipo == "cactoPequeno":
        return 0.0
    if tipo == "cactoGrande":
        return 0.5
    return 1.0


def montarEntradas(dino: DinoSimulado, obstaculo: ObstaculoSimulado | None, velocidade: float) -> list[float]:
    """Monta as 10 entradas normalizadas da rede neural."""

    if obstaculo is None:
        distancia = larguraJogo
        larguraObstaculo = 0
        alturaObstaculo = 0
        obstaculoY = 0
        tipoCodigo = 0
    else:
        distancia = obstaculo.x - dinoX
        larguraObstaculo = obstaculo.largura
        alturaObstaculo = obstaculo.altura
        obstaculoY = obstaculo.y
        tipoCodigo = codigoTipoObstaculo(obstaculo.tipo)

    return [
        max(0.0, min(distancia / larguraJogo, 1.0)),
        larguraObstaculo / 160,
        alturaObstaculo / 120,
        obstaculoY / 600,
        velocidade / 12,
        (dinoCorrendoY - dino.y) / 160,
        dino.velocidadePulo / velocidadePuloInicial,
        1.0 if dino.noChao else 0.0,
        1.0 if dino.abaixado else 0.0,
        tipoCodigo,
    ]


def aplicarAcao(dino: DinoSimulado, acaoEscolhida: int) -> None:
    """Aplica a acao 0, 1 ou 2 no dino simulado."""

    if acaoEscolhida == 1 and not dino.pulando:
        dino.abaixado = False
        dino.pulando = True
        dino.noChao = False
    elif acaoEscolhida == 2 and not dino.pulando:
        dino.abaixado = True
        dino.noChao = True
    elif not dino.pulando:
        dino.abaixado = False
        dino.noChao = True


def atualizarDino(dino: DinoSimulado) -> None:
    """Atualiza a posicao vertical e a velocidade do pulo."""

    if dino.abaixado and dino.noChao:
        dino.y = dinoAbaixadoY
    elif dino.noChao:
        dino.y = dinoCorrendoY

    if dino.pulando:
        dino.y -= dino.velocidadePulo
        dino.velocidadePulo -= decaimentoPulo

        if dino.velocidadePulo < -velocidadePuloInicial:
            dino.pulando = False
            dino.noChao = True
            dino.velocidadePulo = velocidadePuloInicial
            dino.y = dinoCorrendoY


def caixasSobrepostas(caixaA: tuple[float, float, float, float], caixaB: tuple[float, float, float, float]) -> bool:
    """Verifica se dois retangulos se encostam."""

    ax, ay, larguraA, alturaA = caixaA
    bx, by, larguraB, alturaB = caixaB
    return ax < bx + larguraB and ax + larguraA > bx and ay < by + alturaB and ay + alturaA > by


def obterCaixasDino(dino: DinoSimulado) -> list[tuple[float, float, float, float]]:
    """Retorna hitboxes segmentadas do dino, iguais ao jogo visual.

    Antes o treino usava uma unica caixa grande envolvendo o corpo inteiro.
    Isso deixava o Python mais "injusto", porque partes transparentes do sprite
    tambem contavam como colisao. Agora usamos caixas menores para cabeca, corpo
    e perna, como em game.js.
    """

    if dino.abaixado:
        return [
            # Corpo/cabeca do dino abaixado.
            (dinoX + 18, dino.y + 18, 70, 25),
            # Parte inferior do dino abaixado.
            (dinoX + 28, dino.y + 40, 45, 12),
        ]

    return [
        # Cabeca.
        (dinoX + 45, dino.y + 8, 39, 28),
        # Corpo.
        (dinoX + 5, dino.y + 30, 62, 38),
        # Pernas.
        (dinoX + 22, dino.y + 68, 30, 21),
    ]


def obterCaixaObstaculo(obstaculo: ObstaculoSimulado) -> tuple[float, float, float, float]:
    """Retorna a hitbox do obstaculo com margens iguais ao game.js."""

    if obstaculo.tipo == "passaro":
        return (
            obstaculo.x + 10,
            obstaculo.y + 10,
            obstaculo.largura - 20,
            obstaculo.altura - 20,
        )

    return (
        obstaculo.x + 8,
        obstaculo.y + 5,
        obstaculo.largura - 16,
        obstaculo.altura - 10,
    )


def colidiu(dino: DinoSimulado, obstaculo: ObstaculoSimulado) -> bool:
    """Verifica colisao entre o dino simulado e um obstaculo."""

    caixaObstaculo = obterCaixaObstaculo(obstaculo)
    return any(caixasSobrepostas(caixaDino, caixaObstaculo) for caixaDino in obterCaixasDino(dino))


def jogarPartida(rede: RedeNeural) -> int:
    """Faz uma rede jogar uma partida simulada e retorna a pontuacao."""

    dino = DinoSimulado()
    obstaculos: list[ObstaculoSimulado] = []
    velocidade = velocidadeBase
    pontuacao = 0

    for _passo in range(maximoPassos):
        proximoObstaculo = next((obstaculo for obstaculo in obstaculos if obstaculo.x + obstaculo.largura >= dinoX), None)
        entradas = montarEntradas(dino, proximoObstaculo, velocidade)
        acaoEscolhida = rede.prever(entradas)

        aplicarAcao(dino, acaoEscolhida)
        atualizarDino(dino)

        for obstaculo in obstaculos:
            obstaculo.x -= velocidade

        obstaculos = [obstaculo for obstaculo in obstaculos if obstaculo.x + obstaculo.largura > 0]

        if not obstaculos:
            obstaculos.append(criarObstaculo())
        elif obstaculos[-1].x < larguraJogo - random.randint(420, 720):
            obstaculos.append(criarObstaculo())

        if any(colidiu(dino, obstaculo) for obstaculo in obstaculos):
            return pontuacao

        pontuacao += 1
        velocidade += 0.00045

    return pontuacao


def cruzar(paiA: RedeNeural, paiB: RedeNeural) -> RedeNeural:
    """Mistura pesos de dois pais para criar uma rede filha."""

    filho = RedeNeural()

    for atributo in ["pesosEntradaOculta", "biasOculta", "pesosOcultaSaida", "biasSaida"]:
        valoresA = getattr(paiA, atributo)
        valoresB = getattr(paiB, atributo)
        mascara = np.random.rand(*valoresA.shape) < 0.5
        setattr(filho, atributo, np.where(mascara, valoresA, valoresB))

    return filho


def sofrerMutacao(rede: RedeNeural) -> None:
    """Altera alguns pesos aleatoriamente."""

    for atributo in ["pesosEntradaOculta", "biasOculta", "pesosOcultaSaida", "biasSaida"]:
        pesos = getattr(rede, atributo)
        mascaraMutacao = np.random.rand(*pesos.shape) < taxaMutacao
        alteracaoAleatoria = np.random.randn(*pesos.shape) * forcaMutacao
        setattr(rede, atributo, pesos + mascaraMutacao * alteracaoAleatoria)


def escolherPai(ranqueados: list[tuple[RedeNeural, int]]) -> RedeNeural:
    """Escolhe um pai por torneio entre os melhores."""

    candidatos = random.sample(ranqueados[: max(quantidadeElite * 3, 3)], 3)
    candidatos.sort(key=lambda item: item[1], reverse=True)
    return candidatos[0][0]


def proximaGeracao(populacao: list[RedeNeural], pontuacoes: list[int]) -> list[RedeNeural]:
    """Cria a proxima geracao usando elitismo, crossover e mutacao."""

    ranqueados = list(zip(populacao, pontuacoes))
    ranqueados.sort(key=lambda item: item[1], reverse=True)

    novaPopulacao: list[RedeNeural] = []

    for rede, _pontuacao in ranqueados[:quantidadeElite]:
        novaPopulacao.append(rede.copiar())

    while len(novaPopulacao) < tamanhoPopulacao:
        paiA = escolherPai(ranqueados)
        paiB = escolherPai(ranqueados)
        filho = cruzar(paiA, paiB)
        sofrerMutacao(filho)
        novaPopulacao.append(filho)

    return novaPopulacao


def salvarCerebro(rede: RedeNeural, pontuacao: int) -> None:
    """Salva o melhor cerebro em JSON."""

    arquivoSaida.write_text(json.dumps(rede.paraJson(pontuacao), indent=2), encoding="utf-8")


def treinar() -> RedeNeural:
    """Executa o treinamento completo."""

    populacao = [RedeNeural() for _ in range(tamanhoPopulacao)]
    melhorRede = populacao[0].copiar()
    melhorPontuacaoHistorica = 0

    for geracao in range(1, quantidadeGeracoes + 1):
        pontuacoes = [jogarPartida(rede) for rede in populacao]
        melhorPontuacao = max(pontuacoes)
        mediaPontuacao = sum(pontuacoes) / len(pontuacoes)
        indiceMelhor = pontuacoes.index(melhorPontuacao)

        if melhorPontuacao > melhorPontuacaoHistorica:
            melhorPontuacaoHistorica = melhorPontuacao
            melhorRede = populacao[indiceMelhor].copiar()
            salvarCerebro(melhorRede, melhorPontuacaoHistorica)

        print(
            f"Geracao {geracao:03d} | "
            f"melhor: {melhorPontuacao:5d} | "
            f"media: {mediaPontuacao:7.2f} | "
            f"recorde: {melhorPontuacaoHistorica:5d}"
        )

        populacao = proximaGeracao(populacao, pontuacoes)

    salvarCerebro(melhorRede, melhorPontuacaoHistorica)
    return melhorRede


if __name__ == "__main__":
    random.seed()
    np.random.seed()

    treinar()
    print(f"\nMelhor cerebro salvo em: {arquivoSaida.resolve()}")
