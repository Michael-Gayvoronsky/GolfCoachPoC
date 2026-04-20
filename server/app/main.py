from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import users, posts

app = FastAPI(title="GolfCoach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://localhost:5001", "https://localhost:7001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(posts.router)


@app.get("/health")
def health():
    return {"status": "ok"}
