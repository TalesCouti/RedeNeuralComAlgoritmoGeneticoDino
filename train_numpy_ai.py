"""
Treinador de IA para o Dino Runner usando NumPy + algoritmo genetico.

Este arquivo NAO usa TensorFlow. A ideia e deixar tudo mais visivel:
- cada individuo e uma pequena rede neural;
- o algoritmo genetico escolhe os melhores individuos;
- crossover mistura pesos de dois pais;
- mutacao altera alguns pesos aleatoriamente;
- no final, os pesos da melhor rede sao salvos em dino_brain.json.

Depois de treinar, abra o jogo e chame no console do navegador:

    await DinoEnv.loadNumpyBrain("dino_brain.json")
    DinoEnv.play()

Importante:
Para carregar o JSON no navegador com fetch(), e melhor abrir o jogo por servidor local:

    python -m http.server 8000

Depois acesse:

    http://127.0.0.1:8000/index.html
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

# Quantidade de entradas da rede neural.
# Estas entradas precisam bater com a funcao build_inputs() no Python
# e com a funcao buildNumpyInputs() no game.js.
inputs = 10

# Quantidade de neuronios na camada escondida.
# Para esse jogo, uma rede pequena ja costuma ser suficiente.
neuronios = 12

# Quantidade de acoes possiveis:
# 0 = nada
# 1 = pular
# 2 = abaixar
outputs = 3

# Quantidade de redes/dinossauros avaliados por geracao.
tamanhoPopulacao = 80

# Quantas redes boas passam diretamente para a proxima geracao.
ELITE_COUNT = 8

# Quantas geracoes serao treinadas.
geracoes = 80

# Chance de cada peso sofrer mutacao.
# 0.10 = 10%.
velocidadeMutacao = 0.10

# Intensidade da mutacao.
# Quanto maior, mais forte e aleatoria fica a alteracao dos pesos.
aleatoriedadeMutacao = 0.4

# Limite de passos de uma partida simulada.
# Evita que uma rede boa rode para sempre durante o treino.
distanciaMaxima = 10000000

# Onde o melhor cerebro sera salvo.
arquivoSalvo = Path("melhor_dino.json")


# =========================
# CONFIGURACOES DO JOGO
# =========================

# Estes valores aproximam a logica do seu game.js.
GAME_WIDTH = 1100
DINO_X = 80
DINO_RUN_Y = 310
DINO_DUCK_Y = 340
JUMP_VELOCITY = 6.0
JUMP_DECAY = 0.1
BASE_SPEED = 3.0

# Tamanhos aproximados dos sprites/colisoes.
DINO_STAND_WIDTH = 88
DINO_STAND_HEIGHT = 94
DINO_DUCK_WIDTH = 118
DINO_DUCK_HEIGHT = 60


# =========================
# REDE NEURAL
# =========================


class NeuralNetwork:
    """Rede neural pequena com 1 camada escondida.

    A rede recebe os dados do jogo, calcula alguns valores internos
    e devolve uma das 3 acoes possiveis.
    """

    def __init__(self) -> None:
        # Peso entre entrada e camada escondida.
        # Formato: inputs x neuronios.
        self.w1 = np.random.randn(inputs, neuronios) * 0.7

        # Bias da camada escondida.
        # Bias e um valor extra somado aos neuronios.
        self.b1 = np.random.randn(neuronios) * 0.2

        # Peso entre camada escondida e saida.
        # Formato: neuronios x outputs.
        self.w2 = np.random.randn(neuronios, outputs) * 0.7

        # Bias da camada de saida.
        self.b2 = np.random.randn(outputs) * 0.2

    def predict(self, inputs: list[float]) -> int:
        """Recebe o estado normalizado do jogo e retorna uma acao."""

        # Converte a lista Python em array NumPy.
        x = np.array(inputs, dtype=float)

        # Calcula a camada escondida:
        # entradas * pesos + bias.
        hidden = np.dot(x, self.w1) + self.b1

        # ReLU: valores negativos viram 0, positivos continuam.
        hidden = np.maximum(0, hidden)

        # Calcula a camada de saida.
        output = np.dot(hidden, self.w2) + self.b2

        # Escolhe a saida com maior valor.
        return int(np.argmax(output))

    def copy(self) -> "NeuralNetwork":
        """Cria uma copia independente da rede."""

        clone = NeuralNetwork()
        clone.w1 = self.w1.copy()
        clone.b1 = self.b1.copy()
        clone.w2 = self.w2.copy()
        clone.b2 = self.b2.copy()
        return clone

    def to_json_data(self, score: int) -> dict:
        """Converte os pesos para listas normais, que podem virar JSON."""

        return {
            "format": "numpy-dino-brain-v1",
            "score": score,
            "inputs": inputs,
            "hidden": neuronios,
            "outputs": outputs,
            "w1": self.w1.tolist(),
            "b1": self.b1.tolist(),
            "w2": self.w2.tolist(),
            "b2": self.b2.tolist(),
            "input_order": [
                "obstacleDistance / 1100",
                "obstacleWidth / 160",
                "obstacleHeight / 120",
                "obstacleY / 600",
                "speed / 12",
                "dinoY / 160",
                "dinoVelocityY / 6",
                "grounded",
                "ducking",
                "obstacleTypeCode",
            ],
        }


# =========================
# ESTADO SIMULADO DO JOGO
# =========================


@dataclass
class Dino:
    """Guarda a fisica atual do dinossauro durante uma partida simulada."""

    y: float = DINO_RUN_Y
    jump_vel: float = JUMP_VELOCITY
    grounded: bool = True
    ducking: bool = False
    jumping: bool = False

    @property
    def width(self) -> int:
        return DINO_DUCK_WIDTH if self.ducking and self.grounded else DINO_STAND_WIDTH

    @property
    def height(self) -> int:
        return DINO_DUCK_HEIGHT if self.ducking and self.grounded else DINO_STAND_HEIGHT


@dataclass
class Obstacle:
    """Representa um obstaculo aproximado do jogo."""

    kind: str
    x: float
    y: float
    width: int
    height: int


def create_obstacle() -> Obstacle:
    """Cria obstaculos parecidos com os do game.js."""

    obstacle_type = random.randint(0, 2)

    if obstacle_type == 0:
        # Cacto pequeno.
        variant = random.randint(0, 2)
        return Obstacle(
            kind="smallCactus",
            x=GAME_WIDTH,
            y=325,
            width=[34, 68, 102][variant],
            height=70,
        )

    if obstacle_type == 1:
        # Cacto grande.
        variant = random.randint(0, 2)
        return Obstacle(
            kind="largeCactus",
            x=GAME_WIDTH,
            y=300,
            width=[50, 100, 150][variant],
            height=95,
        )

    # Passaro. Alguns passaros exigem abaixar, outros pular ou ignorar.
    return Obstacle(
        kind="bird",
        x=GAME_WIDTH,
        y=random.choice([250, 290, 320]),
        width=92,
        height=65,
    )


def obstacle_type_code(kind: str) -> float:
    """Transforma texto do obstaculo em numero para a rede."""

    if kind == "smallCactus":
        return 0.0
    if kind == "largeCactus":
        return 0.5
    return 1.0


def build_inputs(dino: Dino, obstacle: Obstacle | None, speed: float) -> list[float]:
    """Monta as entradas normalizadas da rede.

    Normalizar significa transformar valores grandes em valores menores.
    Isso ajuda a rede a trabalhar melhor.
    """

    if obstacle is None:
        distance = GAME_WIDTH
        width = 0
        height = 0
        obstacle_y = 0
        kind_code = 0
    else:
        distance = obstacle.x - DINO_X
        width = obstacle.width
        height = obstacle.height
        obstacle_y = obstacle.y
        kind_code = obstacle_type_code(obstacle.kind)

    return [
        max(0.0, min(distance / GAME_WIDTH, 1.0)),
        width / 160,
        height / 120,
        obstacle_y / 600,
        speed / 12,
        (DINO_RUN_Y - dino.y) / 160,
        dino.jump_vel / JUMP_VELOCITY,
        1.0 if dino.terrestre else 0.0,
        1.0 if dino.abaixado else 0.0,
        kind_code,
    ]


def apply_action(dino: Dino, action: int) -> None:
    """Aplica a acao escolhida pela rede no dinossauro."""

    if action == 1 and not dino.pulando:
        # Pular.
        dino.abaixado = False
        dino.pulando = True
        dino.terrestre = False

    elif action == 2 and not dino.pulando:
        # Abaixar.
        dino.abaixado = True
        dino.terrestre = True

    elif not dino.pulando:
        # Nao fazer nada.
        dino.abaixado = False
        dino.terrestre = True


def update_dino(dino: Dino) -> None:
    """Atualiza posicao vertical do dino, principalmente durante o pulo."""

    if dino.abaixado and dino.terrestre:
        dino.y = DINO_DUCK_Y

    elif dino.terrestre:
        dino.y = DINO_RUN_Y

    if dino.pulando:
        dino.y -= dino.velocidadePulo
        dino.velocidadePulo -= JUMP_DECAY

        # Quando a velocidade fica muito negativa, o dino terminou o arco do pulo.
        if dino.jump_vel < -JUMP_VELOCITY:
            dino.pulando = False
            dino.terrestre = True
            dino.velocidadePulo = JUMP_VELOCITY
            dino.y = DINO_RUN_Y


def boxes_overlap(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
    """Testa colisao entre dois retangulos."""

    ax, ay, aw, ah = a
    bx, by, bw, bh = b
    return ax < bx + bw and ax + aw > bx and ay < by + bh and ay + ah > by


def has_collision(dino: Dino, obstacle: Obstacle) -> bool:
    """Verifica se o dino bateu no obstaculo."""

    dino_box = (DINO_X + 4, dino.y + 4, dino.width - 4, dino.height - 4)
    obstacle_box = (obstacle.x, obstacle.y, obstacle.width, obstacle.height)
    return boxes_overlap(dino_box, obstacle_box)


def play_game(network: NeuralNetwork) -> int:
    """Faz uma rede jogar uma partida simulada e devolve o score."""

    dino = Dino()
    obstacles: list[Obstacle] = []
    speed = velocidadeBase
    score = 0

    for step in range(distanciaMaxima):
        # Pega o obstaculo que esta na frente do dino.
        next_obstacle = next((obs for obs in obstaculos if obs.x + obs.width >= DINO_X), None)

        # Monta as entradas, pede a decisao da rede e aplica no jogo.
        inputs = build_inputs(dino, next_obstacle, speed)
        action = network.predict(inputs)
        apply_action(dino, action)
        update_dino(dino)

        # Move os obstaculos para a esquerda.
        for obstaculos in obstaculos:
            obstaculos.x -= speed

        # Remove obstaculos que ja sairam da tela.
        obstaculos = [obs for obs in obstaculos if obs.x + obs.width > 0]

        # Cria o primeiro obstaculo, ou cria um novo quando o ultimo ja avancou.
        if not obstaculos:
            obstaculos.append(create_obstacle())
        elif obstaculos[-1].x < GAME_WIDTH - random.randint(420, 720):
            obstaculos.append(create_obstacle())

        # Se colidir, a partida acaba.
        if any(has_collision(dino, obstacle) for obstacle in obstacles):
            return score

        score += 1
        speed += 0.00045

    return score


# =========================
# ALGORITMO GENETICO
# =========================


def crossover(parent_a: NeuralNetwork, parent_b: NeuralNetwork) -> NeuralNetwork:
    """Mistura pesos de dois pais para criar um filho."""

    child = NeuralNetwork()

    for attr in ["w1", "b1", "w2", "b2"]:
        a = getattr(parent_a, attr)
        b = getattr(parent_b, attr)

        # Mascara True/False do mesmo tamanho dos pesos.
        # True pega do pai A, False pega do pai B.
        mask = np.random.rand(*a.shape) < 0.5
        mixed = np.where(mask, a, b)

        setattr(child, attr, mixed)

    return child


def mutate(network: NeuralNetwork) -> None:
    """Altera aleatoriamente alguns pesos da rede."""

    for attr in ["w1", "b1", "w2", "b2"]:
        weights = getattr(network, attr)

        # Decide quais posicoes vao mudar.
        mascaraDeMutacao = np.random.rand(*weights.shape) < velocidadeMutacao

        # Gera mudancas pequenas.
        mutacaoAleatoria = np.random.randn(*weights.shape) * aleatoriedadeMutacao

        # Aplica mudanca so onde mutation_mask for True.
        peso = peso + mascaraDeMutacao * mutacaoAleatoria

        setattr(network, attr, weights)


def choose_parent(ranked: list[tuple[NeuralNetwork, int]]) -> NeuralNetwork:
    """Escolhe um pai entre os melhores usando torneio simples."""

    # O torneio evita escolher sempre o mesmo pai.
    concorrentes = random.sample(ranked[: max(ELITE_COUNT * 3, 3)], 3)
    concorrentes.sort(key=lambda item: item[1], reverse=True)
    return concorrentes[0][0]


def next_generation(population: list[NeuralNetwork], scores: list[int]) -> list[NeuralNetwork]:
    """Cria a proxima geracao a partir da pontuacao atual."""

    ranked = list(zip(population, scores))
    ranked.sort(key=lambda item: item[1], reverse=True)

    new_population: list[NeuralNetwork] = []

    # Elitismo: os melhores passam copiados para a proxima geracao.
    for network, _score in ranked[:ELITE_COUNT]:
        new_population.append(network.copy())

    # O resto da populacao nasce por crossover + mutacao.
    while len(new_population) < tamanhoPopulacao:
        parent_a = choose_parent(ranked)
        parent_b = choose_parent(ranked)

        child = crossover(parent_a, parent_b)
        mutate(child)

        new_population.append(child)

    return new_population


def salvarDino(network: NeuralNetwork, score: int) -> None:
    """Salva a melhor rede em JSON para o JavaScript carregar."""

    data = network.to_json_data(score)
    arquivoSalvo.write_text(json.dumps(data, indent=2), encoding="utf-8")


def train() -> NeuralNetwork:
    """Loop principal de treinamento."""

    populacao = [NeuralNetwork() for _ in range(tamanhoPopulacao)]
    melhorRede = populacao[0].copy()
    melhorRecordeTotal = 0

    for geracao in range(1, geracoes + 1):
        scores = [play_game(network) for network in populacao]

        best_score = max(scores)
        recordeMedio = sum(scores) / len(scores)
        best_index = scores.index(best_score)

        if best_score > melhorRecordeTotal:
            melhorRecordeTotal = best_score
            melhorRede = populacao[best_index].copy()
            salvarDino(melhorRede, melhorRecordeTotal)

        print(
            f"Geracao {geracao:03d} | "
            f"melhor: {melhorRecorde:5d} | "
            f"media: {recordeMedio:7.2f} | "
            f"recorde: {melhorRecordeTotal:5d}"
        )

        populacao = next_generation(populacao, scores)

    salvarDino(melhorRede, melhorRecordeTotal)
    return melhorRede


if __name__ == "__main__":
    random.seed()
    np.random.seed()

    train()
    print(f"\nMelhor cerebro salvo em: {arquivoSalvo.resolve()}")
