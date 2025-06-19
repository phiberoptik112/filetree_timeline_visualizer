#backend dockerfile

FROM python:3.10-slim

COPY requirements.txt ./

RUN pip install -r requirements.txt

CMD ["python", "scanner.py", "/data", "--output", "/shared/file_tree_data.json"]
