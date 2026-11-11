from __future__ import annotations

from typing import Iterable, List, Optional, Tuple


FILES = "abcdefghi"


class ShogiBoard:
    """A compact shogi board model for move generation and move validation."""

    def __init__(self, position: Optional[dict[str, str]] = None):
        self.grid: List[List[Optional[str]]] = [[None for _ in range(9)] for _ in range(9)]
        if position is None:
            self._setup_initial_position()
        else:
            for square, piece in position.items():
                self.place_piece(square, piece)

    def _setup_initial_position(self) -> None:
        initial = {
            "a1": "black_lance",
            "b1": "black_knight",
            "c1": "black_silver",
            "d1": "black_gold",
            "e1": "black_king",
            "f1": "black_gold",
            "g1": "black_silver",
            "h1": "black_knight",
            "i1": "black_lance",
            "b2": "black_rook",
            "h2": "black_bishop",
            "a3": "black_pawn",
            "b3": "black_pawn",
            "c3": "black_pawn",
            "d3": "black_pawn",
            "e3": "black_pawn",
            "f3": "black_pawn",
            "g3": "black_pawn",
            "h3": "black_pawn",
            "i3": "black_pawn",
            "a7": "white_pawn",
            "b7": "white_pawn",
            "c7": "white_pawn",
            "d7": "white_pawn",
            "e7": "white_pawn",
            "f7": "white_pawn",
            "g7": "white_pawn",
            "h7": "white_pawn",
            "i7": "white_pawn",
            "b8": "white_rook",
            "h8": "white_bishop",
            "a9": "white_lance",
            "b9": "white_knight",
            "c9": "white_silver",
            "d9": "white_gold",
            "e9": "white_king",
            "f9": "white_gold",
            "g9": "white_silver",
            "h9": "white_knight",
            "i9": "white_lance",
        }
        for square, piece in initial.items():
            self.place_piece(square, piece)

    @staticmethod
    def _parse_square(square: str) -> Tuple[int, int]:
        if len(square) < 2:
            raise ValueError(f"Invalid square: {square!r}")
        file_char = square[0].lower()
        rank_char = square[1:]
        if file_char not in FILES or not rank_char.isdigit():
            raise ValueError(f"Invalid square: {square!r}")
        col = FILES.index(file_char)
        rank = int(rank_char) - 1
        if not (0 <= col < 9 and 0 <= rank < 9):
            raise ValueError(f"Square out of bounds: {square!r}")
        return rank, col

    @staticmethod
    def _square_name(row: int, col: int) -> str:
        return f"{FILES[col]}{row + 1}"

    def piece_at(self, square: str) -> Optional[str]:
        row, col = self._parse_square(square)
        return self.grid[row][col]

    def place_piece(self, square: str, piece: str) -> None:
        row, col = self._parse_square(square)
        self.grid[row][col] = piece

    def remove_piece(self, square: str) -> Optional[str]:
        row, col = self._parse_square(square)
        piece = self.grid[row][col]
        self.grid[row][col] = None
        return piece

    @staticmethod
    def _side_of(piece: Optional[str]) -> Optional[str]:
        if piece is None:
            return None
        return piece.split("_", 1)[0]

    def _is_occupied_by_enemy(self, square: str, moving_side: str) -> bool:
        piece = self.piece_at(square)
        if piece is None:
            return False
        return self._side_of(piece) != moving_side

    def _can_move_to(self, square: str, moving_side: str) -> bool:
        piece = self.piece_at(square)
        if piece is None:
            return True
        return self._side_of(piece) != moving_side

    def _step(self, row: int, col: int, dr: int, dc: int) -> Optional[str]:
        nr = row + dr
        nc = col + dc
        if not (0 <= nr < 9 and 0 <= nc < 9):
            return None
        return self._square_name(nr, nc)

    def _ray_steps(self, square: str, directions: Iterable[Tuple[int, int]], moving_side: str) -> List[str]:
        row, col = self._parse_square(square)
        moves: List[str] = []
        for dr, dc in directions:
            nr, nc = row + dr, col + dc
            while 0 <= nr < 9 and 0 <= nc < 9:
                target = self._square_name(nr, nc)
                occupant = self.piece_at(target)
                if occupant is None:
                    moves.append(target)
                elif self._side_of(occupant) != moving_side:
                    moves.append(target)
                    break
                else:
                    break
                nr += dr
                nc += dc
        return moves

    def legal_moves_from(self, square: str) -> List[str]:
        piece = self.piece_at(square)
        if piece is None:
            return []
        side, piece_type = piece.split("_", 1)
        row, col = self._parse_square(square)
        moves: List[str] = []

        if piece_type == "pawn":
            dr = 1 if side == "black" else -1
            target = self._step(row, col, dr, 0)
            if target and self._can_move_to(target, side):
                moves.append(target)
            return moves

        if piece_type == "lance":
            dr = 1 if side == "black" else -1
            nr, nc = row + dr, col
            while 0 <= nr < 9:
                target = self._square_name(nr, nc)
                occupant = self.piece_at(target)
                if occupant is None:
                    moves.append(target)
                elif self._side_of(occupant) != side:
                    moves.append(target)
                    break
                else:
                    break
                nr += dr
            return moves

        if piece_type == "knight":
            dr = 2 if side == "black" else -2
            for dc in (-1, 1):
                target = self._step(row, col, dr, dc)
                if target and self._can_move_to(target, side):
                    moves.append(target)
            return moves

        if piece_type == "silver":
            directions = [
                (1, 0),
                (-1, 0),
                (1, -1),
                (1, 1),
                (-1, -1),
                (-1, 1),
            ]
            if side == "black":
                directions = [(1, 0), (1, -1), (1, 1), (-1, -1), (-1, 1)]
            else:
                directions = [(-1, 0), (-1, -1), (-1, 1), (1, -1), (1, 1)]
            for dr, dc in directions:
                target = self._step(row, col, dr, dc)
                if target and self._can_move_to(target, side):
                    moves.append(target)
            return moves

        if piece_type == "gold":
            directions = [
                (1, 0),
                (-1, 0),
                (0, -1),
                (0, 1),
                (1, -1),
                (1, 1),
            ]
            if side == "black":
                directions = [(1, 0), (1, -1), (1, 1), (0, -1), (0, 1), (-1, 0)]
            else:
                directions = [(-1, 0), (-1, -1), (-1, 1), (0, -1), (0, 1), (1, 0)]
            for dr, dc in directions:
                target = self._step(row, col, dr, dc)
                if target and self._can_move_to(target, side):
                    moves.append(target)
            return moves

        if piece_type == "king":
            directions = [
                (1, 0),
                (-1, 0),
                (0, -1),
                (0, 1),
                (1, -1),
                (1, 1),
                (-1, -1),
                (-1, 1),
            ]
            for dr, dc in directions:
                target = self._step(row, col, dr, dc)
                if target and self._can_move_to(target, side):
                    moves.append(target)
            return moves

        if piece_type == "rook":
            directions = [(1, 0), (-1, 0), (0, -1), (0, 1)]
            return self._ray_steps(square, directions, side)

        if piece_type == "bishop":
            directions = [(1, 1), (1, -1), (-1, 1), (-1, -1)]
            return self._ray_steps(square, directions, side)

        return []

    def move_piece(self, from_square: str, to_square: str) -> str:
        if self.piece_at(from_square) is None:
            raise ValueError(f"No piece at {from_square!r}")

        legal_moves = self.legal_moves_from(from_square)
        if to_square not in legal_moves:
            raise ValueError(f"Illegal move from {from_square} to {to_square}")

        piece = self.remove_piece(from_square)
        self.place_piece(to_square, piece)
        return piece
