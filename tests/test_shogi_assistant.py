from shogi_assistant import ShogiBoard


def test_initial_board_has_pawns_in_expected_positions():
    board = ShogiBoard()

    assert board.piece_at("e3") == "black_pawn"
    assert board.piece_at("e7") == "white_pawn"


def test_pawn_can_move_forward_one_square():
    board = ShogiBoard()

    assert board.legal_moves_from("e3") == ["e4"]


def test_piece_can_move_and_board_updates():
    board = ShogiBoard()

    board.move_piece("e3", "e4")

    assert board.piece_at("e3") is None
    assert board.piece_at("e4") == "black_pawn"


def test_rook_can_move_in_straight_lines():
    board = ShogiBoard()
    board.place_piece("d5", "black_rook")

    assert "d6" in board.legal_moves_from("d5")
    assert "d7" in board.legal_moves_from("d5")
    assert "a5" in board.legal_moves_from("d5")
