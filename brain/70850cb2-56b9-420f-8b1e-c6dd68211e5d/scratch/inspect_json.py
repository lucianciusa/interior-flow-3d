path = r"c:\Users\mario\PycharmProjects\interior-flow-3d\backend\app\data\catalog.json"
with open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

for i, line in enumerate(lines[3240:3250]):
    print(f"{i+3241}: {repr(line)}")
