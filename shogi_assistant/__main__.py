from .board import ShogiBoard


def main() -> None:
    board = ShogiBoard()
    print(board.piece_at("e3"))
    print(board.legal_moves_from("e3"))


if __name__ == "__main__":
    main()
