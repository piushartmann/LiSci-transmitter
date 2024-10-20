import json
from datetime import datetime

citations = []

lines = []

authors = {}

with open("./Zitate_raw.txt", "r", encoding="utf-8") as file:
    current_date = ""
    buffer = []
    for line in file:
        lines.append(line)
        if line == "\n":
            timestamp = datetime.strptime(current_date, "%d.%m.%Y").isoformat()
            citations.append({"timestamp": timestamp, "citations": buffer})
            buffer = []
        line = line.strip()
        if line:
            if line[0].isdigit():
                current_date = line
            else:
                if line != "":
                    if ":" not in line:
                        print(line)
                    else:
                        if line != "":
                            author = line.split(":")[0]
                            if author == "Ich":
                                author = "Cornelius"

                            if authors.get(author) is None:
                                authors[author] = 1
                            else:
                                authors[author] += 1
                            
                            citation = line.split(":")[1].strip().strip("„").strip("“").strip('”')
                            buffer.append({"author": author, "content": citation})
    timestamp = datetime.strptime(current_date, "%d.%m.%Y").isoformat()
    citations.append({"timestamp": timestamp, "citations": buffer})
                
with open("./citations.json", "w", encoding="utf-8") as file:
    json.dump(citations, file, indent=4, ensure_ascii=False)
    
print("Total: " + str(len(citations)))
print("")

sorted_authors = sorted(authors.items(), key=lambda item: item[1], reverse=True)
pruned_authors = sorted_authors[:10]
for author, count in pruned_authors:
    print(f"{author}: {count}")