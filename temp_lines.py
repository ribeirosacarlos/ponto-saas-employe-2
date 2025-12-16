from pathlib import Path
lines = Path('src/pages/History.jsx').read_text().splitlines()
for i in range(450, 540):
    print(f"{i+1:04d}: {lines[i]}")
