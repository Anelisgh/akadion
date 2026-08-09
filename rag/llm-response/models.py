from pydantic import BaseModel
from typing import List

class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    studentId: int
    cursId: int
    maxSaptamanaParcursa: int
    intrebare: str
    istoricConversatie: List[Message] = []

class ChatResponse(BaseModel):
    raspuns: str
    surseFolosite: List[int] = []

class QuizGenerateRequest(BaseModel):
    cursId: int
    maxSaptamanaParcursa: int | None = None
    maxSaptamana: int | None = None
    documentId: int | None = None
    nrIntrebari: int = 5

class QuizQuestion(BaseModel):
    intrebare: str
    optiuni: dict[str, str]
    raspuns_corect: str
    explicatie: str
