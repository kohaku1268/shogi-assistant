# shogi-assistant

A lightweight Shogi board and move helper built in Python.

## Features

- Basic 9x9 board model
- Standard starting setup for both sides
- Move generation for pawns, rooks, bishops, knights, lances, silver, gold, and king
- Move validation and simple board updates

## Quick start

```bash
python -m shogi_assistant
```

## Example

```python
from shogi_assistant import ShogiBoard

board = ShogiBoard()
print(board.piece_at("e3"))
print(board.legal_moves_from("e3"))
```

This project is intentionally compact and suitable as a foundation for a more advanced Shogi UI or analysis tool.
