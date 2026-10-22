"""Đưa service account key vừa tải về vào .env.production.local rồi xóa file tải về.

Chạy từ thư mục gốc dự án: python3 scripts/install-service-account.py
Không in nội dung khóa, chỉ in tên file và client_email để đối chiếu.
"""

import glob
import json
import os
import sys

PROJECT_ID = "so-yen-app"
ENV_FILE = ".env.production.local"

candidates = sorted(
    glob.glob(os.path.expanduser(f"~/Downloads/{PROJECT_ID}-*.json")),
    key=os.path.getmtime,
    reverse=True,
)
if not candidates:
    sys.exit(f"Không thấy file ~/Downloads/{PROJECT_ID}-*.json")

path = candidates[0]
with open(path, encoding="utf-8") as f:
    key = json.load(f)
if key.get("type") != "service_account" or key.get("project_id") != PROJECT_ID:
    sys.exit(f"{os.path.basename(path)} không phải service account key của {PROJECT_ID}")

line = "FIREBASE_SERVICE_ACCOUNT=" + json.dumps(key, separators=(",", ":"))
with open(ENV_FILE, encoding="utf-8") as f:
    lines = f.read().splitlines()
lines = [line if l.startswith("FIREBASE_SERVICE_ACCOUNT=") else l for l in lines]
if line not in lines:
    lines.append(line)
with open(ENV_FILE, "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")
os.chmod(ENV_FILE, 0o600)
os.remove(path)

print(f"Đã ghi key từ {os.path.basename(path)} ({key['client_email']}) vào {ENV_FILE} và xóa file tải về.")
