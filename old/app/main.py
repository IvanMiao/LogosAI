# backend/app/main.py
# FastAPI application

from fastapi import FastAPI

app = FastAPI()

# A simple endpoint
@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

