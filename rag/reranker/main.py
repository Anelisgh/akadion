import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sentence_transformers import CrossEncoder

from logging_setup import setup_logging
from middleware import request_context
from models import RerankRequest, RerankResponse, RerankedChunk

setup_logging()
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    yield


app = FastAPI(lifespan=lifespan)
app.middleware("http")(request_context)

log.info("model_loading")
start_time = time.perf_counter()
model = CrossEncoder("cross-encoder/mmarco-mMiniLMv2-L12-H384-v1")
log.info("model_loaded", extra={"duration_ms": round((time.perf_counter() - start_time) * 1000, 1)})


@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": True}


@app.post("/api/rerank/chunks")
def rerank(request: RerankRequest) -> RerankResponse:
    log.info("rerank_start", extra={"n_chunks": len(request.chunks), "top_k": request.top_k})
    start_time = time.perf_counter()

    pairs = [(request.query, document.text) for document in request.chunks]
    scores = model.predict(pairs)

    scored = [
        (index + 1, chunk, score)
        for index, (chunk, score) in enumerate(zip(request.chunks, scores))
    ]

    ranked = sorted(scored, key=lambda pair: pair[2], reverse=True)
    top = ranked[:request.top_k]

    reranked = [
        RerankedChunk(
            text=chunk.text,
            rerank_score=float(score),
            chunk_id=chunk.chunk_id,
            original_rank=rank,
        )
        for rank, chunk, score in top
    ]

    log.info(
        "rerank_done",
        extra={
            "n_returned": len(reranked),
            "duration_ms": round((time.perf_counter() - start_time) * 1000, 1),
        },
    )
    return RerankResponse(reranked_chunks=reranked)
