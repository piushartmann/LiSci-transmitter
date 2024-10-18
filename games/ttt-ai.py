
import numpy as np

from winning_conditions import winning_idecies_table_binary

TURN_X = 1
TURN_O = -1
FULL_GAME_BINARY = 0b111111111

def get_square_selection(possible_squares, dimension):
    array = [i+1 for i in range(9) if (1<<i)&possible_squares]
    print(f"Choose one of the possibilities on Level ({dimension}): {array}")
    val = int(input(" > ")) - 1

    assert val+1 in array

    return val

class Square:
    def __init__(self,dimensions=1):
        self.state = None

    def show(self):
        if self.state == TURN_X: return "X"
        elif self.state == TURN_O: return "O"
        else: return "_"
    
    def is_empty(self):
        return self.state == None
        
    def set_state(self, turn):
        self.state = turn
        
    def put_piece(self, turn):
        self.set_state(turn)
        return -1
        # return -1 so there is no last move:
        # next turn: user selection is requested again because no last move

class Board(Square):
    def __init__(self, dimensions):
        super().__init__()

        self.dimension = dimensions
        self.next_selection = -1
        
        if dimensions > 1:
            obj = Board
        else:
            obj = Square
        
        self.board = [
            obj(dimensions=dimensions-1) for _ in range(9)
        ]

        self.possible_squares = FULL_GAME_BINARY
    
    def create_binary_of_turn(self, turn):
        binary = 0
        contra_binary = 0
        for i,square in enumerate(self.board):
            if square.state == turn:
                binary = binary | (1 << i)
            elif square.state == -turn:
                contra_binary = contra_binary | (1 << i)
        return binary, contra_binary

    def check_win(self, binary):
        for winning_case in winning_idecies_table_binary:
            if (binary & winning_case) == winning_case:
                return True

        return False

    def get_possible_squares(self, binary, contra_binary):
        return FULL_GAME_BINARY - (binary | contra_binary)
    
    def get_selection(self):
        if self.next_selection == -1:
            return get_square_selection(self.possible_squares, self.dimension)
        
        return self.next_selection
        
    def put_piece(self, turn):
        current_selection = self.get_selection()
        square = self.board[current_selection]
        
        selection_from_lower_dim = square.put_piece(turn)

        if self.board[selection_from_lower_dim].is_empty():
            self.next_selection = selection_from_lower_dim
        else:
            # board cant become selection as it is complete
            self.next_selection = -1

        binary, contra_binary = self.create_binary_of_turn(turn)
        self.possible_squares = self.get_possible_squares(binary, contra_binary)

        if self.check_win(binary):
            print("won")
            self.set_state(turn)
        elif not self.possible_squares:
            print("draw")
            self.set_state(0)
               
        # next_selection for leaf boards always = -1 (Null) because Square() returns -1
        # so there always has to be a user selection
        # Board() always returns selection but next_selection might be set to -1
        # so it isn't selected next turn and there is new user selection
        return current_selection

    def show(self):
        data = {
            "dimension":self.dimension,
            "state": self.state,
            "next_selection": self.next_selection
        }
        for i, square in enumerate(self.board):
            data[i+1] = square.show()
        return data

def play():
    dimensions = 2#int(input("number of dimensions > "))

    root_game = Board(dimensions)

    turn = 1
    while root_game.is_empty():
        root_game.put_piece(turn)
        print(root_game.show())
        turn*= -1

if __name__ == "__main__":
    play()