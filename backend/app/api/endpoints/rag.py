from fastapi import APIRouter
from app.models.domain import RAGQueryRequest, RAGQueryResponse
from app.ai.rag_engine import query_rag_knowledge_base

router = APIRouter()


@router.post("/rag/query", response_model=RAGQueryResponse)
def query_rag_assistant(req: RAGQueryRequest):
    """Answers regulatory and operational questions using RAG knowledge base."""
    return query_rag_knowledge_base(req.query)
