import os
import hashlib

table = {}

for root, dirs, files in os.walk("./testing"):
    for file in files:
        path = os.path.join(root, file)
        size = os.path.getsize(path)
        md5 = hashlib.md5(open(path, 'rb').read()).hexdigest()
        table[path] = (size, md5)


# pretty print the table
for path, (size, md5) in table.items():
    print(path, size, md5)

