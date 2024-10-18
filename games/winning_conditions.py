
winning_idecies_table = [
    # Rows
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    
    # Columns
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    
    # Diagonals
    [0, 4, 8],
    [2, 4, 6]
]

winning_idecies_table_binary = []

for winning_case in winning_idecies_table:
    binary = 0
    for i in winning_case:
        binary = binary | (1 << i)

    winning_idecies_table_binary.append(binary)
